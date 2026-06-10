'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import type { HandDetection } from '@/lib/mediapipe/types'
import {
  landmarkToWorld,
  computeWristQuaternion,
  computePalmNormal,
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
  /**
   * Direct palm normal: normalize(cross(indexBase - wrist, pinkyBase - wrist)).
   * Points toward the palmar side of the hand.
   * Negate to get the dorsal direction (where the watch sits).
   */
  palmNormal: THREE.Vector3
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

    const palmNormal = computePalmNormal(
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
      palmNormal,
      allLandmarksWorld,
    }
  }, [handDetection, camera, videoWidth, videoHeight, flipHorizontal])

  return mappedData
}
