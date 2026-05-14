'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { WorldCoordinates } from '@/lib/three/coordinateMapping'

interface HandDebugVisualizerProps {
  wristPosition: WorldCoordinates | null
  indexBasePosition: WorldCoordinates | null
  pinkyBasePosition: WorldCoordinates | null
  allLandmarks?: WorldCoordinates[]
  showConnections?: boolean
}

export function HandDebugVisualizer({
  wristPosition,
  indexBasePosition,
  pinkyBasePosition,
  allLandmarks = [],
  showConnections = true,
}: HandDebugVisualizerProps) {
  const wristRef = useRef<THREE.Mesh>(null)
  const indexRef = useRef<THREE.Mesh>(null)
  const pinkyRef = useRef<THREE.Mesh>(null)
  const landmarksGroupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (wristRef.current && wristPosition) {
      wristRef.current.position.set(wristPosition.x, wristPosition.y, wristPosition.z)
    }
    if (indexRef.current && indexBasePosition) {
      indexRef.current.position.set(indexBasePosition.x, indexBasePosition.y, indexBasePosition.z)
    }
    if (pinkyRef.current && pinkyBasePosition) {
      pinkyRef.current.position.set(pinkyBasePosition.x, pinkyBasePosition.y, pinkyBasePosition.z)
    }
  })

  if (!wristPosition) return null

  return (
    <group>
      {/* Wrist marker (red) */}
      <mesh ref={wristRef}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
      </mesh>

      {/* Index base marker (green) */}
      {indexBasePosition && (
        <mesh ref={indexRef}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.5} />
        </mesh>
      )}

      {/* Pinky base marker (orange) */}
      {pinkyBasePosition && (
        <mesh ref={pinkyRef}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.5} />
        </mesh>
      )}

      {/* All landmarks (small blue spheres) */}
      {allLandmarks.length > 0 && (
        <group ref={landmarksGroupRef}>
          {allLandmarks.map((landmark, index) => (
            <mesh key={index} position={[landmark.x, landmark.y, landmark.z]}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshStandardMaterial color="#60a5fa" emissive="#60a5fa" emissiveIntensity={0.3} />
            </mesh>
          ))}
        </group>
      )}

      {/* Connection lines */}
      {showConnections && indexBasePosition && pinkyBasePosition && (
        <>
          <Line
            points={[
              [wristPosition.x, wristPosition.y, wristPosition.z],
              [indexBasePosition.x, indexBasePosition.y, indexBasePosition.z],
            ]}
            color="#10b981"
          />
          <Line
            points={[
              [wristPosition.x, wristPosition.y, wristPosition.z],
              [pinkyBasePosition.x, pinkyBasePosition.y, pinkyBasePosition.z],
            ]}
            color="#f59e0b"
          />
          <Line
            points={[
              [indexBasePosition.x, indexBasePosition.y, indexBasePosition.z],
              [pinkyBasePosition.x, pinkyBasePosition.y, pinkyBasePosition.z],
            ]}
            color="#60a5fa"
          />
        </>
      )}
    </group>
  )
}

function Line({ points, color }: { points: [number, number, number][]; color: string }) {
  const ref = useRef<THREE.Line>(null)

  useFrame(() => {
    if (ref.current) {
      const geometry = ref.current.geometry as THREE.BufferGeometry
      const positions = new Float32Array(points.flat())
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geometry.computeBoundingSphere()
    }
  })

  return (
    <line ref={ref}>
      <bufferGeometry />
      <lineBasicMaterial color={color} linewidth={2} />
    </line>
  )
}
