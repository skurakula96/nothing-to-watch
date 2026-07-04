import { Filter, Loader2, Sparkles, X } from 'lucide-react'

import { applyGenreFilters } from '@/integrations/genre-filter'
import { useShallowState } from '@/store'
import { cn } from '../../utils/tw'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

const GENRE_OPTIONS = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Drama',
  'Family',
  'Fantasy',
  'History',
  'Horror',
  'Mystery',
  'Romance',
  'Rom-Com',
  'Science Fiction',
  'Thriller',
  'War',
  'Western',
] as const

export function GenreFilterMenu({
  className,
}: {
  className?: string
}) {
  const { selectedGenres, genreFilterLoading, libraryOnly, catalogMetaLoaded } =
    useShallowState((state) => ({
      selectedGenres: state.selectedGenres,
      genreFilterLoading: state.genreFilterLoading,
      libraryOnly: Boolean(state.userConfig.libraryOnly),
      catalogMetaLoaded: state.catalogMetaLoaded,
    }))

  const buttonLabel =
    selectedGenres.length > 0 ? `${selectedGenres.length}` : undefined

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          disabled={!catalogMetaLoaded || libraryOnly || genreFilterLoading}
          className={cn(
            '!size-6 lg:!size-8 pointer-events-auto rounded-full cursor-pointer border border-foreground/20 bg-background/70 backdrop-blur-lg',
            className,
          )}
          title={
            libraryOnly
              ? 'Genre filters are available in full catalog mode'
              : 'Filter by genre'
          }
        >
          {genreFilterLoading ? (
            <Loader2 className='size-4 animate-spin lg:size-5' />
          ) : selectedGenres.length > 0 ? (
            <Sparkles className='size-4 lg:size-5' />
          ) : (
            <Filter className='size-4 lg:size-5' />
          )}
          {buttonLabel && (
            <span className='absolute -top-1 -right-1 min-w-4 rounded-full bg-foreground px-1 text-[10px] font-semibold leading-4 text-background'>
              {buttonLabel}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='end'
        className='w-60 rounded-2xl border-foreground/15 bg-background/95 p-2 backdrop-blur-xl'
      >
        <DropdownMenuLabel className='flex items-center justify-between px-2 py-2'>
          <span>Genres</span>
          {selectedGenres.length > 0 ? (
            <button
              type='button'
              className='inline-flex items-center gap-1 rounded-full border border-foreground/15 px-2 py-1 text-xs font-medium text-foreground/75 transition hover:bg-accent'
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                void applyGenreFilters([])
              }}
            >
              <X className='size-3' />
              Clear
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className='mx-0 bg-foreground/10' />
        {GENRE_OPTIONS.map((genre) => (
          <DropdownMenuCheckboxItem
            key={genre}
            checked={selectedGenres.includes(genre)}
            className='rounded-xl px-8 py-2 text-sm'
            onSelect={(event) => {
              event.preventDefault()
            }}
            onCheckedChange={(checked) => {
              const nextGenres = checked
                ? [...selectedGenres, genre]
                : selectedGenres.filter((selectedGenre) => selectedGenre !== genre)

              void applyGenreFilters(nextGenres)
            }}
          >
            {genre}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
