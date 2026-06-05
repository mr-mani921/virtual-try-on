'use client'

import { useState } from 'react'
import { CameraView } from '@/components/camera/CameraView'
import Link from 'next/link'

export default function CameraTestPage() {
  const [streamInfo, setStreamInfo] = useState<string>('')

  const handleStreamReady = (stream: MediaStream) => {
    const videoTrack = stream.getVideoTracks()[0]
    const settings = videoTrack.getSettings()
    
    setStreamInfo(
      `Camera: ${videoTrack.label}\n` +
      `Resolution: ${settings.width}x${settings.height}\n` +
      `Facing: ${settings.facingMode || 'unknown'}`
    )
  }

  return (
    <div className="w-full h-screen bg-zinc-900 flex flex-col">
      {/* Header */}
      <div className="bg-zinc-800 border-b border-zinc-700 p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-white text-xl font-semibold">Camera Test</h1>
            <p className="text-zinc-400 text-sm">Browser camera integration demo</p>
          </div>
          <Link 
            href="/"
            className="text-zinc-400 hover:text-white transition-colors text-sm"
          >
            ← Back to 3D Scene
          </Link>
        </div>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative min-h-0">
        <CameraView onStreamReady={handleStreamReady} />
        
        {/* Info Overlay */}
        {streamInfo && (
          <div className="absolute top-4 left-4 bg-black/70 text-white text-xs p-3 rounded-lg font-mono whitespace-pre-line z-10">
            {streamInfo}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-zinc-800 border-t border-zinc-700 p-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-zinc-400 text-sm">
            <span className="text-white font-medium">Instructions:</span> Grant camera permission when prompted. 
            On mobile, use the button to switch between front and rear cameras.
          </p>
        </div>
      </div>
    </div>
  )
}
