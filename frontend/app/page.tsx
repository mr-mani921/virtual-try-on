'use client'

import { useState, useCallback } from 'react'
import { CameraView } from '@/components/camera/CameraView'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { useHandTracking } from '@/hooks/useHandTracking'

export default function Home() {
  const [cameraReady, setCameraReady] = useState(false)
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)
  const [showLandmarks, setShowLandmarks] = useState(true)

  const { handDetection, isLoading: trackingLoading, error: trackingError, startTracking } = useHandTracking({
    maxNumHands: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5,
  })

  const handleStreamReady = (stream: MediaStream) => {
    setCameraReady(true)
    console.log('Camera ready:', stream)
  }

  const handleVideoReady = useCallback(async (video: HTMLVideoElement) => {
    setVideoElement(video)
    console.log('Video element ready, starting hand tracking...')
    try {
      await startTracking(video)
      console.log('Hand tracking started successfully')
    } catch (err) {
      console.error('Failed to start hand tracking:', err)
    }
  }, [startTracking])

  const handDetected = handDetection !== null

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-900/20 via-transparent to-transparent"></div>
      
      {/* Main Content */}
      <div className="relative z-10 w-full h-full flex flex-col">
        {/* Header */}
        <header className="px-6 py-4 backdrop-blur-xl bg-zinc-900/50 border-b border-white/10">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-purple-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">AR Watch Try-On</h1>
                <p className="text-xs text-zinc-400">Virtual watch fitting experience</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {cameraReady && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs text-green-400 font-medium">Camera Active</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Camera View */}
        <div className="flex-1 relative">
          <CameraView 
            onStreamReady={handleStreamReady}
            onVideoReady={handleVideoReady}
            showControls={true}
            handDetection={handDetection}
            videoElement={videoElement}
            showLandmarks={showLandmarks}
          />
          
          {/* Overlay UI */}
          {cameraReady && (
            <>
              {/* Instructions Card */}
              <div className="absolute top-6 left-6 max-w-sm">
                <Card>
                  <CardBody className="py-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white mb-1">
                          {handDetected ? 'Hand detected!' : 'Position your hand'}
                        </h3>
                        <p className="text-xs text-zinc-400">
                          {handDetected 
                            ? `${handDetection?.handedness} hand tracked with ${(handDetection?.score || 0 * 100).toFixed(0)}% confidence`
                            : 'Show your hand to the camera to begin tracking'
                          }
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>

              {/* Status Indicator */}
              <div className="absolute top-6 right-6">
                <Card>
                  <CardBody className="py-2 px-4">
                    <div className="flex items-center gap-2">
                      {trackingLoading ? (
                        <>
                          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                          <span className="text-xs text-zinc-300 font-medium">Initializing hand tracking...</span>
                        </>
                      ) : trackingError ? (
                        <>
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          <span className="text-xs text-red-300 font-medium">Tracking error</span>
                        </>
                      ) : handDetected ? (
                        <>
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                          <span className="text-xs text-green-300 font-medium">
                            Hand detected ({handDetection?.handedness})
                          </span>
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
              </div>

              {/* Bottom Controls */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                <Card>
                  <CardBody className="py-3 px-6">
                    <div className="flex items-center gap-4">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowLandmarks(!showLandmarks)}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {showLandmarks ? 'Hide' : 'Show'} Landmarks
                      </Button>
                      
                      <div className="w-px h-6 bg-white/10"></div>
                      
                      <Button variant="ghost" size="sm" disabled>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Select Watch
                      </Button>
                      
                      <div className="w-px h-6 bg-white/10"></div>
                      
                      <Button variant="ghost" size="sm" disabled>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Capture
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              </div>

              {/* Debug Info Panel */}
              {handDetected && handDetection && (
                <div className="absolute bottom-24 right-6 max-w-xs">
                  <Card>
                    <CardBody className="py-3">
                      <h4 className="text-xs font-semibold text-white mb-2">Key Landmarks</h4>
                      <div className="space-y-1 text-xs font-mono">
                        <div className="flex justify-between text-zinc-400">
                          <span>Wrist:</span>
                          <span>
                            ({handDetection.landmarks.wrist.x.toFixed(3)}, {handDetection.landmarks.wrist.y.toFixed(3)})
                          </span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Index Base:</span>
                          <span>
                            ({handDetection.landmarks.indexBase.x.toFixed(3)}, {handDetection.landmarks.indexBase.y.toFixed(3)})
                          </span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Pinky Base:</span>
                          <span>
                            ({handDetection.landmarks.pinkyBase.x.toFixed(3)}, {handDetection.landmarks.pinkyBase.y.toFixed(3)})
                          </span>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </div>
              )}
            </>
          )}

          {/* Loading State */}
          {!cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Card className="max-w-md">
                <CardBody className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">Initializing Camera</h2>
                  <p className="text-sm text-zinc-400">Please grant camera permission to continue</p>
                </CardBody>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

