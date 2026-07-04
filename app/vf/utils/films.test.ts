import { describe, expect, it } from 'vitest'
import { getCellFilm, type FilmBatches } from './films'

describe('getCellFilm', () => {
  it('resolves film batches from cell id when subgrid metadata is stale', async () => {
    const filmBatches: FilmBatches = new Map([
      [
        1,
        [
          {
            id: 278,
            title: 'The Shawshank Redemption',
            release_year: '1994',
            vote_average: '8.7',
            popularity: '10',
            poster_path: '/poster.jpg',
            backdrop_path: '/backdrop.jpg',
          },
        ],
      ],
    ])

    const film = await getCellFilm(
      {
        id: 216,
        subgrid: 0,
        subgridIndex: 0,
      } as unknown as Parameters<typeof getCellFilm>[0],
      filmBatches,
    )

    expect(film?.title).toBe('The Shawshank Redemption')
    expect(film?.year).toBe(1994)
  })
})
