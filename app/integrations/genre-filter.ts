import { loadAllCatalogBatches } from './catalog'
import { store } from '../store'
import { initVoroforce } from '../vf'

const ROM_COM_LABEL = 'Rom-Com'

const reinitializeVoroforce = () => {
  const { voroforce, setFilm, setVoroforce, setConfig, setVoroforceMediaPreloaded } =
    store.getState()

  setFilm(undefined)
  setVoroforceMediaPreloaded(false)
  if (voroforce) {
    voroforce.dispose()
    setVoroforce(undefined)
    setConfig(undefined)
  }
  initVoroforce({ force: true })
}

const matchesGenreFilter = (filmGenres: string[], selectedGenres: string[]) => {
  if (selectedGenres.length === 0) return true

  return selectedGenres.some((genre) => {
    if (genre === ROM_COM_LABEL) {
      return filmGenres.includes('Romance') && filmGenres.includes('Comedy')
    }

    return filmGenres.includes(genre)
  })
}

export const applyGenreFilters = async (selectedGenres: string[]) => {
  const {
    fullCatalogMeta,
    allCatalogBatches,
    setAllCatalogBatches,
    setGenreFilterLoading,
    setGenreFilteredCatalogIds,
    setSelectedGenres,
    userConfig,
    setUserConfig,
  } = store.getState()

  setSelectedGenres(selectedGenres)
  setUserConfig({
    ...userConfig,
    selectedGenres,
  })

  if (selectedGenres.length === 0) {
    setGenreFilteredCatalogIds([])
    reinitializeVoroforce()
    return
  }

  if (!fullCatalogMeta) return

  setGenreFilterLoading(true)
  try {
    const batches =
      allCatalogBatches.size > 0
        ? allCatalogBatches
        : await loadAllCatalogBatches(fullCatalogMeta)

    if (allCatalogBatches.size === 0) {
      setAllCatalogBatches(new Map(batches))
    }

    const matchingIds: number[] = []
    for (const [batchIndex, batch] of batches.entries()) {
      batch.forEach((film, batchOffset) => {
        const genres = film.genres
          ? String(film.genres)
              .split(',')
              .map((genre) => genre.trim())
              .filter(Boolean)
          : []

        if (matchesGenreFilter(genres, selectedGenres)) {
          matchingIds.push(batchIndex * fullCatalogMeta.batchSize + batchOffset)
        }
      })
    }

    setGenreFilteredCatalogIds(matchingIds)
    reinitializeVoroforce()
  } finally {
    setGenreFilterLoading(false)
  }
}
