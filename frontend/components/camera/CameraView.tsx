'use client'

import { useState, useEffect } from 'react'
import { CameraStream } from './CameraStream'
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
  const [facingMode, setFacingMode] = useState<'user' | 'environment' | null>(null)

  // Pick the initial camera without opening a temporary stream. Mobile browser
  // camera stacks are sensitive to rapid getUserMedia start/stop/start cycles.
  useEffect(() => {
    const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false
    const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    setFacingMode(coarsePointer || mobileUserAgent ? 'environment' : 'user')
  }, [])

  if (!facingMode) {
    return (
      <div className="absolute inset-0 flex items-center justify-center w-full h-full bg-zinc-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-sm">Preparing camera...</p>
        </div>
      </div>
    )
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
    </div>
  )
}
