'use client'

import { useState } from 'react'
import { CameraStream } from './CameraStream'
import { CameraControls } from './CameraControls'
import { HandLandmarksCanvas } from './HandLandmarksCanvas'
import type { HandDetection } from '@/lib/mediapipe/types'

interface CameraViewProps {
  onStreamReady?: (stream: MediaStream) => void
  onVideoReady?: (video: HTMLVideoElement) => void
  showControls?: boolean
  handDetection?: HandDetection | null
  videoElement?: HTMLVideoElement | null
  showLandmarks?: boolean
}

export function CameraView({ 
  onStreamReady,
  onVideoReady,
  showControls = true,
  handDetection,
  videoElement,
  showLandmarks = false,
}: CameraViewProps) {
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')

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
          onFacingModeChange={setFacingMode}
        />
      )}
    </div>
  )
}
