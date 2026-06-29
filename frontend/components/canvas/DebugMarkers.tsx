'use client'

import * as THREE from 'three'
import type { WorldCoordinates } from '@/lib/three/coordinateMapping'

interface DebugMarkersProps {
  wristPosition: WorldCoordinates | null
  palmNormal: THREE.Vector3 | null
  handOrientation: THREE.Quaternion | null
  enabled?: boolean
}

/**
 * TICKET 44e: Debug visualization markers for occlusion diagnosis
 */
export function DebugMarkers({
  wristPosition,
  palmNormal,
  handOrientation,
  enabled = true,
}: DebugMarkersProps) {
  if (!wristPosition || !enabled) return null

  // Wrist anchor (yellow sphere)
  const wristAnchor = (
    <mesh position={[wristPosition.x, wristPosition.y, wristPosition.z]}>
      <sphereGeometry args={[0.01, 16, 16]} />
      <meshBasicMaterial color="#ffff00" />
    </mesh>
  )

  // Palm normal (cyan arrow)
  const palmNormalArrow = palmNormal ? (
    <arrowHelper
      args={[
        palmNormal,
        new THREE.Vector3(wristPosition.x, wristPosition.y, wristPosition.z),
        0.05,
        0x00ffff,
        0.01,
        0.01,
      ]}
    />
  ) : null

  // Wrist forward direction (magenta arrow)
  const forwardDir = handOrientation ? (
    <arrowHelper
      args={[
        new THREE.Vector3(0, 0, 1).applyQuaternion(handOrientation),
        new THREE.Vector3(wristPosition.x, wristPosition.y, wristPosition.z),
        0.05,
        0xff00ff,
        0.01,
        0.01,
      ]}
    />
  ) : null

  return (
    <group>
      {wristAnchor}
      {palmNormalArrow}
      {forwardDir}
    </group>
  )
}
