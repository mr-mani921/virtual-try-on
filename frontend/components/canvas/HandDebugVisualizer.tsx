'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { WorldCoordinates } from '@/lib/three/coordinateMapping'

// Axis length in world units — visible without cluttering the scene.
const AXIS_LENGTH = 0.45

interface HandDebugVisualizerProps {
  wristPosition: WorldCoordinates | null
  indexBasePosition: WorldCoordinates | null
  pinkyBasePosition: WorldCoordinates | null
  allLandmarks?: WorldCoordinates[]
  showConnections?: boolean
  /**
   * When provided alongside showAxes=true, draws the computed wrist
   * coordinate frame (X/Y/Z axes) at the wrist position.
   * X = red  (index → pinky)
   * Y = green (into palm, right-handed)
   * Z = blue  (wrist → fingers)
   */
  handOrientation?: THREE.Quaternion | null
  showAxes?: boolean
}

// Pre-allocated vectors reused every frame to avoid GC pressure.
const _xDir = new THREE.Vector3()
const _yDir = new THREE.Vector3()
const _zDir = new THREE.Vector3()

export function HandDebugVisualizer({
  wristPosition,
  indexBasePosition,
  pinkyBasePosition,
  allLandmarks = [],
  showConnections = true,
  handOrientation,
  showAxes = false,
}: HandDebugVisualizerProps) {
  const wristRef = useRef<THREE.Mesh>(null)
  const indexRef = useRef<THREE.Mesh>(null)
  const pinkyRef = useRef<THREE.Mesh>(null)
  const landmarksGroupRef = useRef<THREE.Group>(null)

  // Axis endpoint refs — each axis is a line from wrist to wrist + dir * length.
  const xAxisRef = useRef<[number, number, number][]>([[0,0,0],[1,0,0]])
  const yAxisRef = useRef<[number, number, number][]>([[0,0,0],[0,1,0]])
  const zAxisRef = useRef<[number, number, number][]>([[0,0,0],[0,0,1]])

  // Trigger axes re-render by bumping a version counter stored in a ref.
  const axesVersionRef = useRef(0)

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

    // Update axis endpoints from current wrist position and orientation.
    if (showAxes && wristPosition && handOrientation) {
      const ox = wristPosition.x
      const oy = wristPosition.y
      const oz = wristPosition.z

      _xDir.set(1, 0, 0).applyQuaternion(handOrientation).multiplyScalar(AXIS_LENGTH)
      _yDir.set(0, 1, 0).applyQuaternion(handOrientation).multiplyScalar(AXIS_LENGTH)
      _zDir.set(0, 0, 1).applyQuaternion(handOrientation).multiplyScalar(AXIS_LENGTH)

      xAxisRef.current = [[ox, oy, oz], [ox + _xDir.x, oy + _xDir.y, oz + _xDir.z]]
      yAxisRef.current = [[ox, oy, oz], [ox + _yDir.x, oy + _yDir.y, oz + _yDir.z]]
      zAxisRef.current = [[ox, oy, oz], [ox + _zDir.x, oy + _zDir.y, oz + _zDir.z]]
      axesVersionRef.current++
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

      {/* Wrist coordinate frame axes (optional)
          X = red   (+X: index → pinky)
          Y = green (+Y: into palm, right-handed cross product)
          Z = blue  (+Z: wrist → fingers / forearm direction)
      */}
      {showAxes && handOrientation && (
        <>
          <AxisLine pointsRef={xAxisRef} color="#ef4444" />
          <AxisLine pointsRef={yAxisRef} color="#10b981" />
          <AxisLine pointsRef={zAxisRef} color="#3b82f6" />
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

/**
 * Like Line but reads points from a ref each frame so the axis visualization
 * stays in sync with useFrame updates without triggering React re-renders.
 */
function AxisLine({
  pointsRef,
  color,
}: {
  pointsRef: React.MutableRefObject<[number, number, number][]>
  color: string
}) {
  const ref = useRef<THREE.Line>(null)

  useFrame(() => {
    if (ref.current) {
      const geometry = ref.current.geometry as THREE.BufferGeometry
      const positions = new Float32Array(pointsRef.current.flat())
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geometry.computeBoundingSphere()
    }
  })

  return (
    <line ref={ref}>
      <bufferGeometry />
      <lineBasicMaterial color={color} linewidth={3} />
    </line>
  )
}
