/**
 * Watch Configuration Types
 * Centralized type definitions for watch models and configurations
 */

export interface WatchTransform {
  scale: number
  rotationOffset: { x: number; y: number; z: number }
  positionOffset: { x: number; y: number; z: number }
}

export interface WatchConfiguration {
  id: string
  name: string
  brand?: string
  category?: 'sports' | 'luxury' | 'casual' | 'smart'
  thumbnail: string
  modelUrl: string
  scale: number
  rotationOffset: { x: number; y: number; z: number }
  positionOffset: { x: number; y: number; z: number }
  occluderOffset?: { x: number; y: number; z: number }
  smoothing?: number
  /**
   * TICKET 41d: Separate rotation smoothing factor
   * Controls quaternion slerp alpha (0.3-0.85)
   * Higher = more responsive, lower = more stable
   * Default: 0.6 (preserves rotation range while reducing jitter)
   */
  rotationSmoothing?: number
  description?: string
  price?: string
}

export interface WatchRegistry {
  [key: string]: WatchConfiguration
}
