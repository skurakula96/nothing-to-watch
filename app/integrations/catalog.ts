import type { MediaAvailabilityIndex } from './media-availability'
import { getInLibraryTmdbIds } from './media-availability'
import type { CatalogMeta } from '../store/film-data-slice'
import type { FilmBatch, FilmData } from '../vf'

const DEFAULT_CATALOG_BASE_URL = '/json'

const getCatalogBatchUrls = (batchIndex: number) => {
  const configuredBaseUrl = import.meta.env.VITE_FILM_INFO_BASE_URL
  return [...new Set([DEFAULT_CATALOG_BASE_URL, configuredBaseUrl].filter(Boolean))]
    .map((baseUrl) => `${baseUrl}/${batchIndex}.json`)
}

const isJsonResponse = (response: Response) =>
  (response.headers.get('content-type') ?? '').includes('application/json')

export const loadCatalogBatch = async (batchIndex: number): Promise<FilmBatch> => {
  for (const url of getCatalogBatchUrls(batchIndex)) {
    const response = await fetch(url)
    if (!response.ok || !isJsonResponse(response)) continue
    return (await response.json()) as FilmBatch
  }

  throw new Error(`Failed to load catalog batch ${batchIndex}`)
}

export const loadAllCatalogBatches = async (
  catalogMeta: CatalogMeta,
): Promise<Map<number, FilmData[]>> => {
  const batches = await Promise.all(
    Array.from({ length: catalogMeta.batchCount }, (_, batchIndex) =>
      loadCatalogBatch(batchIndex),
    ),
  )

  return new Map(batches.map((batch, batchIndex) => [batchIndex, batch]))
}

export const buildLibraryCatalog = async (
  catalogMeta: CatalogMeta | undefined,
  availabilityIndex: MediaAvailabilityIndex,
): Promise<{ batches: Map<number, FilmData[]>; meta: CatalogMeta }> => {
  if (!catalogMeta) {
    return {
      batches: new Map<number, FilmData[]>(),
      meta: {
        count: 0,
        batchCount: 0,
        batchSize: 216,
      },
    }
  }

  const inLibraryTmdbIds = getInLibraryTmdbIds(availabilityIndex)
  const allBatches = await loadAllCatalogBatches(catalogMeta)
  const filteredFilms = [...allBatches.values()]
    .flat()
    .filter((film) => inLibraryTmdbIds.has(Number(film.id)))

  const batchSize = catalogMeta.batchSize
  const filteredBatches = new Map<number, FilmData[]>()

  for (let batchIndex = 0; batchIndex * batchSize < filteredFilms.length; batchIndex++) {
    filteredBatches.set(
      batchIndex,
      filteredFilms.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize),
    )
  }

  return {
    batches: filteredBatches,
    meta: {
      ...catalogMeta,
      count: filteredFilms.length,
      batchCount: filteredBatches.size,
    },
  }
}
