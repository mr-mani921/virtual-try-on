'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { HandDetection, Landmark } from '@/lib/mediapipe/types'
import { HAND_LANDMARKS } from '@/lib/mediapipe/types'

interface UseHandTrackingOptions {
  maxNumHands?: number
  minDetectionConfidence?: number
  minTrackingConfidence?: number
  onHandDetected?: (hand: HandDetection) => void
}

interface UseHandTrackingReturn {
  isLoading: boolean
  error: string | null
  handDetection: HandDetection | null
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

  const handsRef = useRef<any>(null)
  const cameraRef = useRef<any>(null)
  const animationFrameRef = useRef<number | null>(null)

  const stopTracking = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (cameraRef.current) {
      cameraRef.current.stop()
      cameraRef.current = null
    }

    if (handsRef.current) {
      handsRef.current.close()
      handsRef.current = null
    }
  }, [])

  const startTracking = useCallback(
    async (videoElement: HTMLVideoElement) => {
      try {
        setIsLoading(true)
        setError(null)

        // Dynamically import MediaPipe (client-side only)
        const { Hands } = await import('@mediapipe/hands')
        const { Camera } = await import('@mediapipe/camera_utils')

        // Initialize MediaPipe Hands
        const hands = new Hands({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
          },
        })

        hands.setOptions({
          maxNumHands,
          modelComplexity: 1,
          minDetectionConfidence,
          minTrackingConfidence,
        })

        hands.onResults((results) => {
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0]
            const handedness = results.multiHandedness?.[0]?.label || 'Right'
            const score = results.multiHandedness?.[0]?.score || 0

            const detection: HandDetection = {
              landmarks: {
                wrist: landmarks[HAND_LANDMARKS.WRIST] as Landmark,
                indexBase: landmarks[HAND_LANDMARKS.INDEX_FINGER_MCP] as Landmark,
                pinkyBase: landmarks[HAND_LANDMARKS.PINKY_MCP] as Landmark,
                allLandmarks: landmarks as Landmark[],
              },
              handedness: handedness as 'Left' | 'Right',
              score,
            }

            setHandDetection(detection)
            onHandDetected?.(detection)
          } else {
            setHandDetection(null)
          }
        })

        handsRef.current = hands

        // Initialize camera
        const camera = new Camera(videoElement, {
          onFrame: async () => {
            if (handsRef.current) {
              await handsRef.current.send({ image: videoElement })
            }
          },
          width: 1280,
          height: 720,
        })

        cameraRef.current = camera
        await camera.start()

        setIsLoading(false)
      } catch (err) {
        const error = err as Error
        setError(error.message || 'Failed to initialize hand tracking')
        setIsLoading(false)
      }
    },
    [maxNumHands, minDetectionConfidence, minTrackingConfidence, onHandDetected]
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
    startTracking,
    stopTracking,
  }
}
