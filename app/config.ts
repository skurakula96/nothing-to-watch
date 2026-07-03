const env = import.meta.env as unknown as {
  VITE_TELEMETRY_ENABLED?: string
  VITE_TELEMETRY_ENDPOINT?: string
  VITE_APP_VERSION?: string
  VITE_CATALOG_META_URL?: string
  VITE_PLEX_BASE_URL?: string
  VITE_OVERSEERR_BASE_URL?: string
  VITE_MEDIA_AVAILABILITY_URL?: string
}

export default {
  backdropBaseUrl: 'https://image.tmdb.org/t/p/w1280',
  posterBaseUrl: 'https://image.tmdb.org/t/p/w300_and_h450_bestv2',
  sourceCodeUrl: 'https://github.com/gnovotny/nothing-to-watch',
  tmdbUrl: 'https://themoviedb.org',
  tmdbFilmBaseUrl: 'https://www.themoviedb.org/movie/',
  imdbFilmBaseUrl: 'https://imdb.com/title/',
  catalogMetaUrl: env?.VITE_CATALOG_META_URL || '/json/catalog-meta.json',
  plexBaseUrl: env?.VITE_PLEX_BASE_URL || undefined,
  overseerrBaseUrl: env?.VITE_OVERSEERR_BASE_URL || undefined,
  mediaAvailabilityUrl:
    env?.VITE_MEDIA_AVAILABILITY_URL || '/json/library-availability.sample.json',
  contactEmail: '96j0o1ivb@mozmail.com',
  disableUI: false,
  telemetry: {
    enabled:
      env?.VITE_TELEMETRY_ENABLED === '1' ||
      env?.VITE_TELEMETRY_ENABLED === 'true',
    endpoint: env?.VITE_TELEMETRY_ENDPOINT || undefined,
    appVersion: env?.VITE_APP_VERSION || undefined,
  },
}
