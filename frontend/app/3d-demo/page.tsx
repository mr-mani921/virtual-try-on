'use client'

import { Canvas } from '@react-three/fiber'
import { Scene } from '@/components/canvas/Scene'
import { CameraControls } from '@/components/canvas/CameraControls'
import Link from 'next/link'

export default function ThreeDemoPage() {
  return (
    <div className="w-full h-screen bg-zinc-900 relative">
      <Canvas
        camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 0, 5] }}
        gl={{ antialias: true }}
      >
        <Scene />
        <CameraControls />
      </Canvas>
      
      {/* Navigation */}
      <div className="absolute top-4 left-4 z-10">
        <Link 
          href="/"
          className="bg-white/90 hover:bg-white text-zinc-900 px-4 py-2 rounded-lg shadow-lg transition-all text-sm font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to AR
        </Link>
      </div>
      
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-zinc-800/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm">
          <p className="font-medium">3D Scene Demo</p>
          <p className="text-xs text-zinc-400">React Three Fiber fundamentals</p>
        </div>
      </div>
    </div>
  )
}
