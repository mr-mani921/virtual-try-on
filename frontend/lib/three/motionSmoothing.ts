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
 * Combined stabilizer: One Euro Filter + Velocity-Adaptive Slerp
 */
export class MotionStabilizer {
  private positionFilter: OneEuroFilter3D
  private rotationFilter: OneEuroFilterQuaternion
  private velocityAdapter: VelocityAdaptiveSmoothing

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
    return this.velocityAdapter.getAdaptiveAlpha(position, timestamp)
  }

  reset() {
    this.positionFilter.reset()
    this.rotationFilter.reset()
    this.velocityAdapter.reset()
  }
}
