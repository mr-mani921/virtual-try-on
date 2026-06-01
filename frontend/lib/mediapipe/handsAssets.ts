/** Base URL for MediaPipe Hands WASM / model assets (synced to public/ by postinstall). */
export const MEDIAPIPE_HANDS_ASSET_BASE = '/mediapipe/hands'

export function mediapipeHandsLocateFile(file: string): string {
  const normalized = file.replace(/^\/+/, '')
  return `${MEDIAPIPE_HANDS_ASSET_BASE}/${normalized}`
}
