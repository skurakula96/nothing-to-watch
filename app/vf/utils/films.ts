import type { VoroforceCell } from '../types'

export type FilmData = Record<string, string | number>
export type FilmBatch = FilmData[]
export type FilmBatches = Map<number, FilmBatch>

const DEFAULT_FILM_INFO_BASE_URL = '/json'
const DEFAULT_FILM_BATCH_SIZE = 216

const getFilmBatchUrls = (batchIndex: number) => {
  const configuredBaseUrl = import.meta.env.VITE_FILM_INFO_BASE_URL
  return [...new Set([DEFAULT_FILM_INFO_BASE_URL, configuredBaseUrl].filter(Boolean))]
    .map((baseUrl) => `${baseUrl}/${batchIndex}.json`)
}

const isJsonResponse = (response: Response) =>
  (response.headers.get('content-type') ?? '').includes('application/json')

export class Film {
  tmdbId: number
  imdbId?: string
  title: string
  tagline?: string
  overview?: string
  genres?: string[]
  year: number
  rating: number
  popularity: number
  poster: string
  backdrop: string

  constructor(data: FilmData) {
    this.tmdbId = Number(data.id)
    this.imdbId = data.imdb_id ? String(data.imdb_id) : undefined
    this.title = String(data.title)
    this.tagline = data.tagline ? String(data.tagline) : undefined
    this.overview = data.overview ? String(data.overview) : undefined
    this.genres = data.genres ? String(data.genres).split(', ') : undefined
    this.year = Number(data.release_year)
    this.rating = Number(data.vote_average) * 10
    this.popularity = Number(data.popularity)
    this.poster = String(data.poster_path)
    this.backdrop = String(data.backdrop_path)
  }
}

const getCellBatchCoordinates = (cell: VoroforceCell) => {
  if (Number.isFinite(cell?.id)) {
    const id = Number(cell.id)
    return {
      batchIndex: Math.floor(id / DEFAULT_FILM_BATCH_SIZE),
      batchOffset: id % DEFAULT_FILM_BATCH_SIZE,
    }
  }

  return {
    batchIndex: Number(cell?.subgrid),
    batchOffset: Number(cell?.subgridIndex),
  }
}

const loadCellFilmBatch = async (batchIndex: number) => {
  for (const url of getFilmBatchUrls(batchIndex)) {
    try {
      const response = await fetch(url)
      if (!response.ok || !isJsonResponse(response)) {
        continue
      }

      return (await response.json()) as FilmBatch
    } catch (error) {
      console.error('Error loading JSON:', error)
    }
  }

  console.log('batchIndex', batchIndex)
}

export const getCellFilm = async (
  cell: VoroforceCell,
  filmBatches: FilmBatches,
) => {
  if (!cell) return
  const { batchIndex, batchOffset } = getCellBatchCoordinates(cell)
  if (!Number.isFinite(batchIndex) || !Number.isFinite(batchOffset)) return

  let filmBatch = filmBatches.get(batchIndex)
  if (!filmBatch) {
    filmBatch = await loadCellFilmBatch(batchIndex)
    filmBatches.set(batchIndex, filmBatch ?? [])
  }

  return filmBatch?.[batchOffset]
    ? new Film(filmBatch[batchOffset])
    : undefined
}
