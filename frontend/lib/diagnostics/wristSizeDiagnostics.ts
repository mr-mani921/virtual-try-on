/**
 * Wrist Size Measurement Diagnostics
 * 
 * Compares multiple anatomical measurements to identify the most stable
 * wrist-size metric across hand poses and camera distances.
 * 
 * NO smoothing, filtering, or temporal logic - pure measurement comparison.
 */

import * as THREE from 'three'
import type { HandDetection } from '@/lib/mediapipe/types'

/**
 * All candidate measurements for wrist sizing
 */
export interface WristSizeCandidates {
  // Current measurement (what we use now)
  indexToPinkyMCP: number          // Distance across knuckles
  
  // Wrist-to-knuckle distances (more stable to wrist reference)
  wristToIndexMCP: number           // Wrist to index base
  wristToPinkyMCP: number           // Wrist to pinky base
  wristToMiddleMCP: number          // Wrist to middle base
  
  // Average wrist metrics (potentially more stable)
  avgWristToKnuckle: number         // Average of index + pinky + middle
  wristCircumference: number        // Estimate from triangulation
  
  // Combined metrics (current approach)
  combinedSizeMetric: number        // sqrt(knuckleWidth² + handLength²)
}

/**
 * Variance statistics for each measurement over time
 */
export interface MeasurementVariance {
  mean: number
  variance: number
  stdDev: number
  coefficientOfVariation: number  // CV = stdDev / mean (stability metric)
  minValue: number
  maxValue: number
  range: number
  rangePercent: number              // (max - min) / mean * 100
}

/**
 * Complete diagnostic report
 */
export interface WristSizeDiagnostics {
  candidates: WristSizeCandidates
  sampleCount: number
  
  // Variance for each candidate
  variance: {
    indexToPinkyMCP: MeasurementVariance
    wristToIndexMCP: MeasurementVariance
    wristToPinkyMCP: MeasurementVariance
    wristToMiddleMCP: MeasurementVariance
    avgWristToKnuckle: MeasurementVariance
    wristCircumference: MeasurementVariance
    combinedSizeMetric: MeasurementVariance
  }
  
  // Current hand state (for correlation analysis)
  handState: {
    wristDepth: number
    palmOrientation: 'up' | 'down' | 'side' | 'unknown'
    fingerSpread: number              // Index-to-pinky angle
  }
}

/**
 * Calculate all candidate measurements from hand landmarks
 */
export function calculateWristSizeCandidates(
  handDetection: HandDetection
): WristSizeCandidates {
  // Convert landmarks to 3D vectors (world space from MediaPipe)
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
  const middleBase = new THREE.Vector3(
    handDetection.landmarks.middleBase.x,
    handDetection.landmarks.middleBase.y,
    handDetection.landmarks.middleBase.z
  )
  const pinkyBase = new THREE.Vector3(
    handDetection.landmarks.pinkyBase.x,
    handDetection.landmarks.pinkyBase.y,
    handDetection.landmarks.pinkyBase.z
  )

  // 1. Current measurement: index-to-pinky MCP
  const indexToPinkyMCP = indexBase.distanceTo(pinkyBase)

  // 2. Wrist-to-knuckle distances
  const wristToIndexMCP = wrist.distanceTo(indexBase)
  const wristToPinkyMCP = wrist.distanceTo(pinkyBase)
  const wristToMiddleMCP = wrist.distanceTo(middleBase)

  // 3. Average wrist-to-knuckle distance
  const avgWristToKnuckle = (wristToIndexMCP + wristToPinkyMCP + wristToMiddleMCP) / 3

  // 4. Wrist circumference estimate (triangulation from 3 points)
  // Using Heron's formula for triangle area, then estimating circumference
  const a = indexBase.distanceTo(pinkyBase)
  const b = pinkyBase.distanceTo(middleBase)
  const c = middleBase.distanceTo(indexBase)
  const s = (a + b + c) / 2
  const triangleArea = Math.sqrt(s * (s - a) * (s - b) * (s - c))
  // Approximate wrist as circle: area ≈ πr², circumference = 2πr
  const estimatedRadius = Math.sqrt(triangleArea / Math.PI)
  const wristCircumference = 2 * Math.PI * estimatedRadius

  // 5. Combined metric (current approach)
  const midKnuckle = new THREE.Vector3()
    .addVectors(indexBase, pinkyBase)
    .multiplyScalar(0.5)
  const handLength = wrist.distanceTo(midKnuckle)
  const combinedSizeMetric = Math.sqrt(
    indexToPinkyMCP * indexToPinkyMCP + 
    handLength * handLength
  )

  return {
    indexToPinkyMCP,
    wristToIndexMCP,
    wristToPinkyMCP,
    wristToMiddleMCP,
    avgWristToKnuckle,
    wristCircumference,
    combinedSizeMetric,
  }
}

/**
 * Calculate variance statistics for a series of measurements
 */
function calculateVariance(values: number[]): MeasurementVariance {
  if (values.length === 0) {
    return {
      mean: 0,
      variance: 0,
      stdDev: 0,
      coefficientOfVariation: 0,
      minValue: 0,
      maxValue: 0,
      range: 0,
      rangePercent: 0,
    }
  }

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)
  const coefficientOfVariation = mean !== 0 ? (stdDev / mean) * 100 : 0
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const range = maxValue - minValue
  const rangePercent = mean !== 0 ? (range / mean) * 100 : 0

  return {
    mean,
    variance,
    stdDev,
    coefficientOfVariation,
    minValue,
    maxValue,
    range,
    rangePercent,
  }
}

/**
 * Determine hand orientation from palm normal
 */
function determinePalmOrientation(
  wrist: THREE.Vector3,
  indexBase: THREE.Vector3,
  pinkyBase: THREE.Vector3,
  cameraPosition: THREE.Vector3
): 'up' | 'down' | 'side' | 'unknown' {
  // Compute palm normal
  const v1 = new THREE.Vector3().subVectors(indexBase, wrist)
  const v2 = new THREE.Vector3().subVectors(pinkyBase, wrist)
  const palmNormal = new THREE.Vector3().crossVectors(v1, v2).normalize()

  // Vector from wrist to camera
  const toCamera = new THREE.Vector3().subVectors(cameraPosition, wrist).normalize()

  // Dot product determines orientation
  const dot = palmNormal.dot(toCamera)

  if (dot > 0.7) return 'up'      // Palm facing camera
  if (dot < -0.7) return 'down'   // Back of hand facing camera
  if (Math.abs(dot) < 0.3) return 'side'  // Hand turned sideways
  return 'unknown'
}

/**
 * Calculate finger spread angle (index to pinky)
 */
function calculateFingerSpread(
  wrist: THREE.Vector3,
  indexBase: THREE.Vector3,
  pinkyBase: THREE.Vector3
): number {
  const toIndex = new THREE.Vector3().subVectors(indexBase, wrist).normalize()
  const toPinky = new THREE.Vector3().subVectors(pinkyBase, wrist).normalize()
  
  // Angle in degrees
  const dotProduct = toIndex.dot(toPinky)
  const angleRadians = Math.acos(Math.max(-1, Math.min(1, dotProduct)))
  return THREE.MathUtils.radToDeg(angleRadians)
}

/**
 * Accumulator for tracking variance over time
 */
export class WristSizeVarianceTracker {
  private history: {
    indexToPinkyMCP: number[]
    wristToIndexMCP: number[]
    wristToPinkyMCP: number[]
    wristToMiddleMCP: number[]
    avgWristToKnuckle: number[]
    wristCircumference: number[]
    combinedSizeMetric: number[]
  } = {
    indexToPinkyMCP: [],
    wristToIndexMCP: [],
    wristToPinkyMCP: [],
    wristToMiddleMCP: [],
    avgWristToKnuckle: [],
    wristCircumference: [],
    combinedSizeMetric: [],
  }

  private maxHistory = 300  // 5 seconds at 60fps

  /**
   * Add a new measurement sample
   */
  update(candidates: WristSizeCandidates): void {
    this.history.indexToPinkyMCP.push(candidates.indexToPinkyMCP)
    this.history.wristToIndexMCP.push(candidates.wristToIndexMCP)
    this.history.wristToPinkyMCP.push(candidates.wristToPinkyMCP)
    this.history.wristToMiddleMCP.push(candidates.wristToMiddleMCP)
    this.history.avgWristToKnuckle.push(candidates.avgWristToKnuckle)
    this.history.wristCircumference.push(candidates.wristCircumference)
    this.history.combinedSizeMetric.push(candidates.combinedSizeMetric)

    // Trim to max history
    Object.keys(this.history).forEach(key => {
      const arr = this.history[key as keyof typeof this.history]
      if (arr.length > this.maxHistory) {
        arr.shift()
      }
    })
  }

  /**
   * Get current diagnostics report
   */
  getDiagnostics(
    currentCandidates: WristSizeCandidates,
    handDetection: HandDetection,
    cameraPosition: THREE.Vector3
  ): WristSizeDiagnostics {
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

    return {
      candidates: currentCandidates,
      sampleCount: this.history.indexToPinkyMCP.length,
      variance: {
        indexToPinkyMCP: calculateVariance(this.history.indexToPinkyMCP),
        wristToIndexMCP: calculateVariance(this.history.wristToIndexMCP),
        wristToPinkyMCP: calculateVariance(this.history.wristToPinkyMCP),
        wristToMiddleMCP: calculateVariance(this.history.wristToMiddleMCP),
        avgWristToKnuckle: calculateVariance(this.history.avgWristToKnuckle),
        wristCircumference: calculateVariance(this.history.wristCircumference),
        combinedSizeMetric: calculateVariance(this.history.combinedSizeMetric),
      },
      handState: {
        wristDepth: wrist.distanceTo(cameraPosition),
        palmOrientation: determinePalmOrientation(wrist, indexBase, pinkyBase, cameraPosition),
        fingerSpread: calculateFingerSpread(wrist, indexBase, pinkyBase),
      },
    }
  }

  /**
   * Reset all history
   */
  reset(): void {
    Object.keys(this.history).forEach(key => {
      this.history[key as keyof typeof this.history] = []
    })
  }

  /**
   * Get sample count
   */
  getSampleCount(): number {
    return this.history.indexToPinkyMCP.length
  }
}
