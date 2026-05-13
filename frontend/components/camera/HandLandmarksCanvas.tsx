'use client'

import { useEffect, useRef } from 'react'
import type { HandDetection } from '@/lib/mediapipe/types'

interface HandLandmarksCanvasProps {
  handDetection: HandDetection | null
  videoElement: HTMLVideoElement | null
  width?: number
  height?: number
}

export function HandLandmarksCanvas({
  handDetection,
  videoElement,
  width = 1280,
  height = 720,
}: HandLandmarksCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, width, height)

    if (!handDetection || !videoElement) return

    const { landmarks } = handDetection
    const canvasWidth = canvas.width
    const canvasHeight = canvas.height

    ctx.save()

    // Draw all landmarks
    landmarks.allLandmarks.forEach((landmark, index) => {
      const x = landmark.x * canvasWidth
      const y = landmark.y * canvasHeight

      ctx.beginPath()
      ctx.arc(x, y, 5, 0, 2 * Math.PI)
      ctx.fillStyle = '#60a5fa'
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.font = '10px monospace'
      ctx.fillText(index.toString(), x + 8, y + 4)
    })

    // Highlight key landmarks
    const drawKeyLandmark = (landmark: { x: number; y: number; z: number }, color: string, label: string) => {
      const x = landmark.x * canvasWidth
      const y = landmark.y * canvasHeight

      ctx.beginPath()
      ctx.arc(x, y, 8, 0, 2 * Math.PI)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 12px sans-serif'
      ctx.fillText(label, x + 12, y + 4)
    }

    drawKeyLandmark(landmarks.wrist, '#ef4444', 'Wrist')
    drawKeyLandmark(landmarks.indexBase, '#10b981', 'Index')
    drawKeyLandmark(landmarks.pinkyBase, '#f59e0b', 'Pinky')

    // Draw connections
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [0, 17], [5, 9], [9, 13], [13, 17], // Palm
      [9, 10], [10, 11], [11, 12], // Middle
      [13, 14], [14, 15], [15, 16], // Ring
      [17, 18], [18, 19], [19, 20], // Pinky
    ]

    ctx.strokeStyle = '#60a5fa'
    ctx.lineWidth = 2

    connections.forEach(([start, end]) => {
      const startLandmark = landmarks.allLandmarks[start]
      const endLandmark = landmarks.allLandmarks[end]

      ctx.beginPath()
      ctx.moveTo(startLandmark.x * canvasWidth, startLandmark.y * canvasHeight)
      ctx.lineTo(endLandmark.x * canvasWidth, endLandmark.y * canvasHeight)
      ctx.stroke()
    })

    // Draw handedness label
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(10, 10, 200, 60)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 16px sans-serif'
    ctx.fillText(`Hand: ${handDetection.handedness}`, 20, 35)
    ctx.font = '14px sans-serif'
    ctx.fillText(`Confidence: ${(handDetection.score * 100).toFixed(1)}%`, 20, 55)

    ctx.restore()
  }, [handDetection, videoElement, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ objectFit: 'cover' }}
    />
  )
}
