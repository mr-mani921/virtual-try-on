import * as THREE from 'three'

/**
 * TICKET 43c: Tapered Wrist Geometry Generator
 * 
 * Creates an anatomically-accurate tapered cylinder for wrist occlusion.
 * Narrow at wrist position, gradually widens toward forearm.
 * 
 * Replaces uniform CylinderGeometry with tapered volume that better
 * matches natural wrist-to-forearm anatomy.
 */

export interface TaperedWristGeometryParams {
  /**
   * Number of segments around the circumference
   * Default: 32 (increased from 16 in V1 for smoother appearance)
   */
  radialSegments?: number
  
  /**
   * Number of segments along the height (length) axis
   * More segments = smoother taper transition
   * Default: 8
   */
  heightSegments?: number
  
  /**
   * Taper ratio: radius at wrist end relative to radius at forearm end
   * 
   * Examples:
   * - 1.0 = uniform cylinder (no taper, like V1)
   * - 0.8 = wrist is 80% of forearm width (natural anatomical taper)
   * - 0.6 = more aggressive taper (very narrow wrist)
   * 
   * Default: 0.75 (wrist is 75% of forearm width)
   */
  taperRatio?: number
  
  /**
   * Whether to cap the ends of the cylinder
   * Default: true (closed volume)
   */
  openEnded?: boolean
}

/**
 * Generate a tapered cylinder BufferGeometry.
 * 
 * Geometry is oriented with height along local +Y axis (Three.js convention).
 * After rotation by π/2 around X, the taper goes from narrow (wrist, z=0)
 * to wide (forearm, z=+length).
 * 
 * @param radiusTop - Radius at top of cylinder (forearm end, wider)
 * @param radiusBottom - Radius at bottom of cylinder (wrist end, narrower)
 * @param height - Length along height axis
 * @param params - Optional geometry parameters
 * @returns BufferGeometry for tapered wrist volume
 */
export function createTaperedWristGeometry(
  radiusTop = 1,
  radiusBottom = 1,
  height = 1,
  params: TaperedWristGeometryParams = {},
): THREE.BufferGeometry {
  const {
    radialSegments = 32,
    heightSegments = 8,
    taperRatio = 0.75,
    openEnded = false,
  } = params

  // Apply taper: bottom (wrist) is narrower than top (forearm)
  const actualRadiusBottom = radiusBottom * taperRatio
  const actualRadiusTop = radiusTop

  // Use Three.js built-in CylinderGeometry with different top/bottom radii
  // This creates a cone/frustum shape which is our tapered cylinder
  const geometry = new THREE.CylinderGeometry(
    actualRadiusTop,      // Top radius (forearm end, wider)
    actualRadiusBottom,   // Bottom radius (wrist end, narrower)
    height,               // Height along Y axis
    radialSegments,       // Segments around circumference
    heightSegments,       // Segments along height (for smooth taper)
    openEnded,            // Whether to cap ends
  )

  return geometry
}

/**
 * TICKET 43c: Optimized tapered wrist geometry with anatomical proportions.
 * 
 * This is the primary geometry used in WristOccluder. It creates a tapered
 * ellipsoid that matches natural wrist anatomy:
 * - Narrower at watch position (wrist)
 * - Gradually widens toward forearm
 * - Elliptical cross-section (via non-uniform scaling)
 * 
 * Usage in WristOccluder:
 * ```tsx
 * <mesh ref={occluderRef} rotation={[Math.PI / 2, 0, 0]}>
 *   <primitive object={createOptimizedWristGeometry()} />
 *   <meshBasicMaterial colorWrite={false} depthWrite={true} />
 * </mesh>
 * ```
 * 
 * The mesh is then scaled per-frame based on hand measurements:
 * - scaleX: lateral width (hand width)
 * - scaleY: forearm length
 * - scaleZ: AP depth (creates elliptical cross-section)
 */
export function createOptimizedWristGeometry(): THREE.BufferGeometry {
  return createTaperedWristGeometry(
    1,    // radiusTop (normalized, scaled per-frame)
    1,    // radiusBottom (normalized, scaled per-frame)
    1,    // height (normalized, scaled per-frame)
    {
      radialSegments: 32,     // Smooth circumference (TICKET 43b increased from 16)
      heightSegments: 8,      // Smooth taper transition
      taperRatio: 0.75,       // Wrist is 75% of forearm width (anatomical)
      openEnded: false,       // Closed volume (caps on both ends)
    },
  )
}

/**
 * TICKET 43c: Alternative geometries for experimentation/debugging
 */

/**
 * Aggressive taper (60% ratio) for very narrow wrists
 */
export function createSlimWristGeometry(): THREE.BufferGeometry {
  return createTaperedWristGeometry(1, 1, 1, {
    radialSegments: 32,
    heightSegments: 8,
    taperRatio: 0.6,
    openEnded: false,
  })
}

/**
 * Gentle taper (85% ratio) for thicker wrists/forearms
 */
export function createThickWristGeometry(): THREE.BufferGeometry {
  return createTaperedWristGeometry(1, 1, 1, {
    radialSegments: 32,
    heightSegments: 8,
    taperRatio: 0.85,
    openEnded: false,
  })
}

/**
 * No taper (100% ratio) - equivalent to V1 cylinder for A/B testing
 */
export function createUniformWristGeometry(): THREE.BufferGeometry {
  return createTaperedWristGeometry(1, 1, 1, {
    radialSegments: 32,
    heightSegments: 1,
    taperRatio: 1.0,
    openEnded: false,
  })
}
