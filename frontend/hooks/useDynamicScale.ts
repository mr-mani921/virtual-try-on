'use client'

import { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { HandDetection } from '@/lib/mediapipe/types'

interface DynamicScaleOptions {
  baseScale?: number
  minScale?: number
  maxScale?: number
  smoothing?: number
  enabled?: boolean
}

interface DynamicScaleResult {
  dynamicScale: number
  handWidth: number
  averageDepth: number
  isStable: boolean
}

/**
 * Calculate hand width from index and pinky base landmarks
 */
function calculateHandWidth(handDetection: HandDetection): number {
  const indexBase = handDetection.landmarks.indexBase
  const pinkyBase = handDetection.landmarks.pinkyBase

  // Calculate Euclidean distance in 3D space
  const dx = indexBase.x - pinkyBase.x
  const dy = indexBase.y - pinkyBase.y
  const dz = indexBase.z - pinkyBase.z

  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/**
 * Calculate average depth (z-coordinate) of key landmarks
 */
function calculateAverageDepth(handDetection: HandDetection): number {
  const wrist = handDetection.landmarks.wrist
  const indexBase = handDetection.landmarks.indexBase
  const pinkyBase = handDetection.landmarks.pinkyBase

  return (wrist.z + indexBase.z + pinkyBase.z) / 3
}

/**
 * Dynamic scaling hook that adjusts watch size based on hand width and depth
 */
export function useDynamicScale(
  handDetection: HandDetection | null,
  options: DynamicScaleOptions = {}
): DynamicScaleResult {
  const {
    baseScale = 1.5,
    minScale = 0.8,
    maxScale = 3.0,
    smoothing = 0.15,
    enabled = true,
  } = options

  const [dynamicScale, setDynamicScale] = useState(baseScale)
  const [handWidth, setHandWidth] = useState(0)
  const [averageDepth, setAverageDepth] = useState(0)
  const [isStable, setIsStable] = useState(false)

  // Reference values for normalization
  const referenceHandWidth = useRef(0)
  const referenceDepth = useRef(0)
  const isInitialized = useRef(false)

  // Smoothing buffer to prevent jumps
  const scaleHistory = useRef<number[]>([])
  const maxHistorySize = 10

  useEffect(() => {
    if (!handDetection || !enabled) {
      setIsStable(false)
      return
    }

    // Calculate current hand metrics
    const currentHandWidth = calculateHandWidth(handDetection)
    const currentDepth = calculateAverageDepth(handDetection)

    setHandWidth(currentHandWidth)
    setAverageDepth(currentDepth)

    // Initialize reference values on first detection
    if (!isInitialized.current) {
      referenceHandWidth.current = currentHandWidth
      referenceDepth.current = currentDepth
      isInitialized.current = true
      setDynamicScale(baseScale)
      setIsStable(true)
      return
    }

    // Calculate scale factors

    // 1. Hand width factor (accounts for hand size variations)
    const widthFactor = currentHandWidth / referenceHandWidth.current

    // 2. Depth factor (accounts for camera distance)
    // Negative z = closer to camera, positive z = farther
    // More negative = larger scale needed
    const depthDelta = currentDepth - referenceDepth.current
    const depthFactor = 1 - depthDelta * 2 // Scale by 2x for visible effect

    // Combine factors
    let targetScale = baseScale * widthFactor * depthFactor

    // Clamp to min/max range
    targetScale = Math.max(minScale, Math.min(maxScale, targetScale))

    // Add to history for smoothing
    scaleHistory.current.push(targetScale)
    if (scaleHistory.current.length > maxHistorySize) {
      scaleHistory.current.shift()
    }

    // Calculate smoothed scale (moving average)
    const smoothedScale =
      scaleHistory.current.reduce((sum, val) => sum + val, 0) /
      scaleHistory.current.length

    // Apply additional lerp smoothing
    setDynamicScale((prevScale) => {
      const newScale = THREE.MathUtils.lerp(prevScale, smoothedScale, smoothing)
      return newScale
    })

    // Check if scale is stable (not changing rapidly)
    if (scaleHistory.current.length >= maxHistorySize) {
      const variance =
        scaleHistory.current.reduce((sum, val) => {
          const diff = val - smoothedScale
          return sum + diff * diff
        }, 0) / scaleHistory.current.length

      setIsStable(variance < 0.01) // Stable if variance is low
    }
  }, [handDetection, baseScale, minScale, maxScale, smoothing, enabled])

  // Reset when hand is lost
  useEffect(() => {
    if (!handDetection) {
      isInitialized.current = false
      scaleHistory.current = []
      setDynamicScale(baseScale)
    }
  }, [handDetection, baseScale])

  return {
    dynamicScale,
    handWidth,
    averageDepth,
    isStable,
  }
}
