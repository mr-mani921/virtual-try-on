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
// ── Coordinate frame (computeWristQuaternion) ─────────────────────────────────
//   +X  index MCP → pinky MCP  (hand-width / lateral direction)
//   +Y  cross(Z, X)             (into palm — the depth-into-wrist axis)
//   +Z  wrist → palm midpoint   (forearm / along-arm direction)
//
// ── positionOffset semantics (LOCAL WRIST FRAME) ──────────────────────────────
//   These are expressed in the wrist local frame and rotated to world space by
//   handOrientation in WatchModel.useFrame — so offsets stay anchored to the
//   wrist surface regardless of hand angle.
//
//   x:  lateral shift along wrist width (positive = toward pinky)
//   y:  depth into wrist (positive = toward palm = "sunk into wrist surface")
//       This is the primary "wrap-around" dimension.  Increase to reduce hover.
//   z:  shift along forearm (positive = toward fingers, negative = toward elbow)
//
// ── rotationOffset Euler (XYZ, applied as wristQuat × offsetQuat) ─────────────
//   Derivation (M_transition × R_offset_old):
//   old { x:π,    y:0,     z:π/2 }  →  new { x:π/2,       y:0, z:π/2 }
//   old { x:π,    y:α,     z:π/2 }  →  new { x:π/2 + α,   y:0, z:π/2 }
export const WATCH_PRESETS: Record<string, WatchPreset> = {
  default: {
    name: 'Default',
    description: 'Standard watch placement',
    config: {
      scale: 2.5,
      // y: small push into wrist surface so it feels "on" not "hovering".
      // z: negative offset positions watch lower (toward elbow) for realistic placement.
      positionOffset: { x: 0, y: 0.02, z: -0.05 },
      // x: π/2 + π/9 tilts watch face forward ~20° to face camera more directly
      rotationOffset: { x: Math.PI / 2 + Math.PI / 9, y: 0, z: Math.PI / 2 },
      smoothing: 0.3,
    },
  },
  sports: {
    name: 'Sports Watch',
    description: 'Larger, positioned higher on wrist',
    config: {
      scale: 1.8,
      // z: shift toward fingers (higher on wrist in local frame).
      // y: standard into-wrist depth.
      positionOffset: { x: 0, y: 0.02, z: 0.03 },
      // x: π/2 + π/9 tilts watch face forward ~20° to face camera more directly
      rotationOffset: { x: Math.PI / 2 + Math.PI / 9, y: 0, z: Math.PI / 2 },
      smoothing: 0.3,
    },
  },
  luxury: {
    name: 'Luxury Watch',
    description: 'Elegant, slightly rotated',
    config: {
      scale: 1.4,
      // z: shift toward elbow for elegant lower placement.
      positionOffset: { x: 0, y: 0.02, z: -0.06 },
      // π/12 + π/9 combines original tilt with forward tilt to face camera
      rotationOffset: { x: Math.PI / 2 + Math.PI / 12 + Math.PI / 9, y: 0, z: Math.PI / 2 },
      smoothing: 0.4,
    },
  },
  smart: {
    name: 'Smart Watch',
    description: 'Modern, centered placement',
    config: {
      scale: 1.6,
      positionOffset: { x: 0, y: 0.02, z: -0.04 },
      // x: π/2 + π/9 tilts watch face forward ~20° to face camera more directly
      rotationOffset: { x: Math.PI / 2 + Math.PI / 9, y: 0, z: Math.PI / 2 },
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
