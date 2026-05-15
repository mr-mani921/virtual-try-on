'use client'

import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { WorldCoordinates } from '@/lib/three/coordinateMapping'
import { lerpWorldCoordinates } from '@/lib/three/coordinateMapping'

interface WatchModelProps {
  wristPosition: WorldCoordinates | null
  handOrientation?: THREE.Euler | null
  smoothing?: number
  scale?: number
  showDebugAxis?: boolean
  modelPath?: string
}

export function WatchModel({
  wristPosition,
  handOrientation,
  smoothing = 0.3,
  scale = 1,
  showDebugAxis = false,
  modelPath = '/models/watch.glb',
}: WatchModelProps) {
  const groupRef = useRef<THREE.Group>(null)
  const modelRef = useRef<THREE.Group>(null)
  const [currentPosition, setCurrentPosition] = useState<WorldCoordinates | null>(null)
  const [currentRotation, setCurrentRotation] = useState<THREE.Euler | null>(null)
  const [modelLoaded, setModelLoaded] = useState(false)

  // Load the GLTF model
  const { scene, nodes, materials } = useGLTF(modelPath)

  useEffect(() => {
    if (scene && modelRef.current) {
      // Clear any existing children
      while (modelRef.current.children.length > 0) {
        modelRef.current.remove(modelRef.current.children[0])
      }

      // Clone the scene to avoid modifying the cached version
      const clonedScene = scene.clone()

      // Normalize the model
      const box = new THREE.Box3().setFromObject(clonedScene)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())

      // Center the model at origin
      clonedScene.position.sub(center)

      // Calculate scale to normalize to unit size
      const maxDim = Math.max(size.x, size.y, size.z)
      const normalizedScale = 1 / maxDim

      // Apply normalized scale
      clonedScene.scale.setScalar(normalizedScale * scale)

      // Adjust rotation to align with wrist orientation
      // Most watch models need rotation adjustments
      clonedScene.rotation.set(0, 0, 0)

      // Enable shadows
      clonedScene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true
          child.receiveShadow = true

          // Enhance materials
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => {
                mat.envMapIntensity = 1.5
                mat.needsUpdate = true
              })
            } else {
              child.material.envMapIntensity = 1.5
              child.material.needsUpdate = true
            }
          }
        }
      })

      modelRef.current.add(clonedScene)
      setModelLoaded(true)

      console.log('Watch model loaded:', {
        nodes: Object.keys(nodes).length,
        materials: Object.keys(materials).length,
        originalSize: size,
        normalizedScale,
      })
    }
  }, [scene, nodes, materials, scale])

  useFrame((state, delta) => {
    if (!groupRef.current || !wristPosition) return

    // Smooth position transition
    const targetPosition = wristPosition
    const smoothedPosition = currentPosition
      ? lerpWorldCoordinates(currentPosition, targetPosition, smoothing)
      : targetPosition

    groupRef.current.position.set(
      smoothedPosition.x,
      smoothedPosition.y,
      smoothedPosition.z
    )

    setCurrentPosition(smoothedPosition)

    // Smooth rotation transition
    if (handOrientation) {
      if (!currentRotation) {
        groupRef.current.rotation.copy(handOrientation)
        setCurrentRotation(handOrientation.clone())
      } else {
        groupRef.current.rotation.x = THREE.MathUtils.lerp(
          groupRef.current.rotation.x,
          handOrientation.x,
          smoothing
        )
        groupRef.current.rotation.y = THREE.MathUtils.lerp(
          groupRef.current.rotation.y,
          handOrientation.y,
          smoothing
        )
        groupRef.current.rotation.z = THREE.MathUtils.lerp(
          groupRef.current.rotation.z,
          handOrientation.z,
          smoothing
        )
        setCurrentRotation(groupRef.current.rotation.clone())
      }
    }
  })

  if (!wristPosition) return null

  return (
    <group ref={groupRef}>
      <group ref={modelRef} />

      {/* Anchor point indicator (small sphere at wrist center) */}
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

      {/* Loading indicator */}
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

// Preload the model
useGLTF.preload('/models/watch.glb')
