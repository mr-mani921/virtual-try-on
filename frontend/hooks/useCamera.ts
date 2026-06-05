import { useEffect, useRef, useState, useCallback } from 'react'

interface UseCameraOptions {
  facingMode?: 'user' | 'environment'
  width?: number
  height?: number
}

interface UseCameraReturn {
  stream: MediaStream | null
  error: string | null
  isLoading: boolean
  hasPermission: boolean | null
  switchCamera: () => void
  stopCamera: () => void
}

export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const {
    facingMode: initialFacingMode = 'user',
    width = 1280,
    height = 720,
  } = options

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(initialFacingMode)
  
  const streamRef = useRef<MediaStream | null>(null)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
      setStream(null)
    }
  }, [])

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }, [])

  useEffect(() => {
    let mounted = true

    const startCamera = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Stop existing stream
        stopCamera()

        // Request camera access
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: width },
            height: { ideal: height },
          },
          audio: false,
        })

        if (!mounted) {
          mediaStream.getTracks().forEach(track => track.stop())
          return
        }

        streamRef.current = mediaStream
        setStream(mediaStream)
        setHasPermission(true)
        setIsLoading(false)
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
      }
    }

    startCamera()

    return () => {
      mounted = false
      stopCamera()
    }
  }, [facingMode, width, height, stopCamera])

  return {
    stream,
    error,
    isLoading,
    hasPermission,
    switchCamera,
    stopCamera,
  }
}
