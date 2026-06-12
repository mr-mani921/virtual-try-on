'use client'

import { useState } from 'react'
import { CameraStream } from './CameraStream'
import { CameraControls } from './CameraControls'
import { HandLandmarksCanvas } from './HandLandmarksCanvas'
import type { HandDetection } from '@/lib/mediapipe/types'

interface CameraViewProps {
  facingMode?: 'user' | 'environment'
  onFacingModeChange?: (mode: 'user' | 'environment') => void
  onStreamReady?: (stream: MediaStream) => void
  onVideoReady?: (video: HTMLVideoElement) => void
  showControls?: boolean
  handDetection?: HandDetection | null
  videoElement?: HTMLVideoElement | null
  showLandmarks?: boolean
}

export function CameraView({ 
  facingMode: externalFacingMode,
  onFacingModeChange,
  onStreamReady,
  onVideoReady,
  showControls = true,
  handDetection,
  videoElement,
  showLandmarks = false,
}: CameraViewProps) {
  // If the parent controls facingMode externally, use that.
  // Otherwise manage it internally (demo page behaviour).
  const [internalFacingMode, setInternalFacingMode] = useState<'user' | 'environment'>('user')

  const facingMode = externalFacingMode ?? internalFacingMode
  const handleFacingModeChange = (mode: 'user' | 'environment') => {
    if (onFacingModeChange) {
      onFacingModeChange(mode)
    } else {
      setInternalFacingMode(mode)
    }
  }

  return (
    <div className="absolute inset-0 w-full h-full">
      <CameraStream 
        facingMode={facingMode}
        onStreamReady={onStreamReady}
        onVideoReady={onVideoReady}
        onError={(error) => console.error('Camera error:', error)}
      />
      
      {showLandmarks && (
        <HandLandmarksCanvas
          handDetection={handDetection || null}
          videoElement={videoElement || null}
        />
      )}
      
      {showControls && (
        <CameraControls 
          currentFacingMode={facingMode}
          onFacingModeChange={handleFacingModeChange}
        />
      )}
    </div>
  )
}
