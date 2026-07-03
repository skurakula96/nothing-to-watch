import type { StateCreator } from 'zustand'
import type { Film, FilmBatch, FilmData } from '../vf'
import type { MediaAvailabilityIndex } from '../integrations/media-availability'

export type CatalogMeta = {
  count: number
  batchCount: number
  batchSize: number
  generatedAt?: string
}

export interface FilmDataSlice {
  film?: Film
  setFilm: (film?: Film) => void
  filmBatches: Map<number, FilmData[]>
  catalogMeta?: CatalogMeta
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
  catalogMeta: undefined,
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
