/**
 * Scene.tsx - Main 3D Scene Container
 * 
 * PURPOSE:
 * This component represents the entire 3D scene. It's a container for all
 * 3D objects (meshes, lights, cameras, etc.) that will be rendered.
 * 
 * WHY IT EXISTS:
 * - Separates 3D scene logic from Next.js page logic
 * - Provides a clean boundary between React UI and Three.js world
 * - Makes it easy to add/remove 3D objects without touching page.tsx
 * 
 * ARCHITECTURE DECISION:
 * We keep Scene as a separate component (not inline in page.tsx) because:
 * 1. Separation of concerns - page.tsx handles routing, Scene handles 3D
 * 2. Reusability - Scene can be used in multiple pages
 * 3. Testing - Easier to test 3D logic separately
 * 4. Team collaboration - 3D developers work here, UI developers work in page.tsx
 */

import { Box } from './Box'

export function Scene() {
  /**
   * RENDERING EXPLANATION:
   * This component returns JSX that looks like HTML, but it's NOT HTML.
   * React Three Fiber translates these tags into Three.js objects:
   * 
   * <mesh> → new THREE.Mesh()
   * <boxGeometry> → new THREE.BoxGeometry()
   * <meshStandardMaterial> → new THREE.MeshStandardMaterial()
   * 
   * The reconciler (explained earlier) handles the translation.
   */
  
  return (
    <>
      {/* 
        LIGHTING:
        Three.js scenes need lights to see objects (just like real life).
        Without lights, everything would be black.
        
        ambientLight: Illuminates all objects equally from all directions.
        - intensity={0.5}: Half brightness (0 = dark, 1 = full brightness)
        - Think of it as "room lighting" or "sky light"
        
        WHY ambientLight?
        - Simple to understand for learning
        - No shadows or complex calculations
        - Good for seeing object shapes clearly
        
        FUTURE: For AR watch, we'll add:
        - directionalLight (simulates sun)
        - pointLight (simulates bulb)
        - Environment maps (realistic reflections on watch metal)
      */}
      <ambientLight intensity={0.5} />
      
      {/* 
        DIRECTIONAL LIGHT:
        Simulates sunlight - parallel rays from a specific direction.
        
        position={[10, 10, 5]}: Light comes from top-right-front
        - [x, y, z] = [right, up, forward]
        - Positive Y = above the scene
        
        intensity={1}: Full brightness
        
        WHY directionalLight?
        - Creates depth through shadows (we'll enable shadows later)
        - Makes objects look 3D (not flat)
        - Simulates natural lighting
        
        COMBINATION STRATEGY:
        ambientLight (0.5) + directionalLight (1) = balanced lighting
        - Ambient fills in shadows so they're not pure black
        - Directional creates definition and depth
      */}
      <directionalLight position={[10, 10, 5]} intensity={1} />
      
      {/* 
        BOX COMPONENT:
        Our first 3D object. We'll create this next.
        
        WHY separate component?
        - Encapsulation: Box manages its own state/behavior
        - Reusability: Can render multiple boxes easily
        - Maintainability: Box logic is isolated
        
        REACT PATTERN:
        This is standard React composition. Box is a child component.
        In Three.js terms, Box will be added to the scene graph.
      */}
      <Box />
    </>
  )
}

/**
 * SENIOR REVIEW NOTES:
 * 
 * Q: Why not put lights inside Box component?
 * A: Lights affect the entire scene, not just one object. They belong at
 *    scene level. This follows Three.js best practices.
 * 
 * Q: Why Fragment (<>) instead of <group>?
 * A: Fragment doesn't create a Three.js object (no overhead). Use <group>
 *    when you need to transform multiple objects together.
 * 
 * Q: What about performance with many lights?
 * A: Each light has a performance cost. For AR watch:
 *    - Start with 2-3 lights
 *    - Use baked lighting for static elements
 *    - Consider light probes for mobile performance
 * 
 * FUTURE REFACTORING:
 * When adding AR:
 * - Extract lighting into <Lighting> component
 * - Add <WatchModel> component
 * - Add <Hand> component (MediaPipe tracking)
 * - Add <Environment> component (HDR backgrounds)
 */
