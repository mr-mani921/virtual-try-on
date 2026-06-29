'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { mediapipeHandsLocateFile } from '@/lib/mediapipe/handsAssets'
import type { HandDetection, Landmark } from '@/lib/mediapipe/types'
import { HAND_LANDMARKS } from '@/lib/mediapipe/types'

interface UseHandTrackingOptions {
  maxNumHands?: number
  minDetectionConfidence?: number
  minTrackingConfidence?: number
  onHandDetected?: (hand: HandDetection | null) => void
}

interface UseHandTrackingReturn {
  isLoading: boolean
  error: string | null
  handDetection: HandDetection | null
  hasProcessedFrames: boolean
  startTracking: (videoElement: HTMLVideoElement) => Promise<void>
  stopTracking: () => void
}

export function useHandTracking(
  options: UseHandTrackingOptions = {}
): UseHandTrackingReturn {
  const {
    maxNumHands = 1,
    minDetectionConfidence = 0.7,
    minTrackingConfidence = 0.5,
    onHandDetected,
  } = options

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [handDetection, setHandDetection] = useState<HandDetection | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [hasProcessedFrames, setHasProcessedFrames] = useState(false)

  const handsRef = useRef<any>(null)
  const animationFrameRef = useRef<number | null>(null)
  const isSendingFrameRef = useRef(false)
  const onHandDetectedRef = useRef(onHandDetected)

  useEffect(() => {
    onHandDetectedRef.current = onHandDetected
  }, [onHandDetected])

  const stopTracking = useCallback(() => {
    console.log('Stopping hand tracking...')
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (handsRef.current) {
      handsRef.current.close()
      handsRef.current = null
    }

    isSendingFrameRef.current = false
    setIsInitialized(false)
    setHasProcessedFrames(false)
    setHandDetection(null)
  }, [])

  const startTracking = useCallback(
    async (videoElement: HTMLVideoElement) => {
      if (isInitialized || handsRef.current) {
        console.log('Hand tracking already initialized, skipping...')
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        console.log('Initializing MediaPipe Hands...')

        // Dynamically import MediaPipe (client-side only)
        const { Hands } = await import('@mediapipe/hands')

        // Initialize MediaPipe Hands
        const hands = new Hands({
          locateFile: mediapipeHandsLocateFile,
        })

        hands.setOptions({
          maxNumHands,
          modelComplexity: 1,
          minDetectionConfidence,
          minTrackingConfidence,
        })

        hands.onResults((results) => {
          setHasProcessedFrames(true)

          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0]
            const rawHandedness = results.multiHandedness?.[0]?.label || 'Right'
            const score = results.multiHandedness?.[0]?.score || 0

            // MediaPipe's handedness is from its perspective (mirrored camera view).
            // Invert it to match the user's actual hand.
            const handedness = rawHandedness === 'Left' ? 'Right' : 'Left'

            const detection: HandDetection = {
              landmarks: {
                wrist: landmarks[HAND_LANDMARKS.WRIST] as Landmark,
                indexBase: landmarks[HAND_LANDMARKS.INDEX_FINGER_MCP] as Landmark,
                pinkyBase: landmarks[HAND_LANDMARKS.PINKY_MCP] as Landmark,
                middleBase: landmarks[HAND_LANDMARKS.MIDDLE_FINGER_MCP] as Landmark,
                allLandmarks: landmarks as Landmark[],
              },
              handedness: handedness as 'Left' | 'Right',
              score,
            }

            setHandDetection(detection)
            onHandDetectedRef.current?.(detection)
          } else {
            setHandDetection(null)
            onHandDetectedRef.current?.(null)
          }
        })

        handsRef.current = hands

        const waitForVideoFrame = () =>
          new Promise<void>((resolve, reject) => {
            if (videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && videoElement.videoWidth > 0) {
              resolve()
              return
            }

            const timeout = window.setTimeout(() => {
              cleanup()
              reject(new Error('Camera video did not become ready for hand tracking'))
            }, 5000)

            const cleanup = () => {
              window.clearTimeout(timeout)
              videoElement.removeEventListener('loadeddata', onReady)
              videoElement.removeEventListener('playing', onReady)
            }

            const onReady = () => {
              if (videoElement.videoWidth === 0) return
              cleanup()
              resolve()
            }

            videoElement.addEventListener('loadeddata', onReady)
            videoElement.addEventListener('playing', onReady)
          })

        await waitForVideoFrame()

        const sendFrame = async () => {
          if (!handsRef.current) return

          const stream = videoElement.srcObject as MediaStream | null
          const videoTrack = stream?.getVideoTracks()[0]
          const canSendFrame =
            videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
            videoElement.videoWidth > 0 &&
            videoElement.videoHeight > 0 &&
            videoTrack?.readyState === 'live' &&
            !videoElement.paused &&
            !videoElement.ended

          if (canSendFrame && !isSendingFrameRef.current) {
            isSendingFrameRef.current = true
            try {
              await handsRef.current.send({ image: videoElement })
            } finally {
              isSendingFrameRef.current = false
            }
          }

          animationFrameRef.current = requestAnimationFrame(sendFrame)
        }

        setIsInitialized(true)
        animationFrameRef.current = requestAnimationFrame(sendFrame)

        setIsLoading(false)
        console.log('MediaPipe Hands initialized successfully')
      } catch (err) {
        const error = err as Error
        console.error('MediaPipe initialization error:', error)
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
          animationFrameRef.current = null
        }
        if (handsRef.current) {
          handsRef.current.close()
          handsRef.current = null
        }
        isSendingFrameRef.current = false
        setError(error.message || 'Failed to initialize hand tracking')
        setIsLoading(false)
        setIsInitialized(false)
        setHasProcessedFrames(false)
      }
    },
    [maxNumHands, minDetectionConfidence, minTrackingConfidence, isInitialized]
  )

  useEffect(() => {
    return () => {
      stopTracking()
    }
  }, [stopTracking])

  return {
    isLoading,
    error,
    handDetection,
    hasProcessedFrames,
    startTracking,
    stopTracking,
  }
}
