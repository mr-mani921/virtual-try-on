'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import type { HandDetection } from '@/lib/mediapipe/types'
import {
  landmarkToWorld,
  computePalmNormalFromLandmarks,
  computeWristQuaternionFromLandmarks,
  computeWristQuaternionV2FromLandmarks,
  type WorldCoordinates,
  type CoordinateMappingOptions,
  type LandmarkOrientationOptions,
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

    const orientationOptions: LandmarkOrientationOptions = {
      videoWidth,
      videoHeight,
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

    // Choose coordinate system: V2 (with Middle MCP) or V1 (palm midpoint).
    // Rotation is computed in MediaPipe's landmark-space 3D frame instead of
    // from camera-unprojected world positions. This keeps side wrist poses
    // anatomical: the watch face follows the palm/dorsal plane instead of
    // being biased back toward the camera plane.
    const handOrientation = useV2CoordinateSystem
      ? computeWristQuaternionV2FromLandmarks(
          handDetection.landmarks.wrist,
          handDetection.landmarks.indexBase,
          handDetection.landmarks.middleBase,
          handDetection.landmarks.pinkyBase,
          orientationOptions
        )
      : computeWristQuaternionFromLandmarks(
          handDetection.landmarks.wrist,
          handDetection.landmarks.indexBase,
          handDetection.landmarks.pinkyBase,
          orientationOptions
        )

    const palmNormal = computePalmNormalFromLandmarks(
      handDetection.landmarks.wrist,
      handDetection.landmarks.indexBase,
      handDetection.landmarks.pinkyBase,
      orientationOptions
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
