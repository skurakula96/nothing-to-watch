import { useEffect } from 'react'
import { loadCatalogMeta } from '../../integrations/catalog-meta'
import { loadMediaAvailabilityIndex } from '../../integrations/media-availability'
import { store } from '../../store'

export const CatalogBootstrap = () => {
  useEffect(() => {
    let active = true

    const load = async () => {
      const {
        setFullCatalogMeta,
        setCatalogMeta,
        setCatalogMetaError,
        setCatalogMetaLoaded,
        setAvailabilityError,
        setAvailabilityIndex,
        setAvailabilityLoaded,
      } = store.getState()

      try {
        setCatalogMetaError(undefined)
        setAvailabilityError(undefined)
        const [catalogMeta, availabilityIndex] = await Promise.all([
          loadCatalogMeta(),
          loadMediaAvailabilityIndex(),
        ])
        if (!active) return
        setFullCatalogMeta(catalogMeta)
        setCatalogMeta(catalogMeta)
        setAvailabilityIndex(availabilityIndex)
      } catch (error) {
        if (!active) return
        setCatalogMetaError(
          error instanceof Error ? error.message : 'Failed to load catalog meta',
        )
        setAvailabilityError(
          error instanceof Error ? error.message : 'Failed to load availability index',
        )
      } finally {
        if (active) {
          setCatalogMetaLoaded(true)
          setAvailabilityLoaded(true)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  return null
}
