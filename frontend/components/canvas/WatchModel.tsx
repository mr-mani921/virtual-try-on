'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { WorldCoordinates } from '@/lib/three/coordinateMapping'
import { lerpWorldCoordinates } from '@/lib/three/coordinateMapping'
import { MotionStabilizer, QuaternionSmoother } from '@/lib/three/motionSmoothing'
import {
  computeTargetPosition,
  computeTargetRotation,
  wristTransformFromCoords,
} from '@/lib/three/watchCalibration'
import type { WatchConfiguration } from '@/lib/watches/types'

interface WatchModelProps {
  wristPosition: WorldCoordinates | null
  handOrientation?: THREE.Quaternion | null
  handedness?: 'Left' | 'Right'
  smoothing?: number
  /**
   * TICKET 41d: Separate rotation smoothing factor (slerp alpha)
   * Independent from position smoothing to prevent rotation compression
   * Range: 0.3 (heavy smoothing) to 0.85 (light smoothing)
   * Default: 0.6 (preserves full rotation range while reducing jitter)
   */
  rotationSmoothing?: number
  scale?: number
  dynamicScale?: number
  useDynamicScaling?: boolean
  positionOffset?: { x: number; y: number; z: number }
  rotationOffset?: { x: number; y: number; z: number }
  /**
   * Per-watch wrist-fit bias (additive on positionOffset.y).
   * Positive = sits deeper into wrist (bulky models).
   * Negative = sits more on the surface (slim models).
   */
  wristFitBias?: number
  /**
   * Direct palm normal from computePalmNormal().
   * When provided, the Y position offset is applied along this vector instead
   * of the quaternion-derived Y axis — more stable surface anchor.
   * Points toward the palmar side; negate for dorsal (watch) direction.
   */
  palmNormal?: THREE.Vector3 | null
  showDebugAxis?: boolean
  modelPath?: string
  /**
   * NEW: Watch configuration object from registry
   * When provided, uses config values as base, allowing prop overrides
   */
  watchConfig?: WatchConfiguration
  /**
   * EXPERIMENT: Enable/disable adaptive lerp smoothing layer
   * true = One Euro Filter + Adaptive Lerp (current behavior)
   * false = One Euro Filter only
   * Default: true
   */
  useAdaptiveLerp?: boolean
  /**
   * EXPERIMENT: Callback for debug metrics (position variance, velocity, alpha)
   * Called every frame with smoothing metrics
   */
  onDebugMetrics?: (metrics: any) => void
  /**
   * VALIDATION: Callback for rotation debug data (quaternions, Euler angles)
   * Called every frame with raw and smoothed rotation values
   */
  onRotationDebug?: (data: {
    rawQuaternion: { x: number; y: number; z: number; w: number }
    smoothedQuaternion: { x: number; y: number; z: number; w: number }
    rawEuler: { x: number; y: number; z: number }
    smoothedEuler: { x: number; y: number; z: number }
    bypassMode: boolean
    ranges: {
      raw: {
        x: { min: number; max: number; range: number }
        y: { min: number; max: number; range: number }
        z: { min: number; max: number; range: number }
      }
      smoothed: {
        x: { min: number; max: number; range: number }
        y: { min: number; max: number; range: number }
        z: { min: number; max: number; range: number }
      }
      sampleCount: number
    }
  }) => void
  /**
   * VALIDATION: Bypass all quaternion smoothing and apply raw target rotation
   * Used to isolate whether smoothing is causing rotation regression
   * true = apply raw quaternion (no smoothing)
   * false = use QuaternionSmoother (current behavior)
   * Default: false
   */
  bypassQuaternionSmoothing?: boolean
  /**
   * VALIDATION: Callback to expose rotation range reset function
   */
  onRotationRangesResetCallback?: (resetFn: () => void) => void
}

export function WatchModel({
  wristPosition,
  handOrientation,
  handedness = 'Right',
  smoothing,
  rotationSmoothing,
  scale,
  dynamicScale = 1,
  useDynamicScaling = false,
  positionOffset,
  rotationOffset,
  wristFitBias = 0,
  palmNormal = null,
  showDebugAxis = false,
  modelPath,
  watchConfig,
  useAdaptiveLerp = true,
  onDebugMetrics,
  bypassQuaternionSmoothing = false,
  onRotationDebug,
  onRotationRangesResetCallback,
}: WatchModelProps) {
  // Use watchConfig values as base, allow prop overrides for backward compatibility
  const effectiveScale = scale ?? watchConfig?.scale ?? 1
  const effectiveSmoothingValue = smoothing ?? watchConfig?.smoothing ?? 0.3
  // TICKET 41d: Separate rotation smoothing (default 0.6 to prevent compression)
  const effectiveRotationSmoothing = rotationSmoothing ?? watchConfig?.rotationSmoothing ?? 0.6
  const effectivePositionOffset = positionOffset ?? watchConfig?.positionOffset ?? { x: 0, y: 0, z: 0 }
  const effectiveRotationOffset = rotationOffset ?? watchConfig?.rotationOffset ?? { x: 0, y: 0, z: 0 }
  const effectiveModelPath = modelPath ?? watchConfig?.modelUrl ?? '/models/watch.glb'
  const groupRef = useRef<THREE.Group>(null)
  const modelRef = useRef<THREE.Group>(null)
  const [modelLoaded, setModelLoaded] = useState(false)

  // Per-frame state lives in refs — never in React state — to avoid 60fps re-renders.
  const currentPosRef = useRef<WorldCoordinates | null>(null)
  const previousTargetPosRef = useRef<WorldCoordinates | null>(null)
  const previousFinalPosRef = useRef<WorldCoordinates | null>(null)

  // ── Calibration helpers (pre-allocated, zero GC in the render loop) ─────────
  // wristTransformVec mirrors wristPosition as a THREE.Vector3 so it can be
  // passed to the pure calibration helpers without allocating each frame.
  const wristTransformVec = useRef(new THREE.Vector3())

  // Position pipeline
  const localOffsetVec = useRef(new THREE.Vector3())   // temp for local→world rotation
  const targetPosVec   = useRef(new THREE.Vector3())   // result from computeTargetPosition

  // Rotation pipeline
  const targetQuatRef  = useRef(new THREE.Quaternion()) // result from computeTargetRotation
  const offsetQuatRef  = useRef(new THREE.Quaternion()) // temp inside computeTargetRotation
  const tempEulerRef   = useRef(new THREE.Euler())      // temp inside computeTargetRotation

  // Position stabilizer (One Euro filter only - validated 33.8% improvement)
  const stabilizer = useRef(new MotionStabilizer())

  // Rotation smoother: Fixed-factor quaternion slerp with sign correction
  const quatSmoother = useRef(new QuaternionSmoother())

  // VALIDATION: Rotation range tracking for logging
  const rotationRangesRef = useRef({
    raw: { x: { min: Infinity, max: -Infinity }, y: { min: Infinity, max: -Infinity }, z: { min: Infinity, max: -Infinity } },
    smoothed: { x: { min: Infinity, max: -Infinity }, y: { min: Infinity, max: -Infinity }, z: { min: Infinity, max: -Infinity } },
    sampleCount: 0,
  })
  const lastLogTimeRef = useRef(0)
  
  // VALIDATION: Ref to track bypass mode for useFrame closure (always current value)
  const bypassModeRef = useRef(bypassQuaternionSmoothing)
  bypassModeRef.current = bypassQuaternionSmoothing

  // VALIDATION: Expose reset function via callback
  useEffect(() => {
    if (onRotationRangesResetCallback) {
      const resetFn = () => {
        rotationRangesRef.current = {
          raw: { x: { min: Infinity, max: -Infinity }, y: { min: Infinity, max: -Infinity }, z: { min: Infinity, max: -Infinity } },
          smoothed: { x: { min: Infinity, max: -Infinity }, y: { min: Infinity, max: -Infinity }, z: { min: Infinity, max: -Infinity } },
          sampleCount: 0,
        }
        console.log('🔄 Rotation ranges reset')
      }
      onRotationRangesResetCallback(resetFn)
    }
  }, [onRotationRangesResetCallback])

  // Stores the 1/maxDim normalization factor so useFrame can apply final scale
  // without triggering a model re-clone.
  const normalizedScaleRef = useRef(1)

  const { scene } = useGLTF(effectiveModelPath)

  // useMemo only recalculates when the source GLB scene changes.
  // Scale, rotation offset, and handedness are intentionally excluded —
  // they are applied every frame via refs in useFrame so that slider
  // adjustments don't cause a full model re-clone.
  const processedModel = useMemo(() => {
    if (!scene) return null

    const cloned = scene.clone()

    // Center geometry at origin.
    const box = new THREE.Box3().setFromObject(cloned)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    cloned.position.sub(center)

    // Normalize to unit size; store factor for useFrame.
    const maxDim = Math.max(size.x, size.y, size.z)
    normalizedScaleRef.current = maxDim > 0 ? 1 / maxDim : 1

    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
        if (child.material) {
          const mats = Array.isArray(child.material)
            ? child.material
            : [child.material]
          mats.forEach((mat) => {
            if (mat instanceof THREE.MeshStandardMaterial) {
              // Detect material type based on properties and name
              const isGlass = mat.transparent || mat.opacity < 1.0 || 
                             mat.name.toLowerCase().includes('glass') ||
                             mat.name.toLowerCase().includes('crystal')
              
              const isMetal = mat.metalness > 0.5 || 
                             mat.name.toLowerCase().includes('metal') ||
                             mat.name.toLowerCase().includes('steel') ||
                             mat.name.toLowerCase().includes('gold') ||
                             mat.name.toLowerCase().includes('chrome')
              
              if (isGlass) {
                // Glass/Crystal enhancement (cast to any for advanced properties)
                const physicalMat = mat as any
                mat.transparent = true
                mat.opacity = Math.max(mat.opacity, 0.3)
                physicalMat.transmission = 0.95
                physicalMat.thickness = 0.5
                mat.roughness = 0.05
                mat.metalness = 0
                mat.envMapIntensity = 2.0
                physicalMat.ior = 1.5
                physicalMat.clearcoat = 1.0
                physicalMat.clearcoatRoughness = 0.1
              } else if (isMetal) {
                // Metallic enhancement
                const physicalMat = mat as any
                mat.metalness = Math.max(mat.metalness, 0.9)
                mat.roughness = Math.min(mat.roughness, 0.3)
                mat.envMapIntensity = 2.5
                physicalMat.clearcoat = 0.5
                physicalMat.clearcoatRoughness = 0.2
              } else {
                // Default material enhancement
                mat.envMapIntensity = 1.5
                mat.roughness = Math.max(mat.roughness, 0.4)
              }
              
              mat.needsUpdate = true
            }
          })
        }
        if (child.geometry) {
          child.geometry.computeBoundingSphere()
        }
      }
    })

    return cloned
  }, [scene, effectiveModelPath])

  useEffect(() => {
    if (processedModel && modelRef.current) {
      while (modelRef.current.children.length > 0) {
        modelRef.current.remove(modelRef.current.children[0])
      }
      modelRef.current.add(processedModel)
      setModelLoaded(true)
    }
  }, [processedModel])

  useFrame(() => {
    if (!groupRef.current || !wristPosition) return

    const timestamp = Date.now()

    // ── Step 1: build wrist transform (position + quaternion, no allocation) ───
    const wristTransform = wristTransformFromCoords(
      wristPosition,
      handOrientation,
      wristTransformVec.current,
    )

    // ── Step 2: compute calibrated target position (local frame → world) ──────
    if (palmNormal) {
      // Palm-normal path: apply X/Z lateral+forearm offsets via quaternion, then
      // add the depth (Y) component directly along the palm normal.
      // This anchors the watch to the wrist surface more precisely than going
      // through the quaternion-derived Y axis alone.
      const yOffset = effectivePositionOffset.y + wristFitBias
      localOffsetVec.current.set(effectivePositionOffset.x, 0, effectivePositionOffset.z)
      if (handOrientation) localOffsetVec.current.applyQuaternion(handOrientation)
      // Palm normal points toward palm; positive Y sinks watch into wrist surface.
      localOffsetVec.current.addScaledVector(palmNormal, yOffset)
      targetPosVec.current.copy(wristTransformVec.current).add(localOffsetVec.current)
    } else {
      // Fallback: full quaternion-derived offset (no palmNormal available).
      computeTargetPosition(
        wristTransform,
        { positionOffset: effectivePositionOffset, wristFitBias },
        localOffsetVec.current,
        targetPosVec.current,
      )
    }

    const targetPos = {
      x: targetPosVec.current.x,
      y: targetPosVec.current.y,
      z: targetPosVec.current.z,
    }

    // ── Step 3: Record INPUT variance for reference (raw target jitter) ───────
    // This measures MediaPipe + coordinate transformation noise BEFORE smoothing
    if (previousTargetPosRef.current) {
      const dx = targetPos.x - previousTargetPosRef.current.x
      const dy = targetPos.y - previousTargetPosRef.current.y
      const dz = targetPos.z - previousTargetPosRef.current.z
      const inputVariance = Math.sqrt(dx * dx + dy * dy + dz * dz)
      // Store for metrics but don't use for primary measurement
      ;(targetPos as any)._inputVariance = inputVariance
    }
    previousTargetPosRef.current = targetPos

    // ── Step 4: One Euro filter ───────────────────────────────────────────────
    const filteredPos = stabilizer.current.filterPosition(targetPos, timestamp)

    // ── Step 5: Simple fixed lerp smoothing ────────────────────────────────────
    // VALIDATED: One Euro Filter alone performs 33.8% better than One Euro + Adaptive Lerp
    // Adaptive lerp was measuring velocity from already-smoothed data, creating jitter
    let finalPos: WorldCoordinates
    
    if (currentPosRef.current) {
      // Simple lerp with fixed smoothing factor - One Euro already adapts to velocity
      finalPos = lerpWorldCoordinates(currentPosRef.current, filteredPos, effectiveSmoothingValue)
    } else {
      // First frame: snap immediately
      finalPos = filteredPos
    }

    groupRef.current.position.set(finalPos.x, finalPos.y, finalPos.z)
    
    // ── Step 6: Record OUTPUT variance (final smoothed position jitter) ───────
    // CRITICAL: This measures smoothing effectiveness, not input noise
    stabilizer.current.recordPositionVariance(finalPos, previousFinalPosRef.current)
    previousFinalPosRef.current = finalPos
    currentPosRef.current = finalPos

    // ── Step 7: Export debug metrics ──────────────────────────────────────────
    if (onDebugMetrics) {
      const metrics = stabilizer.current.getDebugMetrics()
      if (metrics) {
        onDebugMetrics({
          ...metrics,
          config: {
            useAdaptiveLerp,
            smoothingFactor: effectiveSmoothingValue,
          },
          positions: {
            target: targetPos,
            filtered: filteredPos,
            final: finalPos,
            inputVariance: (targetPos as any)._inputVariance || 0,
          },
        })
      }
    }

    // ── Step 8: compute calibrated target rotation ────────────────────────────
    if (handOrientation) {
      computeTargetRotation(
        wristTransform,
        { rotationOffset: effectiveRotationOffset },
        tempEulerRef.current,
        offsetQuatRef.current,
        targetQuatRef.current,
      )

      // ── Step 9: Quaternion smoothing (or raw bypass for validation) ───────────
      let finalQuat: THREE.Quaternion
      if (bypassModeRef.current) {
        // VALIDATION MODE: Apply raw target quaternion directly (no smoothing)
        groupRef.current.quaternion.copy(targetQuatRef.current)
        finalQuat = targetQuatRef.current
      } else {
        // NORMAL MODE: Fixed-factor quaternion slerp with sign correction
        // TICKET 41d: Use separate rotation smoothing factor (default 0.6)
        const smoothedQuat = quatSmoother.current.update(targetQuatRef.current, effectiveRotationSmoothing)
        groupRef.current.quaternion.copy(smoothedQuat)
        finalQuat = smoothedQuat
      }

      // ── Step 10: Export rotation debug data ───────────────────────────────────
      if (onRotationDebug) {
        // Convert quaternions to Euler angles for easier interpretation
        const rawEuler = new THREE.Euler().setFromQuaternion(targetQuatRef.current, 'XYZ')
        const finalEuler = new THREE.Euler().setFromQuaternion(finalQuat, 'XYZ')
        
        const rawEulerDeg = {
          x: rawEuler.x * (180 / Math.PI),
          y: rawEuler.y * (180 / Math.PI),
          z: rawEuler.z * (180 / Math.PI),
        }
        const smoothedEulerDeg = {
          x: finalEuler.x * (180 / Math.PI),
          y: finalEuler.y * (180 / Math.PI),
          z: finalEuler.z * (180 / Math.PI),
        }

        // VALIDATION: Track rotation ranges for both raw and smoothed
        const ranges = rotationRangesRef.current
        ranges.sampleCount++

        // Update raw ranges
        ranges.raw.x.min = Math.min(ranges.raw.x.min, rawEulerDeg.x)
        ranges.raw.x.max = Math.max(ranges.raw.x.max, rawEulerDeg.x)
        ranges.raw.y.min = Math.min(ranges.raw.y.min, rawEulerDeg.y)
        ranges.raw.y.max = Math.max(ranges.raw.y.max, rawEulerDeg.y)
        ranges.raw.z.min = Math.min(ranges.raw.z.min, rawEulerDeg.z)
        ranges.raw.z.max = Math.max(ranges.raw.z.max, rawEulerDeg.z)

        // Update smoothed ranges
        ranges.smoothed.x.min = Math.min(ranges.smoothed.x.min, smoothedEulerDeg.x)
        ranges.smoothed.x.max = Math.max(ranges.smoothed.x.max, smoothedEulerDeg.x)
        ranges.smoothed.y.min = Math.min(ranges.smoothed.y.min, smoothedEulerDeg.y)
        ranges.smoothed.y.max = Math.max(ranges.smoothed.y.max, smoothedEulerDeg.y)
        ranges.smoothed.z.min = Math.min(ranges.smoothed.z.min, smoothedEulerDeg.z)
        ranges.smoothed.z.max = Math.max(ranges.smoothed.z.max, smoothedEulerDeg.z)

        // VALIDATION: Console log every 2 seconds with range statistics
        const now = timestamp
        if (now - lastLogTimeRef.current >= 2000 && ranges.sampleCount > 10) {
          console.log('🔄 ROTATION VALIDATION LOG')
          console.log('Mode:', bypassModeRef.current ? '🔴 RAW (No Smoothing)' : '🟣 SMOOTHED')
          console.log('Samples:', ranges.sampleCount)
          
          console.group('📊 Euler Angle Ranges (degrees)')
          console.log('X-axis (Pitch):')
          console.log(`  Raw:      ${ranges.raw.x.min.toFixed(1)}° to ${ranges.raw.x.max.toFixed(1)}° (range: ${(ranges.raw.x.max - ranges.raw.x.min).toFixed(1)}°)`)
          console.log(`  Smoothed: ${ranges.smoothed.x.min.toFixed(1)}° to ${ranges.smoothed.x.max.toFixed(1)}° (range: ${(ranges.smoothed.x.max - ranges.smoothed.x.min).toFixed(1)}°)`)
          
          console.log('Y-axis (Yaw):')
          console.log(`  Raw:      ${ranges.raw.y.min.toFixed(1)}° to ${ranges.raw.y.max.toFixed(1)}° (range: ${(ranges.raw.y.max - ranges.raw.y.min).toFixed(1)}°)`)
          console.log(`  Smoothed: ${ranges.smoothed.y.min.toFixed(1)}° to ${ranges.smoothed.y.max.toFixed(1)}° (range: ${(ranges.smoothed.y.max - ranges.smoothed.y.min).toFixed(1)}°)`)
          
          console.log('Z-axis (Roll):')
          console.log(`  Raw:      ${ranges.raw.z.min.toFixed(1)}° to ${ranges.raw.z.max.toFixed(1)}° (range: ${(ranges.raw.z.max - ranges.raw.z.min).toFixed(1)}°)`)
          console.log(`  Smoothed: ${ranges.smoothed.z.min.toFixed(1)}° to ${ranges.smoothed.z.max.toFixed(1)}° (range: ${(ranges.smoothed.z.max - ranges.smoothed.z.min).toFixed(1)}°)`)
          console.groupEnd()

          console.group('🎯 Current Frame Values')
          console.log('Raw Quat:     ', `x:${targetQuatRef.current.x.toFixed(4)} y:${targetQuatRef.current.y.toFixed(4)} z:${targetQuatRef.current.z.toFixed(4)} w:${targetQuatRef.current.w.toFixed(4)}`)
          console.log('Smoothed Quat:', `x:${finalQuat.x.toFixed(4)} y:${finalQuat.y.toFixed(4)} z:${finalQuat.z.toFixed(4)} w:${finalQuat.w.toFixed(4)}`)
          console.log('Raw Euler:     ', `x:${rawEulerDeg.x.toFixed(1)}° y:${rawEulerDeg.y.toFixed(1)}° z:${rawEulerDeg.z.toFixed(1)}°`)
          console.log('Smoothed Euler:', `x:${smoothedEulerDeg.x.toFixed(1)}° y:${smoothedEulerDeg.y.toFixed(1)}° z:${smoothedEulerDeg.z.toFixed(1)}°`)
          console.groupEnd()

          console.log('─────────────────────────────────────────────')
          
          lastLogTimeRef.current = now
        }
        
        onRotationDebug({
          rawQuaternion: {
            x: targetQuatRef.current.x,
            y: targetQuatRef.current.y,
            z: targetQuatRef.current.z,
            w: targetQuatRef.current.w,
          },
          smoothedQuaternion: {
            x: finalQuat.x,
            y: finalQuat.y,
            z: finalQuat.z,
            w: finalQuat.w,
          },
          rawEuler: rawEulerDeg,
          smoothedEuler: smoothedEulerDeg,
          bypassMode: bypassModeRef.current,
          ranges: {
            raw: {
              x: { min: ranges.raw.x.min, max: ranges.raw.x.max, range: ranges.raw.x.max - ranges.raw.x.min },
              y: { min: ranges.raw.y.min, max: ranges.raw.y.max, range: ranges.raw.y.max - ranges.raw.y.min },
              z: { min: ranges.raw.z.min, max: ranges.raw.z.max, range: ranges.raw.z.max - ranges.raw.z.min },
            },
            smoothed: {
              x: { min: ranges.smoothed.x.min, max: ranges.smoothed.x.max, range: ranges.smoothed.x.max - ranges.smoothed.x.min },
              y: { min: ranges.smoothed.y.min, max: ranges.smoothed.y.max, range: ranges.smoothed.y.max - ranges.smoothed.y.min },
              z: { min: ranges.smoothed.z.min, max: ranges.smoothed.z.max, range: ranges.smoothed.z.max - ranges.smoothed.z.min },
            },
            sampleCount: ranges.sampleCount,
          },
        })
      }
    }

    // --- Scale (applied to modelRef so normalizedScale from useMemo is preserved) ---
    if (modelRef.current) {
      const finalScale = useDynamicScaling ? dynamicScale : effectiveScale
      const s = normalizedScaleRef.current * finalScale
      // Mirror Z (palm normal) for left-hand wearers
      modelRef.current.scale.set(s, s, handedness === 'Left' ? -s : s)
    }
  })

  if (!wristPosition) return null

  return (
    <group ref={groupRef}>
      <group ref={modelRef} />

      {showDebugAxis && (
        <>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.02, 16, 16]} />
            <meshStandardMaterial
              color="#ef4444"
              emissive="#ef4444"
              emissiveIntensity={0.8}
            />
          </mesh>
          <axesHelper args={[0.3]} />
        </>
      )}

      {!modelLoaded && (
        <mesh>
          <boxGeometry args={[0.2, 0.1, 0.3]} />
          <meshStandardMaterial
            color="#8b5cf6"
            wireframe
            emissive="#8b5cf6"
            emissiveIntensity={0.5}
          />
        </mesh>
      )}
    </group>
  )
}

// Preload default watch model
useGLTF.preload('/models/watch.glb')

