'use client'

import { useCallback, useMemo, useState } from 'react'
import type { WatchCalibration } from '@/lib/three/watchCalibration'
import {
  DEFAULT_WATCH_ID,
  getWatchByIdOrDefault,
  getWatchListItems,
  watchToCalibration,
} from '@/lib/watches/registry'
import { preloadWatchModel } from '@/lib/watches/modelCache'
import type { WatchDefinition } from '@/lib/watches/types'

export type WatchConfig = WatchCalibration

/**
 * Catalog-driven watch selection with optional runtime calibration overrides.
 * Replaces preset-only useWatchConfig for multi-watch try-on.
 */
export function useWatchSelection(initialWatchId: string = DEFAULT_WATCH_ID) {
  const [selectedWatchId, setSelectedWatchId] = useState(initialWatchId)
  const [config, setConfig] = useState<WatchConfig>(() =>
    watchToCalibration(getWatchByIdOrDefault(initialWatchId)),
  )

  const selectedWatch: WatchDefinition = useMemo(
    () => getWatchByIdOrDefault(selectedWatchId),
    [selectedWatchId],
  )

  const selectWatch = useCallback((watchId: string) => {
    const watch = getWatchByIdOrDefault(watchId)
    setSelectedWatchId(watch.id)
    setConfig(watchToCalibration(watch))
    preloadWatchModel(watch.modelUrl)
  }, [])

  const updateScale = useCallback((scale: number) => {
    setConfig((prev) => ({ ...prev, scale }))
  }, [])

  const updatePositionOffset = useCallback(
    (axis: 'x' | 'y' | 'z', value: number) => {
      setConfig((prev) => ({
        ...prev,
        positionOffset: { ...prev.positionOffset, [axis]: value },
      }))
    },
    [],
  )

  const updateRotationOffset = useCallback(
    (axis: 'x' | 'y' | 'z', value: number) => {
      setConfig((prev) => ({
        ...prev,
        rotationOffset: { ...prev.rotationOffset, [axis]: value },
      }))
    },
    [],
  )

  const updateOccluderOffset = useCallback(
    (axis: 'x' | 'y' | 'z', value: number) => {
      setConfig((prev) => ({
        ...prev,
        occluderOffset: { ...prev.occluderOffset, [axis]: value },
      }))
    },
    [],
  )

  const updateWristFitBias = useCallback((wristFitBias: number) => {
    setConfig((prev) => ({ ...prev, wristFitBias }))
  }, [])

  const updateSmoothing = useCallback((smoothing: number) => {
    setConfig((prev) => ({ ...prev, smoothing }))
  }, [])

  const resetToCatalog = useCallback(() => {
    setConfig(watchToCalibration(selectedWatch))
  }, [selectedWatch])

  const watches = useMemo(() => getWatchListItems(), [])

  return {
    selectedWatchId,
    selectedWatch,
    config,
    watches,
    selectWatch,
    updateScale,
    updatePositionOffset,
    updateRotationOffset,
    updateOccluderOffset,
    updateWristFitBias,
    updateSmoothing,
    resetToCatalog,
    // Legacy aliases for WatchControls
    resetToDefault: resetToCatalog,
    loadPreset: selectWatch,
    presets: Object.fromEntries(
      watches.map((w) => [w.id, { name: w.name, description: w.description }]),
    ),
  }
}
