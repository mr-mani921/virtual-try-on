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
  const videoReadyCalledRef = useRef(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  useEffect(() => {
    let mounted = true
    const onStreamReadyRef = onStreamReady
    const onErrorRef = onError

    const startCamera = async () => {
      // ── 1. Fully stop any existing stream before requesting a new one ──
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      // ── 2. Detach from video element so the OS releases the device ──
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }

      // Reset per-switch state
      videoReadyCalledRef.current = false
      setIsLoading(true)
      setError(null)

      // ── 3. Small delay to let the OS fully release the camera device ──
      //    Without this, some Android/iOS browsers throw NotReadableError
      //    immediately after stopping the previous track.
      await new Promise(resolve => setTimeout(resolve, 300))

      if (!mounted) return

      try {
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

        // ── 4. Attach stream to video element immediately ──
        if (videoRef.current) {
          videoRef.current.srcObject = stream

          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play()
              .then(() => {
                if (videoRef.current && !videoReadyCalledRef.current && mounted) {
                  videoReadyCalledRef.current = true
                  onVideoReady?.(videoRef.current)
                }
              })
              .catch(err => console.warn('Video play failed:', err))
          }
        }

        setIsLoading(false)
        onStreamReadyRef?.(stream)

      } catch (err) {
        if (!mounted) return

        const error = err as Error
        let errorMessage = 'Failed to access camera'

        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = 'Camera permission denied'
          setHasPermission(false)
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errorMessage = 'No camera found on this device'
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          errorMessage = 'Camera is already in use by another app'
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = 'Camera does not support requested settings'
        }

        setError(errorMessage)
        setIsLoading(false)
        onErrorRef?.(new Error(errorMessage))
      }
    }

    startCamera()

    return () => {
      mounted = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      videoReadyCalledRef.current = false
    }
  }, [facingMode])    // re-run only when facingMode changes

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
