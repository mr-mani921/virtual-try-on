'use client'

import React from 'react'

interface OcclusionDiagnostics {
  // Watch
  watchScale: number
  watchFinalScale: number
  watchPosition: { x: number; y: number; z: number }
  watchRotation: { x: number; y: number; z: number }
  
  // Occluder
  occluderScaleX: number
  occluderScaleY: number
  occluderScaleZ: number
  occluderPosition: { x: number; y: number; z: number }
  
  // Tracking
  knuckleWidthRaw: number
  knuckleWidthStabilized: number
  wristDepth: number
  palmNormal: { x: number; y: number; z: number } | null
  
  // Distances
  watchToOccluderCenter: number
  watchFrontToOccluderFront: number
  watchBackToOccluderBack: number
}

interface OcclusionDiagnosticsPanelProps {
  diagnostics: OcclusionDiagnostics | null
  className?: string
}

export function OcclusionDiagnosticsPanel({
  diagnostics,
  className = '',
}: OcclusionDiagnosticsPanelProps) {
  if (!diagnostics) {
    return (
      <div className={`bg-gray-900/90 rounded-lg p-4 ${className}`}>
        <h3 className="text-sm font-semibold mb-2 text-white">
          🔍 Occlusion Diagnostics
        </h3>
        <p className="text-xs text-gray-400">No diagnostics available</p>
      </div>
    )
  }

  return (
    <div className={`bg-gray-900/90 rounded-lg p-3 space-y-2 ${className}`}>
      <h3 className="text-xs font-bold text-red-400 border-b border-red-500/30 pb-1">
        🔍 OCCLUSION DIAGNOSTICS (44e)
      </h3>

      {/* Watch Metrics */}
      <div className="space-y-1 bg-green-900/20 p-2 rounded border border-green-500/30">
        <div className="text-xs font-semibold text-green-300">Watch</div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div className="text-gray-400">Dynamic Scale:</div>
          <div className="text-white font-mono">{diagnostics.watchScale.toFixed(3)}</div>
          
          <div className="text-gray-400">Final Scale:</div>
          <div className="text-white font-mono">{diagnostics.watchFinalScale.toFixed(3)}</div>
          
          <div className="col-span-2 text-gray-400 mt-1">Position:</div>
          <div className="col-span-2 text-white font-mono text-[10px]">
            x: {diagnostics.watchPosition.x.toFixed(4)}<br/>
            y: {diagnostics.watchPosition.y.toFixed(4)}<br/>
            z: {diagnostics.watchPosition.z.toFixed(4)}
          </div>
          
          <div className="col-span-2 text-gray-400 mt-1">Rotation (deg):</div>
          <div className="col-span-2 text-white font-mono text-[10px]">
            x: {diagnostics.watchRotation.x.toFixed(1)}°<br/>
            y: {diagnostics.watchRotation.y.toFixed(1)}°<br/>
            z: {diagnostics.watchRotation.z.toFixed(1)}°
          </div>
        </div>
      </div>

      {/* Occluder Metrics */}
      <div className="space-y-1 bg-red-900/20 p-2 rounded border border-red-500/30">
        <div className="text-xs font-semibold text-red-300">Occluder</div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div className="text-gray-400">Scale X:</div>
          <div className="text-white font-mono">{diagnostics.occluderScaleX.toFixed(4)}</div>
          
          <div className="text-gray-400">Scale Y:</div>
          <div className="text-white font-mono">{diagnostics.occluderScaleY.toFixed(4)}</div>
          
          <div className="text-gray-400">Scale Z:</div>
          <div className="text-white font-mono">{diagnostics.occluderScaleZ.toFixed(4)}</div>
          
          <div className="col-span-2 text-gray-400 mt-1">Position:</div>
          <div className="col-span-2 text-white font-mono text-[10px]">
            x: {diagnostics.occluderPosition.x.toFixed(4)}<br/>
            y: {diagnostics.occluderPosition.y.toFixed(4)}<br/>
            z: {diagnostics.occluderPosition.z.toFixed(4)}
          </div>
        </div>
      </div>

      {/* Tracking Metrics */}
      <div className="space-y-1 bg-blue-900/20 p-2 rounded border border-blue-500/30">
        <div className="text-xs font-semibold text-blue-300">Tracking</div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div className="text-gray-400">Knuckle Raw:</div>
          <div className="text-white font-mono">{diagnostics.knuckleWidthRaw.toFixed(4)}</div>
          
          <div className="text-gray-400">Knuckle Stab:</div>
          <div className="text-white font-mono">{diagnostics.knuckleWidthStabilized.toFixed(4)}</div>
          
          <div className="text-gray-400">Wrist Depth:</div>
          <div className="text-white font-mono">{diagnostics.wristDepth.toFixed(3)}m ({Math.round(diagnostics.wristDepth * 100)}cm)</div>
          
          {diagnostics.palmNormal && (
            <>
              <div className="col-span-2 text-gray-400 mt-1">Palm Normal:</div>
              <div className="col-span-2 text-white font-mono text-[10px]">
                x: {diagnostics.palmNormal.x.toFixed(3)}<br/>
                y: {diagnostics.palmNormal.y.toFixed(3)}<br/>
                z: {diagnostics.palmNormal.z.toFixed(3)}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Distance Analysis */}
      <div className="space-y-1 bg-yellow-900/20 p-2 rounded border border-yellow-500/30">
        <div className="text-xs font-semibold text-yellow-300">Distances</div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div className="text-gray-400">Center→Center:</div>
          <div className="text-white font-mono">{diagnostics.watchToOccluderCenter.toFixed(4)}</div>
          
          <div className="text-gray-400">Front→Front:</div>
          <div className={`font-mono ${diagnostics.watchFrontToOccluderFront < 0 ? 'text-red-400' : 'text-green-400'}`}>
            {diagnostics.watchFrontToOccluderFront.toFixed(4)}
          </div>
          
          <div className="text-gray-400">Back→Back:</div>
          <div className={`font-mono ${diagnostics.watchBackToOccluderBack < 0 ? 'text-red-400' : 'text-green-400'}`}>
            {diagnostics.watchBackToOccluderBack.toFixed(4)}
          </div>
        </div>
        <div className="text-[10px] text-gray-500 mt-1">
          Negative = overlap/occlusion
        </div>
      </div>
    </div>
  )
}
