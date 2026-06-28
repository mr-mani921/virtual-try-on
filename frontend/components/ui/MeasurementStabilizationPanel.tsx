'use client'

import type { MeasurementStabilizationDiagnostics } from '@/lib/diagnostics/HandMeasurementStabilizer'

interface MeasurementStabilizationPanelProps {
  diagnostics: MeasurementStabilizationDiagnostics | null
  className?: string
}

export function MeasurementStabilizationPanel({ 
  diagnostics, 
  className = '' 
}: MeasurementStabilizationPanelProps) {
  if (!diagnostics) return null

  const driftAbs = Math.abs(diagnostics.differencePercent)

  const statusLabel = diagnostics.wasOutlier
    ? '🚫 OUTLIER REJECTED'
    : diagnostics.bufferReset
      ? '🔄 REGIME RESET'
      : diagnostics.bufferSize >= diagnostics.windowSize
        ? driftAbs <= 10
          ? '✅ TRACKING'
          : driftAbs <= 30
            ? '⚠️ ADAPTING'
            : '❌ HIGH DRIFT'
        : '⏳ CALIBRATING'

  const statusColor = diagnostics.wasOutlier
    ? 'text-red-400'
    : diagnostics.bufferReset
      ? 'text-cyan-400'
      : driftAbs <= 10
        ? 'text-green-400'
        : driftAbs <= 30
          ? 'text-yellow-400'
          : 'text-red-400'

  const deviationColor = diagnostics.deviationFromMedian > diagnostics.outlierThreshold
    ? 'text-red-400'
    : diagnostics.deviationFromMedian > diagnostics.outlierThreshold * 0.8
      ? 'text-orange-400'
      : 'text-green-400'

  const diffColor = driftAbs > 10
    ? 'text-red-400'
    : driftAbs > 5
      ? 'text-yellow-400'
      : 'text-green-400'

  return (
    <div 
      className={`fixed bg-black/80 backdrop-blur-sm text-white p-4 rounded-lg text-xs font-mono border border-white/20 ${className}`}
      style={{ minWidth: '340px' }}
    >
      <div className="font-bold text-sm mb-3 text-blue-400 border-b border-white/20 pb-2">
        📊 MEASUREMENT STABILIZATION
      </div>

      <div className="mb-3 pb-3 border-b border-white/10">
        <div className="flex items-center justify-between mb-1">
          <span className="text-white/60">Status:</span>
          <span className={`font-bold ${statusColor}`}>{statusLabel}</span>
        </div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-white/60">Buffer:</span>
          <span className="text-white">
            {diagnostics.bufferSize}/{diagnostics.windowSize} frames
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/60">Buffer resets:</span>
          <span className={diagnostics.bufferResetCount > 0 ? 'text-cyan-400' : 'text-white/60'}>
            {diagnostics.bufferResetCount}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-3 pb-3 border-b border-white/10">
        <div className="text-white/80 font-semibold mb-2">Knuckle Width</div>
        
        <div className="flex items-center justify-between">
          <span className="text-white/60">Raw:</span>
          <span className="text-white">{diagnostics.raw.toFixed(6)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-white/60">Median:</span>
          <span className="text-blue-300">{diagnostics.median.toFixed(6)}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-white/60">Stabilized:</span>
          <span className="text-green-400 font-bold">{diagnostics.stabilized.toFixed(6)}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-white/60">Raw vs Stabilized:</span>
          <span className={diffColor}>
            {diagnostics.differencePercent >= 0 ? '+' : ''}{diagnostics.differencePercent.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-3 pb-3 border-b border-white/10">
        <div className="text-white/80 font-semibold mb-2">Outlier Rejection</div>
        
        <div className="flex items-center justify-between">
          <span className="text-white/60">Deviation from median:</span>
          <span className={deviationColor}>
            {diagnostics.deviationFromMedian.toFixed(2)}%
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-white/60">Threshold:</span>
          <span className="text-white/60">{diagnostics.outlierThreshold.toFixed(0)}%</span>
        </div>

        <div className="mt-2">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${
                diagnostics.deviationFromMedian > diagnostics.outlierThreshold 
                  ? 'bg-red-500' 
                  : diagnostics.deviationFromMedian > diagnostics.outlierThreshold * 0.8
                    ? 'bg-orange-500'
                    : 'bg-green-500'
              }`}
              style={{ 
                width: `${Math.min(100, (diagnostics.deviationFromMedian / diagnostics.outlierThreshold) * 100)}%` 
              }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-3 pb-3 border-b border-white/10">
        <div className="text-white/80 font-semibold mb-2">Regime Change</div>

        <div className="flex items-center justify-between">
          <span className="text-white/60">Counter:</span>
          <span className={diagnostics.regimeChangeCounter > 0 ? 'text-yellow-400' : 'text-white/60'}>
            {diagnostics.regimeChangeCounter}/{diagnostics.regimeChangeFrames}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-white/60">Drift threshold:</span>
          <span className="text-white/60">{diagnostics.regimeChangeThreshold.toFixed(0)}%</span>
        </div>

        {diagnostics.bufferReset && (
          <div className="text-cyan-400 text-center mt-1">
            Buffer reset + seeded this frame
          </div>
        )}
      </div>

      <div className="space-y-1 text-xs text-white/40">
        <div>Window: {diagnostics.windowSize} frames (median)</div>
        <div>Outlier: &gt;{diagnostics.outlierThreshold.toFixed(0)}% from median</div>
        <div>Regime: {diagnostics.regimeChangeFrames} frames &gt;{diagnostics.regimeChangeThreshold.toFixed(0)}% drift</div>
      </div>
    </div>
  )
}
