import { mergeConfigs } from '√'
import appConfig from '../../config'
import type { THEME } from '../../consts'
import type { StoreState } from '../../store'
import type { CatalogMeta } from '../../store/film-data-slice'
import baseConfig from '../config'
import {
  DEFAULT_VOROFORCE_PRESET,
  VOROFORCE_MODE,
  VOROFORCE_PRESET,
} from '../consts'
import presets from '../presets'
import type { VoroforceCell, VoroforceInstance } from '../types'
import type { ConfigUniform } from './uniforms'
import type { Film } from './films'

export type CustomLink = {
  name: string
  baseUrl: string
  slug: boolean
  property: 'title' | 'tmdbId' | 'imdbId'
}

export type UserConfig = {
  cells?: number
  devTools?: boolean
  libraryOnly?: boolean
  customLinks?: CustomLink[]
  favorites?: {
    [key: Film['tmdbId']]: {
      cellId: VoroforceCell['id']
      title: Film['title']
      year: Film['year']
      tagline: Film['tagline']
      tmdbId: Film['tmdbId']
      imdbId?: Film['imdbId']
      poster?: Film['poster']
    }
  }
}

const handleCustomLinkParam = (
  customLinkBase64Param: string,
  state: StoreState,
) => {
  const { userConfig, setUserConfig } = state
  try {
    const customLink = JSON.parse(window.atob(customLinkBase64Param))
    userConfig.customLinks = [...(userConfig.customLinks ?? [])]
    const sameNameIndex = userConfig.customLinks.findIndex(
      ({ name }) => name === customLink.name,
    )
    if (sameNameIndex !== -1) {
      userConfig.customLinks[sameNameIndex] = customLink
    } else {
      userConfig.customLinks.push(customLink)
    }
    setUserConfig(userConfig)
    window.history.replaceState({}, document.title, '/')
  } catch {}
}

const getMaxCellsForConfiguredMedia = (
  config: ReturnType<typeof mergeConfigs>,
) => {
  const highResVersion = config.media?.versions?.[2]
  if (!highResVersion) return

  const { cols, rows, layers } = highResVersion
  if (![cols, rows, layers].every((value) => Number.isFinite(value))) return

  return cols * rows * layers
}

const configureCatalogMediaMode = (
  config: ReturnType<typeof mergeConfigs>,
  catalogMeta?: CatalogMeta,
) => {
  if (!catalogMeta?.count) return config

  config.media.baseUrl = '/media'
  config.media.preload = 'first'
  const mediaVersionMetaByName = new Map(
    (catalogMeta.mediaVersions ?? []).map((version) => [version.name, version]),
  )

  config.media.versions = config.media.versions.map(
    (version: any, index: number) => {
      if (index === 0 || index === 1) {
        return {
          ...version,
          layers: 0,
        }
      }

      if (index === 2) {
        const versionMeta = mediaVersionMetaByName.get('high')
        return {
          ...version,
          layers:
            versionMeta?.layerCount ??
            Math.max(1, Math.ceil(catalogMeta.count / (version.cols * version.rows))),
        }
      }
      if (index !== 3) return version

      return {
        ...version,
        layers: catalogMeta.count,
        layerSrcFormat: '/single/{INDEX}.jpg',
      }
    },
  )

  const forceStepModeConfigs = config.simulation.forceStepModeConfigs
  ;[VOROFORCE_MODE.preview, VOROFORCE_MODE.select].forEach((mode) => {
    const forceConfig = forceStepModeConfigs?.[mode]?.forces
    if (!forceConfig || Array.isArray(forceConfig)) return

    forceConfig.requestMediaVersions = {
      ...forceConfig.requestMediaVersions,
      enabled: true,
      v3ColLevelAdjacencyThreshold:
        mode === VOROFORCE_MODE.select ? 1 : 0,
      v3RowLevelAdjacencyThreshold:
        mode === VOROFORCE_MODE.select ? 1 : 0,
      v2ColLevelAdjacencyThreshold: 9999,
      v2RowLevelAdjacencyThreshold: 9999,
      v1ColLevelAdjacencyThreshold: 0,
      v1RowLevelAdjacencyThreshold: 0,
    }
  })

  return config
}

export const getVoroforceConfig = (state: StoreState) => {
  const {
    userConfig,
    preset: initialPreset,
    cellLimit,
    mode,
    catalogMeta,
    filmBatches,
    catalogMode,
  } = state
  const urlParams = new URLSearchParams(window.location.search)
  const presetOverrideParam = urlParams.get('preset') as VOROFORCE_PRESET
  const cellsOverrideParam = urlParams.get('cells')
  const customLinkBase64Param = urlParams.get('customLinkBase64')

  let preset = initialPreset
  if (presetOverrideParam && VOROFORCE_PRESET[presetOverrideParam]) {
    preset = presetOverrideParam
  }

  if (!preset) preset = DEFAULT_VOROFORCE_PRESET

  let config = mergeConfigs(
    baseConfig,
    (presets as unknown as Record<VOROFORCE_PRESET, typeof baseConfig>)[preset],
  )
  if (config.modes?.[mode]) {
    config = mergeConfigs(config, config.modes?.[mode])
  }

  config = configureCatalogMediaMode(config, catalogMeta)

  if (catalogMode === 'library' && filmBatches.size > 0) {
    const batchSize = catalogMeta?.batchSize ?? 216
    const libraryBatches = filmBatches
    config.media.preload = false
    config.media.versions = config.media.versions.map((version: any, index: number) => {
      if (index !== 3) return version

      return {
        ...version,
        layers: catalogMeta?.count ?? 0,
        layerSrcFormat: async (layerIndex: number) => {
          const batchIndex = Math.floor(layerIndex / batchSize)
          const subgridIndex = layerIndex % batchSize
          const film = libraryBatches.get(batchIndex)?.[subgridIndex]
          const posterPath = film?.poster_path ? String(film.poster_path) : undefined

          return posterPath
            ? `${appConfig.posterBaseUrl}${posterPath}`
            : 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
        },
      }
    })

    const forceStepModeConfigs = config.simulation.forceStepModeConfigs
    ;[VOROFORCE_MODE.preview, VOROFORCE_MODE.select].forEach((mode) => {
      const forceConfig = forceStepModeConfigs?.[mode]?.forces
      if (!forceConfig || Array.isArray(forceConfig)) return

      forceConfig.requestMediaVersions = {
        ...forceConfig.requestMediaVersions,
        enabled: true,
        v3ColLevelAdjacencyThreshold: 9999,
        v3RowLevelAdjacencyThreshold: 9999,
        v2ColLevelAdjacencyThreshold: 0,
        v2RowLevelAdjacencyThreshold: 0,
        v1ColLevelAdjacencyThreshold: 0,
        v1RowLevelAdjacencyThreshold: 0,
      }
    })
  }

  if (catalogMode !== 'library') {
    config.media.versions = config.media.versions.filter(
      (version: any) => version.type !== 'uncompressed-single',
    )
  }

  if (customLinkBase64Param) {
    handleCustomLinkParam(customLinkBase64Param, state)
  }

  config.cells = cellsOverrideParam
    ? Number.parseInt(cellsOverrideParam)
    : (cellLimit ?? catalogMeta?.count ?? config.cells)

  if (catalogMeta?.count) {
    config.cells = Math.min(config.cells, catalogMeta.count)
  }

  const maxCellsForConfiguredMedia = getMaxCellsForConfiguredMedia(config)
  if (maxCellsForConfiguredMedia) {
    config.cells = Math.min(config.cells, maxCellsForConfiguredMedia)
  }

  if ('devTools' in userConfig) {
    config.devTools.enabled = !!userConfig.devTools
  }

  return config
}

const processVoroforceStageConfigUniforms = (
  stageConfigUniforms: Record<string, ConfigUniform>,
  transitioning: Map<string, ConfigUniform>,
  mode: VOROFORCE_MODE,
  theme: THEME,
) => {
  return new Map<string, ConfigUniform>(
    Object.entries(stageConfigUniforms).map(([key, uniform]) => {
      if (typeof uniform.value === 'undefined') {
        const uniformValue = uniform.modes
          ? typeof uniform.modes?.[mode]?.value !== 'undefined'
            ? uniform.modes[mode].value
            : (uniform.modes?.default?.value ?? 0)
          : typeof uniform.themes?.[theme]?.value !== 'undefined'
            ? uniform.themes[theme].value
            : (uniform.themes?.default?.value ?? 0)

        if (
          uniform.transition &&
          typeof uniform.initial?.value === 'number' &&
          typeof uniformValue === 'number'
        ) {
          uniform.value = uniform.initial.value

          uniform.targetValue = uniformValue
          if (!transitioning.has(key)) {
            transitioning.set(key, uniform)
          }
        } else {
          uniform.value = uniformValue as number
        }
      }
      return [key, uniform]
    }),
  )
}

export const getVoroforceConfigUniforms = (
  config: VoroforceInstance['config'],
  mode: VOROFORCE_MODE,
  theme: THEME,
) => {
  const {
    display: {
      scene: {
        main: { uniforms: mainConfigUniforms = {} },
        post: { uniforms: postConfigUniforms = {} },
      },
    },
  } = config

  const transitioning = new Map<string, ConfigUniform>()

  return {
    main: processVoroforceStageConfigUniforms(
      mainConfigUniforms,
      transitioning,
      mode,
      theme,
    ),
    post: processVoroforceStageConfigUniforms(
      postConfigUniforms,
      transitioning,
      mode,
      theme,
    ),
    transitioning,
  }
}
