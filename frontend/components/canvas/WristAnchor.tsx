'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { WorldCoordinates } from '@/lib/three/coordinateMapping'
import { lerpWorldCoordinates } from '@/lib/three/coordinateMapping'

interface WristAnchorProps {
  wristPosition: WorldCoordinates | null
  handOrientation?: THREE.Quaternion | null
  smoothing?: number
  showDebugAxis?: boolean
}

export function WristAnchor({
  wristPosition,
  handOrientation,
  smoothing = 0.3,
  showDebugAxis = false,
}: WristAnchorProps) {
  const groupRef = useRef<THREE.Group>(null)
  const cubeRef = useRef<THREE.Mesh>(null)

  const currentPosRef = useRef<WorldCoordinates | null>(null)
  const currentQuatRef = useRef(new THREE.Quaternion())
  const rotationInitializedRef = useRef(false)

  useFrame((_, delta) => {
    if (!groupRef.current || !wristPosition) return

    // --- Position ---
    if (currentPosRef.current) {
      const smoothed = lerpWorldCoordinates(currentPosRef.current, wristPosition, smoothing)
      groupRef.current.position.set(smoothed.x, smoothed.y, smoothed.z)
      currentPosRef.current = smoothed
    } else {
      groupRef.current.position.set(wristPosition.x, wristPosition.y, wristPosition.z)
      currentPosRef.current = { ...wristPosition }
    }

    // --- Rotation (quaternion slerp) ---
    if (handOrientation) {
      if (!rotationInitializedRef.current) {
        currentQuatRef.current.copy(handOrientation)
        rotationInitializedRef.current = true
      } else {
        currentQuatRef.current.slerp(handOrientation, smoothing)
      }
      groupRef.current.quaternion.copy(currentQuatRef.current)
    }

    // Placeholder cube spin animation.
    if (cubeRef.current) {
      cubeRef.current.rotation.x += delta * 0.5
      cubeRef.current.rotation.y += delta * 0.3
    }
  })

  if (!wristPosition) return null

  return (
    <group ref={groupRef}>
      <mesh ref={cubeRef} castShadow receiveShadow>
        <boxGeometry args={[0.4, 0.15, 0.6]} />
        <meshStandardMaterial
          color="#8b5cf6"
          metalness={0.8}
          roughness={0.2}
          emissive="#8b5cf6"
          emissiveIntensity={0.2}
        />
      </mesh>

      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial
          color="#ef4444"
          emissive="#ef4444"
          emissiveIntensity={0.8}
        />
      </mesh>

      {showDebugAxis && <axesHelper args={[0.5]} />}

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.35, 32]} />
        <meshBasicMaterial
          color="#8b5cf6"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}
