'use client'

import { useEffect, useState } from 'react'
import { loadWatchModel, preloadWatchModel } from '@/lib/watches/modelCache'
import type { WatchLoaderState } from '@/lib/watches/types'

/**
 * Lazy-load a watch GLB by URL with loading / error state.
 * Shares cache with WatchModel via lib/watches/modelCache.
 */
export function useWatchLoader(modelUrl: string | null): WatchLoaderState {
  const [state, setState] = useState<WatchLoaderState>({
    status: 'idle',
    modelUrl: null,
    error: null,
    progress: 0,
  })

  useEffect(() => {
    if (!modelUrl) {
      setState({ status: 'idle', modelUrl: null, error: null, progress: 0 })
      return
    }

    let cancelled = false

    setState({ status: 'loading', modelUrl, error: null, progress: 0 })

    loadWatchModel(modelUrl, (progress) => {
      if (!cancelled) {
        setState((prev) =>
          prev.modelUrl === modelUrl ? { ...prev, progress } : prev,
        )
      }
    })
      .then(() => {
        if (!cancelled) {
          setState({ status: 'loaded', modelUrl, error: null, progress: 1 })
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            modelUrl,
            error: err instanceof Error ? err.message : 'Failed to load watch model',
            progress: 0,
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [modelUrl])

  return state
}

/** Preload models for nearby catalog entries (e.g. on selection change). */
export function preloadWatchModels(urls: string[]): void {
  for (const url of urls) {
    preloadWatchModel(url)
  }
}
