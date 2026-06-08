import type { WatchCalibration } from '@/lib/three/watchCalibration'
import { WATCH_CATALOG } from './catalog'
import type { WatchDefinition } from './types'

const catalogById = new Map<string, WatchDefinition>(
  WATCH_CATALOG.map((watch) => [watch.id, watch]),
)

/** Default watch when an unknown id is requested. */
export const DEFAULT_WATCH_ID = 'classic'

export function getWatchById(id: string): WatchDefinition | undefined {
  return catalogById.get(id)
}

export function getWatchByIdOrDefault(id: string): WatchDefinition {
  return catalogById.get(id) ?? catalogById.get(DEFAULT_WATCH_ID)!
}

export function getAllWatches(): WatchDefinition[] {
  return WATCH_CATALOG
}

export function getUniqueModelUrls(): string[] {
  return [...new Set(WATCH_CATALOG.map((w) => w.modelUrl))]
}

/** Convert catalog entry → runtime calibration consumed by WatchModel / occluder. */
export function watchToCalibration(watch: WatchDefinition): WatchCalibration {
  return {
    scale: watch.scale,
    positionOffset: { ...watch.positionOffset },
    rotationOffset: { ...watch.rotationOffset },
    occluderOffset: { ...watch.occluderOffset },
    wristFitBias: watch.wristFitBias ?? 0,
    smoothing: watch.smoothing ?? 0.3,
  }
}

/** Catalog summary for UI lists (selector, debug presets). */
export function getWatchListItems(): Array<{
  id: string
  name: string
  description: string
  thumbnail: string
}> {
  return WATCH_CATALOG.map(({ id, name, description = '', thumbnail }) => ({
    id,
    name,
    description,
    thumbnail,
  }))
}
