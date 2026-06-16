'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import type { HandDetection } from '@/lib/mediapipe/types'
import {
  landmarkToWorld,
  computeWristQuaternion,
  computeWristQuaternionV2,
  computePalmNormal,
  type WorldCoordinates,
  type CoordinateMappingOptions,
} from '@/lib/three/coordinateMapping'

interface UseCoordinateMappingOptions {
  videoWidth?: number
  videoHeight?: number
  flipHorizontal?: boolean
  /**
   * Use V2 coordinate system with Middle MCP landmark for improved stability.
   * V2 provides:
   * - More stable perpendicular-to-palm orientation
   * - Reduced orientation flipping during hand rotation
   * - Better palm-up to back-hand transition behavior
   * - Anatomically correct dorsal-side alignment
   * 
   * Default: true (V2 enabled)
   */
  useV2CoordinateSystem?: boolean
}

interface MappedHandData {
  wristPosition: WorldCoordinates
  indexBasePosition: WorldCoordinates
  middleBasePosition: WorldCoordinates
  pinkyBasePosition: WorldCoordinates
  handOrientation: THREE.Quaternion
  /**
   * Direct palm normal: normalize(cross(indexBase - wrist, pinkyBase - wrist)).
   * Points toward the palmar side of the hand.
   * Negate to get the dorsal direction (where the watch sits).
   */
  palmNormal: THREE.Vector3
  allLandmarksWorld: WorldCoordinates[]
  /**
   * Indicates which coordinate system was used for handOrientation.
   * true = V2 (with Middle MCP), false = V1 (palm midpoint)
   */
  isV2: boolean
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
    useV2CoordinateSystem = true,
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

    const middleBasePosition = landmarkToWorld(
      handDetection.landmarks.middleBase,
      mappingOptions
    )

    const pinkyBasePosition = landmarkToWorld(
      handDetection.landmarks.pinkyBase,
      mappingOptions
    )

    // Choose coordinate system: V2 (with Middle MCP) or V1 (palm midpoint)
    const handOrientation = useV2CoordinateSystem
      ? computeWristQuaternionV2(
          wristPosition,
          indexBasePosition,
          middleBasePosition,
          pinkyBasePosition
        )
      : computeWristQuaternion(
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
      middleBasePosition,
      pinkyBasePosition,
      handOrientation,
      palmNormal,
      allLandmarksWorld,
      isV2: useV2CoordinateSystem,
    }
  }, [handDetection, camera, videoWidth, videoHeight, flipHorizontal, useV2CoordinateSystem])

  return mappedData
}
