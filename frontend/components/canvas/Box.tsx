/**
 * Box.tsx - Animated 3D Box Component
 * 
 * PURPOSE:
 * A simple rotating box to learn R3F fundamentals:
 * - Mesh rendering
 * - Geometry and materials
 * - Animation with useFrame
 * - Refs to Three.js objects
 * - React state integration
 * 
 * This is a LEARNING component. In the final AR watch system, this will be
 * replaced with watch models, but the patterns learned here apply directly.
 */

'use client'

import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'

export function Box() {
  /**
   * REF EXPLANATION:
   * meshRef holds a reference to the actual THREE.Mesh instance.
   * 
   * WHY useRef?
   * - Direct access to Three.js object for animations
   * - No React re-renders when we mutate the mesh
   * - Performance: updating ref doesn't trigger component re-render
   * 
   * TYPE ANNOTATION:
   * Mesh is the Three.js type. TypeScript ensures type safety.
   * null! means "trust me, this will be assigned"
   * 
   * LIFECYCLE:
   * 1. Component mounts → meshRef.current is null
   * 2. R3F creates THREE.Mesh → assigns to meshRef.current
   * 3. Now meshRef.current points to the actual Three.js mesh
   */
  const meshRef = useRef<Mesh>(null!)
  
  /**
   * STATE EXPLANATION:
   * hovered and active are React state for interactivity.
   * 
   * WHY useState here?
   * - These affect the material color (a prop)
   * - When state changes, React re-renders
   * - R3F reconciler updates only the material color in Three.js
   * - The mesh itself is NOT recreated
   * 
   * PERFORMANCE NOTE:
   * This is fine because:
   * - State changes are infrequent (only on user interaction)
   * - R3F only updates what changed (just the color)
   * - No geometry or mesh recreation
   * 
   * ANTI-PATTERN (don't do this):
   * const [rotation, setRotation] = useState(0)
   * useFrame(() => setRotation(r => r + 0.01)) // ❌ Re-renders every frame!
   */
  const [hovered, setHovered] = useState(false)
  const [active, setActive] = useState(false)

  /**
   * useFrame DEEP DIVE:
   * This hook runs every frame (~60 FPS).
   * 
   * PARAMETERS:
   * - state: The entire R3F context (scene, camera, clock, etc.)
   * - delta: Time since last frame in seconds
   * 
   * WHY delta?
   * Frame rates vary (60 FPS on desktop, 30 FPS on mobile).
   * Using delta makes animation speed consistent:
   * 
   * At 60 FPS: delta ≈ 0.016s → rotation += 0.016
   * At 30 FPS: delta ≈ 0.033s → rotation += 0.033
   * 
   * Result: Same rotation speed regardless of frame rate.
   * 
   * DIRECT MUTATION:
   * meshRef.current.rotation.x += delta
   * 
   * This is DIRECT mutation of the Three.js object.
   * - No React re-render
   * - No reconciliation
   * - Pure Three.js performance
   * 
   * WHY this is safe:
   * - We're not changing React state
   * - We're not changing props
   * - We're mutating the Three.js object directly
   * - This is the recommended pattern for animations
   * 
   * EXECUTION ORDER:
   * 1. useFrame callbacks run (all components)
   * 2. R3F renders the scene: renderer.render(scene, camera)
   * 3. Browser displays the frame
   * 4. requestAnimationFrame schedules next frame
   * 5. Repeat
   * 
   * PERFORMANCE:
   * useFrame is highly optimized:
   * - Runs outside React's render cycle
   * - No virtual DOM diffing
   * - Direct Three.js updates
   */
  useFrame((state, delta) => {
    // Rotate on X and Y axes for visual interest
    meshRef.current.rotation.x += delta
    meshRef.current.rotation.y += delta * 0.5
  })

  /**
   * JSX EXPLANATION:
   * This looks like HTML but translates to Three.js objects.
   */
  return (
    <mesh
      ref={meshRef}
      /**
       * SCALE PROP:
       * scale={active ? 1.5 : 1}
       * 
       * When clicked, box grows to 1.5x size.
       * 
       * HOW IT WORKS:
       * 1. User clicks → setActive(true)
       * 2. React re-renders component
       * 3. scale prop changes from 1 to 1.5
       * 4. R3F reconciler detects prop change
       * 5. R3F calls: mesh.scale.set(1.5, 1.5, 1.5)
       * 6. Next frame shows larger box
       * 
       * NO RECREATION:
       * The mesh is NOT destroyed and recreated.
       * Only the scale property is updated.
       * This is efficient.
       */
      scale={active ? 1.5 : 1}
      
      /**
       * EVENT HANDLERS:
       * R3F provides pointer events for 3D objects.
       * 
       * HOW IT WORKS:
       * 1. R3F uses raycasting to detect which object is under the mouse
       * 2. Raycasting shoots a ray from camera through mouse position
       * 3. Ray intersects with mesh geometry
       * 4. R3F triggers the event handler
       * 
       * PERFORMANCE:
       * Raycasting has a cost. For AR watch:
       * - Limit interactive objects
       * - Use bounding boxes for complex geometry
       * - Consider pointer-events: none for non-interactive objects
       */
      onClick={() => setActive(!active)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/**
       * GEOMETRY:
       * <boxGeometry> → new THREE.BoxGeometry()
       * 
       * args prop passes constructor arguments:
       * args={[1, 1, 1]} → new THREE.BoxGeometry(1, 1, 1)
       * 
       * [width, height, depth] in Three.js units
       * 
       * WHY args?
       * R3F can't know what arguments each Three.js class needs.
       * args is a generic way to pass constructor parameters.
       * 
       * GEOMETRY LIFECYCLE:
       * 1. R3F creates geometry once
       * 2. Geometry is reused until component unmounts
       * 3. On unmount, R3F calls geometry.dispose() (memory cleanup)
       * 
       * MEMORY MANAGEMENT:
       * R3F automatically disposes geometries and materials.
       * You don't need to manually call dispose() (unlike vanilla Three.js).
       */}
      <boxGeometry args={[1, 1, 1]} />
      
      {/**
       * MATERIAL:
       * <meshStandardMaterial> → new THREE.MeshStandardMaterial()
       * 
       * WHY meshStandardMaterial?
       * - Physically-based rendering (PBR)
       * - Reacts to lights realistically
       * - Good balance of quality and performance
       * 
       * ALTERNATIVES:
       * - meshBasicMaterial: No lighting, flat color (fastest)
       * - meshPhongMaterial: Older lighting model (legacy)
       * - meshPhysicalMaterial: More realistic (slower)
       * 
       * FOR AR WATCH:
       * We'll use meshPhysicalMaterial for watch metal:
       * - Realistic reflections
       * - Metalness and roughness control
       * - Clearcoat for glass
       * 
       * COLOR PROP:
       * color={hovered ? 'hotpink' : 'orange'}
       * 
       * When hovered, color changes.
       * R3F updates: material.color.set('hotpink')
       * No material recreation, just color update.
       */}
      <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
    </mesh>
  )
}

/**
 * SENIOR REVIEW NOTES:
 * 
 * Q: Why not use useState for rotation?
 * A: Would cause 60 re-renders per second. useFrame + ref is the pattern
 *    for continuous animations. useState is for discrete state changes.
 * 
 * Q: What about cleanup?
 * A: R3F handles it. When component unmounts, R3F calls:
 *    - geometry.dispose()
 *    - material.dispose()
 *    - scene.remove(mesh)
 * 
 * Q: Can we optimize the raycasting?
 * A: Yes, for production:
 *    - Use <BVH> from drei for complex geometry
 *    - Limit interactive objects
 *    - Use layers to exclude objects from raycasting
 * 
 * Q: What about mobile performance?
 * A: This box is very cheap:
 *    - Simple geometry (12 triangles)
 *    - Standard material (optimized)
 *    - Single mesh
 *    Watch models will be more expensive, so we'll need:
 *    - LOD (Level of Detail)
 *    - Texture compression
 *    - Geometry instancing for multiple watches
 * 
 * PATTERNS LEARNED:
 * 1. useRef for Three.js object access
 * 2. useFrame for animations
 * 3. useState for discrete state (color, scale)
 * 4. Direct mutation in useFrame (performance)
 * 5. Props map to Three.js properties
 * 6. R3F handles lifecycle and cleanup
 * 
 * FUTURE REFACTORING:
 * Replace this with:
 * - <WatchModel> component
 * - GLTF model loading
 * - PBR materials for realism
 * - Animation mixer for watch hands
 */
