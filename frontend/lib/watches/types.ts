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
  
  // ═══════════════════════════════════════════════════════════════════════
  // CALIBRATION SYSTEM V2 - Transform Parameters
  // ═══════════════════════════════════════════════════════════════════════
  
  /**
   * Scale multiplier applied to normalized model size
   * Range: 0.5 (small/slim watches) to 3.0 (large/bulky watches)
   * Default: 1.5
   */
  scale: number
  
  /**
   * Rotation offset applied in wrist local coordinate frame
   * Applied AFTER wrist quaternion computation
   * 
   * Common values:
   * - x: π/2 (90°) - Rotates watch face to align with wrist dorsal side
   * - y: 0 - No lateral rotation adjustment
   * - z: 0 - No twist adjustment
   * 
   * Units: radians
   */
  rotationOffset: { x: number; y: number; z: number }
  
  /**
   * Position offset in wrist local coordinate frame
   * Applied BEFORE palm normal depth adjustment
   * 
   * Axes (wrist local frame):
   * - x: Lateral shift (positive = toward pinky)
   * - y: Depth into wrist (positive = deeper, see wristFitBias for details)
   * - z: Along forearm (positive = toward fingers)
   * 
   * Units: world units (typically meters)
   * Range: -0.05 to 0.05 for most adjustments
   */
  positionOffset: { x: number; y: number; z: number }
  
  /**
   * Per-watch wrist depth bias (additive to positionOffset.y)
   * Controls how deep the watch sits INTO the wrist surface
   * 
   * Use cases:
   * - Positive values: Bulky/thick watches that need to sink deeper
   * - Negative values: Slim/flat watches that sit more on surface
   * - Zero: Standard fit (watch sits at wrist surface)
   * 
   * Applied along palm normal vector for stable surface anchoring
   * 
   * Range: -0.02 (surface) to 0.02 (deep)
   * Default: 0
   */
  wristFitBias?: number
  
  /**
   * Occluder offset for depth-based wrist occlusion
   * Adjusts invisible geometry that hides watch when hand covers it
   * 
   * Typically matches positionOffset for consistent depth handling
   * 
   * Units: world units
   */
  occluderOffset?: { x: number; y: number; z: number }
  
  // ═══════════════════════════════════════════════════════════════════════
  // MOTION SMOOTHING PARAMETERS
  // ═══════════════════════════════════════════════════════════════════════
  
  /**
   * Position smoothing factor (lerp alpha)
   * Applied AFTER One Euro Filter
   * 
   * Range: 0.15 (heavy smoothing) to 0.5 (light smoothing)
   * Default: 0.3 (validated optimal)
   */
  smoothing?: number
  
  /**
   * Rotation smoothing factor (slerp alpha)
   * Independent from position smoothing
   * 
   * Range: 0.3 (heavy smoothing) to 0.85 (light smoothing)
   * Default: 0.6 (preserves full rotation range, validated)
   * 
   * CRITICAL: Values <0.5 may cause rotation compression
   */
  rotationSmoothing?: number
  
  // ═══════════════════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════════════════
  
  description?: string
  price?: string
}

export interface WatchRegistry {
  [key: string]: WatchConfiguration
}
