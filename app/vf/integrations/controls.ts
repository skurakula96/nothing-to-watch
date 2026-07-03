import { mergeConfigs } from '√'
import { isFilmInLibrary } from '../../integrations/media-availability'
import { store } from '../../store'
import { VOROFORCE_MODE } from '../consts'
import type { VoroforceCell, VoroforceInstance } from '../types'
import { getCellFilm } from '../utils'

const getSelectableFilm = async (cell?: VoroforceCell) => {
  if (!cell) return

  const { filmBatches, availabilityIndex, userConfig } = store.getState()
  const film = await getCellFilm(cell, filmBatches)

  if (userConfig.libraryOnly && film && !isFilmInLibrary(film, availabilityIndex)) {
    return
  }

  return film
}

export const handleControls = () => {
  const {
    setFilm,
    voroforce,
    configUniforms: {
      main: mainUniforms,
      transitioning: transitioningUniforms,
    },
    mode,
  } = store.getState()

  if (!voroforce?.controls) return

  const { controls } = voroforce

  controls.listen('focused', (async ({ cell }: { cell: VoroforceCell }) => {
    setFilm(await getSelectableFilm(cell))
  }) as unknown as EventListener)

  controls.listen('selected', (async ({ cell }: { cell: VoroforceCell }) => {
    if (cell) {
      setFilm(await getSelectableFilm(cell))
      // controls.pinPointer()
    } else {
      // controls.unpinPointer()
    }
  }) as unknown as EventListener)

  controls.listen('pointerFrozenChange', (async ({
    frozen,
  }: { frozen: boolean }) => {
    const uniformKey = 'fUnweightedEffectMod'
    const uniform = mainUniforms.get(uniformKey)
    if (!uniform) return
    const value =
      [VOROFORCE_MODE.preview, VOROFORCE_MODE.select].includes(mode) && frozen
        ? 1
        : 0
    if (transitioningUniforms && uniform.transition) {
      if (uniform.value !== value) {
        uniform.targetValue = value
        if (!transitioningUniforms.has(uniformKey)) {
          transitioningUniforms.set(uniformKey, uniform)
        }
      }
    } else {
      uniform.value = value
    }
  }) as unknown as EventListener)
}

export const updateControlsByMode = (
  controls: VoroforceInstance['controls'],
  mode: VOROFORCE_MODE,
  controlsConfig: VoroforceInstance['config']['controls'],
) => {
  controls.updateConfig(
    mergeConfigs(controlsConfig.default, controlsConfig.modes?.[mode]),
  )
}
