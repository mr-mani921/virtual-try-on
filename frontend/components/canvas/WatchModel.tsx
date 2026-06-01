'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { WorldCoordinates } from '@/lib/three/coordinateMapping'
import { lerpWorldCoordinates } from '@/lib/three/coordinateMapping'
import { MotionStabilizer } from '@/lib/three/motionSmoothing'

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

  // Motion stabilizer for advanced smoothing
  const stabilizer = useRef(new MotionStabilizer())

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

    const timestamp = Date.now()

    // --- Position with One Euro Filter + Velocity-Adaptive Smoothing ---
    const targetPos = {
      x: wristPosition.x + positionOffset.x,
      y: wristPosition.y + positionOffset.y,
      z: wristPosition.z + positionOffset.z,
    }

    // Apply One Euro low-pass filter to reduce jitter
    const filteredPos = stabilizer.current.filterPosition(targetPos, timestamp)

    if (currentPosRef.current) {
      // Get velocity-adaptive alpha (faster motion = higher alpha = more responsive)
      const adaptiveAlpha = stabilizer.current.getAdaptiveAlpha(filteredPos, timestamp)
      const effectiveSmoothing = Math.max(smoothing, adaptiveAlpha)
      
      const smoothed = lerpWorldCoordinates(currentPosRef.current, filteredPos, effectiveSmoothing)
      groupRef.current.position.set(smoothed.x, smoothed.y, smoothed.z)
      currentPosRef.current = smoothed
    } else {
      groupRef.current.position.set(filteredPos.x, filteredPos.y, filteredPos.z)
      currentPosRef.current = { ...filteredPos }
    }

    // --- Rotation with One Euro Filter + Quaternion Slerp ---
    if (handOrientation) {
      // Compose: wrist world orientation * local rotation offset
      tempEulerRef.current.set(rotationOffset.x, rotationOffset.y, rotationOffset.z)
      offsetQuatRef.current.setFromEuler(tempEulerRef.current)
      targetQuatRef.current.multiplyQuaternions(handOrientation, offsetQuatRef.current)

      // Apply One Euro filter to rotation for smooth tracking
      const filteredQuat = stabilizer.current.filterRotation(targetQuatRef.current, timestamp)

      if (!rotationInitializedRef.current) {
        // Snap to the first valid orientation
        currentQuatRef.current.copy(filteredQuat)
        rotationInitializedRef.current = true
      } else {
        // Slerp with filtered quaternion (double-smoothing for ultra-stable rotation)
        currentQuatRef.current.slerp(filteredQuat, smoothing * 1.2)
      }

      groupRef.current.quaternion.copy(currentQuatRef.current)
    }

    // --- Scale (applied to modelRef so normalizedScale from useMemo is preserved) ---
    if (modelRef.current) {
      const finalScale = useDynamicScaling ? dynamicScale : scale
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

useGLTF.preload('/models/watch.glb')
