import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const JSON_DIR = path.join(ROOT, 'public', 'json')
const BATCH_SIZE = 18 * 12

const parseDotEnv = async (filePath) => {
  try {
    const raw = await readFile(filePath, 'utf8')
    return raw.split(/\r?\n/).reduce((acc, line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return acc
      const eq = trimmed.indexOf('=')
      if (eq === -1) return acc
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim()
      acc[key] = value
      return acc
    }, {})
  } catch {
    return {}
  }
}

const envFromFile = await parseDotEnv(path.join(ROOT, '.env.local'))
const env = {
  ...envFromFile,
  ...process.env,
}

const tmdbReadAccessToken = env.TMDB_READ_ACCESS_TOKEN
const tmdbApiKey = env.TMDB_API_KEY
const maxDiscoverPages = Number.parseInt(env.TMDB_DISCOVER_PAGES ?? '500', 10)
const targetCount = Number.parseInt(env.TMDB_TARGET_COUNT ?? '10000', 10)
const language = env.TMDB_LANGUAGE ?? 'en-US'

if (!tmdbReadAccessToken && !tmdbApiKey) {
  throw new Error(
    'Missing TMDB_READ_ACCESS_TOKEN or TMDB_API_KEY in .env.local',
  )
}

const fetchJson = async (url) => {
  const headers = tmdbReadAccessToken
    ? { Authorization: `Bearer ${tmdbReadAccessToken}` }
    : {}

  const withApiKey = tmdbApiKey
    ? `${url}${url.includes('?') ? '&' : '?'}api_key=${tmdbApiKey}`
    : url

  const response = await fetch(withApiKey, { headers })
  if (!response.ok) {
    throw new Error(`TMDB request failed (${response.status}) for ${url}`)
  }
  return response.json()
}

const genreResponse = await fetchJson(
  `https://api.themoviedb.org/3/genre/movie/list?language=${encodeURIComponent(language)}`,
)
const genreMap = new Map(
  genreResponse.genres.map((genre) => [genre.id, genre.name]),
)

const movies = []
const seen = new Set()
let page = 1
let totalPages = maxDiscoverPages

while (page <= maxDiscoverPages && page <= totalPages && movies.length < targetCount) {
  const response = await fetchJson(
    `https://api.themoviedb.org/3/discover/movie?include_adult=false&include_video=false&language=${encodeURIComponent(language)}&page=${page}&sort_by=popularity.desc&vote_count.gte=25`,
  )
  totalPages = Math.min(response.total_pages ?? maxDiscoverPages, maxDiscoverPages)

  for (const movie of response.results ?? []) {
    if (seen.has(movie.id) || !movie.poster_path) continue
    seen.add(movie.id)

    movies.push({
      id: movie.id,
      title: movie.title,
      vote_average: String(movie.vote_average ?? 0),
      vote_count: movie.vote_count ?? 0,
      backdrop_path: movie.backdrop_path ?? '',
      imdb_id: '',
      overview: movie.overview ?? '',
      popularity: String(movie.popularity ?? 0),
      poster_path: movie.poster_path ?? '',
      tagline: '',
      genres: (movie.genre_ids ?? [])
        .map((genreId) => genreMap.get(genreId))
        .filter(Boolean)
        .join(', '),
      production_countries: '',
      keywords: '',
      release_year: movie.release_date
        ? String(movie.release_date).slice(0, 4)
        : '',
    })

    if (movies.length >= targetCount) {
      break
    }
  }

  page++
}

await mkdir(JSON_DIR, { recursive: true })
const existingJsonFiles = await readdir(JSON_DIR)
for (const file of existingJsonFiles) {
  if (/^\d+\.json$/.test(file) || file === 'catalog-meta.json') {
    await rm(path.join(JSON_DIR, file), { force: true })
  }
}

const batchCount = Math.ceil(movies.length / BATCH_SIZE)
for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
  const start = batchIndex * BATCH_SIZE
  const end = start + BATCH_SIZE
  await writeFile(
    path.join(JSON_DIR, `${batchIndex}.json`),
    JSON.stringify(movies.slice(start, end)),
  )
}

await writeFile(
  path.join(JSON_DIR, 'catalog-meta.json'),
  JSON.stringify(
    {
      count: movies.length,
      batchCount,
      batchSize: BATCH_SIZE,
      generatedAt: new Date().toISOString(),
      source: 'tmdb-discover-movie',
      pages: page - 1,
      language,
    },
    null,
    2,
  ),
)

console.log(
  `Generated ${movies.length} movies across ${batchCount} batches in public/json`,
)
