'use client'

import { useState, useCallback } from 'react'
import type { WatchCalibration } from '@/lib/three/watchCalibration'

// Re-export the canonical calibration type under the name consumers already use.
export type { WatchCalibration }
export type WatchConfig = WatchCalibration

export interface WatchPreset {
  name: string
  description: string
  config: WatchConfig
}

// ─── Wrist-frame axis reference ────────────────────────────────────────────────
//   +X  index MCP → pinky MCP  (lateral / hand-width)
//   +Y  cross(Z, X)             (into palm — depth into wrist)
//   +Z  wrist → palm midpoint   (forearm direction)
//
// positionOffset and occluderOffset are all in this LOCAL WRIST FRAME.
//
// wristFitBias is additive to positionOffset.y:
//   positive → watch sits deeper into wrist (thick / large-cased models)
//   negative → watch sits more on the surface (slim / dress-watch models)
//
// rotationOffset is Euler XYZ, applied as: wristQuat × fromEuler(rotationOffset)
// Derivation (M_transition from old frame):
//   old { x:π,  y:0,   z:π/2 }  →  new { x:π/2,       y:0, z:π/2 }
//   old { x:π,  y:α,   z:π/2 }  →  new { x:π/2 + α,   y:0, z:π/2 }

export const WATCH_PRESETS: Record<string, WatchPreset> = {
  default: {
    name: 'Default',
    description: 'Standard watch placement',
    config: {
      scale: 2.5,
      positionOffset: { x: 0, y: 0.02, z: -0.05 },
      rotationOffset: { x: Math.PI / 2, y: 0, z: Math.PI / 2 },
      occluderOffset: { x: 0, y: 0, z: 0 },
      wristFitBias:   0,
      smoothing: 0.3,
    },
  },
  sports: {
    name: 'Sports Watch',
    description: 'Larger, positioned higher on wrist',
    config: {
      scale: 1.8,
      positionOffset: { x: 0, y: 0.02, z: 0.03 },
      rotationOffset: { x: Math.PI / 2, y: 0, z: Math.PI / 2 },
      // Bulkier case — sink a little deeper into wrist.
      occluderOffset: { x: 0, y: 0.01, z: 0 },
      wristFitBias:   0.01,
      smoothing: 0.3,
    },
  },
  luxury: {
    name: 'Luxury Watch',
    description: 'Elegant, slightly rotated',
    config: {
      scale: 1.4,
      positionOffset: { x: 0, y: 0.02, z: -0.06 },
      rotationOffset: { x: Math.PI / 2 + Math.PI / 12, y: 0, z: Math.PI / 2 },
      occluderOffset: { x: 0, y: 0, z: 0 },
      wristFitBias:   -0.005,
      smoothing: 0.4,
    },
  },
  smart: {
    name: 'Smart Watch',
    description: 'Modern, centered placement',
    config: {
      scale: 1.6,
      positionOffset: { x: 0, y: 0.02, z: -0.04 },
      rotationOffset: { x: Math.PI / 2, y: 0, z: Math.PI / 2 },
      occluderOffset: { x: 0, y: 0, z: 0 },
      wristFitBias:   0,
      smoothing: 0.25,
    },
  },
}

export function useWatchConfig(initialPreset: string = 'default') {
  const [config, setConfig] = useState<WatchConfig>(
    WATCH_PRESETS[initialPreset]?.config ?? WATCH_PRESETS.default.config
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

  const updateOccluderOffset = useCallback(
    (axis: 'x' | 'y' | 'z', value: number) => {
      setConfig((prev) => ({
        ...prev,
        occluderOffset: { ...prev.occluderOffset, [axis]: value },
      }))
    },
    []
  )

  const updateWristFitBias = useCallback((wristFitBias: number) => {
    setConfig((prev) => ({ ...prev, wristFitBias }))
  }, [])

  const updateSmoothing = useCallback((smoothing: number) => {
    setConfig((prev) => ({ ...prev, smoothing }))
  }, [])

  const loadPreset = useCallback((presetName: string) => {
    const preset = WATCH_PRESETS[presetName]
    if (preset) setConfig(preset.config)
  }, [])

  const resetToDefault = useCallback(() => {
    setConfig(WATCH_PRESETS.default.config)
  }, [])

  return {
    config,
    updateScale,
    updatePositionOffset,
    updateRotationOffset,
    updateOccluderOffset,
    updateWristFitBias,
    updateSmoothing,
    loadPreset,
    resetToDefault,
    presets: WATCH_PRESETS,
  }
}
