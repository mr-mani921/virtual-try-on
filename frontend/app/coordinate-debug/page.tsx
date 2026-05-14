'use client'

import { useState, useCallback, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { CameraView } from '@/components/camera/CameraView'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { useHandTracking } from '@/hooks/useHandTracking'
import { useCoordinateMapping } from '@/hooks/useCoordinateMapping'
import { HandDebugVisualizer } from '@/components/canvas/HandDebugVisualizer'
import Link from 'next/link'

function CoordinateDebugScene() {
  const { camera } = useThree()
  const [handDetection, setHandDetection] = useState<any>(null)
  
  const mappedData = useCoordinateMapping(handDetection, camera, {
    videoWidth: 1280,
    videoHeight: 720,
    flipHorizontal: true,
  })

  // Expose hand detection setter globally
  if (typeof window !== 'undefined') {
    ;(window as any).__setHandDetection = setHandDetection
  }

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      {/* Grid helper */}
      <gridHelper args={[20, 20, '#444444', '#222222']} />
      
      {/* Axis helper */}
      <axesHelper args={[5]} />
      
      {/* Hand visualization */}
      {mappedData && (
        <HandDebugVisualizer
          wristPosition={mappedData.wristPosition}
          indexBasePosition={mappedData.indexBasePosition}
          pinkyBasePosition={mappedData.pinkyBasePosition}
          allLandmarks={mappedData.allLandmarksWorld}
          showConnections={true}
        />
      )}
    </>
  )
}

export default function CoordinateDebugPage() {
  const [cameraReady, setCameraReady] = useState(false)
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)
  const handTrackingStartedRef = useRef(false)

  const { handDetection, isLoading, error, startTracking } = useHandTracking({
    maxNumHands: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5,
    onHandDetected: (hand) => {
      if (typeof window !== 'undefined' && (window as any).__setHandDetection) {
        ;(window as any).__setHandDetection(hand)
      }
    },
  })

  const handleStreamReady = useCallback((stream: MediaStream) => {
    setCameraReady(true)
  }, [])

  const handleVideoReady = useCallback((video: HTMLVideoElement) => {
    if (handTrackingStartedRef.current) return
    
    setVideoElement(video)
    handTrackingStartedRef.current = true
    
    startTracking(video)
      .then(() => console.log('Hand tracking started'))
      .catch(err => console.error('Failed to start hand tracking:', err))
  }, [startTracking])

  return (
    <div className="relative w-full h-screen bg-zinc-950 overflow-hidden">
      {/* Split view: Camera on left, 3D on right */}
      <div className="flex w-full h-full">
        {/* Camera View */}
        <div className="w-1/2 h-full relative border-r border-white/10">
          <CameraView 
            onStreamReady={handleStreamReady}
            onVideoReady={handleVideoReady}
            showControls={false}
            handDetection={handDetection}
            videoElement={videoElement}
            showLandmarks={true}
          />
          
          <div className="absolute top-4 left-4">
            <Card>
              <CardBody className="py-2 px-4">
                <p className="text-xs text-white font-medium">Camera Feed</p>
                <p className="text-xs text-zinc-400">2D MediaPipe Tracking</p>
              </CardBody>
            </Card>
          </div>
        </div>

        {/* 3D View */}
        <div className="w-1/2 h-full relative bg-zinc-900">
          <Canvas
            camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 2, 10] }}
            gl={{ antialias: true }}
          >
            <CoordinateDebugScene />
          </Canvas>
          
          <div className="absolute top-4 right-4">
            <Card>
              <CardBody className="py-2 px-4">
                <p className="text-xs text-white font-medium">3D World Space</p>
                <p className="text-xs text-zinc-400">Mapped Coordinates</p>
              </CardBody>
            </Card>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 right-4">
            <Card>
              <CardBody className="py-3">
                <h4 className="text-xs font-semibold text-white mb-2">Legend</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-zinc-300">Wrist</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-zinc-300">Index Base</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-zinc-300">Pinky Base</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                    <span className="text-zinc-300">All Landmarks</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to AR
          </Button>
        </Link>
      </div>

      {/* Status */}
      <div className="absolute top-4 left-4 z-20">
        <Card>
          <CardBody className="py-2 px-4">
            <div className="flex items-center gap-2">
              {isLoading ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                  <span className="text-xs text-zinc-300 font-medium">Initializing...</span>
                </>
              ) : error ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-xs text-red-300 font-medium">Error</span>
                </>
              ) : handDetection ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs text-green-300 font-medium">Hand Detected</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <span className="text-xs text-zinc-300 font-medium">Waiting...</span>
                </>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Coordinate Info */}
      {handDetection && (
        <div className="absolute bottom-4 left-4 z-20 max-w-sm">
          <Card>
            <CardBody className="py-3">
              <h4 className="text-xs font-semibold text-white mb-2">Coordinate Mapping</h4>
              <div className="space-y-2 text-xs font-mono">
                <div>
                  <p className="text-zinc-400 mb-1">Normalized (MediaPipe):</p>
                  <p className="text-zinc-300">
                    ({handDetection.landmarks.wrist.x.toFixed(3)}, {handDetection.landmarks.wrist.y.toFixed(3)}, {handDetection.landmarks.wrist.z.toFixed(3)})
                  </p>
                </div>
                <div className="border-t border-white/10 pt-2">
                  <p className="text-zinc-400 mb-1">Screen Space:</p>
                  <p className="text-zinc-300">
                    ({(handDetection.landmarks.wrist.x * 1280).toFixed(0)}px, {(handDetection.landmarks.wrist.y * 720).toFixed(0)}px)
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}
