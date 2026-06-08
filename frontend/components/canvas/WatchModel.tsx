'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { WorldCoordinates } from '@/lib/three/coordinateMapping'
import { lerpWorldCoordinates } from '@/lib/three/coordinateMapping'
import { MotionStabilizer, QuaternionSmoother } from '@/lib/three/motionSmoothing'
import {
  computeTargetPosition,
  computeTargetRotation,
  wristTransformFromCoords,
} from '@/lib/three/watchCalibration'
import { loadWatchModel } from '@/lib/watches/modelCache'
import { DEFAULT_MODEL_URL } from '@/lib/watches/catalog'

interface WatchModelProps {
  wristPosition: WorldCoordinates | null
  handOrientation?: THREE.Quaternion | null
  handedness?: 'Left' | 'Right'
  smoothing?: number
  scale?: number
  dynamicScale?: number
  useDynamicScaling?: boolean
  positionOffset?: { x: number; y: number; z: number }
  rotationOffset?: { x: number; y: number; z: number }
  wristFitBias?: number
  palmNormal?: THREE.Vector3 | null
  showDebugAxis?: boolean
  /** GLB URL from watch catalog (lazy-loaded by id). */
  modelPath?: string
  onLoad?: () => void
  onError?: (message: string) => void
}

function WatchLoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.2, 0.1, 0.3]} />
      <meshStandardMaterial
        color="#8b5cf6"
        wireframe
        emissive="#8b5cf6"
        emissiveIntensity={0.5}
      />
    </mesh>
  )
}

function WatchErrorFallback({ message }: { message: string }) {
  return (
    <mesh>
      <boxGeometry args={[0.18, 0.08, 0.28]} />
      <meshStandardMaterial color="#ef4444" wireframe emissive="#ef4444" emissiveIntensity={0.4} />
    </mesh>
  )
}

export function WatchModel({
  wristPosition,
  handOrientation,
  handedness = 'Right',
  smoothing = 0.3,
  scale = 1,
  dynamicScale = 1,
  useDynamicScaling = false,
  positionOffset = { x: 0, y: 0, z: 0 },
  rotationOffset = { x: 0, y: 0, z: 0 },
  wristFitBias = 0,
  palmNormal = null,
  showDebugAxis = false,
  modelPath = DEFAULT_MODEL_URL,
  onLoad,
  onError,
}: WatchModelProps) {
  const groupRef = useRef<THREE.Group>(null)
  const modelRef = useRef<THREE.Group>(null)

  const [sourceScene, setSourceScene] = useState<THREE.Group | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)

  const currentPosRef = useRef<WorldCoordinates | null>(null)
  const wristTransformVec = useRef(new THREE.Vector3())
  const localOffsetVec = useRef(new THREE.Vector3())
  const targetPosVec = useRef(new THREE.Vector3())
  const targetQuatRef = useRef(new THREE.Quaternion())
  const offsetQuatRef = useRef(new THREE.Quaternion())
  const tempEulerRef = useRef(new THREE.Euler())
  const stabilizer = useRef(new MotionStabilizer())
  const quatSmoother = useRef(new QuaternionSmoother())
  const normalizedScaleRef = useRef(1)

  // ── Lazy load GLB when modelPath (watch id → catalog url) changes ─────────
  useEffect(() => {
    let cancelled = false

    setLoadState('loading')
    setLoadError(null)
    setSourceScene(null)
    stabilizer.current.reset()
    quatSmoother.current.reset()
    currentPosRef.current = null

    loadWatchModel(modelPath)
      .then((gltf) => {
        if (cancelled) return
        setSourceScene(gltf.scene)
        setLoadState('loaded')
        onLoad?.()
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Failed to load watch model'
        setLoadError(message)
        setLoadState('error')
        onError?.(message)
      })

    return () => {
      cancelled = true
    }
  }, [modelPath])

  const processedModel = useMemo(() => {
    if (!sourceScene) return null

    const cloned = sourceScene.clone()

    const box = new THREE.Box3().setFromObject(cloned)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    cloned.position.sub(center)

    const maxDim = Math.max(size.x, size.y, size.z)
    normalizedScaleRef.current = maxDim > 0 ? 1 / maxDim : 1

    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material]
          mats.forEach((mat) => {
            if (mat instanceof THREE.MeshStandardMaterial) {
              const isGlass =
                mat.transparent ||
                mat.opacity < 1.0 ||
                mat.name.toLowerCase().includes('glass') ||
                mat.name.toLowerCase().includes('crystal')

              const isMetal =
                mat.metalness > 0.5 ||
                mat.name.toLowerCase().includes('metal') ||
                mat.name.toLowerCase().includes('steel') ||
                mat.name.toLowerCase().includes('gold') ||
                mat.name.toLowerCase().includes('chrome')

              if (isGlass) {
                const physicalMat = mat as THREE.MeshStandardMaterial & {
                  transmission?: number
                  thickness?: number
                  ior?: number
                  clearcoat?: number
                  clearcoatRoughness?: number
                }
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
                const physicalMat = mat as THREE.MeshStandardMaterial & {
                  clearcoat?: number
                  clearcoatRoughness?: number
                }
                mat.metalness = Math.max(mat.metalness, 0.9)
                mat.roughness = Math.min(mat.roughness, 0.3)
                mat.envMapIntensity = 2.5
                physicalMat.clearcoat = 0.5
                physicalMat.clearcoatRoughness = 0.2
              } else {
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
  }, [sourceScene])

  useEffect(() => {
    if (processedModel && modelRef.current) {
      while (modelRef.current.children.length > 0) {
        modelRef.current.remove(modelRef.current.children[0])
      }
      modelRef.current.add(processedModel)
    }
  }, [processedModel])

  useFrame(() => {
    if (!groupRef.current || !wristPosition || loadState !== 'loaded') return

    const timestamp = Date.now()

    const wristTransform = wristTransformFromCoords(
      wristPosition,
      handOrientation,
      wristTransformVec.current,
    )

    if (palmNormal) {
      const yOffset = positionOffset.y + wristFitBias
      localOffsetVec.current.set(positionOffset.x, 0, positionOffset.z)
      if (handOrientation) localOffsetVec.current.applyQuaternion(handOrientation)
      localOffsetVec.current.addScaledVector(palmNormal, yOffset)
      targetPosVec.current.copy(wristTransformVec.current).add(localOffsetVec.current)
    } else {
      computeTargetPosition(
        wristTransform,
        { positionOffset, wristFitBias },
        localOffsetVec.current,
        targetPosVec.current,
      )
    }

    const targetPos = {
      x: targetPosVec.current.x,
      y: targetPosVec.current.y,
      z: targetPosVec.current.z,
    }

    const filteredPos = stabilizer.current.filterPosition(targetPos, timestamp)

    if (currentPosRef.current) {
      const adaptiveAlpha = stabilizer.current.getAdaptiveAlpha(filteredPos, timestamp)
      const effectiveSmoothing = Math.max(smoothing, adaptiveAlpha)
      const smoothed = lerpWorldCoordinates(currentPosRef.current, filteredPos, effectiveSmoothing)
      groupRef.current.position.set(smoothed.x, smoothed.y, smoothed.z)
      currentPosRef.current = smoothed
    } else {
      groupRef.current.position.set(filteredPos.x, filteredPos.y, filteredPos.z)
      currentPosRef.current = { ...filteredPos }
    }

    if (handOrientation) {
      computeTargetRotation(
        wristTransform,
        { rotationOffset },
        tempEulerRef.current,
        offsetQuatRef.current,
        targetQuatRef.current,
      )

      const smoothedQuat = quatSmoother.current.update(targetQuatRef.current, smoothing)
      groupRef.current.quaternion.copy(smoothedQuat)
    }

    if (modelRef.current) {
      const finalScale = useDynamicScaling ? dynamicScale : scale
      const s = normalizedScaleRef.current * finalScale
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
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8} />
          </mesh>
          <axesHelper args={[0.3]} />
        </>
      )}

      {loadState === 'loading' && <WatchLoadingFallback />}
      {loadState === 'error' && <WatchErrorFallback message={loadError ?? 'Error'} />}
    </group>
  )
}
