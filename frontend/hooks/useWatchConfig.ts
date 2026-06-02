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
// rotationOffset semantics updated for the computeWristQuaternion coordinate frame
// (refactored from calculateWristQuaternion):
//
//   New frame local axes:
//     +X  index → pinky  (hand-width direction)
//     +Y  cross(Z, X)    (into palm / right-handed)
//     +Z  wrist → palm midpoint  (forearm / finger direction)
//
//   Old frame local axes:
//     +X  pinky → index  (opposite of new X)
//     +Y  wrist → midKnuckle  (= new Z)
//     +Z  cross(X_old, Y_old)  (= new Y)
//
// The two frames differ by the transformation M where:
//   new X = −old X,  new Y = old Z,  new Z = old Y
//
// Solving R_offset_new = M_transition × R_offset_old gives:
//   old { x:π,      y:0,    z:π/2 }  →  new { x:π/2,        y:0, z:π/2 }
//   old { x:π,      y:α,    z:π/2 }  →  new { x:π/2 + α,    y:0, z:π/2 }
// (old y-tilt around forearm = old local Y = new local Z → maps to new x)
export const WATCH_PRESETS: Record<string, WatchPreset> = {
  default: {
    name: 'Default',
    description: 'Standard watch placement',
    config: {
      scale: 2.5,
      positionOffset: { x: 0, y: 0, z: 0 },
      rotationOffset: { x: Math.PI / 2, y: 0, z: Math.PI / 2 },
      smoothing: 0.3,
    },
  },
  sports: {
    name: 'Sports Watch',
    description: 'Larger, positioned higher on wrist',
    config: {
      scale: 1.8,
      positionOffset: { x: 0, y: 0.05, z: 0 },
      rotationOffset: { x: Math.PI / 2, y: 0, z: Math.PI / 2 },
      smoothing: 0.3,
    },
  },
  luxury: {
    name: 'Luxury Watch',
    description: 'Elegant, slightly rotated',
    config: {
      scale: 1.4,
      positionOffset: { x: 0, y: -0.02, z: 0 },
      // Old y:π/12 forearm-tilt maps to x:π/2 + π/12 in the new frame.
      rotationOffset: { x: Math.PI / 2 + Math.PI / 12, y: 0, z: Math.PI / 2 },
      smoothing: 0.4,
    },
  },
  smart: {
    name: 'Smart Watch',
    description: 'Modern, centered placement',
    config: {
      scale: 1.6,
      positionOffset: { x: 0, y: 0, z: 0.01 },
      rotationOffset: { x: Math.PI / 2, y: 0, z: Math.PI / 2 },
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
