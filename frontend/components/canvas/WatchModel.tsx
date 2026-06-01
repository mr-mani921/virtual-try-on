'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { WorldCoordinates } from '@/lib/three/coordinateMapping'
import { lerpWorldCoordinates } from '@/lib/three/coordinateMapping'

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
  showDebugAxis?: boolean
  modelPath?: string
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
  showDebugAxis = false,
  modelPath = '/models/watch.glb',
}: WatchModelProps) {
  const groupRef = useRef<THREE.Group>(null)
  const modelRef = useRef<THREE.Group>(null)
  const [modelLoaded, setModelLoaded] = useState(false)

  // Per-frame state lives in refs — never in React state — to avoid 60fps re-renders.
  const currentPosRef = useRef<WorldCoordinates | null>(null)
  const currentQuatRef = useRef(new THREE.Quaternion())
  const targetQuatRef = useRef(new THREE.Quaternion())
  const offsetQuatRef = useRef(new THREE.Quaternion())
  const tempEulerRef = useRef(new THREE.Euler())
  const rotationInitializedRef = useRef(false)

  // Stores the 1/maxDim normalization factor so useFrame can apply final scale
  // without triggering a model re-clone.
  const normalizedScaleRef = useRef(1)

  const { scene } = useGLTF(modelPath)

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
              mat.envMapIntensity = 1.5
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
  }, [scene])

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

    // --- Position (lerp via refs, no state) ---
    const targetPos = {
      x: wristPosition.x + positionOffset.x,
      y: wristPosition.y + positionOffset.y,
      z: wristPosition.z + positionOffset.z,
    }

    if (currentPosRef.current) {
      const smoothed = lerpWorldCoordinates(currentPosRef.current, targetPos, smoothing)
      groupRef.current.position.set(smoothed.x, smoothed.y, smoothed.z)
      currentPosRef.current = smoothed
    } else {
      groupRef.current.position.set(targetPos.x, targetPos.y, targetPos.z)
      currentPosRef.current = { ...targetPos }
    }

    // --- Rotation (quaternion slerp — immune to gimbal lock) ---
    if (handOrientation) {
      // Compose: wrist world orientation * local rotation offset.
      // All THREE objects pre-allocated as refs to avoid per-frame GC pressure.
      tempEulerRef.current.set(rotationOffset.x, rotationOffset.y, rotationOffset.z)
      offsetQuatRef.current.setFromEuler(tempEulerRef.current)
      targetQuatRef.current.multiplyQuaternions(handOrientation, offsetQuatRef.current)

      if (!rotationInitializedRef.current) {
        // Snap to the first valid orientation; slerp from next frame onward.
        currentQuatRef.current.copy(targetQuatRef.current)
        rotationInitializedRef.current = true
      } else {
        // slerp mutates currentQuatRef toward target — always takes the
        // shortest angular path, preventing the ±π flip that caused flickering.
        currentQuatRef.current.slerp(targetQuatRef.current, smoothing)
      }

      groupRef.current.quaternion.copy(currentQuatRef.current)
    }

    // --- Scale (applied to modelRef so normalizedScale from useMemo is preserved) ---
    if (modelRef.current) {
      const finalScale = useDynamicScaling ? dynamicScale : scale
      const s = normalizedScaleRef.current * finalScale
      // Mirror X for left-hand wearers instead of re-cloning the model.
      modelRef.current.scale.set(handedness === 'Left' ? -s : s, s, s)
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

useGLTF.preload('/models/watch.glb')
