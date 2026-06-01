'use client'

import { Environment as DreiEnvironment } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'

interface EnvironmentProps {
  preset?: 'sunset' | 'dawn' | 'night' | 'warehouse' | 'forest' | 'apartment' | 'studio' | 'city' | 'park' | 'lobby'
  background?: boolean
  blur?: number
  intensity?: number
}

/**
 * PBR Environment component with HDR lighting and reflections.
 * Provides realistic illumination for metallic and glass materials.
 */
export function Environment({
  preset = 'studio',
  background = false,
  blur = 0.1,
  intensity = 1.0,
}: EnvironmentProps) {
  const { gl } = useThree()

  useEffect(() => {
    // Enable tone mapping for realistic HDR rendering
    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.toneMappingExposure = 1.2
    gl.outputColorSpace = THREE.SRGBColorSpace
  }, [gl])

  return (
    <DreiEnvironment
      preset={preset}
      background={background}
      blur={blur}
      environmentIntensity={intensity}
    />
  )
}
