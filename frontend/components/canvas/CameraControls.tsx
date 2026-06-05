'use client'

import { OrbitControls as DreiOrbitControls } from '@react-three/drei'

export function CameraControls() {
  return (
    <DreiOrbitControls
      enableDamping
      dampingFactor={0.05}
      minDistance={2}
      maxDistance={10}
      minPolarAngle={Math.PI / 4}
      maxPolarAngle={Math.PI / 1.5}
    />
  )
}

