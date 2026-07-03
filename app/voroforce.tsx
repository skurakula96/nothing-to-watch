import { useEffect, useState } from 'react'
import { store, useShallowState } from './store'
import { initVoroforce } from './vf'

export function Voroforce() {
  const [error, setError] = useState<Error | null>(null)
  const { catalogMetaLoaded } = useShallowState((state) => ({
    catalogMetaLoaded: state.catalogMetaLoaded,
  }))

  useEffect(() => {
    if (!catalogMetaLoaded) return

    const tryInit = () => {
      try {
        initVoroforce()
      } catch (e) {
        setError(e as Error)
      }
    }

    void tryInit()
    const unsub = store.subscribe(
      (s) => s.preset,
      () => {
        setTimeout(() => {
          void tryInit()
        }, 700)
      },
    )
    return () => {
      unsub()
    }
  }, [catalogMetaLoaded])

  if (error) {
    throw error
  }

  return null
}
