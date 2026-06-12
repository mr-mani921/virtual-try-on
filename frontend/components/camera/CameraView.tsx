'use client'

import { useState, useEffect } from 'react'
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
  const [hasCheckedCameras, setHasCheckedCameras] = useState(false)

  // Check for multiple cameras and default to rear camera if available
  useEffect(() => {
    const checkCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter(device => device.kind === 'videoinput')
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        
        console.log('Camera detection:', {
          totalCameras: videoDevices.length,
          isMobile,
          cameras: videoDevices.map(d => ({ label: d.label, id: d.deviceId }))
        })
        
        // Default to rear camera for mobile devices with multiple cameras
        if (videoDevices.length > 1 && isMobile) {
          console.log('Multiple cameras detected on mobile - defaulting to rear camera')
          setFacingMode('environment')
        }
        
        setHasCheckedCameras(true)
      } catch (error) {
        console.warn('Failed to enumerate devices:', error)
        setHasCheckedCameras(true)
      }
    }

    if (!hasCheckedCameras) {
      checkCameras()
    }
  }, [hasCheckedCameras])

  // Don't render camera until we've checked available cameras
  if (!hasCheckedCameras) {
    return (
      <div className="absolute inset-0 flex items-center justify-center w-full h-full bg-zinc-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-sm">Initializing camera...</p>
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
      
      {showControls && (
        <CameraControls 
          currentFacingMode={facingMode}
          onFacingModeChange={setFacingMode}
        />
      )}
    </div>
  )
}
