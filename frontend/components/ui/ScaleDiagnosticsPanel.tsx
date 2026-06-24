'use client'

import React from 'react'
import type { ScaleDiagnostics } from '@/hooks/useDynamicScale'

interface ScaleDiagnosticsPanelProps {
  diagnostics: ScaleDiagnostics | null
  className?: string
}

export function ScaleDiagnosticsPanel({
  diagnostics,
  className = '',
}: ScaleDiagnosticsPanelProps) {
  if (!diagnostics) {
    return (
      <div className={`bg-gray-900/90 rounded-lg p-4 ${className}`}>
        <h3 className="text-sm font-semibold mb-2 text-white">
          Scale Diagnostics
        </h3>
        <p className="text-xs text-gray-400">No diagnostics available</p>
      </div>
    )
  }

  const { isCalibrated, calibrationFrames } = diagnostics

  // Determine distance range (for 30cm/50cm/70cm comparison)
  const depthInCm = Math.round(diagnostics.wristDepth * 100)
  let distanceCategory = 'Unknown'
  let categoryColor = 'text-gray-400'
  
  if (depthInCm < 40) {
    distanceCategory = '< 40cm (Very Close)'
    categoryColor = 'text-red-400'
  } else if (depthInCm < 60) {
    distanceCategory = '40-60cm (Close)'
    categoryColor = 'text-yellow-400'
  } else if (depthInCm < 80) {
    distanceCategory = '60-80cm (Normal)'
    categoryColor = 'text-green-400'
  } else {
    distanceCategory = '> 80cm (Far)'
    categoryColor = 'text-blue-400'
  }

  return (
    <div className={`bg-gray-900/90 rounded-lg p-4 space-y-3 ${className}`}>
      <h3 className="text-sm font-semibold mb-2 text-white border-b border-gray-700 pb-2">
        🔍 Scale Growth Investigation
      </h3>

      {/* Calibration Status */}
      <div className="space-y-1">
        <div className="text-xs font-medium text-gray-300">
          Calibration Status
        </div>
        <div className="flex items-center gap-2 text-xs">
          {isCalibrated ? (
            <>
              <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-green-400">Calibrated</span>
            </>
          ) : (
            <>
              <span className="inline-block w-2 h-2 rounded-full bg-yellow-500"></span>
              <span className="text-yellow-400">
                Calibrating ({calibrationFrames}/30 frames)
              </span>
            </>
          )}
        </div>
      </div>

      {/* Distance Category */}
      <div className="space-y-1">
        <div className="text-xs font-medium text-gray-300">
          Distance Category
        </div>
        <div className={`text-xs font-bold ${categoryColor}`}>
          {distanceCategory}
        </div>
      </div>

      {/* Screen-Space Measurements */}
      <div className="space-y-1 bg-gray-800/50 p-2 rounded">
        <div className="text-xs font-medium text-blue-300">
          📐 Screen-Space (2D Normalized)
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-400">Knuckle Width:</span>
            <span className="ml-1 text-white font-mono">
              {diagnostics.screenKnuckleWidth.toFixed(4)}
            </span>
          </div>
        </div>
      </div>

      {/* World-Space Measurements */}
      <div className="space-y-1 bg-gray-800/50 p-2 rounded">
        <div className="text-xs font-medium text-purple-300">
          🌍 World-Space (3D Reconstructed)
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-400">Knuckle Width:</span>
            <span className="ml-1 text-white font-mono">
              {diagnostics.worldKnuckleWidth.toFixed(4)}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Hand Length:</span>
            <span className="ml-1 text-white font-mono">
              {diagnostics.worldHandLength.toFixed(4)}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-400">Wrist Size (combined):</span>
            <span className="ml-1 text-white font-mono">
              {diagnostics.worldWristSize.toFixed(4)}
            </span>
          </div>
        </div>
      </div>

      {/* Depth Measurements */}
      <div className="space-y-1 bg-gray-800/50 p-2 rounded">
        <div className="text-xs font-medium text-green-300">
          📏 Depth (Distance from Camera)
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-400">Current Depth:</span>
            <span className="ml-1 text-white font-mono">
              {diagnostics.wristDepth.toFixed(4)} ({depthInCm}cm)
            </span>
          </div>
          <div>
            <span className="text-gray-400">Reference Depth:</span>
            <span className="ml-1 text-white font-mono">
              {diagnostics.referenceDepth.toFixed(4)}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-400">Depth Ratio:</span>
            <span className="ml-1 text-white font-mono">
              {diagnostics.depthRatio.toFixed(4)}
            </span>
          </div>
        </div>
      </div>

      {/* Scale Factors */}
      <div className="space-y-1 bg-gray-800/50 p-2 rounded">
        <div className="text-xs font-medium text-yellow-300">
          ⚖️ Scale Factors
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-400">Size Factor:</span>
            <span className="ml-1 text-white font-mono">
              {diagnostics.sizeFactor.toFixed(4)}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Depth Factor:</span>
            <span className="ml-1 text-white font-mono">
              {diagnostics.depthFactor.toFixed(4)}
            </span>
          </div>
        </div>
      </div>

      {/* Final Scale */}
      <div className="space-y-1 bg-gray-800/50 p-2 rounded">
        <div className="text-xs font-medium text-orange-300">
          🎯 Final Scale
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-400">Base Scale:</span>
            <span className="ml-1 text-white font-mono">
              {diagnostics.baseScale.toFixed(4)}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Target Scale:</span>
            <span className="ml-1 text-white font-mono">
              {diagnostics.targetScale.toFixed(4)}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-400">Final Scale (smoothed):</span>
            <span className="ml-1 font-mono font-bold text-orange-400">
              {diagnostics.finalScale.toFixed(4)}
            </span>
          </div>
        </div>
      </div>

      {/* Scale Growth Analysis */}
      {isCalibrated && (
        <div className="space-y-1 bg-red-900/20 border border-red-500/30 p-2 rounded">
          <div className="text-xs font-medium text-red-300">
            ⚠️ Scale Growth Analysis
          </div>
          <div className="text-xs text-gray-300 space-y-1">
            <div>
              <span className="text-gray-400">Scale vs Base:</span>
              <span className="ml-1 text-white font-mono">
                {((diagnostics.finalScale / diagnostics.baseScale) * 100).toFixed(1)}%
              </span>
              {diagnostics.finalScale > diagnostics.baseScale * 1.2 && (
                <span className="ml-2 text-red-400">⚠️ High inflation!</span>
              )}
            </div>
            <div>
              <span className="text-gray-400">Depth contribution:</span>
              <span className="ml-1 text-white font-mono">
                {((diagnostics.depthFactor - 1) * 100).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-gray-400">Size contribution:</span>
              <span className="ml-1 text-white font-mono">
                {((diagnostics.sizeFactor - 1) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Testing Instructions */}
      <div className="text-xs text-gray-400 bg-gray-800/30 p-2 rounded border border-gray-700">
        <div className="font-medium text-gray-300 mb-1">Testing Protocol:</div>
        <ul className="list-disc list-inside space-y-0.5 text-gray-400">
          <li>Move hand to ~30cm (very close)</li>
          <li>Move hand to ~50cm (normal)</li>
          <li>Move hand to ~70cm (far)</li>
          <li>Compare scale growth across distances</li>
        </ul>
      </div>
    </div>
  )
}
