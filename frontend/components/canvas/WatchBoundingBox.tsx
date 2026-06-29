'use client'

import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import type { WorldCoordinates } from '@/lib/three/coordinateMapping'

interface WatchBoundingBoxProps {
  wristPosition: WorldCoordinates | null
  handOrientation?: THREE.Quaternion | null
  scale: number
  positionOffset?: { x: number; y: number; z: number }
  enabled?: boolean
}

/**
 * TICKET 44e: Watch bounding box visualization for occlusion debugging
 */
export function WatchBoundingBox({
  wristPosition,
  handOrientation,
  scale,
  positionOffset = { x: 0, y: 0, z: 0 },
  enabled = true,
}: WatchBoundingBoxProps) {
  const boxRef = useRef<THREE.LineSegments>(null)
  const groupRef = useRef<THREE.Group>(null)

  useEffect(() => {
    if (!groupRef.current || !wristPosition) return

    groupRef.current.position.set(wristPosition.x, wristPosition.y, wristPosition.z)
    
    if (handOrientation) {
      groupRef.current.quaternion.copy(handOrientation)
    }
  })

  if (!wristPosition || !enabled) return null

  // Approximate watch dimensions (adjust based on actual model)
  const width = 0.04 * scale
  const height = 0.01 * scale
  const depth = 0.04 * scale

  return (
    <group ref={groupRef}>
      <group position={[positionOffset.x, positionOffset.y, positionOffset.z]}>
        <boxHelper args={[new THREE.Mesh(new THREE.BoxGeometry(width, height, depth)), 0x00ff00]} />
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(width, height, depth)]} />
          <lineBasicMaterial color="#00ff00" linewidth={2} />
        </lineSegments>
      </group>
    </group>
  )
}
