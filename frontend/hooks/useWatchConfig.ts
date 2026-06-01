'use client'

import { useState, useCallback } from 'react'

export interface WatchConfig {
  scale: number
  positionOffset: { x: number; y: number; z: number }
  rotationOffset: { x: number; y: number; z: number }
  smoothing: number
}

export interface WatchPreset {
  name: string
  description: string
  config: WatchConfig
}

// Default presets for different watch types.
//
// rotationOffset semantics changed in Ticket 9A:
// The new quaternion coordinate frame (calculateWristQuaternion) already maps
// the model's local +Z to the palm normal (toward camera) and local +Y to the
// forearm direction. The old Euler-based frame had Y and Z swapped, so the old
// presets all carried rotationOffset.x = π/2 to compensate.
// In the new frame that compensation is no longer needed — x offset is 0.
export const WATCH_PRESETS: Record<string, WatchPreset> = {
  default: {
    name: 'Default',
    description: 'Standard watch placement',
    config: {
      scale: 2.5,
      positionOffset: { x: 0, y: 0, z: 0 },
      rotationOffset: { x: 0, y: 0, z: 0 },
      smoothing: 0.3,
    },
  },
  sports: {
    name: 'Sports Watch',
    description: 'Larger, positioned higher on wrist',
    config: {
      scale: 1.8,
      positionOffset: { x: 0, y: 0.05, z: 0 },
      rotationOffset: { x: 0, y: 0, z: 0 },
      smoothing: 0.3,
    },
  },
  luxury: {
    name: 'Luxury Watch',
    description: 'Elegant, slightly rotated',
    config: {
      scale: 1.4,
      positionOffset: { x: 0, y: -0.02, z: 0 },
      rotationOffset: { x: 0, y: Math.PI / 12, z: 0 },
      smoothing: 0.4,
    },
  },
  smart: {
    name: 'Smart Watch',
    description: 'Modern, centered placement',
    config: {
      scale: 1.6,
      positionOffset: { x: 0, y: 0, z: 0.01 },
      rotationOffset: { x: 0, y: 0, z: 0 },
      smoothing: 0.25,
    },
  },
}

export function useWatchConfig(initialPreset: string = 'default') {
  const [config, setConfig] = useState<WatchConfig>(
    WATCH_PRESETS[initialPreset]?.config || WATCH_PRESETS.default.config
  )

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
    []
  )

  const updateRotationOffset = useCallback(
    (axis: 'x' | 'y' | 'z', value: number) => {
      setConfig((prev) => ({
        ...prev,
        rotationOffset: { ...prev.rotationOffset, [axis]: value },
      }))
    },
    []
  )

  const updateSmoothing = useCallback((smoothing: number) => {
    setConfig((prev) => ({ ...prev, smoothing }))
  }, [])

  const loadPreset = useCallback((presetName: string) => {
    const preset = WATCH_PRESETS[presetName]
    if (preset) {
      setConfig(preset.config)
    }
  }, [])

  const resetToDefault = useCallback(() => {
    setConfig(WATCH_PRESETS.default.config)
  }, [])

  return {
    config,
    updateScale,
    updatePositionOffset,
    updateRotationOffset,
    updateSmoothing,
    loadPreset,
    resetToDefault,
    presets: WATCH_PRESETS,
  }
}
