import { describe, expect, it } from 'vitest'
import {
  getMediaAvailabilityForFilm,
  isFilmInLibrary,
  normalizeMediaAvailabilityIndex,
} from './media-availability'

describe('media availability', () => {
  it('normalizes array and nested payload shapes', () => {
    const direct = normalizeMediaAvailabilityIndex([
      { tmdbId: '10', inLibrary: true },
    ])
    const nested = normalizeMediaAvailabilityIndex({
      items: [{ id: '20', inLibrary: false, requested: true }],
    })

    expect(direct[10]).toMatchObject({ tmdbId: 10, inLibrary: true })
    expect(nested[20]).toMatchObject({
      tmdbId: 20,
      inLibrary: false,
      requested: true,
    })
  })

  it('looks up library membership by tmdb id', () => {
    const availabilityIndex = normalizeMediaAvailabilityIndex([
      { tmdbId: 30, inLibrary: true },
      { tmdbId: 40, inLibrary: false },
    ])

    expect(
      getMediaAvailabilityForFilm({ tmdbId: 30 } as { tmdbId: number }, availabilityIndex),
    ).toMatchObject({ tmdbId: 30, inLibrary: true })
    expect(
      isFilmInLibrary({ tmdbId: 30 } as { tmdbId: number }, availabilityIndex),
    ).toBe(true)
    expect(
      isFilmInLibrary({ tmdbId: 40 } as { tmdbId: number }, availabilityIndex),
    ).toBe(false)
  })
})
