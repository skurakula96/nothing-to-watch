import type { VoroforceCell } from '../types'

export type FilmData = Record<string, string | number>
export type FilmBatch = FilmData[]
export type FilmBatches = Map<number, FilmBatch>

const DEFAULT_FILM_INFO_BASE_URL = '/json'

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
  let filmBatch = filmBatches.get(cell.subgrid)
  if (!filmBatch) {
    filmBatch = await loadCellFilmBatch(cell.subgrid)
    filmBatches.set(cell.subgrid, filmBatch ?? [])
  }

  return filmBatch?.[cell.subgridIndex]
    ? new Film(filmBatch[cell.subgridIndex])
    : undefined
}
