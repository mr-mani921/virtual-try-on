'use client'

import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { WorldCoordinates } from '@/lib/three/coordinateMapping'
import { lerpWorldCoordinates } from '@/lib/three/coordinateMapping'

interface WristAnchorProps {
  wristPosition: WorldCoordinates | null
  handOrientation?: THREE.Euler | null
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
  const [currentPosition, setCurrentPosition] = useState<WorldCoordinates | null>(null)
  const [currentRotation, setCurrentRotation] = useState<THREE.Euler | null>(null)

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
        // Lerp rotation
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

    // Subtle floating animation for the cube
    if (cubeRef.current) {
      cubeRef.current.rotation.x += delta * 0.5
      cubeRef.current.rotation.y += delta * 0.3
    }
  })

  if (!wristPosition) return null

  return (
    <group ref={groupRef}>
      {/* Placeholder Cube - Watch will replace this */}
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

      {/* Anchor point indicator (small sphere at wrist center) */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial
          color="#ef4444"
          emissive="#ef4444"
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Debug axis helper */}
      {showDebugAxis && <axesHelper args={[0.5]} />}

      {/* Glow effect ring */}
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
