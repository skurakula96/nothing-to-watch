import { buildLibraryCatalog } from './catalog'
import { initVoroforce } from '../vf'
import { store } from '../store'

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

export const setCatalogMode = async (libraryOnly: boolean) => {
  const state = store.getState()
  const {
    availabilityIndex,
    catalogMeta,
    fullCatalogMeta,
    libraryCatalogMeta,
    setCatalogMeta,
    setCatalogMode: setStoreCatalogMode,
    setFilmBatches,
    libraryFilmBatches,
    setLibraryFilmBatches,
    setLibraryCatalogMeta,
    userConfig,
    setUserConfig,
  } = state

  setUserConfig({
    ...userConfig,
    libraryOnly,
  })

  if (!libraryOnly) {
    setStoreCatalogMode('all')
    setCatalogMeta(fullCatalogMeta ?? catalogMeta)
    setFilmBatches(new Map())
    reinitializeVoroforce()
    return
  }

  const hasCachedLibraryBatches =
    libraryFilmBatches.size > 0 && libraryCatalogMeta
  if (!hasCachedLibraryBatches) {
    const { batches, meta } = await buildLibraryCatalog(
      fullCatalogMeta ?? catalogMeta,
      availabilityIndex,
    )
    setLibraryCatalogMeta(meta)
    setLibraryFilmBatches(new Map(batches))
    setFilmBatches(new Map(batches))
    setCatalogMeta(meta)
  } else {
    setCatalogMeta(libraryCatalogMeta)
    setFilmBatches(new Map(libraryFilmBatches))
  }

  setStoreCatalogMode('library')
  reinitializeVoroforce()
}
