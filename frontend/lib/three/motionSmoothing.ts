import * as THREE from 'three'
import type { WorldCoordinates } from './coordinateMapping'

/**
 * One Euro Filter - A low-pass filter with automatic cutoff frequency adjustment
 * based on signal velocity. Reduces jitter while maintaining responsiveness.
 * 
 * Paper: "1€ Filter: A Simple Speed-based Low-pass Filter for Noisy Input in Interactive Systems"
 * https://cristal.univ-lille.fr/~casiez/1euro/
 */
export class OneEuroFilter {
  private x: number
  private dx: number
  private lastTime: number
  
  private minCutoff: number
  private beta: number
  private dCutoff: number

  constructor(minCutoff: number = 1.0, beta: number = 0.007, dCutoff: number = 1.0) {
    this.minCutoff = minCutoff
    this.beta = beta
    this.dCutoff = dCutoff
    
    this.x = 0
    this.dx = 0
    this.lastTime = 0
  }

  private lowPassFilter(x: number, cutoff: number, dt: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff)
    const alpha = dt / (dt + tau)
    return alpha * x + (1 - alpha) * this.x
  }

  filter(x: number, timestamp: number = Date.now()): number {
    const dt = timestamp - this.lastTime
    
    if (this.lastTime === 0 || dt <= 0) {
      this.lastTime = timestamp
      this.x = x
      this.dx = 0
      return x
    }

    // Estimate velocity
    const velocity = (x - this.x) / dt
    const filteredDx = this.lowPassFilter(velocity, this.dCutoff, dt)
    
    // Adaptive cutoff based on velocity
    const cutoff = this.minCutoff + this.beta * Math.abs(filteredDx)
    
    // Filter position
    const filtered = this.lowPassFilter(x, cutoff, dt)
    
    this.x = filtered
    this.dx = filteredDx
    this.lastTime = timestamp
    
    return filtered
  }

  reset() {
    this.x = 0
    this.dx = 0
    this.lastTime = 0
  }
}

/**
 * 3D One Euro Filter for Vector3 coordinates
 */
export class OneEuroFilter3D {
  private xFilter: OneEuroFilter
  private yFilter: OneEuroFilter
  private zFilter: OneEuroFilter

  constructor(minCutoff: number = 1.0, beta: number = 0.007) {
    this.xFilter = new OneEuroFilter(minCutoff, beta)
    this.yFilter = new OneEuroFilter(minCutoff, beta)
    this.zFilter = new OneEuroFilter(minCutoff, beta)
  }

  filter(coords: WorldCoordinates, timestamp?: number): WorldCoordinates {
    return {
      x: this.xFilter.filter(coords.x, timestamp),
      y: this.yFilter.filter(coords.y, timestamp),
      z: this.zFilter.filter(coords.z, timestamp),
    }
  }

  reset() {
    this.xFilter.reset()
    this.yFilter.reset()
    this.zFilter.reset()
  }
}

/**
 * Quaternion One Euro Filter for smooth rotation tracking
 */
export class OneEuroFilterQuaternion {
  private xFilter: OneEuroFilter
  private yFilter: OneEuroFilter
  private zFilter: OneEuroFilter
  private wFilter: OneEuroFilter

  constructor(minCutoff: number = 1.0, beta: number = 0.007) {
    this.xFilter = new OneEuroFilter(minCutoff, beta)
    this.yFilter = new OneEuroFilter(minCutoff, beta)
    this.zFilter = new OneEuroFilter(minCutoff, beta)
    this.wFilter = new OneEuroFilter(minCutoff, beta)
  }

  filter(quat: THREE.Quaternion, timestamp?: number): THREE.Quaternion {
    return new THREE.Quaternion(
      this.xFilter.filter(quat.x, timestamp),
      this.yFilter.filter(quat.y, timestamp),
      this.zFilter.filter(quat.z, timestamp),
      this.wFilter.filter(quat.w, timestamp)
    ).normalize()
  }

  reset() {
    this.xFilter.reset()
    this.yFilter.reset()
    this.zFilter.reset()
    this.wFilter.reset()
  }
}

/**
 * Velocity-based adaptive smoothing
 * Adjusts smoothing factor based on motion speed:
 * - Fast motion = higher alpha (more responsive)
 * - Slow motion = lower alpha (more stable)
 */
export class VelocityAdaptiveSmoothing {
  private lastPosition: WorldCoordinates | null = null
  private lastTime: number = 0
  private velocity: number = 0
  private velocityEMA: number = 0

  private minAlpha: number
  private maxAlpha: number
  private velocityThreshold: number

  constructor(
    minAlpha: number = 0.1,
    maxAlpha: number = 0.5,
    velocityThreshold: number = 0.05
  ) {
    this.minAlpha = minAlpha
    this.maxAlpha = maxAlpha
    this.velocityThreshold = velocityThreshold
  }

  getAdaptiveAlpha(position: WorldCoordinates, timestamp: number = Date.now()): number {
    if (!this.lastPosition || this.lastTime === 0) {
      this.lastPosition = { ...position }
      this.lastTime = timestamp
      return this.maxAlpha
    }

    const dt = Math.max((timestamp - this.lastTime) / 1000, 0.001)

    // Calculate velocity magnitude
    const dx = position.x - this.lastPosition.x
    const dy = position.y - this.lastPosition.y
    const dz = position.z - this.lastPosition.z
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
    this.velocity = distance / dt

    // Smooth velocity with EMA
    this.velocityEMA = 0.7 * this.velocityEMA + 0.3 * this.velocity

    // Map velocity to alpha (higher velocity = higher alpha = faster response)
    const normalized = Math.min(this.velocityEMA / this.velocityThreshold, 1)
    const alpha = this.minAlpha + normalized * (this.maxAlpha - this.minAlpha)

    this.lastPosition = { ...position }
    this.lastTime = timestamp

    return alpha
  }

  reset() {
    this.lastPosition = null
    this.lastTime = 0
    this.velocity = 0
    this.velocityEMA = 0
  }
}

/**
 * Frame-to-frame quaternion smoother using pure slerp with explicit dot-product
 * sign correction.
 *
 * Why sign correction matters
 * ───────────────────────────
 * A unit quaternion Q and −Q represent the same rotation in SO(3), but they
 * live on opposite poles of the 4D unit sphere (S³).  Slerp always travels
 * along the SHORTER arc, but only if the two quaternions are in the same
 * hemisphere (dot ≥ 0).  If the raw target flips hemisphere between frames
 * (dot < 0), naïve slerp would travel the LONG way round, causing a visible
 * 360° spin artefact.  Negating the target before slerp brings it to the same
 * hemisphere without changing the represented rotation.
 *
 * Algorithm (per frame)
 * ─────────────────────
 *   1. if dot(previous, current) < 0 → negate current
 *   2. smoothed = slerp(previous, current, factor)   factor ∈ [0, 1]
 *   3. previous = smoothed
 *   4. return smoothed
 *
 * factor = 0 → stays at previous (maximum damping)
 * factor = 1 → snaps to current  (no smoothing)
 * Recommended range: 0.15 – 0.35
 *
 * All quaternion objects are pre-allocated at construction; update() never
 * allocates on the heap, making it safe to call every animation frame.
 */
export class QuaternionSmoother {
  private previous: THREE.Quaternion | null = null
  // result and signCorrected are reused every frame — no GC on hot path.
  private readonly result = new THREE.Quaternion()
  private readonly signCorrected = new THREE.Quaternion()

  constructor(private readonly defaultFactor: number = 0.25) {}

  /**
   * Advance the smoother by one frame.
   *
   * @param current  Raw target quaternion for this frame (not mutated).
   * @param factor   Slerp weight.  Defaults to the constructor value.
   * @returns        Smoothed quaternion (reference is stable until next call).
   */
  update(current: THREE.Quaternion, factor: number = this.defaultFactor): THREE.Quaternion {
    // First frame: snap immediately — no previous state to blend from.
    if (this.previous === null) {
      this.previous = current.clone()
      this.result.copy(current)
      return this.result
    }

    // ── Sign correction ──────────────────────────────────────────────────────
    // dot < 0 means previous and current are in opposite S³ hemispheres.
    // Negate current so slerp takes the short arc (< 180°) instead of long arc.
    const dot = this.previous.dot(current)
    if (dot < 0) {
      this.signCorrected.set(-current.x, -current.y, -current.z, -current.w)
    } else {
      this.signCorrected.copy(current)
    }

    // ── Slerp ────────────────────────────────────────────────────────────────
    // Interpolate from previous toward (sign-corrected) current by `factor`.
    this.result.copy(this.previous).slerp(this.signCorrected, factor)

    // Store smoothed result as previous for the next frame.
    this.previous.copy(this.result)

    return this.result
  }

  /** Reset to uninitialized state (e.g. when hand tracking is lost). */
  reset(): void {
    this.previous = null
    this.result.set(0, 0, 0, 1)
    this.signCorrected.set(0, 0, 0, 1)
  }
}

/**
 * Combined stabilizer: One Euro Filter + Velocity-Adaptive Slerp
 */
export class MotionStabilizer {
  private positionFilter: OneEuroFilter3D
  private rotationFilter: OneEuroFilterQuaternion
  private velocityAdapter: VelocityAdaptiveSmoothing

  // Debug metrics
  private positionVarianceHistory: number[] = []
  private velocityHistory: number[] = []
  private alphaHistory: number[] = []
  private readonly historySize = 60 // 1 second at 60 FPS

  constructor() {
    // Tuned parameters for watch AR tracking
    this.positionFilter = new OneEuroFilter3D(1.5, 0.01)
    this.rotationFilter = new OneEuroFilterQuaternion(2.0, 0.01)
    this.velocityAdapter = new VelocityAdaptiveSmoothing(0.15, 0.6, 0.08)
  }

  filterPosition(position: WorldCoordinates, timestamp?: number): WorldCoordinates {
    return this.positionFilter.filter(position, timestamp)
  }

  filterRotation(rotation: THREE.Quaternion, timestamp?: number): THREE.Quaternion {
    return this.rotationFilter.filter(rotation, timestamp)
  }

  getAdaptiveAlpha(position: WorldCoordinates, timestamp?: number): number {
    const alpha = this.velocityAdapter.getAdaptiveAlpha(position, timestamp)
    
    // Track alpha for metrics
    this.alphaHistory.push(alpha)
    if (this.alphaHistory.length > this.historySize) {
      this.alphaHistory.shift()
    }
    
    return alpha
  }

  /**
   * Record position variance for debugging
   * Call this with raw target position to measure jitter
   */
  recordPositionVariance(position: WorldCoordinates, previousPosition: WorldCoordinates | null): void {
    if (!previousPosition) return

    const dx = position.x - previousPosition.x
    const dy = position.y - previousPosition.y
    const dz = position.z - previousPosition.z
    const variance = Math.sqrt(dx * dx + dy * dy + dz * dz)

    this.positionVarianceHistory.push(variance)
    if (this.positionVarianceHistory.length > this.historySize) {
      this.positionVarianceHistory.shift()
    }

    // Track velocity for correlation analysis
    this.velocityHistory.push(this.velocityAdapter['velocity'] || 0)
    if (this.velocityHistory.length > this.historySize) {
      this.velocityHistory.shift()
    }
  }

  /**
   * Get debug metrics for position smoothing analysis
   */
  getDebugMetrics() {
    if (this.positionVarianceHistory.length === 0) {
      return null
    }

    const variance = this.positionVarianceHistory
    const velocity = this.velocityHistory
    const alpha = this.alphaHistory

    return {
      position: {
        currentVariance: variance[variance.length - 1] || 0,
        avgVariance: variance.reduce((a, b) => a + b, 0) / variance.length,
        maxVariance: Math.max(...variance),
        minVariance: Math.min(...variance),
        stdDev: this.calculateStdDev(variance),
      },
      velocity: {
        current: velocity[velocity.length - 1] || 0,
        avg: velocity.reduce((a, b) => a + b, 0) / velocity.length,
        max: Math.max(...velocity),
      },
      alpha: {
        current: alpha[alpha.length - 1] || 0,
        avg: alpha.reduce((a, b) => a + b, 0) / alpha.length,
        min: Math.min(...alpha),
        max: Math.max(...alpha),
      },
      sampleCount: variance.length,
    }
  }

  private calculateStdDev(values: number[]): number {
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    const squareDiffs = values.map(value => Math.pow(value - avg, 2))
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length
    return Math.sqrt(avgSquareDiff)
  }

  reset() {
    this.positionFilter.reset()
    this.rotationFilter.reset()
    this.velocityAdapter.reset()
    this.positionVarianceHistory = []
    this.velocityHistory = []
    this.alphaHistory = []
  }
}
