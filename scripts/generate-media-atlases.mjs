import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const JSON_DIR = path.join(ROOT, 'public', 'json')
const MEDIA_DIR = path.join(ROOT, 'public', 'media')
const TMP_DIR = path.join(os.tmpdir(), 'nothing-to-watch-atlases')
const CRUNCH_PATH = path.join(
  ROOT,
  'node_modules',
  'texture-compressor',
  'bin',
  process.platform === 'win32' ? 'win32' : process.platform,
  process.platform === 'win32' ? 'crunch.exe' : 'crunch',
)

const envFromFile = async (filePath) => {
  try {
    const raw = await readFile(filePath, 'utf8')
    return raw.split(/\r?\n/).reduce((acc, line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return acc
      const eq = trimmed.indexOf('=')
      if (eq === -1) return acc
      acc[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
      return acc
    }, {})
  } catch {
    return {}
  }
}

const { spawn } = await import('node:child_process')

const run = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' })
    child.on('exit', (code) => {
      if (code === 0) resolve(undefined)
      else reject(new Error(`${command} exited with code ${code}`))
    })
    child.on('error', reject)
  })

const ensureDir = (dir) => mkdir(dir, { recursive: true })

const getBatchFiles = async () => {
  const files = await readdir(JSON_DIR)
  return files
    .filter((file) => /^\d+\.json$/.test(file))
    .sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10))
}

const loadCatalogFilms = async () => {
  const batchFiles = await getBatchFiles()
  const batches = await Promise.all(
    batchFiles.map(async (file) =>
      JSON.parse(await readFile(path.join(JSON_DIR, file), 'utf8')),
    ),
  )
  return batches.flat()
}

const env = {
  ...(await envFromFile(path.join(ROOT, '.env.local'))),
  ...process.env,
}

const posterBaseUrl =
  env.TMDB_POSTER_DOWNLOAD_BASE_URL ??
  'https://image.tmdb.org/t/p/w300_and_h450_bestv2'
const singleQuality = Number.parseInt(env.MEDIA_SINGLE_JPEG_QUALITY ?? '78', 10)
const atlasQuality = Number.parseInt(env.MEDIA_ATLAS_JPEG_QUALITY ?? '82', 10)
const helperThreads = Number.parseInt(env.MEDIA_CRUNCH_THREADS ?? '8', 10)
const posterConcurrency = Number.parseInt(env.MEDIA_POSTER_CONCURRENCY ?? '10', 10)

const versions = [
  {
    name: 'high',
    cols: 18,
    rows: 12,
    tileWidth: 110,
    tileHeight: 165,
    width: 1980,
    height: 1980,
  },
]

const singleVersion = {
  name: 'single',
  width: 220,
  height: 330,
}

const cleanGeneratedFiles = async () => {
  const dirs = [
    path.join(MEDIA_DIR, 'single'),
    ...versions.flatMap((version) => [
      path.join(MEDIA_DIR, version.name, 'dds'),
      path.join(MEDIA_DIR, version.name, 'jpg'),
    ]),
  ]

  for (const dir of dirs) {
    await ensureDir(dir)
    const files = await readdir(dir)
    await Promise.all(
      files
        .filter((file) => file !== '.gitignore')
        .map((file) => rm(path.join(dir, file), { force: true })),
    )
  }

  await ensureDir(TMP_DIR)
  const tmpFiles = await readdir(TMP_DIR).catch(() => [])
  await Promise.all(
    tmpFiles.map((file) => rm(path.join(TMP_DIR, file), { force: true, recursive: true })),
  )
}

const fetchPosterBuffer = async (posterPath) => {
  const response = await fetch(`${posterBaseUrl}${posterPath}`)
  if (!response.ok) {
    throw new Error(`Poster download failed (${response.status}) for ${posterPath}`)
  }
  return Buffer.from(await response.arrayBuffer())
}

const createJpegTile = async (posterBuffer, width, height, quality) =>
  sharp(posterBuffer)
    .resize(width, height, {
      fit: 'cover',
      position: 'centre',
    })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer()

const writeSinglePoster = async (index, posterBuffer) => {
  const outputPath = path.join(MEDIA_DIR, 'single', `${index}.jpg`)
  await sharp(posterBuffer)
    .resize(singleVersion.width, singleVersion.height, {
      fit: 'cover',
      position: 'centre',
    })
    .jpeg({ quality: singleQuality, mozjpeg: true })
    .toFile(outputPath)
}

const buildAtlasJobs = (films) =>
  versions.map((version) => {
    const layerCapacity = version.cols * version.rows
    const layerCount = Math.ceil(films.length / layerCapacity)

    return {
      ...version,
      layerCapacity,
      layerCount,
      overlays: Array.from({ length: layerCount }, () => []),
    }
  })

const processWithConcurrency = async (items, concurrency, worker) => {
  let nextIndex = 0
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++
      await worker(items[currentIndex], currentIndex)
    }
  })
  await Promise.all(runners)
}

const crunchToDds = async (inputPath, outputPath) => {
  await run(CRUNCH_PATH, [
    '-file',
    inputPath,
    '-out',
    outputPath,
    '-fileformat',
    'dds',
    '-DXT1',
    '-quality',
    '255',
    '-helperThreads',
    `${helperThreads}`,
    '-noprogress',
  ])
}

const saveAtlasLayer = async (version, layerIndex, overlays) => {
  const jpgPath = path.join(MEDIA_DIR, version.name, 'jpg', `${layerIndex}.jpg`)
  const ddsPath = path.join(MEDIA_DIR, version.name, 'dds', `${layerIndex}.dds`)
  const tmpPngPath = path.join(TMP_DIR, `${version.name}-${layerIndex}.png`)

  await sharp({
    create: {
      width: version.width,
      height: version.height,
      channels: 3,
      background: '#000000',
    },
  })
    .composite(overlays)
    .jpeg({ quality: atlasQuality, mozjpeg: true })
    .toFile(jpgPath)

  await sharp(jpgPath).png().toFile(tmpPngPath)
  await crunchToDds(tmpPngPath, ddsPath)
}

const films = await loadCatalogFilms()

if (films.length === 0) {
  throw new Error('No poster paths found in local catalog JSON')
}

await cleanGeneratedFiles()

const atlasJobs = buildAtlasJobs(films)

const placeholderBuffer = await sharp({
  create: {
    width: singleVersion.width,
    height: singleVersion.height,
    channels: 3,
    background: '#111111',
  },
})
  .jpeg({ quality: singleQuality, mozjpeg: true })
  .toBuffer()

let preparedCount = 0
await processWithConcurrency(films, posterConcurrency, async (film, index) => {
  const posterBuffer = film.poster_path
    ? await fetchPosterBuffer(String(film.poster_path)).catch(() => placeholderBuffer)
    : placeholderBuffer

  await writeSinglePoster(index, posterBuffer)

  const tiles = await Promise.all(
    atlasJobs.map((version) =>
      createJpegTile(
        posterBuffer,
        version.tileWidth,
        version.tileHeight,
        atlasQuality,
      ),
    ),
  )

  atlasJobs.forEach((version, versionIndex) => {
    const layerIndex = Math.floor(index / version.layerCapacity)
    const indexInLayer = index % version.layerCapacity
    const col = indexInLayer % version.cols
    const row = Math.floor(indexInLayer / version.cols)

    version.overlays[layerIndex].push({
      input: tiles[versionIndex],
      left: col * version.tileWidth,
      top: row * version.tileHeight,
    })
  })

  preparedCount++
  if (preparedCount % 100 === 0 || preparedCount === films.length) {
    console.log(`Prepared ${preparedCount}/${films.length} posters`)
  }
})

for (const version of atlasJobs) {
  for (let layerIndex = 0; layerIndex < version.layerCount; layerIndex++) {
    await saveAtlasLayer(version, layerIndex, version.overlays[layerIndex])
    console.log(
      `Wrote ${version.name} atlas ${layerIndex + 1}/${version.layerCount}`,
    )
  }
}

await writeFile(
  path.join(MEDIA_DIR, 'atlas-meta.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      count: films.length,
      mediaVersions: atlasJobs.map(({ overlays, ...version }) => ({
        ...version,
      })),
      single: singleVersion,
    },
    null,
    2,
  ),
)

console.log(`Generated media atlases for ${films.length} posters`)
