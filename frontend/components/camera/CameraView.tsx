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
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')

  // Detect if device has multiple cameras and choose appropriate default
  useEffect(() => {
    const detectCameras = async () => {
      try {
        // First, request camera permission to get device labels
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        
        // Now enumerate devices (will have labels after permission granted)
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter(device => device.kind === 'videoinput')
        
        // Stop the temporary stream
        stream.getTracks().forEach(track => track.stop())
        
        // Wait for camera to be fully released
        await new Promise(resolve => setTimeout(resolve, 500))
        
        console.log('Camera detection:', {
          totalCameras: videoDevices.length,
          cameras: videoDevices.map(d => ({ label: d.label, id: d.deviceId }))
        })
        
        // If device has multiple cameras, use rear camera (better for AR watch try-on)
        if (videoDevices.length > 1) {
          console.log('Multiple cameras detected, using rear camera')
          setFacingMode('environment')
        } else {
          console.log('Single camera detected, using front camera')
          setFacingMode('user')
        }
      } catch (error) {
        console.warn('Failed to enumerate devices:', error)
        // Default to front camera on error
        setFacingMode('user')
      }
    }

    detectCameras()
  }, [])

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
