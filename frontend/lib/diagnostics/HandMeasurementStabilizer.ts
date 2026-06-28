/**
 * HandMeasurementStabilizer - Stabilizes hand measurements before scaling
 *
 * Features:
 * - Rolling median filter (7-10 frames)
 * - Outlier rejection vs current median (not previous raw)
 * - Regime-change detection with buffer reset + seed
 *
 * @module HandMeasurementStabilizer
 */

export interface StabilizationConfig {
  /** Rolling median window size (7-10 frames) */
  medianWindowSize: number
  /** Max deviation from median before rejecting frame (0.25 = 25%) */
  outlierThreshold: number
  /** Raw vs stabilized drift that signals a pose regime change (0.30 = 30%) */
  regimeChangeThreshold: number
  /** Consecutive accepted frames above regime threshold before reset */
  regimeChangeFrames: number
}

export interface StabilizedMeasurement {
  /** Raw measurement from current frame */
  raw: number
  /** Stabilized measurement after median + outlier rejection */
  stabilized: number
  /** Current median of the buffer (before outlier rejection on this frame) */
  median: number
  /** Whether current frame was rejected as outlier */
  wasOutlier: boolean
  /** Number of frames in median buffer */
  bufferSize: number
  /** Deviation of raw from median as a fraction (0.25 = 25%) */
  deviationFromMedian: number
  /** Consecutive accepted frames where raw vs stabilized drift exceeds regime threshold */
  regimeChangeCounter: number
  /** Whether buffer was reset this frame due to regime change */
  bufferReset: boolean
  /** Total buffer resets since last explicit reset() call */
  bufferResetCount: number
}

const DEFAULT_CONFIG: StabilizationConfig = {
  medianWindowSize: 9,
  outlierThreshold: 0.25,
  regimeChangeThreshold: 0.30,
  regimeChangeFrames: 3,
}

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0

  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

function relativeDifference(a: number, b: number): number {
  const reference = Math.max(Math.abs(b), Number.EPSILON)
  return Math.abs(a - b) / reference
}

/**
 * Stabilizer for hand measurements using rolling median + outlier rejection
 */
export class HandMeasurementStabilizer {
  private config: StabilizationConfig
  private buffer: number[] = []
  private regimeChangeCounter = 0
  private bufferResetCount = 0

  constructor(config: Partial<StabilizationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Process new measurement
   */
  update(rawMeasurement: number): StabilizedMeasurement {
    const currentMedian =
      this.buffer.length > 0 ? calculateMedian(this.buffer) : rawMeasurement

    const deviationFromMedian =
      this.buffer.length > 0
        ? relativeDifference(rawMeasurement, currentMedian)
        : 0

    // Regime drift is measured against the current median so genuine pose
    // changes are detected even when individual frames are rejected as outliers.
    const regimeDrift =
      this.buffer.length > 0
        ? relativeDifference(rawMeasurement, currentMedian)
        : 0

    if (regimeDrift > this.config.regimeChangeThreshold) {
      this.regimeChangeCounter += 1
    } else {
      this.regimeChangeCounter = 0
    }

    let bufferReset = false

    if (this.regimeChangeCounter >= this.config.regimeChangeFrames) {
      this.seedBuffer(rawMeasurement)
      this.regimeChangeCounter = 0
      bufferReset = true
      this.bufferResetCount += 1

      return {
        raw: rawMeasurement,
        stabilized: rawMeasurement,
        median: currentMedian,
        wasOutlier: false,
        bufferSize: this.buffer.length,
        deviationFromMedian,
        regimeChangeCounter: 0,
        bufferReset: true,
        bufferResetCount: this.bufferResetCount,
      }
    }

    const isOutlier =
      this.buffer.length > 0 &&
      deviationFromMedian > this.config.outlierThreshold

    if (!isOutlier) {
      this.buffer.push(rawMeasurement)

      if (this.buffer.length > this.config.medianWindowSize) {
        this.buffer.shift()
      }

      const stabilized = calculateMedian(this.buffer)

      return {
        raw: rawMeasurement,
        stabilized,
        median: currentMedian,
        wasOutlier: false,
        bufferSize: this.buffer.length,
        deviationFromMedian,
        regimeChangeCounter: this.regimeChangeCounter,
        bufferReset,
        bufferResetCount: this.bufferResetCount,
      }
    }

    return {
      raw: rawMeasurement,
      stabilized: currentMedian,
      median: currentMedian,
      wasOutlier: true,
      bufferSize: this.buffer.length,
      deviationFromMedian,
      regimeChangeCounter: this.regimeChangeCounter,
      bufferReset: false,
      bufferResetCount: this.bufferResetCount,
    }
  }

  private seedBuffer(value: number): void {
    this.buffer = Array.from({ length: this.config.medianWindowSize }, () => value)
  }

  /**
   * Reset stabilizer state
   */
  reset(): void {
    this.buffer = []
    this.regimeChangeCounter = 0
    this.bufferResetCount = 0
  }

  /**
   * Get current configuration
   */
  getConfig(): StabilizationConfig {
    return { ...this.config }
  }

  /**
   * Update configuration (resets buffer)
   */
  setConfig(config: Partial<StabilizationConfig>): void {
    this.config = { ...this.config, ...config }
    this.reset()
  }
}

/**
 * Diagnostics for measurement stabilization
 */
export interface MeasurementStabilizationDiagnostics {
  raw: number
  stabilized: number
  median: number
  difference: number
  differencePercent: number
  wasOutlier: boolean
  bufferSize: number
  deviationFromMedian: number
  regimeChangeCounter: number
  bufferReset: boolean
  bufferResetCount: number
  windowSize: number
  outlierThreshold: number
  regimeChangeThreshold: number
  regimeChangeFrames: number
}

/**
 * Create diagnostics from stabilized measurement
 */
export function createStabilizationDiagnostics(
  measurement: StabilizedMeasurement,
  config: StabilizationConfig
): MeasurementStabilizationDiagnostics {
  const difference = measurement.stabilized - measurement.raw
  const differencePercent =
    measurement.raw !== 0 ? (difference / measurement.raw) * 100 : 0

  return {
    raw: measurement.raw,
    stabilized: measurement.stabilized,
    median: measurement.median,
    difference,
    differencePercent,
    wasOutlier: measurement.wasOutlier,
    bufferSize: measurement.bufferSize,
    deviationFromMedian: measurement.deviationFromMedian * 100,
    regimeChangeCounter: measurement.regimeChangeCounter,
    bufferReset: measurement.bufferReset,
    bufferResetCount: measurement.bufferResetCount,
    windowSize: config.medianWindowSize,
    outlierThreshold: config.outlierThreshold * 100,
    regimeChangeThreshold: config.regimeChangeThreshold * 100,
    regimeChangeFrames: config.regimeChangeFrames,
  }
}
