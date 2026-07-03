import config from '../config'
import type { CatalogMeta } from '../store/film-data-slice'

export const loadCatalogMeta = async (): Promise<CatalogMeta | undefined> => {
  const response = await fetch(config.catalogMetaUrl)
  if (!response.ok) {
    if (response.status === 404) return
    throw new Error(`Failed to load catalog meta (${response.status})`)
  }

  return (await response.json()) as CatalogMeta
}
