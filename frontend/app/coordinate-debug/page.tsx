'use client'

import { useState, useCallback, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { CameraView } from '@/components/camera/CameraView'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { useHandTracking } from '@/hooks/useHandTracking'
import { useCoordinateMapping } from '@/hooks/useCoordinateMapping'
import { HandDebugVisualizer } from '@/components/canvas/HandDebugVisualizer'
import Link from 'next/link'

function CoordinateDebugScene({ showVisualizer }: { showVisualizer: boolean }) {
  const { camera } = useThree()
  const [handDetection, setHandDetection] = useState<any>(null)
  
  const mappedData = useCoordinateMapping(handDetection, camera, {
    videoWidth: 1280,
    videoHeight: 720,
    flipHorizontal: true,
  })

  if (typeof window !== 'undefined') {
    ;(window as any).__setHandDetection = setHandDetection
  }

  return (
    <>
      <color attach="background" args={['#18181b']} />
      
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-10, -10, -10]} intensity={0.4} />
      
      <gridHelper args={[20, 20, '#3f3f46', '#27272a']} position={[0, -0.01, 0]} />
      <axesHelper args={[3]} />
      
      {showVisualizer && mappedData && (
        <HandDebugVisualizer
          wristPosition={mappedData.wristPosition}
          indexBasePosition={mappedData.indexBasePosition}
          pinkyBasePosition={mappedData.pinkyBasePosition}
          allLandmarks={mappedData.allLandmarksWorld}
          showConnections={true}
        />
      )}
      
      <OrbitControls 
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={30}
      />
    </>
  )
}

export default function CoordinateDebugPage() {
  const [cameraReady, setCameraReady] = useState(false)
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)
  const [showLandmarks, setShowLandmarks] = useState(true)
  const [showVisualizer, setShowVisualizer] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [showCoordinates, setShowCoordinates] = useState(true)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
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

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
    handTrackingStartedRef.current = false
  }

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-900/10 via-transparent to-transparent"></div>
      
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-30 px-6 py-4 backdrop-blur-xl bg-zinc-900/50 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </Button>
            </Link>
            <div className="w-px h-6 bg-white/10"></div>
            <div>
              <h1 className="text-lg font-bold text-white">Coordinate Mapping Debug</h1>
              <p className="text-xs text-zinc-400">2D Tracking → 3D World Space</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {cameraReady && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs text-green-400 font-medium">System Active</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative w-full h-full pt-[72px] flex">
        {/* Camera View */}
        <div className="w-1/2 h-full relative border-r border-white/10 bg-black">
          <CameraView 
            onStreamReady={handleStreamReady}
            onVideoReady={handleVideoReady}
            showControls={false}
            handDetection={handDetection}
            videoElement={videoElement}
            showLandmarks={showLandmarks}
            facingMode={facingMode}
          />
          
          {/* Camera Label */}
          <div className="absolute top-4 left-4">
            <Card>
              <CardBody className="py-2 px-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-sky-500"></div>
                  <div>
                    <p className="text-xs text-white font-semibold">Camera Feed</p>
                    <p className="text-xs text-zinc-400">MediaPipe 2D Tracking</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Camera Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <Card>
              <CardBody className="py-2 px-3">
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
                      <span className="text-xs text-green-300 font-medium">Hand: {handDetection.handedness}</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      <span className="text-xs text-zinc-300 font-medium">Waiting for hand...</span>
                    </>
                  )}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="py-2 px-3">
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setShowLandmarks(!showLandmarks)}
                    className="flex items-center justify-between gap-3 text-xs text-white hover:text-sky-400 transition-colors"
                  >
                    <span>2D Landmarks</span>
                    <div className={`w-8 h-4 rounded-full transition-colors ${showLandmarks ? 'bg-sky-500' : 'bg-zinc-600'} relative`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${showLandmarks ? 'translate-x-4' : 'translate-x-0.5'}`}></div>
                    </div>
                  </button>
                  
                  <button
                    onClick={toggleCamera}
                    className="flex items-center gap-2 text-xs text-white hover:text-sky-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Flip Camera
                  </button>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Coordinate Info */}
          {showCoordinates && handDetection && (
            <div className="absolute bottom-4 left-4 max-w-sm">
              <Card>
                <CardBody className="py-3">
                  <h4 className="text-xs font-semibold text-white mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Wrist Coordinates
                  </h4>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="bg-zinc-800/50 rounded p-2">
                      <p className="text-zinc-400 mb-1">Normalized (0-1):</p>
                      <p className="text-sky-400">
                        x: {handDetection.landmarks.wrist.x.toFixed(4)}<br/>
                        y: {handDetection.landmarks.wrist.y.toFixed(4)}<br/>
                        z: {handDetection.landmarks.wrist.z.toFixed(4)}
                      </p>
                    </div>
                    <div className="bg-zinc-800/50 rounded p-2">
                      <p className="text-zinc-400 mb-1">Screen Space (px):</p>
                      <p className="text-green-400">
                        x: {(handDetection.landmarks.wrist.x * 1280).toFixed(0)}<br/>
                        y: {(handDetection.landmarks.wrist.y * 720).toFixed(0)}
                      </p>
                    </div>
                    <div className="bg-zinc-800/50 rounded p-2">
                      <p className="text-zinc-400 mb-1">Confidence:</p>
                      <p className="text-purple-400">{(handDetection.score * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}
        </div>

        {/* 3D View */}
        <div className="w-1/2 h-full relative">
          <Canvas
            camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 3, 12] }}
            gl={{ antialias: true }}
            shadows
          >
            <CoordinateDebugScene showVisualizer={showVisualizer} />
          </Canvas>
          
          {/* 3D Label */}
          <div className="absolute top-4 right-4">
            <Card>
              <CardBody className="py-2 px-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <div>
                    <p className="text-xs text-white font-semibold">3D World Space</p>
                    <p className="text-xs text-zinc-400">Three.js Scene</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* 3D Controls */}
          <div className="absolute top-4 left-4">
            <Card>
              <CardBody className="py-2 px-3">
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setShowVisualizer(!showVisualizer)}
                    className="flex items-center justify-between gap-3 text-xs text-white hover:text-purple-400 transition-colors"
                  >
                    <span>3D Visualizer</span>
                    <div className={`w-8 h-4 rounded-full transition-colors ${showVisualizer ? 'bg-purple-500' : 'bg-zinc-600'} relative`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${showVisualizer ? 'translate-x-4' : 'translate-x-0.5'}`}></div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setShowGrid(!showGrid)}
                    className="flex items-center justify-between gap-3 text-xs text-white hover:text-purple-400 transition-colors"
                  >
                    <span>Grid Helper</span>
                    <div className={`w-8 h-4 rounded-full transition-colors ${showGrid ? 'bg-purple-500' : 'bg-zinc-600'} relative`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${showGrid ? 'translate-x-4' : 'translate-x-0.5'}`}></div>
                    </div>
                  </button>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 right-4">
            <Card>
              <CardBody className="py-3">
                <h4 className="text-xs font-semibold text-white mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  Landmark Colors
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50"></div>
                    <span className="text-zinc-300">Wrist (Anchor)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></div>
                    <span className="text-zinc-300">Index Base</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500 shadow-lg shadow-orange-500/50"></div>
                    <span className="text-zinc-300">Pinky Base</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-400 shadow-lg shadow-blue-400/50"></div>
                    <span className="text-zinc-300">All Landmarks (21)</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Instructions */}
          <div className="absolute bottom-4 left-4">
            <Card>
              <CardBody className="py-3">
                <h4 className="text-xs font-semibold text-white mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                  Camera Controls
                </h4>
                <div className="space-y-1 text-xs text-zinc-400">
                  <p>• Left Click + Drag: Rotate</p>
                  <p>• Right Click + Drag: Pan</p>
                  <p>• Scroll: Zoom In/Out</p>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>

      {/* Bottom Toggle Bar */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30">
        <Card>
          <CardBody className="py-3 px-6">
            <div className="flex items-center gap-6">
              <button
                onClick={() => setShowCoordinates(!showCoordinates)}
                className="flex items-center gap-2 text-sm text-white hover:text-sky-400 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                {showCoordinates ? 'Hide' : 'Show'} Coordinates
              </button>
              
              <div className="w-px h-6 bg-white/10"></div>
              
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="font-mono">
                  {handDetection ? '21 landmarks tracked' : 'No hand detected'}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
