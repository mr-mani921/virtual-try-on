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
  adaptiveReference?: boolean
}

interface DynamicScaleResult {
  dynamicScale: number
  handWidth: number
  wristDepth: number
  isStable: boolean
}

/**
 * Calculate wrist circumference estimate from multiple landmarks.
 * Uses world coordinates for accurate perspective-independent measurement.
 */
function calculateWristSize(
  wrist: THREE.Vector3,
  indexBase: THREE.Vector3,
  pinkyBase: THREE.Vector3
): number {
  // Distance across knuckles (index to pinky)
  const knuckleWidth = indexBase.distanceTo(pinkyBase)
  
  // Distance from wrist to midpoint of knuckles
  const midKnuckle = new THREE.Vector3()
    .addVectors(indexBase, pinkyBase)
    .multiplyScalar(0.5)
  const handLength = wrist.distanceTo(midKnuckle)
  
  // Wrist size is roughly proportional to knuckle width and hand length
  // Average adult wrist: 165mm, knuckle width: ~75mm, hand length: ~100mm
  // Scale factor = sqrt(knuckleWidth^2 + handLength^2) for rotational invariance
  return Math.sqrt(knuckleWidth * knuckleWidth + handLength * handLength)
}

/**
 * Calculate actual depth (distance from camera) in world space
 */
function calculateWristDepth(wrist: THREE.Vector3, cameraPosition: THREE.Vector3): number {
  return wrist.distanceTo(cameraPosition)
}

/**
 * Exponential moving average with outlier rejection
 */
class RobustEMA {
  private value: number
  private initialized: boolean
  private alpha: number
  private history: number[] = []
  private maxHistory: number = 30

  constructor(alpha: number = 0.2) {
    this.value = 0
    this.initialized = false
    this.alpha = alpha
  }

  update(newValue: number): number {
    // Reject extreme outliers (beyond 3 standard deviations)
    if (this.history.length >= 10) {
      const mean = this.history.reduce((a, b) => a + b, 0) / this.history.length
      const variance = this.history.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.history.length
      const stdDev = Math.sqrt(variance)
      
      if (Math.abs(newValue - mean) > 3 * stdDev) {
        // Outlier detected, use previous value
        return this.value
      }
    }

    // Update history
    this.history.push(newValue)
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    }

    // Update EMA
    if (!this.initialized) {
      this.value = newValue
      this.initialized = true
    } else {
      this.value = this.alpha * newValue + (1 - this.alpha) * this.value
    }

    return this.value
  }

  getValue(): number {
    return this.value
  }

  isStable(): boolean {
    if (this.history.length < 10) return false
    
    const recentHistory = this.history.slice(-10)
    const mean = recentHistory.reduce((a, b) => a + b, 0) / recentHistory.length
    const variance = recentHistory.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentHistory.length
    
    // Stable if coefficient of variation is low
    return (Math.sqrt(variance) / mean) < 0.05
  }

  reset() {
    this.initialized = false
    this.history = []
  }
}

/**
 * Improved dynamic scaling hook with perspective correction and adaptive reference values
 */
export function useDynamicScale(
  handDetection: HandDetection | null,
  options: DynamicScaleOptions = {}
): DynamicScaleResult {
  const {
    baseScale = 1.5,
    minScale = 0.8,
    maxScale = 3.0,
    smoothing = 0.2,
    enabled = true,
    adaptiveReference = true,
  } = options

  const [dynamicScale, setDynamicScale] = useState(baseScale)
  const [handWidth, setHandWidth] = useState(0)
  const [wristDepth, setWristDepth] = useState(0)
  const [isStable, setIsStable] = useState(false)

  // Camera position (assumed at origin for unprojected world coordinates)
  const cameraPosition = useRef(new THREE.Vector3(0, 0, 0))

  // Robust exponential moving averages
  const sizeEMA = useRef(new RobustEMA(smoothing))
  const depthEMA = useRef(new RobustEMA(smoothing))
  const scaleEMA = useRef(new RobustEMA(smoothing * 0.5)) // Slower for scale

  // Adaptive reference values (use median of first 30 frames)
  const referenceSize = useRef(0)
  const referenceDepth = useRef(0)
  const calibrationSamples = useRef<{ size: number; depth: number }[]>([])
  const isCalibrated = useRef(false)
  const calibrationFrames = 30

  useEffect(() => {
    if (!handDetection || !enabled) {
      setIsStable(false)
      return
    }

    // Convert landmarks to world space vectors
    const wrist = new THREE.Vector3(
      handDetection.landmarks.wrist.x,
      handDetection.landmarks.wrist.y,
      handDetection.landmarks.wrist.z
    )
    const indexBase = new THREE.Vector3(
      handDetection.landmarks.indexBase.x,
      handDetection.landmarks.indexBase.y,
      handDetection.landmarks.indexBase.z
    )
    const pinkyBase = new THREE.Vector3(
      handDetection.landmarks.pinkyBase.x,
      handDetection.landmarks.pinkyBase.y,
      handDetection.landmarks.pinkyBase.z
    )

    // Calculate metrics
    const currentSize = calculateWristSize(wrist, indexBase, pinkyBase)
    const currentDepth = calculateWristDepth(wrist, cameraPosition.current)

    // Smooth measurements
    const smoothedSize = sizeEMA.current.update(currentSize)
    const smoothedDepth = depthEMA.current.update(currentDepth)

    setHandWidth(smoothedSize)
    setWristDepth(smoothedDepth)

    // Calibration phase: collect reference samples
    if (!isCalibrated.current) {
      calibrationSamples.current.push({ size: smoothedSize, depth: smoothedDepth })
      
      if (calibrationSamples.current.length >= calibrationFrames) {
        // Use median for robustness against outliers
        const sizes = calibrationSamples.current.map(s => s.size).sort((a, b) => a - b)
        const depths = calibrationSamples.current.map(s => s.depth).sort((a, b) => a - b)
        
        referenceSize.current = sizes[Math.floor(sizes.length / 2)]
        referenceDepth.current = depths[Math.floor(depths.length / 2)]
        isCalibrated.current = true
      } else {
        // During calibration, use base scale
        setDynamicScale(baseScale)
        setIsStable(false)
        return
      }
    }

    // Adaptive reference update (slowly drift toward current values)
    if (adaptiveReference && isCalibrated.current) {
      const adaptRate = 0.001 // Very slow adaptation
      referenceSize.current = referenceSize.current * (1 - adaptRate) + smoothedSize * adaptRate
      referenceDepth.current = referenceDepth.current * (1 - adaptRate) + smoothedDepth * adaptRate
    }

    // Calculate scale factors with perspective correction

    // 1. Size factor (larger wrist = larger watch)
    const sizeFactor = smoothedSize / referenceSize.current

    // 2. Depth factor with inverse square falloff for natural perspective
    // Objects appear smaller with distance (inverse relationship)
    // Scale proportionally to (referenceDepth / currentDepth)
    const depthRatio = referenceDepth.current / smoothedDepth
    // Apply square root to moderate the effect
    const depthFactor = Math.pow(depthRatio, 0.7)

    // Combine factors
    let targetScale = baseScale * sizeFactor * depthFactor

    // Clamp to range
    targetScale = Math.max(minScale, Math.min(maxScale, targetScale))

    // Apply final smoothing
    const finalScale = scaleEMA.current.update(targetScale)
    setDynamicScale(finalScale)

    // Update stability
    const stable = sizeEMA.current.isStable() && depthEMA.current.isStable() && scaleEMA.current.isStable()
    setIsStable(stable)

  }, [handDetection, baseScale, minScale, maxScale, smoothing, enabled, adaptiveReference])

  // Reset when hand is lost
  useEffect(() => {
    if (!handDetection) {
      isCalibrated.current = false
      calibrationSamples.current = []
      sizeEMA.current.reset()
      depthEMA.current.reset()
      scaleEMA.current.reset()
      setDynamicScale(baseScale)
      setIsStable(false)
    }
  }, [handDetection, baseScale])

  return {
    dynamicScale,
    handWidth,
    wristDepth,
    isStable,
  }
}
