'use client'

import { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { HandDetection } from '@/lib/mediapipe/types'
import { 
  calculateWristSizeCandidates,
  WristSizeVarianceTracker,
  type WristSizeDiagnostics as WristVarianceDiagnostics
} from '@/lib/diagnostics/wristSizeDiagnostics'
import {
  HandMeasurementStabilizer,
  createStabilizationDiagnostics,
  type MeasurementStabilizationDiagnostics
} from '@/lib/diagnostics/HandMeasurementStabilizer'

// Extend window for scale logging
declare global {
  interface Window {
    __lastScaleLogTime?: number
    __lastVarianceLogTime?: number
  }
}

interface DynamicScaleOptions {
  baseScale?: number
  minScale?: number
  maxScale?: number
  smoothing?: number
  enabled?: boolean
  adaptiveReference?: boolean
  // Ticket 44b: Size factor constraints
  minSizeFactor?: number
  maxSizeFactor?: number
  // Ticket 44c: Perspective scale rebalance
  sizeFactorInfluence?: number
  depthExponent?: number
}

interface DynamicScaleResult {
  dynamicScale: number
  handWidth: number
  wristDepth: number
  isStable: boolean
}

/**
 * Extended scale diagnostics for debugging scale growth issues
 */
export interface ScaleDiagnostics {
  // Screen-space measurements (2D normalized coordinates)
  screenKnuckleWidth: number
  
  // World-space measurements (3D world coordinates)
  worldKnuckleWidth: number
  worldHandLength: number
  worldWristSize: number
  
  // Depth measurements
  wristDepth: number
  referenceDepth: number
  
  // Scale factors
  sizeFactor: number
  sizeFactorRaw: number
  sizeFactorClamped: number
  sizeFactorClampedHit: boolean
  depthFactor: number
  depthRatio: number
  // Ticket 44c: Rebalance diagnostics
  sizeFactorInfluence: number
  depthExponent: number
  sizeContributionPercent: number
  depthContributionPercent: number
  
  // Final scale
  targetScale: number
  finalScale: number
  baseScale: number
  
  // Calibration status
  isCalibrated: boolean
  calibrationFrames: number
  
  // Measurement stabilization (Ticket 44a)
  stabilization: MeasurementStabilizationDiagnostics | null
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

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
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
): DynamicScaleResult & { 
  diagnostics: ScaleDiagnostics | null
  wristSizeVariance: WristVarianceDiagnostics | null
} {
  const {
    baseScale = 1.5,
    minScale = 0.8,
    maxScale = 3.0,
    smoothing = 0.2,
    enabled = true,
    adaptiveReference = true,
    minSizeFactor = 0.85,
    maxSizeFactor = 1.15,
    sizeFactorInfluence = 0.4,
    depthExponent = 0.85,
  } = options

  const [dynamicScale, setDynamicScale] = useState(baseScale)
  const [handWidth, setHandWidth] = useState(0)
  const [wristDepth, setWristDepth] = useState(0)
  const [isStable, setIsStable] = useState(false)
  const [diagnostics, setDiagnostics] = useState<ScaleDiagnostics | null>(null)
  const [wristSizeVariance, setWristSizeVariance] = useState<WristVarianceDiagnostics | null>(null)

  // Camera position (assumed at origin for unprojected world coordinates)
  const cameraPosition = useRef(new THREE.Vector3(0, 0, 0))

  // Robust exponential moving averages
  const sizeEMA = useRef(new RobustEMA(smoothing))
  const depthEMA = useRef(new RobustEMA(smoothing))
  const scaleEMA = useRef(new RobustEMA(smoothing * 0.5)) // Slower for scale

  // Wrist size variance tracker
  const varianceTracker = useRef(new WristSizeVarianceTracker())

  // Measurement stabilizer (Ticket 44a)
  const measurementStabilizer = useRef(new HandMeasurementStabilizer({
    medianWindowSize: 9,
    outlierThreshold: 0.25, // 25% max frame-to-frame change
  }))

  // Adaptive reference values (use median of first 30 frames)
  const referenceSize = useRef(0)
  const referenceDepth = useRef(0)
  const calibrationSamples = useRef<{ size: number; depth: number }[]>([])
  const isCalibrated = useRef(false)
  const calibrationFrames = 30

  useEffect(() => {
    if (!handDetection || !enabled) {
      setIsStable(false)
      setDiagnostics(null)
      setWristSizeVariance(null)
      return
    }

    // Calculate wrist size candidates for variance analysis
    const candidates = calculateWristSizeCandidates(handDetection)
    varianceTracker.current.update(candidates)

    // Calculate screen-space knuckle width (in normalized coordinates)
    const screenIndexBase = { x: handDetection.landmarks.indexBase.x, y: handDetection.landmarks.indexBase.y }
    const screenPinkyBase = { x: handDetection.landmarks.pinkyBase.x, y: handDetection.landmarks.pinkyBase.y }
    const screenKnuckleWidth = Math.sqrt(
      Math.pow(screenIndexBase.x - screenPinkyBase.x, 2) +
      Math.pow(screenIndexBase.y - screenPinkyBase.y, 2)
    )

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

    // Calculate world-space metrics
    const worldKnuckleWidth = indexBase.distanceTo(pinkyBase)
    
    // TICKET 44a.1: Stabilize knuckle width measurement
    const stabilizedMeasurement = measurementStabilizer.current.update(worldKnuckleWidth)

    // Create stabilization diagnostics
    const stabilizationDiagnostics = createStabilizationDiagnostics(
      stabilizedMeasurement,
      measurementStabilizer.current.getConfig()
    )
    
    const midKnuckle = new THREE.Vector3()
      .addVectors(indexBase, pinkyBase)
      .multiplyScalar(0.5)
    const worldHandLength = wrist.distanceTo(midKnuckle)

    // TICKET 44b: Use stabilized knuckle width for wrist size calculation
    const stabilizedKnuckleWidth = stabilizedMeasurement.stabilized
    const currentSize = Math.sqrt(
      stabilizedKnuckleWidth * stabilizedKnuckleWidth + 
      worldHandLength * worldHandLength
    )
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
        setDiagnostics({
          screenKnuckleWidth,
          worldKnuckleWidth,
          worldHandLength,
          worldWristSize: currentSize,
          wristDepth: currentDepth,
          referenceDepth: 0,
          sizeFactor: 1,
          sizeFactorRaw: 1,
          sizeFactorClamped: 1,
          sizeFactorClampedHit: false,
          depthFactor: 1,
          depthRatio: 1,
          sizeFactorInfluence,
          depthExponent,
          sizeContributionPercent: 0,
          depthContributionPercent: 0,
          targetScale: baseScale,
          finalScale: baseScale,
          baseScale,
          isCalibrated: false,
          calibrationFrames: calibrationSamples.current.length,
          stabilization: stabilizationDiagnostics,
        })
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
    const sizeFactorRaw = smoothedSize / referenceSize.current
    const sizeFactorClamped = clamp(sizeFactorRaw, minSizeFactor, maxSizeFactor)
    const sizeFactorClampedHit = sizeFactorClamped !== sizeFactorRaw
    // Ticket 44c: Dampen size influence toward neutral (1.0)
    const sizeFactor = lerp(1.0, sizeFactorClamped, sizeFactorInfluence)

    // 2. Depth factor — stronger perspective response (Ticket 44c)
    const depthRatio = referenceDepth.current / smoothedDepth
    const depthFactor = Math.pow(depthRatio, depthExponent)

    // Combine factors
    let targetScale = baseScale * sizeFactor * depthFactor

    const sizeContributionPercent = (sizeFactor - 1) * 100
    const depthContributionPercent = (depthFactor - 1) * 100

    // Clamp to range
    targetScale = Math.max(minScale, Math.min(maxScale, targetScale))

    // Apply final smoothing
    const finalScale = scaleEMA.current.update(targetScale)
    setDynamicScale(finalScale)

    // Update stability
    const stable = sizeEMA.current.isStable() && depthEMA.current.isStable() && scaleEMA.current.isStable()
    setIsStable(stable)

    // Update diagnostics
    setDiagnostics({
      screenKnuckleWidth,
      worldKnuckleWidth,
      worldHandLength,
      worldWristSize: smoothedSize,
      wristDepth: smoothedDepth,
      referenceDepth: referenceDepth.current,
      sizeFactor,
      sizeFactorRaw,
      sizeFactorClamped,
      sizeFactorClampedHit,
      depthFactor,
      depthRatio,
      sizeFactorInfluence,
      depthExponent,
      sizeContributionPercent,
      depthContributionPercent,
      targetScale,
      finalScale,
      baseScale,
      isCalibrated: true,
      calibrationFrames: calibrationSamples.current.length,
      stabilization: stabilizationDiagnostics,
    })

    // Update wrist size variance diagnostics
    const varianceDiagnostics = varianceTracker.current.getDiagnostics(
      candidates,
      handDetection,
      cameraPosition.current
    )
    setWristSizeVariance(varianceDiagnostics)

    // Console logging for scale growth investigation
    // Log every 1 second to avoid spamming the console
    const now = Date.now()
    if (!window.__lastScaleLogTime || now - window.__lastScaleLogTime > 1000) {
      window.__lastScaleLogTime = now
      
      const depthCm = Math.round(smoothedDepth * 100)
      let distanceCategory = 'Unknown'
      if (depthCm < 40) distanceCategory = '<40cm (Very Close)'
      else if (depthCm < 60) distanceCategory = '40-60cm (Close)'
      else if (depthCm < 80) distanceCategory = '60-80cm (Normal)'
      else if (depthCm < 120) distanceCategory = '80-120cm (Far)'
      else distanceCategory = '>120cm (Very Far)'

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('🔍 SCALE GROWTH INVESTIGATION')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`📏 Distance: ${distanceCategory} (${depthCm}cm)`)
      console.log('')
      console.log('📐 Screen-Space (2D Normalized):')
      console.log(`   Knuckle Width: ${screenKnuckleWidth.toFixed(6)}`)
      console.log('')
      console.log('🌍 World-Space (3D Reconstructed):')
      console.log(`   Knuckle Width: ${worldKnuckleWidth.toFixed(6)}`)
      console.log(`   Hand Length:   ${worldHandLength.toFixed(6)}`)
      console.log(`   Wrist Size:    ${smoothedSize.toFixed(6)}`)
      console.log('')
      console.log('📏 Depth Measurements:')
      console.log(`   Current Depth:   ${smoothedDepth.toFixed(6)} (${depthCm}cm)`)
      console.log(`   Reference Depth: ${referenceDepth.current.toFixed(6)}`)
      console.log(`   Depth Ratio:     ${depthRatio.toFixed(6)}`)
      console.log('')
      console.log('⚖️  Scale Factors (Ticket 44c Rebalance):')
      console.log(`   Size Factor (measured): ${sizeFactorRaw.toFixed(6)} (${((sizeFactorRaw - 1) * 100).toFixed(1)}%)`)
      console.log(`   Size Factor (clamped):  ${sizeFactorClamped.toFixed(6)} (${((sizeFactorClamped - 1) * 100).toFixed(1)}%)${sizeFactorClampedHit ? ' 🔒' : ''}`)
      console.log(`   Size Factor (applied):  ${sizeFactor.toFixed(6)} (${sizeContributionPercent.toFixed(1)}%) @ ${(sizeFactorInfluence * 100).toFixed(0)}% influence`)
      console.log(`   Depth Factor:           ${depthFactor.toFixed(6)} (${depthContributionPercent.toFixed(1)}%) @ exp ${depthExponent}`)
      console.log('')
      console.log('📊 Factor Contribution Audit:')
      console.log(`   Size contrib:  ${sizeContributionPercent.toFixed(1)}%`)
      console.log(`   Depth contrib: ${depthContributionPercent.toFixed(1)}%`)
      console.log(`   Net vs base:   ${((sizeFactor * depthFactor - 1) * 100).toFixed(1)}% (before final clamp/smooth)`)
      if (sizeFactorClampedHit) {
        console.log(`   Clamp range:   ${minSizeFactor.toFixed(2)} - ${maxSizeFactor.toFixed(2)}`)
      }
      console.log('')
      console.log('🎯 Final Scale:')
      console.log(`   Base Scale:   ${baseScale.toFixed(6)}`)
      console.log(`   Target Scale: ${targetScale.toFixed(6)}`)
      console.log(`   Final Scale:  ${finalScale.toFixed(6)}`)
      console.log('')
      console.log('⚠️  Scale Growth Analysis:')
      console.log(`   Scale vs Base: ${((finalScale / baseScale) * 100).toFixed(1)}% ${finalScale > baseScale * 1.2 ? '⚠️ HIGH INFLATION!' : ''}`)
      console.log(`   Depth contrib: ${depthContributionPercent.toFixed(1)}%`)
      console.log(`   Size contrib:  ${sizeContributionPercent.toFixed(1)}%`)
      console.log('')
      const driftAbs = Math.abs(stabilizationDiagnostics.differencePercent)
      const driftStatus =
        stabilizationDiagnostics.wasOutlier
          ? '🚫 OUTLIER REJECTED'
          : stabilizationDiagnostics.bufferReset
            ? '🔄 REGIME RESET'
            : driftAbs <= 10
              ? '✅'
              : driftAbs <= 30
                ? '⚠️ DRIFTING'
                : '❌ HIGH DRIFT'

      console.log('📊 MEASUREMENT STABILIZATION (Ticket 44a.1):')
      console.log(`   Raw Knuckle Width:        ${stabilizationDiagnostics.raw.toFixed(6)}`)
      console.log(`   Median (pre-frame):       ${stabilizationDiagnostics.median.toFixed(6)}`)
      console.log(`   Stabilized Knuckle Width: ${stabilizationDiagnostics.stabilized.toFixed(6)}`)
      console.log(`   Raw vs Stabilized:        ${stabilizationDiagnostics.differencePercent.toFixed(2)}% ${driftStatus}`)
      console.log(`   Deviation from Median:    ${stabilizationDiagnostics.deviationFromMedian.toFixed(2)}% (threshold: ${stabilizationDiagnostics.outlierThreshold.toFixed(0)}%)`)
      console.log(`   Regime Counter:           ${stabilizationDiagnostics.regimeChangeCounter}/${stabilizationDiagnostics.regimeChangeFrames} (>${stabilizationDiagnostics.regimeChangeThreshold.toFixed(0)}% drift)`)
      console.log(`   Buffer:                   ${stabilizationDiagnostics.bufferSize}/${stabilizationDiagnostics.windowSize} | Resets: ${stabilizationDiagnostics.bufferResetCount}`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    }

    // Wrist size variance logging (every 2 seconds, only if we have enough samples)
    if (varianceDiagnostics.sampleCount >= 30 && (!window.__lastVarianceLogTime || now - window.__lastVarianceLogTime > 2000)) {
      window.__lastVarianceLogTime = now

      // Rank measurements by stability
      const measurements = [
        { name: 'Index↔Pinky MCP (CURRENT)', variance: varianceDiagnostics.variance.indexToPinkyMCP },
        { name: 'Wrist→Index MCP', variance: varianceDiagnostics.variance.wristToIndexMCP },
        { name: 'Wrist→Pinky MCP', variance: varianceDiagnostics.variance.wristToPinkyMCP },
        { name: 'Wrist→Middle MCP', variance: varianceDiagnostics.variance.wristToMiddleMCP },
        { name: 'Avg Wrist→Knuckle', variance: varianceDiagnostics.variance.avgWristToKnuckle },
        { name: 'Wrist Circumference', variance: varianceDiagnostics.variance.wristCircumference },
        { name: 'Combined Metric', variance: varianceDiagnostics.variance.combinedSizeMetric },
      ].sort((a, b) => a.variance.coefficientOfVariation - b.variance.coefficientOfVariation)

      console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓')
      console.log('┃  WRIST SIZE MEASUREMENT VARIANCE ANALYSIS  ┃')
      console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛')
      console.log(`📊 Samples: ${varianceDiagnostics.sampleCount}`)
      console.log(`📍 Hand State: ${varianceDiagnostics.handState.palmOrientation.toUpperCase()} | Depth: ${Math.round(varianceDiagnostics.handState.wristDepth * 100)}cm | Spread: ${varianceDiagnostics.handState.fingerSpread.toFixed(1)}°`)
      console.log('')
      console.log('🏆 STABILITY RANKING (Lower CV% = More Stable):')
      console.log('─────────────────────────────────────────────')
      
      measurements.forEach((m, idx) => {
        const cv = m.variance.coefficientOfVariation
        const emoji = idx === 0 ? '✅' : idx === measurements.length - 1 ? '❌' : '  '
        const color = cv < 5 ? '🟢' : cv < 10 ? '🟡' : '🔴'
        console.log(`${emoji} #${idx + 1} ${color} ${m.name}`)
        console.log(`      CV: ${cv.toFixed(2)}% | Range: ${m.variance.rangePercent.toFixed(1)}% | Mean: ${m.variance.mean.toFixed(4)}`)
      })
      
      console.log('')
      console.log(`💡 RECOMMENDATION: Use "${measurements[0].name}"`)
      console.log(`   Current unstable measurement has ${measurements.find(m => m.name.includes('CURRENT'))?.variance.coefficientOfVariation.toFixed(2)}% CV`)
      console.log(`   Best measurement has ${measurements[0].variance.coefficientOfVariation.toFixed(2)}% CV`)
      console.log(`   Improvement: ${(100 - (measurements[0].variance.coefficientOfVariation / measurements.find(m => m.name.includes('CURRENT'))!.variance.coefficientOfVariation) * 100).toFixed(1)}%`)
      console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛')
    }

  }, [handDetection, baseScale, minScale, maxScale, smoothing, enabled, adaptiveReference, minSizeFactor, maxSizeFactor, sizeFactorInfluence, depthExponent])

  // Reset when hand is lost
  useEffect(() => {
    if (!handDetection) {
      isCalibrated.current = false
      calibrationSamples.current = []
      sizeEMA.current.reset()
      depthEMA.current.reset()
      scaleEMA.current.reset()
      varianceTracker.current.reset()
      measurementStabilizer.current.reset()
      setDynamicScale(baseScale)
      setIsStable(false)
      setDiagnostics(null)
      setWristSizeVariance(null)
    }
  }, [handDetection, baseScale])

  return {
    dynamicScale,
    handWidth,
    wristDepth,
    isStable,
    diagnostics,
    wristSizeVariance,
  }
}
