'use client'

import React from 'react'
import type { WristSizeDiagnostics, MeasurementVariance } from '@/lib/diagnostics/wristSizeDiagnostics'

interface WristSizeVariancePanelProps {
  diagnostics: WristSizeDiagnostics | null
  className?: string
}

/**
 * Display variance comparison for all wrist size measurement candidates
 */
export function WristSizeVariancePanel({
  diagnostics,
  className = '',
}: WristSizeVariancePanelProps) {
  if (!diagnostics || diagnostics.sampleCount < 10) {
    return (
      <div className={`bg-gray-900/90 rounded-lg p-4 ${className}`}>
        <h3 className="text-sm font-semibold mb-2 text-white">
          Wrist Size Measurement Variance
        </h3>
        <p className="text-xs text-gray-400">
          {diagnostics ? `Collecting samples... (${diagnostics.sampleCount}/10)` : 'No data available'}
        </p>
      </div>
    )
  }

  const { candidates, variance, handState, sampleCount } = diagnostics

  // Rank measurements by stability (lower CV = more stable)
  const measurements = [
    { name: 'Index↔Pinky MCP (CURRENT)', key: 'indexToPinkyMCP', variance: variance.indexToPinkyMCP, isCurrent: true },
    { name: 'Wrist→Index MCP', key: 'wristToIndexMCP', variance: variance.wristToIndexMCP, isCurrent: false },
    { name: 'Wrist→Pinky MCP', key: 'wristToPinkyMCP', variance: variance.wristToPinkyMCP, isCurrent: false },
    { name: 'Wrist→Middle MCP', key: 'wristToMiddleMCP', variance: variance.wristToMiddleMCP, isCurrent: false },
    { name: 'Avg Wrist→Knuckle', key: 'avgWristToKnuckle', variance: variance.avgWristToKnuckle, isCurrent: false },
    { name: 'Wrist Circumference', key: 'wristCircumference', variance: variance.wristCircumference, isCurrent: false },
    { name: 'Combined Metric', key: 'combinedSizeMetric', variance: variance.combinedSizeMetric, isCurrent: false },
  ].sort((a, b) => a.variance.coefficientOfVariation - b.variance.coefficientOfVariation)

  const bestMeasurement = measurements[0]
  const worstMeasurement = measurements[measurements.length - 1]

  // Helper to render variance stats
  const renderVarianceStats = (v: MeasurementVariance) => (
    <div className="grid grid-cols-2 gap-1 text-xs">
      <div className="text-gray-400">CV:</div>
      <div className="text-white font-mono">{v.coefficientOfVariation.toFixed(2)}%</div>
      
      <div className="text-gray-400">Range:</div>
      <div className="text-white font-mono">{v.rangePercent.toFixed(1)}%</div>
      
      <div className="text-gray-400">Mean:</div>
      <div className="text-white font-mono">{v.mean.toFixed(4)}</div>
      
      <div className="text-gray-400">StdDev:</div>
      <div className="text-white font-mono">{v.stdDev.toFixed(4)}</div>
    </div>
  )

  // Determine pose category color
  let poseColor = 'text-gray-400'
  if (handState.palmOrientation === 'up') poseColor = 'text-green-400'
  else if (handState.palmOrientation === 'down') poseColor = 'text-blue-400'
  else if (handState.palmOrientation === 'side') poseColor = 'text-yellow-400'

  return (
    <div className={`bg-gray-900/90 rounded-lg p-4 space-y-3 ${className}`}>
      <h3 className="text-sm font-semibold mb-2 text-white border-b border-gray-700 pb-2">
        📊 Wrist Size Measurement Variance Analysis
      </h3>

      {/* Sample Info */}
      <div className="bg-gray-800/50 p-2 rounded text-xs">
        <div className="flex items-center justify-between mb-1">
          <span className="text-gray-400">Samples:</span>
          <span className="text-white font-mono">{sampleCount}</span>
        </div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-gray-400">Hand Depth:</span>
          <span className="text-white font-mono">{Math.round(handState.wristDepth * 100)}cm</span>
        </div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-gray-400">Orientation:</span>
          <span className={`font-mono uppercase ${poseColor}`}>{handState.palmOrientation}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Finger Spread:</span>
          <span className="text-white font-mono">{handState.fingerSpread.toFixed(1)}°</span>
        </div>
      </div>

      {/* Best Measurement */}
      <div className="bg-green-900/20 border border-green-500/30 p-2 rounded">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-green-400">
            ✅ MOST STABLE
          </span>
          <span className="text-xs text-green-400 font-mono">
            CV: {bestMeasurement.variance.coefficientOfVariation.toFixed(2)}%
          </span>
        </div>
        <div className="text-xs font-semibold text-white mb-2">
          {bestMeasurement.name}
        </div>
        {renderVarianceStats(bestMeasurement.variance)}
      </div>

      {/* Measurements Ranking */}
      <div className="space-y-1">
        <div className="text-xs font-medium text-gray-300 mb-1">Stability Ranking:</div>
        {measurements.map((m, idx) => {
          const isWorst = m.key === worstMeasurement.key
          const cvColor = 
            m.variance.coefficientOfVariation < 5 ? 'text-green-400' :
            m.variance.coefficientOfVariation < 10 ? 'text-yellow-400' :
            'text-red-400'

          return (
            <div 
              key={m.key} 
              className={`text-xs p-2 rounded ${
                m.isCurrent ? 'bg-blue-900/20 border border-blue-500/30' :
                isWorst ? 'bg-red-900/20 border border-red-500/30' :
                'bg-gray-800/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-mono">#{idx + 1}</span>
                  <span className="text-gray-300">
                    {m.name}
                    {m.isCurrent && <span className="ml-2 text-blue-400">⚡ IN USE</span>}
                    {isWorst && <span className="ml-2 text-red-400">❌ WORST</span>}
                  </span>
                </div>
                <span className={`font-mono font-semibold ${cvColor}`}>
                  {m.variance.coefficientOfVariation.toFixed(2)}%
                </span>
              </div>
              <div className="mt-1 text-gray-500 font-mono">
                Range: {m.variance.rangePercent.toFixed(1)}% | 
                Mean: {m.variance.mean.toFixed(4)}
              </div>
            </div>
          )
        })}
      </div>

      {/* Current Values */}
      <div className="bg-gray-800/50 p-2 rounded">
        <div className="text-xs font-medium text-gray-300 mb-2">Current Frame Values:</div>
        <div className="grid grid-cols-2 gap-1 text-xs font-mono">
          <div className="text-gray-400">Index↔Pinky:</div>
          <div className="text-white">{candidates.indexToPinkyMCP.toFixed(4)}</div>
          
          <div className="text-gray-400">Wrist→Index:</div>
          <div className="text-white">{candidates.wristToIndexMCP.toFixed(4)}</div>
          
          <div className="text-gray-400">Wrist→Pinky:</div>
          <div className="text-white">{candidates.wristToPinkyMCP.toFixed(4)}</div>
          
          <div className="text-gray-400">Wrist→Middle:</div>
          <div className="text-white">{candidates.wristToMiddleMCP.toFixed(4)}</div>
          
          <div className="text-gray-400">Avg W→K:</div>
          <div className="text-white">{candidates.avgWristToKnuckle.toFixed(4)}</div>
          
          <div className="text-gray-400">Circumference:</div>
          <div className="text-white">{candidates.wristCircumference.toFixed(4)}</div>
        </div>
      </div>

      {/* Testing Protocol */}
      <div className="text-xs text-gray-400 bg-gray-800/30 p-2 rounded border border-gray-700">
        <div className="font-medium text-gray-300 mb-1">Testing Protocol:</div>
        <ul className="list-disc list-inside space-y-0.5 text-gray-400">
          <li>Move hand near/far (30-70cm)</li>
          <li>Rotate palm up/down/side</li>
          <li>Spread/close fingers</li>
          <li>Watch CV% ranking change</li>
        </ul>
        <div className="mt-2 text-gray-500">
          Lower CV% = more stable measurement
        </div>
      </div>
    </div>
  )
}
