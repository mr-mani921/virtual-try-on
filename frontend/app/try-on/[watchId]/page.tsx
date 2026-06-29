'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Canvas, useThree } from '@react-three/fiber'
import { CameraView } from '@/components/camera/CameraView'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { useHandTracking } from '@/hooks/useHandTracking'
import type { HandDetection } from '@/lib/mediapipe/types'
import { useCoordinateMapping } from '@/hooks/useCoordinateMapping'
import { useWatchConfig } from '@/hooks/useWatchConfig'
import { useDynamicScale } from '@/hooks/useDynamicScale'
import { WatchModel } from '@/components/canvas/WatchModel'
import { WristOccluder } from '@/components/canvas/WristOccluder'
import { Environment } from '@/components/canvas/Environment'
import { getWatchById } from '@/lib/watches/registry'
import Link from 'next/link'

// AR Scene Component - Uses only default config, not watch-specific values
function ARScene({
  handDetection,
  currentWatch,
  watchConfig,
  handedness,
  dynamicScale,
  wristDepth,
}: {
  handDetection: HandDetection | null
  currentWatch: any
  watchConfig: any
  handedness: 'Left' | 'Right'
  dynamicScale: number
  wristDepth: number
}) {
  const { camera } = useThree()

  const mappedData = useCoordinateMapping(handDetection, camera, {
    videoWidth: 1280,
    videoHeight: 720,
    flipHorizontal: false,
  })

  const isHandTracked = handDetection !== null && mappedData !== null

  return (
    <>
      {isHandTracked && (
        <>
          <WristOccluder
            wristPosition={mappedData.wristPosition}
            handOrientation={mappedData.handOrientation}
            indexBasePosition={mappedData.indexBasePosition}
            pinkyBasePosition={mappedData.pinkyBasePosition}
            palmNormal={mappedData.palmNormal}
            occluderOffset={watchConfig.occluderOffset}
            frontFaceDepthBias={watchConfig.frontFaceDepthBias}
            watchScale={dynamicScale}
            cameraDepth={wristDepth}
            smoothing={watchConfig.smoothing}
          />
          <WatchModel
            wristPosition={mappedData.wristPosition}
            handOrientation={mappedData.handOrientation}
            handedness={handedness}
            smoothing={watchConfig.smoothing}
            rotationSmoothing={0.6}
            scale={watchConfig.scale}
            dynamicScale={dynamicScale}
            useDynamicScaling={true}
            positionOffset={watchConfig.positionOffset}
            rotationOffset={watchConfig.rotationOffset}
            wristFitBias={watchConfig.wristFitBias}
            palmNormal={mappedData.palmNormal}
            showDebugAxis={false}
            useAdaptiveLerp={false}
            modelPath={currentWatch?.modelUrl}
          />
        </>
      )}

      <Environment preset="studio" intensity={1.2} />
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />
      <pointLight position={[-5, 3, -5]} intensity={0.4} color="#fff" />
      <spotLight
        position={[0, 5, 0]}
        intensity={0.3}
        angle={Math.PI / 4}
        penumbra={0.5}
        castShadow
      />
    </>
  )
}

export default function TryOnPage() {
  const params = useParams()
  const watchId = params.watchId as string

  const [currentWatch, setCurrentWatch] = useState<any>(null)
  const [watchNotFound, setWatchNotFound] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)
  const [trackingState, setTrackingState] = useState<'loading' | 'initializing' | 'searching' | 'detected' | 'lost'>('loading')
  const handTrackingStartedRef = useRef(false)

  // Watch configuration
  const watchConfig = useWatchConfig('default')

  // Load watch from registry
  useEffect(() => {
    const watch = getWatchById(watchId)
    if (watch) {
      setCurrentWatch(watch)
      setTrackingState('initializing')
    } else {
      setWatchNotFound(true)
    }
  }, [watchId])

  // Hand tracking
  const {
    handDetection,
    isLoading: trackingLoading,
    error: trackingError,
    hasProcessedFrames,
    startTracking,
  } = useHandTracking({
    maxNumHands: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5,
  })

  // Dynamic scaling with stabilization (TICKET 44a-44c)
  const { dynamicScale, wristDepth } = useDynamicScale(handDetection, {
    baseScale: watchConfig.config.scale,
    minScale: 0.8,
    maxScale: 3.0,
    smoothing: 0.2,
    enabled: true,
    adaptiveReference: true,
    // TICKET 44b: Size factor constraints
    minSizeFactor: 0.85,
    maxSizeFactor: 1.15,
    // TICKET 44c: Perspective scale rebalance
    sizeFactorInfluence: 0.4,
    depthExponent: 0.85,
  })

  // Update tracking state based on hand detection
  useEffect(() => {
    if (trackingError) {
      setTrackingState('lost')
    } else if (trackingLoading || (cameraReady && !hasProcessedFrames && !handDetection)) {
      setTrackingState('initializing')
    } else if (handDetection) {
      setTrackingState('detected')
    } else if (cameraReady && hasProcessedFrames) {
      setTrackingState('searching')
    }
  }, [trackingError, trackingLoading, cameraReady, hasProcessedFrames, handDetection])

  const handleStreamReady = useCallback(() => {
    setCameraReady(true)
    setTrackingState('initializing')
  }, [])

  const handleVideoReady = useCallback(
    (video: HTMLVideoElement) => {
      if (handTrackingStartedRef.current) return

      setVideoElement(video)
      handTrackingStartedRef.current = true

      startTracking(video)
        .then(() => setTrackingState((state) => (state === 'lost' ? state : 'initializing')))
        .catch((err) => {
          console.error('Failed to start hand tracking:', err)
          setTrackingState('lost')
        })
    },
    [startTracking]
  )

  // Watch not found error
  if (watchNotFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardBody className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Watch Not Found</h2>
            <p className="text-slate-400 mb-6">
              The watch you're looking for doesn't exist or has been removed.
            </p>
            <Link href="/watches">
              <Button>Browse All Watches</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    )
  }

  // Loading watch
  if (!currentWatch) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-medium">Loading watch...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-30 px-6 py-4 backdrop-blur-xl bg-slate-900/50 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/watches">
            <Button variant="ghost" size="sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Catalog
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            {cameraReady && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-emerald-400 font-medium">Camera Active</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative w-full h-full pt-[72px]">
        {/* Camera View */}
        <CameraView
          onStreamReady={handleStreamReady}
          onVideoReady={handleVideoReady}
          handDetection={handDetection}
          videoElement={videoElement}
          showLandmarks={false}
        />

        {/* 3D AR Overlay */}
        {cameraReady && (
          <div className="absolute inset-0 pointer-events-none">
            <Canvas
              camera={{
                fov: 75,
                near: 0.1,
                far: 1000,
                position: [0, 0, 0],
              }}
              gl={{
                antialias: true,
                alpha: true,
                preserveDrawingBuffer: true,
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
            >
              <ARScene
                handDetection={handDetection}
                currentWatch={currentWatch}
                watchConfig={watchConfig.config}
                handedness={handDetection?.handedness || 'Right'}
                dynamicScale={dynamicScale}
                wristDepth={wristDepth}
              />
            </Canvas>
          </div>
        )}

        {/* Tracking State Overlay - Ticket 29 */}
        {cameraReady && (
          <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-20">
            <Card>
              <CardBody className="py-2 px-4">
                <div className="flex items-center gap-2">
                  {trackingState === 'loading' && (
                    <>
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-xs text-slate-300 font-medium">Loading watch...</span>
                    </>
                  )}
                  {trackingState === 'initializing' && (
                    <>
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-xs text-slate-300 font-medium">Initializing camera...</span>
                    </>
                  )}
                  {trackingState === 'searching' && (
                    <>
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      <span className="text-xs text-blue-300 font-medium">Searching for hand...</span>
                    </>
                  )}
                  {trackingState === 'detected' && (
                    <>
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs text-emerald-300 font-medium">
                        Hand detected ({handDetection?.handedness})
                      </span>
                    </>
                  )}
                  {trackingState === 'lost' && (
                    <>
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-xs text-red-300 font-medium">Tracking lost</span>
                    </>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Watch Info Panel - Ticket 35 */}
        {cameraReady && currentWatch && (
          <div className="absolute bottom-6 left-6 max-w-sm z-20">
            <Card>
              <CardBody className="py-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {currentWatch.name}
                    </h3>
                    <p className="text-sm text-slate-400 mb-2">{currentWatch.brand}</p>
                    {currentWatch.price && (
                      <p className="text-lg font-bold text-blue-400">{currentWatch.price}</p>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Onboarding Guide - Ticket 30 */}
        {cameraReady && trackingState === 'searching' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="text-center max-w-md px-6">
              <div className="mb-6">
                <svg className="w-24 h-24 mx-auto text-blue-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                </svg>
              </div>
              <Card className="backdrop-blur-xl">
                <CardBody className="py-6">
                  <h3 className="text-xl font-bold text-white mb-3">
                    Position Your Hand
                  </h3>
                  <ul className="text-sm text-slate-300 space-y-2 text-left">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400">→</span>
                      <span>Hold your hand in front of the camera</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400">→</span>
                      <span>Make sure your wrist is visible</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400">→</span>
                      <span>Keep your hand steady for best results</span>
                    </li>
                  </ul>
                </CardBody>
              </Card>
            </div>
          </div>
        )}

        {/* Loading State */}
        {!cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Card className="max-w-md">
              <CardBody className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Initializing Camera</h2>
                <p className="text-sm text-slate-400">Please grant camera permission to continue</p>
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
