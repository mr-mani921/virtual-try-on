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

  const isMobile = typeof window !== 'undefined' && 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  if (!isMobile || !isSupported) {
    return null
  }

  return (
    <div className="absolute bottom-24 right-6 z-20">
      <button
        onClick={handleSwitch}
        className="bg-zinc-900/80 backdrop-blur-xl hover:bg-zinc-800/80 text-white p-4 rounded-2xl shadow-2xl border border-white/10 transition-all flex items-center gap-3"
        aria-label="Switch camera"
      >
        <svg 
          className="w-6 h-6" 
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
        <div className="text-left">
          <div className="text-xs text-zinc-400">Switch to</div>
          <div className="text-sm font-medium">
            {currentFacingMode === 'user' ? 'Rear Camera' : 'Front Camera'}
          </div>
        </div>
      </button>
    </div>
  )
}
