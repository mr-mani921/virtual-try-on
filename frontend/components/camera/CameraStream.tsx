'use client'

import { useEffect, useRef, useState } from 'react'

interface CameraStreamProps {
  facingMode?: 'user' | 'environment'
  onStreamReady?: (stream: MediaStream) => void
  onError?: (error: Error) => void
  onVideoReady?: (video: HTMLVideoElement) => void
}

export function CameraStream({ 
  facingMode = 'user',
  onStreamReady,
  onError,
  onVideoReady,
}: CameraStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null!)
  const streamRef = useRef<MediaStream | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  useEffect(() => {
    let mounted = true

    const startCamera = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Stop and clear existing stream
        if (streamRef.current) {
          console.log('Stopping previous camera stream')
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }

        // Clear video element
        if (videoRef.current) {
          videoRef.current.srcObject = null
        }

        // Wait for camera release
        await new Promise(resolve => setTimeout(resolve, 300))

        if (!mounted) return

        console.log('Requesting camera with facingMode:', facingMode)

        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })

        if (!mounted) {
          stream.getTracks().forEach(track => track.stop())
          return
        }

        console.log('Camera stream obtained, assigning to video element')
        
        streamRef.current = stream
        setHasPermission(true)

        // Immediately assign stream to video element
        if (videoRef.current && mounted) {
          videoRef.current.srcObject = stream

          videoRef.current.onloadedmetadata = () => {
            console.log('Video metadata loaded, playing video')
            videoRef.current?.play()
              .then(() => {
                console.log('Video playing successfully')
                if (mounted) {
                  setIsLoading(false)
                  if (videoRef.current) {
                    onVideoReady?.(videoRef.current)
                  }
                  onStreamReady?.(stream)
                }
              })
              .catch(err => {
                console.error('Video play failed:', err)
                if (mounted) {
                  setError('Failed to play video')
                  setIsLoading(false)
                }
              })
          }

          videoRef.current.onerror = () => {
            console.error('Video element error')
            if (mounted) {
              setError('Video playback error')
              setIsLoading(false)
            }
          }
        }

      } catch (err) {
        if (!mounted) return

        const error = err as Error
        let errorMessage = 'Failed to access camera'

        console.error('Camera error:', error.name, error.message)

        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = 'Camera permission denied'
          setHasPermission(false)
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errorMessage = 'No camera found'
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          errorMessage = 'Camera is already in use'
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = 'Camera does not support requested settings'
        }

        setError(errorMessage)
        setIsLoading(false)
        onError?.(new Error(errorMessage))
      }
    }

    startCamera()

    // Cleanup on unmount or facingMode change
    return () => {
      mounted = false
      console.log('Cleaning up camera')
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
        videoRef.current.onloadedmetadata = null
        videoRef.current.onerror = null
      }
    }
  }, [facingMode, onStreamReady, onError, onVideoReady])

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center w-full h-full bg-zinc-900">
        <div className="text-center p-6">
          <div className="text-red-500 text-xl mb-2">⚠️</div>
          <p className="text-white text-sm mb-4">{error}</p>
          {hasPermission === false && (
            <p className="text-zinc-400 text-xs">
              Please enable camera access in your browser settings
            </p>
          )}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center w-full h-full bg-zinc-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-sm">
            {facingMode === 'environment' ? 'Switching to rear camera...' : 'Requesting camera access...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 w-full h-full">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  )
}
