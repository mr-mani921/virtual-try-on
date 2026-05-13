'use client'

import { useState } from 'react'

interface CameraControlsProps {
  onFacingModeChange: (mode: 'user' | 'environment') => void
  currentFacingMode: 'user' | 'environment'
}

export function CameraControls({ onFacingModeChange, currentFacingMode }: CameraControlsProps) {
  const [isSupported, setIsSupported] = useState(true)

  const handleSwitch = () => {
    const newMode = currentFacingMode === 'user' ? 'environment' : 'user'
    onFacingModeChange(newMode)
  }

  // Check if device has multiple cameras (typically mobile)
  const isMobile = typeof window !== 'undefined' && 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  if (!isMobile || !isSupported) {
    return null
  }

  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20">
      <button
        onClick={handleSwitch}
        className="bg-white/90 hover:bg-white text-zinc-900 px-6 py-3 rounded-full shadow-lg transition-all flex items-center gap-2"
        aria-label="Switch camera"
      >
        <svg 
          className="w-5 h-5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
          />
        </svg>
        <span className="text-sm font-medium">
          {currentFacingMode === 'user' ? 'Switch to Rear' : 'Switch to Front'}
        </span>
      </button>
    </div>
  )
}
