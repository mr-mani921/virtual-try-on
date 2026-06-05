import * as THREE from 'three'

export interface ModelInfo {
  nodes: string[]
  materials: string[]
  meshes: {
    name: string
    vertices: number
    triangles: number
    hasMaterial: boolean
  }[]
  boundingBox: {
    min: THREE.Vector3
    max: THREE.Vector3
    center: THREE.Vector3
    size: THREE.Vector3
  }
  pivot: THREE.Vector3
  totalVertices: number
  totalTriangles: number
}

/**
 * Analyze a GLTF model and return detailed information
 */
export function analyzeModel(scene: THREE.Group): ModelInfo {
  const nodes: string[] = []
  const materials: string[] = []
  const meshes: ModelInfo['meshes'] = []
  let totalVertices = 0
  let totalTriangles = 0

  // Calculate bounding box
  const box = new THREE.Box3().setFromObject(scene)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())

  // Traverse the scene
  scene.traverse((child) => {
    nodes.push(child.name || 'unnamed')

    if (child instanceof THREE.Mesh) {
      const geometry = child.geometry
      const vertices = geometry.attributes.position?.count || 0
      const triangles = geometry.index
        ? geometry.index.count / 3
        : vertices / 3

      totalVertices += vertices
      totalTriangles += triangles

      meshes.push({
        name: child.name || 'unnamed mesh',
        vertices,
        triangles,
        hasMaterial: !!child.material,
      })

      // Collect materials
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            if (mat.name && !materials.includes(mat.name)) {
              materials.push(mat.name)
            }
          })
        } else {
          if (child.material.name && !materials.includes(child.material.name)) {
            materials.push(child.material.name)
          }
        }
      }
    }
  })

  return {
    nodes,
    materials,
    meshes,
    boundingBox: {
      min: box.min,
      max: box.max,
      center,
      size,
    },
    pivot: scene.position.clone(),
    totalVertices,
    totalTriangles,
  }
}

/**
 * Normalize a model to unit size and center it at origin
 */
export function normalizeModel(
  scene: THREE.Group,
  targetSize: number = 1
): THREE.Group {
  const box = new THREE.Box3().setFromObject(scene)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())

  // Center at origin
  scene.position.sub(center)

  // Scale to target size
  const maxDim = Math.max(size.x, size.y, size.z)
  const scale = targetSize / maxDim
  scene.scale.setScalar(scale)

  return scene
}

/**
 * Optimize model materials for better performance
 */
export function optimizeMaterials(scene: THREE.Group): void {
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material]

      materials.forEach((material) => {
        if (material instanceof THREE.MeshStandardMaterial) {
          // Enable environment mapping
          material.envMapIntensity = 1.5

          // Optimize for real-time rendering
          material.needsUpdate = true

          // Enable shadows
          child.castShadow = true
          child.receiveShadow = true
        }
      })
    }
  })
}

/**
 * Calculate optimal scale for watch model on wrist
 */
export function calculateWatchScale(
  modelSize: THREE.Vector3,
  targetWristWidth: number = 0.4
): number {
  // Assume watch width should match wrist width
  const modelWidth = Math.max(modelSize.x, modelSize.z)
  return targetWristWidth / modelWidth
}

/**
 * Verify model pivot point is at the correct location
 */
export function verifyPivot(scene: THREE.Group): {
  isAtOrigin: boolean
  currentPivot: THREE.Vector3
  recommendation: string
} {
  const box = new THREE.Box3().setFromObject(scene)
  const center = box.getCenter(new THREE.Vector3())
  const isAtOrigin = center.length() < 0.01

  let recommendation = 'Pivot is correctly centered at origin.'
  if (!isAtOrigin) {
    recommendation = `Pivot is offset by ${center.length().toFixed(3)} units. Consider re-centering the model.`
  }

  return {
    isAtOrigin,
    currentPivot: center,
    recommendation,
  }
}
