'use client'

import { useState, useEffect } from 'react'

interface CameraControlsProps {
  onFacingModeChange: (mode: 'user' | 'environment') => void
  currentFacingMode: 'user' | 'environment'
}

export function CameraControls({ onFacingModeChange, currentFacingMode }: CameraControlsProps) {
  const [showButton, setShowButton] = useState(false)

  useEffect(() => {
    // Check if device is mobile and has multiple cameras
    const checkCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter(device => device.kind === 'videoinput')
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        
        // Show button only on mobile with multiple cameras
        setShowButton(isMobile && videoDevices.length > 1)
      } catch (error) {
        console.warn('Failed to check cameras:', error)
        setShowButton(false)
      }
    }

    checkCameras()
  }, [])

  const handleSwitch = () => {
    const newMode = currentFacingMode === 'user' ? 'environment' : 'user'
    onFacingModeChange(newMode)
  }

  if (!showButton) {
    return null
  }

  return (
    <div className="absolute bottom-24 right-4 sm:right-6 z-20">
      <button
        onClick={handleSwitch}
        className="bg-zinc-900/80 backdrop-blur-xl hover:bg-zinc-800/80 text-white p-2 sm:p-3 rounded-full shadow-2xl border border-white/10 transition-all"
        aria-label={`Switch to ${currentFacingMode === 'user' ? 'rear' : 'front'} camera`}
        title={`Switch to ${currentFacingMode === 'user' ? 'rear' : 'front'} camera`}
      >
        <svg 
          className="w-5 h-5 sm:w-6 sm:h-6" 
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
      </button>
    </div>
  )
}
