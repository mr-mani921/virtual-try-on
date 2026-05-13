'use client'

import { useState } from 'react'
import { CameraStream } from './CameraStream'
import { CameraControls } from './CameraControls'

interface CameraViewProps {
  onStreamReady?: (stream: MediaStream) => void
  showControls?: boolean
}

export function CameraView({ onStreamReady, showControls = true }: CameraViewProps) {
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')

  return (
    <div className="absolute inset-0 w-full h-full">
      <CameraStream 
        facingMode={facingMode}
        onStreamReady={onStreamReady}
        onError={(error) => console.error('Camera error:', error)}
      />
      
      {showControls && (
        <CameraControls 
          currentFacingMode={facingMode}
          onFacingModeChange={setFacingMode}
        />
      )}
    </div>
  )
}
