import type { StateCreator } from 'zustand'
import type { Film, FilmBatch, FilmData } from '../vf'
import type { MediaAvailabilityIndex } from '../integrations/media-availability'

export type CatalogMeta = {
  count: number
  batchCount: number
  batchSize: number
  generatedAt?: string
  mediaVersions?: Array<{
    name: string
    cols: number
    rows: number
    tileWidth: number
    tileHeight: number
    width: number
    height: number
    layerCapacity: number
    layerCount: number
  }>
}

export type CatalogMode = 'all' | 'library'

export interface FilmDataSlice {
  film?: Film
  setFilm: (film?: Film) => void
  filmBatches: Map<number, FilmData[]>
  setFilmBatches: (filmBatches: Map<number, FilmData[]>) => void
  libraryFilmBatches: Map<number, FilmData[]>
  setLibraryFilmBatches: (filmBatches: Map<number, FilmData[]>) => void
  fullCatalogMeta?: CatalogMeta
  setFullCatalogMeta: (catalogMeta?: CatalogMeta) => void
  catalogMeta?: CatalogMeta
  libraryCatalogMeta?: CatalogMeta
  setLibraryCatalogMeta: (catalogMeta?: CatalogMeta) => void
  catalogMode: CatalogMode
  setCatalogMode: (catalogMode: CatalogMode) => void
  catalogMetaLoaded: boolean
  catalogMetaError?: string
  setCatalogMeta: (catalogMeta?: CatalogMeta) => void
  setCatalogMetaLoaded: (loaded: boolean) => void
  setCatalogMetaError: (error?: string) => void
  availabilityIndex: MediaAvailabilityIndex
  availabilityLoaded: boolean
  availabilityError?: string
  setAvailabilityIndex: (availabilityIndex: MediaAvailabilityIndex) => void
  setAvailabilityLoaded: (loaded: boolean) => void
  setAvailabilityError: (error?: string) => void
}

export const createFilmDataSlice: StateCreator<
  FilmDataSlice,
  [],
  [],
  FilmDataSlice
> = (set) => ({
  setFilm: (film?: Film) => set({ film }),
  filmBatches: new Map<number, FilmBatch>(),
  setFilmBatches: (filmBatches: Map<number, FilmBatch>) => set({ filmBatches }),
  libraryFilmBatches: new Map<number, FilmBatch>(),
  setLibraryFilmBatches: (libraryFilmBatches: Map<number, FilmBatch>) =>
    set({ libraryFilmBatches }),
  fullCatalogMeta: undefined,
  setFullCatalogMeta: (fullCatalogMeta?: CatalogMeta) => set({ fullCatalogMeta }),
  catalogMeta: undefined,
  libraryCatalogMeta: undefined,
  setLibraryCatalogMeta: (libraryCatalogMeta?: CatalogMeta) =>
    set({ libraryCatalogMeta }),
  catalogMode: 'all',
  setCatalogMode: (catalogMode: CatalogMode) => set({ catalogMode }),
  catalogMetaLoaded: false,
  catalogMetaError: undefined,
  setCatalogMeta: (catalogMeta?: CatalogMeta) => set({ catalogMeta }),
  setCatalogMetaLoaded: (catalogMetaLoaded: boolean) => set({ catalogMetaLoaded }),
  setCatalogMetaError: (catalogMetaError?: string) => set({ catalogMetaError }),
  availabilityIndex: {},
  availabilityLoaded: false,
  availabilityError: undefined,
  setAvailabilityIndex: (availabilityIndex: MediaAvailabilityIndex) =>
    set({ availabilityIndex }),
  setAvailabilityLoaded: (availabilityLoaded: boolean) =>
    set({ availabilityLoaded }),
  setAvailabilityError: (availabilityError?: string) => set({ availabilityError }),
})
