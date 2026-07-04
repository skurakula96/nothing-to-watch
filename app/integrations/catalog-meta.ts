import config from '../config'
import type { CatalogMeta } from '../store/film-data-slice'

export const loadCatalogMeta = async (): Promise<CatalogMeta | undefined> => {
  const [catalogResponse, atlasResponse] = await Promise.all([
    fetch(config.catalogMetaUrl),
    fetch('/media/atlas-meta.json'),
  ])

  if (!catalogResponse.ok) {
    if (catalogResponse.status === 404) return
    throw new Error(`Failed to load catalog meta (${catalogResponse.status})`)
  }

  const catalogMeta = (await catalogResponse.json()) as CatalogMeta

  if (!atlasResponse.ok) return catalogMeta

  const atlasMeta = (await atlasResponse.json()) as {
    mediaVersions?: CatalogMeta['mediaVersions']
    versions?: CatalogMeta['mediaVersions']
  }
  return {
    ...catalogMeta,
    mediaVersions: atlasMeta.mediaVersions ?? atlasMeta.versions,
  }
}
