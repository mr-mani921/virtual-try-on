/**
 * Catalog entry for a try-on watch model.
 * Drives model URL, UI metadata, and per-watch wrist calibration.
 */
export interface WatchDefinition {
  id: string
  name: string
  thumbnail: string
  modelUrl: string
  scale: number
  rotationOffset: { x: number; y: number; z: number }
  positionOffset: { x: number; y: number; z: number }
  occluderOffset: { x: number; y: number; z: number }
  /** Optional per-model depth bias (additive on positionOffset.y). */
  wristFitBias?: number
  /** Quaternion / position smoothing factor. */
  smoothing?: number
  /** Short label for selector UI. */
  description?: string
}

export type WatchLoaderStatus = 'idle' | 'loading' | 'loaded' | 'error'

export interface WatchLoaderState {
  status: WatchLoaderStatus
  modelUrl: string | null
  error: string | null
  progress: number
}
