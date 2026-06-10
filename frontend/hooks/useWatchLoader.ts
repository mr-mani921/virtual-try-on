'use client'

import { useState, useEffect, useCallback } from 'react'
import { useGLTF } from '@react-three/drei'
import type { WatchConfiguration } from '@/lib/watches/types'
import { getWatchById } from '@/lib/watches/registry'

interface UseWatchLoaderOptions {
  preload?: boolean
  onLoadStart?: (watchId: string) => void
  onLoadComplete?: (watchId: string) => void
  onError?: (watchId: string, error: Error) => void
}

interface UseWatchLoaderReturn {
  currentWatch: WatchConfiguration | null
  isLoading: boolean
  error: Error | null
  loadWatch: (watchId: string) => Promise<void>
  preloadWatch: (watchId: string) => void
  clearError: () => void
}

/**
 * Dynamic Watch Loader Hook
 * 
 * Handles lazy loading of watch models with error handling and loading states.
 * Supports preloading for better UX.
 * 
 * @example
 * ```tsx
 * const { currentWatch, isLoading, error, loadWatch } = useWatchLoader()
 * 
 * // Load a watch
 * await loadWatch('sport-watch-01')
 * 
 * // Use in component
 * {currentWatch && <WatchModel {...currentWatch} />}
 * ```
 */
export function useWatchLoader(
  initialWatchId: string = 'default-watch',
  options: UseWatchLoaderOptions = {}
): UseWatchLoaderReturn {
  const { preload = false, onLoadStart, onLoadComplete, onError } = options

  const [currentWatch, setCurrentWatch] = useState<WatchConfiguration | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  /**
   * Preload a watch model using useGLTF.preload
   */
  const preloadWatch = useCallback((watchId: string) => {
    const watchConfig = getWatchById(watchId)
    if (watchConfig) {
      try {
        useGLTF.preload(watchConfig.modelUrl)
      } catch (err) {
        console.warn(`Failed to preload watch ${watchId}:`, err)
      }
    }
  }, [])

  /**
   * Load a watch by ID
   */
  const loadWatch = useCallback(
    async (watchId: string): Promise<void> => {
      setIsLoading(true)
      setError(null)
      onLoadStart?.(watchId)

      try {
        // Get watch configuration
        const watchConfig = getWatchById(watchId)

        if (!watchConfig) {
          throw new Error(`Watch not found: ${watchId}`)
        }

        // Preload the model if not already loaded
        if (preload) {
          useGLTF.preload(watchConfig.modelUrl)
        }

        // Simulate async loading for better UX (allows loading UI to show)
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Set the current watch
        setCurrentWatch(watchConfig)
        onLoadComplete?.(watchId)
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to load watch')
        setError(error)
        onError?.(watchId, error)
        console.error(`Failed to load watch ${watchId}:`, error)
      } finally {
        setIsLoading(false)
      }
    },
    [preload, onLoadStart, onLoadComplete, onError]
  )

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Load initial watch on mount
   */
  useEffect(() => {
    if (initialWatchId) {
      loadWatch(initialWatchId)
    }
  }, []) // Only run on mount

  return {
    currentWatch,
    isLoading,
    error,
    loadWatch,
    preloadWatch,
    clearError,
  }
}

/**
 * Preload multiple watches
 */
export function preloadWatches(watchIds: string[]): void {
  watchIds.forEach((id) => {
    const watchConfig = getWatchById(id)
    if (watchConfig) {
      useGLTF.preload(watchConfig.modelUrl)
    }
  })
}
