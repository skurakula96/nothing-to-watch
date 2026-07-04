import config from '../config'
import type { Film } from '../vf'

export type MediaType = 'movie' | 'tv'

export type MediaAvailabilityEntry = {
  tmdbId: number
  title?: string
  mediaType?: MediaType
  inLibrary?: boolean
  plexUrl?: string
  overseerrUrl?: string
  requested?: boolean
}

export type MediaAvailabilityIndex = Record<number, MediaAvailabilityEntry>

type RawMediaAvailabilityEntry = Omit<MediaAvailabilityEntry, 'tmdbId'> & {
  tmdbId?: number | string
  id?: number | string
}

const normalizeEntry = (
  entry: RawMediaAvailabilityEntry,
): MediaAvailabilityEntry | undefined => {
  const tmdbId = Number(entry.tmdbId ?? entry.id)
  if (!Number.isFinite(tmdbId) || tmdbId <= 0) return

  return {
    tmdbId,
    title: entry.title,
    mediaType: entry.mediaType ?? 'movie',
    inLibrary: Boolean(entry.inLibrary),
    plexUrl: entry.plexUrl,
    overseerrUrl: entry.overseerrUrl,
    requested: Boolean(entry.requested),
  }
}

export const normalizeMediaAvailabilityIndex = (
  payload: unknown,
): MediaAvailabilityIndex => {
  if (!payload) return {}

  const entries = Array.isArray(payload)
    ? payload
    : typeof payload === 'object' && payload !== null && 'items' in payload
      ? (payload.items as unknown[])
      : []

  return entries.reduce<MediaAvailabilityIndex>((acc, entry) => {
    const normalized = normalizeEntry(entry as RawMediaAvailabilityEntry)
    if (normalized) acc[normalized.tmdbId] = normalized
    return acc
  }, {})
}

export const loadMediaAvailabilityIndex =
  async (): Promise<MediaAvailabilityIndex> => {
    if (!config.mediaAvailabilityUrl) return {}

    const response = await fetch(config.mediaAvailabilityUrl)
    if (!response.ok) {
      throw new Error(`Failed to load availability index (${response.status})`)
    }

    const payload = (await response.json()) as unknown
    return normalizeMediaAvailabilityIndex(payload)
  }

export const getMediaAvailabilityForFilm = (
  film: Pick<Film, 'tmdbId'> | undefined,
  availabilityIndex: MediaAvailabilityIndex,
) => {
  if (!film) return
  return availabilityIndex[film.tmdbId]
}

const buildOverseerrUrl = (
  film: Pick<Film, 'tmdbId'> | undefined,
  mediaType: MediaType,
) => {
  if (!film || !config.overseerrBaseUrl) return
  const pathname = mediaType === 'tv' ? 'tv' : 'movie'
  return `${config.overseerrBaseUrl.replace(/\/$/, '')}/details/${pathname}/${film.tmdbId}`
}

export const getPlexUrlForFilm = (
  film: Pick<Film, 'tmdbId'> | undefined,
  availabilityIndex: MediaAvailabilityIndex,
) => getMediaAvailabilityForFilm(film, availabilityIndex)?.plexUrl

export const getOverseerrUrlForFilm = (
  film: Pick<Film, 'tmdbId'> | undefined,
  availabilityIndex: MediaAvailabilityIndex,
) => {
  const entry = getMediaAvailabilityForFilm(film, availabilityIndex)
  if (entry?.overseerrUrl) return entry.overseerrUrl
  return buildOverseerrUrl(film, entry?.mediaType ?? 'movie')
}

export const isFilmInLibrary = (
  film: Pick<Film, 'tmdbId'> | undefined,
  availabilityIndex: MediaAvailabilityIndex,
) => Boolean(getMediaAvailabilityForFilm(film, availabilityIndex)?.inLibrary)

export const getInLibraryTmdbIds = (
  availabilityIndex: MediaAvailabilityIndex,
) =>
  new Set(
    Object.values(availabilityIndex)
      .filter((entry) => entry.inLibrary)
      .map((entry) => entry.tmdbId),
  )
