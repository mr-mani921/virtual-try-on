'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import type { HandDetection } from '@/lib/mediapipe/types'
import {
  landmarkToWorld,
  computeWristQuaternion,
  type WorldCoordinates,
  type CoordinateMappingOptions,
} from '@/lib/three/coordinateMapping'

interface UseCoordinateMappingOptions {
  videoWidth?: number
  videoHeight?: number
  flipHorizontal?: boolean
}

interface MappedHandData {
  wristPosition: WorldCoordinates
  indexBasePosition: WorldCoordinates
  pinkyBasePosition: WorldCoordinates
  handOrientation: THREE.Quaternion
  allLandmarksWorld: WorldCoordinates[]
}

export function useCoordinateMapping(
  handDetection: HandDetection | null,
  camera: THREE.Camera | null,
  options: UseCoordinateMappingOptions = {}
) {
  const {
    videoWidth = 1280,
    videoHeight = 720,
    flipHorizontal = true,
  } = options

  const mappedData = useMemo<MappedHandData | null>(() => {
    if (!handDetection || !camera) return null

    const mappingOptions: CoordinateMappingOptions = {
      videoWidth,
      videoHeight,
      camera,
      flipHorizontal,
    }

    const wristPosition = landmarkToWorld(
      handDetection.landmarks.wrist,
      mappingOptions
    )

    const indexBasePosition = landmarkToWorld(
      handDetection.landmarks.indexBase,
      mappingOptions
    )

    const pinkyBasePosition = landmarkToWorld(
      handDetection.landmarks.pinkyBase,
      mappingOptions
    )

    const handOrientation = computeWristQuaternion(
      wristPosition,
      indexBasePosition,
      pinkyBasePosition
    )

    const allLandmarksWorld = handDetection.landmarks.allLandmarks.map(landmark =>
      landmarkToWorld(landmark, mappingOptions)
    )

    return {
      wristPosition,
      indexBasePosition,
      pinkyBasePosition,
      handOrientation,
      allLandmarksWorld,
    }
  }, [handDetection, camera, videoWidth, videoHeight, flipHorizontal])

  return mappedData
}
