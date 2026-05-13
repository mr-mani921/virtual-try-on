'use client'

import { useEffect, useRef, useState } from 'react'

interface CameraStreamProps {
  facingMode?: 'user' | 'environment'
  onStreamReady?: (stream: MediaStream) => void
  onError?: (error: Error) => void
}

export function CameraStream({ 
  facingMode = 'user',
  onStreamReady,
  onError 
}: CameraStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null!)
  const streamRef = useRef<MediaStream | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  // Assign stream to video element when both are ready
  useEffect(() => {
    if (streamRef.current && videoRef.current && !isLoading) {
      videoRef.current.srcObject = streamRef.current
      
      console.log('Stream assigned to video element', {
        streamActive: streamRef.current.active,
        videoTracks: streamRef.current.getVideoTracks().length,
        videoTrackEnabled: streamRef.current.getVideoTracks()[0]?.enabled,
      })
      
      videoRef.current.onloadedmetadata = () => {
        console.log('Video metadata loaded')
        videoRef.current?.play()
          .then(() => console.log('Video playing'))
          .catch(err => console.warn('Video play failed:', err))
      }
    }
  }, [isLoading])

  useEffect(() => {
    let mounted = true

    const startCamera = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Stop existing stream if any
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
        }

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

        streamRef.current = stream
        setHasPermission(true)
        setIsLoading(false)
        onStreamReady?.(stream)
      } catch (err) {
        if (!mounted) return

        const error = err as Error
        let errorMessage = 'Failed to access camera'

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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
    }
  }, [facingMode, onStreamReady, onError])

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
          <p className="text-white text-sm">Requesting camera access...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 w-full h-full ">
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
