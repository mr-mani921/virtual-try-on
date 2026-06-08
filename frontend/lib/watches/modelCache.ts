import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'

const cache = new Map<string, GLTF>()
const inflight = new Map<string, Promise<GLTF>>()

export function isWatchModelCached(url: string): boolean {
  return cache.has(url)
}

/**
 * Lazy-load a watch GLB with in-memory cache and deduplicated in-flight requests.
 */
export function loadWatchModel(
  url: string,
  onProgress?: (progress: number) => void,
): Promise<GLTF> {
  const cached = cache.get(url)
  if (cached) return Promise.resolve(cached)

  const existing = inflight.get(url)
  if (existing) return existing

  const promise = new Promise<GLTF>((resolve, reject) => {
    const loader = new GLTFLoader()
    loader.load(
      url,
      (gltf) => {
        cache.set(url, gltf)
        inflight.delete(url)
        resolve(gltf)
      },
      (event) => {
        if (event.lengthComputable && event.total > 0) {
          onProgress?.(event.loaded / event.total)
        }
      },
      (error) => {
        inflight.delete(url)
        reject(error)
      },
    )
  })

  inflight.set(url, promise)
  return promise
}

/** Preload without awaiting (fire-and-forget). */
export function preloadWatchModel(url: string): void {
  if (cache.has(url) || inflight.has(url)) return
  loadWatchModel(url).catch(() => {
    // Caller / UI handles errors on selection
  })
}
