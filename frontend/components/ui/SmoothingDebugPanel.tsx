'use client'

import { useState, useEffect, useRef } from 'react'

interface SmoothingMetrics {
  position: {
    currentVariance: number
    avgVariance: number
    maxVariance: number
    minVariance: number
    stdDev: number
  }
  velocity: {
    current: number
    avg: number
    max: number
  }
  alpha: {
    current: number
    avg: number
    min: number
    max: number
  }
  sampleCount: number
  config: {
    useAdaptiveLerp: boolean
    smoothingFactor: number
  }
  positions?: {
    target: { x: number; y: number; z: number }
    filtered: { x: number; y: number; z: number }
    final: { x: number; y: number; z: number }
    inputVariance: number
  }
}

interface RecordingSession {
  name: string
  config: {
    useAdaptiveLerp: boolean
    smoothingFactor: number
  }
  metrics: {
    avgVariance: number
    stdDev: number
    maxVariance: number
    avgVelocity: number
    avgAlpha: number
    sampleCount: number
  }
  timestamp: number
}

interface SmoothingDebugPanelProps {
  metrics: SmoothingMetrics | null
  onToggleAdaptiveLerp?: (enabled: boolean) => void
  useAdaptiveLerp?: boolean
  /**
   * VALIDATION: Callback for toggling quaternion smoothing bypass
   */
  onToggleQuaternionSmoothing?: (bypass: boolean) => void
  bypassQuaternionSmoothing?: boolean
  /**
   * VALIDATION: Real-time rotation debug data
   */
  rotationDebug?: {
    rawQuaternion: { x: number; y: number; z: number; w: number }
    smoothedQuaternion: { x: number; y: number; z: number; w: number }
    rawEuler: { x: number; y: number; z: number }
    smoothedEuler: { x: number; y: number; z: number }
    bypassMode: boolean
    ranges: {
      raw: {
        x: { min: number; max: number; range: number }
        y: { min: number; max: number; range: number }
        z: { min: number; max: number; range: number }
      }
      smoothed: {
        x: { min: number; max: number; range: number }
        y: { min: number; max: number; range: number }
        z: { min: number; max: number; range: number }
      }
      sampleCount: number
    }
  } | null
  /**
   * VALIDATION: Callback to reset rotation range tracking
   */
  onResetRotationRanges?: () => void
  /**
   * TICKET 41d: Runtime rotation smoothing control
   */
  rotationSmoothing?: number
  onRotationSmoothingChange?: (value: number) => void
}

export function SmoothingDebugPanel({
  metrics,
  onToggleAdaptiveLerp,
  useAdaptiveLerp = true,
  onToggleQuaternionSmoothing,
  bypassQuaternionSmoothing = false,
  rotationDebug = null,
  onResetRotationRanges,
  rotationSmoothing = 0.6,
  onRotationSmoothingChange,
}: SmoothingDebugPanelProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null)
  const [sessions, setSessions] = useState<RecordingSession[]>([])
  const [sessionName, setSessionName] = useState('')
  
  const recordingMetricsRef = useRef<SmoothingMetrics[]>([])

  // Accumulate metrics during recording
  useEffect(() => {
    if (isRecording && metrics) {
      recordingMetricsRef.current.push(metrics)
    }
  }, [isRecording, metrics])

  const startRecording = () => {
    recordingMetricsRef.current = []
    setRecordingStartTime(Date.now())
    setIsRecording(true)
    setSessionName(`${useAdaptiveLerp ? 'AdaptiveLerp' : 'OneEuroOnly'}_${Date.now()}`)
  }

  const stopRecording = () => {
    setIsRecording(false)
    
    if (recordingMetricsRef.current.length === 0) return

    // Calculate aggregate metrics
    const allMetrics = recordingMetricsRef.current
    const avgVariance =
      allMetrics.reduce((sum, m) => sum + m.position.avgVariance, 0) / allMetrics.length
    const avgStdDev =
      allMetrics.reduce((sum, m) => sum + m.position.stdDev, 0) / allMetrics.length
    const maxVariance = Math.max(...allMetrics.map((m) => m.position.maxVariance))
    const avgVelocity =
      allMetrics.reduce((sum, m) => sum + m.velocity.avg, 0) / allMetrics.length
    const avgAlpha =
      allMetrics.reduce((sum, m) => sum + m.alpha.avg, 0) / allMetrics.length

    const session: RecordingSession = {
      name: sessionName,
      config: {
        useAdaptiveLerp,
        smoothingFactor: metrics?.config.smoothingFactor || 0.3,
      },
      metrics: {
        avgVariance,
        stdDev: avgStdDev,
        maxVariance,
        avgVelocity,
        avgAlpha,
        sampleCount: allMetrics.length,
      },
      timestamp: Date.now(),
    }

    setSessions((prev) => [...prev, session])
    recordingMetricsRef.current = []
    setRecordingStartTime(null)
  }

  const clearSessions = () => {
    setSessions([])
  }

  const exportData = () => {
    const data = {
      sessions,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `smoothing-experiment-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const recordingDuration = recordingStartTime
    ? ((Date.now() - recordingStartTime) / 1000).toFixed(1)
    : '0.0'

  return (
    <div className="fixed top-4 right-4 w-96 bg-slate-900/95 text-white p-4 rounded-lg shadow-2xl text-xs font-mono z-50 max-h-[90vh] overflow-y-auto">
      <h3 className="text-sm font-bold mb-3 text-blue-400">
        Position Smoothing Experiment
      </h3>

      {/* Configuration Toggle */}
      <div className="mb-4 p-3 bg-slate-800 rounded">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold">Position Smoothing:</span>
          <button
            onClick={() => onToggleAdaptiveLerp?.(!useAdaptiveLerp)}
            className={`px-3 py-1 rounded text-xs font-bold ${
              useAdaptiveLerp
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {useAdaptiveLerp ? 'Adaptive Lerp ON' : 'One Euro Only'}
          </button>
        </div>
        <div className="text-xs text-slate-400 mb-3">
          {useAdaptiveLerp
            ? 'Two-layer: One Euro Filter + Adaptive Lerp'
            : 'Single-layer: One Euro Filter only'}
        </div>

        {/* VALIDATION: Quaternion Smoothing Bypass */}
        <div className="pt-3 border-t border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Rotation Smoothing:</span>
            <button
              onClick={() => onToggleQuaternionSmoothing?.(!bypassQuaternionSmoothing)}
              className={`px-3 py-1 rounded text-xs font-bold ${
                bypassQuaternionSmoothing
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {bypassQuaternionSmoothing ? 'RAW (No Smoothing)' : 'Smoothed'}
            </button>
          </div>
          <div className="text-xs text-slate-400">
            {bypassQuaternionSmoothing
              ? '⚠️ VALIDATION MODE: Raw quaternion (jittery but responsive)'
              : 'Normal: Fixed-factor slerp smoothing'}
          </div>
          
          {/* TICKET 41d: Rotation Smoothing Factor Slider */}
          {!bypassQuaternionSmoothing && onRotationSmoothingChange && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-cyan-400">Rotation Slerp Factor:</span>
                <span className="text-xs font-mono text-white bg-slate-800 px-2 py-0.5 rounded">
                  {rotationSmoothing.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.30"
                max="0.85"
                step="0.05"
                value={rotationSmoothing}
                onChange={(e) => onRotationSmoothingChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>0.30 (heavy)</span>
                <span>0.60 (balanced)</span>
                <span>0.85 (light)</span>
              </div>
              <div className="text-xs text-slate-400 mt-2">
                Higher = more responsive, Lower = more stable
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rotation Debug Display */}
      {rotationDebug && (
        <div className="mb-4 p-3 bg-slate-800 rounded">
          <div className="font-semibold mb-2 text-cyan-400 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Rotation Values
            {rotationDebug.bypassMode && (
              <span className="ml-auto px-2 py-0.5 bg-red-600 text-white text-xs rounded font-bold">
                RAW
              </span>
            )}
            {!rotationDebug.bypassMode && (
              <span className="ml-auto px-2 py-0.5 bg-cyan-600 text-white text-xs rounded font-bold">
                α={rotationSmoothing.toFixed(2)}
              </span>
            )}
          </div>
          
          {/* TICKET 41d: Rotation Diagnostics */}
          {!rotationDebug.bypassMode && rotationDebug.ranges && rotationDebug.ranges.sampleCount > 10 && (
            <div className="mb-3 p-2 bg-slate-900 rounded">
              <div className="text-xs font-semibold text-cyan-400 mb-1">Rotation Diagnostics:</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(() => {
                  const xComp = ((rotationDebug.ranges.raw.x.range - rotationDebug.ranges.smoothed.x.range) / rotationDebug.ranges.raw.x.range) * 100
                  const yComp = ((rotationDebug.ranges.raw.y.range - rotationDebug.ranges.smoothed.y.range) / rotationDebug.ranges.raw.y.range) * 100
                  const zComp = ((rotationDebug.ranges.raw.z.range - rotationDebug.ranges.smoothed.z.range) / rotationDebug.ranges.raw.z.range) * 100
                  
                  return (
                    <>
                      <div>
                        <div className="text-slate-400">X Compress:</div>
                        <div className={`font-mono ${xComp > 20 ? 'text-red-400' : xComp > 10 ? 'text-yellow-400' : 'text-green-400'}`}>
                          {xComp.toFixed(0)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400">Y Compress:</div>
                        <div className={`font-mono ${yComp > 20 ? 'text-red-400' : yComp > 10 ? 'text-yellow-400' : 'text-green-400'}`}>
                          {yComp.toFixed(0)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400">Z Compress:</div>
                        <div className={`font-mono ${zComp > 20 ? 'text-red-400' : zComp > 10 ? 'text-yellow-400' : 'text-green-400'}`}>
                          {zComp.toFixed(0)}%
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>
          )}
          
          {/* Euler Angles (degrees) */}
          <div className="space-y-2">
            <div className="text-xs text-slate-400 mb-1">Euler Angles (degrees):</div>
            
            {/* Current (Final) Values */}
            <div className="bg-slate-900 rounded p-2">
              <div className="text-xs font-semibold text-white mb-1">
                {rotationDebug.bypassMode ? 'Raw (Active)' : 'Smoothed (Active)'}:
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-red-400">X:</span>{' '}
                  <span className="text-white font-mono">
                    {(rotationDebug.bypassMode 
                      ? rotationDebug.rawEuler.x 
                      : rotationDebug.smoothedEuler.x
                    ).toFixed(1)}°
                  </span>
                </div>
                <div>
                  <span className="text-green-400">Y:</span>{' '}
                  <span className="text-white font-mono">
                    {(rotationDebug.bypassMode 
                      ? rotationDebug.rawEuler.y 
                      : rotationDebug.smoothedEuler.y
                    ).toFixed(1)}°
                  </span>
                </div>
                <div>
                  <span className="text-blue-400">Z:</span>{' '}
                  <span className="text-white font-mono">
                    {(rotationDebug.bypassMode 
                      ? rotationDebug.rawEuler.z 
                      : rotationDebug.smoothedEuler.z
                    ).toFixed(1)}°
                  </span>
                </div>
              </div>
            </div>

            {/* Comparison (only in smoothed mode) */}
            {!rotationDebug.bypassMode && (
              <div className="bg-slate-900 rounded p-2">
                <div className="text-xs font-semibold text-orange-400 mb-1">
                  Raw (Target):
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-red-400">X:</span>{' '}
                    <span className="text-slate-300 font-mono">
                      {rotationDebug.rawEuler.x.toFixed(1)}°
                    </span>
                  </div>
                  <div>
                    <span className="text-green-400">Y:</span>{' '}
                    <span className="text-slate-300 font-mono">
                      {rotationDebug.rawEuler.y.toFixed(1)}°
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-400">Z:</span>{' '}
                    <span className="text-slate-300 font-mono">
                      {rotationDebug.rawEuler.z.toFixed(1)}°
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Quaternion Values (collapsed by default) */}
            <details className="bg-slate-900 rounded">
              <summary className="cursor-pointer p-2 text-xs text-slate-400 hover:text-white">
                Quaternion Values (advanced)
              </summary>
              <div className="p-2 pt-0 space-y-2">
                <div className="text-xs">
                  <div className="font-semibold text-white mb-1">
                    {rotationDebug.bypassMode ? 'Raw (Active)' : 'Smoothed (Active)'}:
                  </div>
                  <div className="grid grid-cols-2 gap-1 font-mono text-slate-300">
                    <div>x: {(rotationDebug.bypassMode 
                      ? rotationDebug.rawQuaternion.x 
                      : rotationDebug.smoothedQuaternion.x
                    ).toFixed(4)}</div>
                    <div>y: {(rotationDebug.bypassMode 
                      ? rotationDebug.rawQuaternion.y 
                      : rotationDebug.smoothedQuaternion.y
                    ).toFixed(4)}</div>
                    <div>z: {(rotationDebug.bypassMode 
                      ? rotationDebug.rawQuaternion.z 
                      : rotationDebug.smoothedQuaternion.z
                    ).toFixed(4)}</div>
                    <div>w: {(rotationDebug.bypassMode 
                      ? rotationDebug.rawQuaternion.w 
                      : rotationDebug.smoothedQuaternion.w
                    ).toFixed(4)}</div>
                  </div>
                </div>
                {!rotationDebug.bypassMode && (
                  <div className="text-xs pt-2 border-t border-slate-700">
                    <div className="font-semibold text-orange-400 mb-1">Raw (Target):</div>
                    <div className="grid grid-cols-2 gap-1 font-mono text-slate-400">
                      <div>x: {rotationDebug.rawQuaternion.x.toFixed(4)}</div>
                      <div>y: {rotationDebug.rawQuaternion.y.toFixed(4)}</div>
                      <div>z: {rotationDebug.rawQuaternion.z.toFixed(4)}</div>
                      <div>w: {rotationDebug.rawQuaternion.w.toFixed(4)}</div>
                    </div>
                  </div>
                )}
              </div>
            </details>

            {/* Rotation Ranges */}
            {rotationDebug.ranges && rotationDebug.ranges.sampleCount > 10 && (
              <div className="bg-slate-900 rounded p-2 mt-2">
                <div className="text-xs font-semibold text-cyan-400 mb-2 flex items-center justify-between">
                  <span>📊 Rotation Ranges</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-normal">{rotationDebug.ranges.sampleCount} samples</span>
                    {onResetRotationRanges && (
                      <button
                        onClick={onResetRotationRanges}
                        className="px-2 py-0.5 bg-red-600 hover:bg-red-700 rounded text-xs font-bold"
                        title="Reset rotation range tracking"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
                
                {/* X-axis (Pitch) */}
                <div className="mb-2 pb-2 border-b border-slate-700">
                  <div className="text-xs text-red-400 mb-1 font-semibold">X-axis (Pitch):</div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Raw Range:</span>
                      <span className="text-white font-mono">
                        {rotationDebug.ranges.raw.x.min.toFixed(1)}° to {rotationDebug.ranges.raw.x.max.toFixed(1)}°
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Smoothed Range:</span>
                      <span className="text-white font-mono">
                        {rotationDebug.ranges.smoothed.x.min.toFixed(1)}° to {rotationDebug.ranges.smoothed.x.max.toFixed(1)}°
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Raw Span:</span>
                      <span className={`font-mono ${rotationDebug.ranges.raw.x.range > 10 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {rotationDebug.ranges.raw.x.range.toFixed(1)}°
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Smoothed Span:</span>
                      <span className={`font-mono ${rotationDebug.ranges.smoothed.x.range > 10 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {rotationDebug.ranges.smoothed.x.range.toFixed(1)}°
                      </span>
                    </div>
                  </div>
                </div>

                {/* Y-axis (Yaw) */}
                <div className="mb-2 pb-2 border-b border-slate-700">
                  <div className="text-xs text-green-400 mb-1 font-semibold">Y-axis (Yaw):</div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Raw Range:</span>
                      <span className="text-white font-mono">
                        {rotationDebug.ranges.raw.y.min.toFixed(1)}° to {rotationDebug.ranges.raw.y.max.toFixed(1)}°
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Smoothed Range:</span>
                      <span className="text-white font-mono">
                        {rotationDebug.ranges.smoothed.y.min.toFixed(1)}° to {rotationDebug.ranges.smoothed.y.max.toFixed(1)}°
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Raw Span:</span>
                      <span className={`font-mono ${rotationDebug.ranges.raw.y.range > 10 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {rotationDebug.ranges.raw.y.range.toFixed(1)}°
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Smoothed Span:</span>
                      <span className={`font-mono ${rotationDebug.ranges.smoothed.y.range > 10 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {rotationDebug.ranges.smoothed.y.range.toFixed(1)}°
                      </span>
                    </div>
                  </div>
                </div>

                {/* Z-axis (Roll) */}
                <div>
                  <div className="text-xs text-blue-400 mb-1 font-semibold">Z-axis (Roll):</div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Raw Range:</span>
                      <span className="text-white font-mono">
                        {rotationDebug.ranges.raw.z.min.toFixed(1)}° to {rotationDebug.ranges.raw.z.max.toFixed(1)}°
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Smoothed Range:</span>
                      <span className="text-white font-mono">
                        {rotationDebug.ranges.smoothed.z.min.toFixed(1)}° to {rotationDebug.ranges.smoothed.z.max.toFixed(1)}°
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Raw Span:</span>
                      <span className={`font-mono ${rotationDebug.ranges.raw.z.range > 10 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {rotationDebug.ranges.raw.z.range.toFixed(1)}°
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Smoothed Span:</span>
                      <span className={`font-mono ${rotationDebug.ranges.smoothed.z.range > 10 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {rotationDebug.ranges.smoothed.z.range.toFixed(1)}°
                      </span>
                    </div>
                  </div>
                </div>

                {/* Compression Warning */}
                {(() => {
                  const xCompression = ((rotationDebug.ranges.raw.x.range - rotationDebug.ranges.smoothed.x.range) / rotationDebug.ranges.raw.x.range) * 100
                  const yCompression = ((rotationDebug.ranges.raw.y.range - rotationDebug.ranges.smoothed.y.range) / rotationDebug.ranges.raw.y.range) * 100
                  const zCompression = ((rotationDebug.ranges.raw.z.range - rotationDebug.ranges.smoothed.z.range) / rotationDebug.ranges.raw.z.range) * 100
                  
                  const hasSignificantCompression = xCompression > 20 || yCompression > 20 || zCompression > 20
                  
                  if (hasSignificantCompression && !rotationDebug.bypassMode) {
                    return (
                      <div className="mt-2 pt-2 border-t border-slate-700 bg-red-900/20 p-2 rounded">
                        <div className="text-xs text-red-400 font-semibold mb-1">⚠️ Range Compression Detected:</div>
                        <div className="text-xs space-y-0.5 text-slate-300">
                          {xCompression > 20 && <div>• X-axis: {xCompression.toFixed(0)}% compressed</div>}
                          {yCompression > 20 && <div>• Y-axis: {yCompression.toFixed(0)}% compressed</div>}
                          {zCompression > 20 && <div>• Z-axis: {zCompression.toFixed(0)}% compressed</div>}
                        </div>
                      </div>
                    )
                  }
                  return null
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Real-time Metrics */}
      {metrics && (
        <div className="mb-4 space-y-2">
          <div className="p-3 bg-slate-800 rounded">
            <div className="font-semibold mb-2 text-yellow-400">Position Variance (Output)</div>
            <div className="text-xs text-slate-400 mb-2">
              Measures final smoothed position jitter
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Current:</span>
                <span className="text-yellow-300">
                  {(metrics.position.currentVariance * 1000).toFixed(2)} mm
                </span>
              </div>
              <div className="flex justify-between">
                <span>Average:</span>
                <span className="text-green-300">
                  {(metrics.position.avgVariance * 1000).toFixed(2)} mm
                </span>
              </div>
              <div className="flex justify-between">
                <span>Std Dev:</span>
                <span className="text-blue-300">
                  {(metrics.position.stdDev * 1000).toFixed(2)} mm
                </span>
              </div>
              <div className="flex justify-between">
                <span>Max:</span>
                <span className="text-red-300">
                  {(metrics.position.maxVariance * 1000).toFixed(2)} mm
                </span>
              </div>
            </div>
          </div>

          {metrics.positions?.inputVariance !== undefined && (
            <div className="p-3 bg-slate-800 rounded">
              <div className="font-semibold mb-2 text-orange-400">Input Variance</div>
              <div className="text-xs text-slate-400 mb-2">
                MediaPipe noise before smoothing
              </div>
              <div className="flex justify-between">
                <span>Current:</span>
                <span className="text-orange-300">
                  {(metrics.positions.inputVariance * 1000).toFixed(2)} mm
                </span>
              </div>
            </div>
          )}

          <div className="p-3 bg-slate-800 rounded">
            <div className="font-semibold mb-2 text-purple-400">Velocity</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Current:</span>
                <span className="text-purple-300">
                  {metrics.velocity.current.toFixed(3)} u/s
                </span>
              </div>
              <div className="flex justify-between">
                <span>Average:</span>
                <span className="text-purple-300">
                  {metrics.velocity.avg.toFixed(3)} u/s
                </span>
              </div>
            </div>
          </div>

          {useAdaptiveLerp && (
            <div className="p-3 bg-slate-800 rounded">
              <div className="font-semibold mb-2 text-cyan-400">Adaptive Alpha</div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Current:</span>
                  <span className="text-cyan-300">{metrics.alpha.current.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average:</span>
                  <span className="text-cyan-300">{metrics.alpha.avg.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Range:</span>
                  <span className="text-cyan-300">
                    {metrics.alpha.min.toFixed(2)} - {metrics.alpha.max.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-slate-400 text-center">
            Samples: {metrics.sampleCount} (last 1 second)
          </div>
        </div>
      )}

      {/* Recording Controls */}
      <div className="mb-4 p-3 bg-slate-800 rounded">
        <div className="font-semibold mb-2">Recording Session</div>
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 rounded font-bold"
          >
            ● Start Recording
          </button>
        ) : (
          <div>
            <button
              onClick={stopRecording}
              className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 rounded font-bold animate-pulse mb-2"
            >
              ■ Stop Recording ({recordingDuration}s)
            </button>
            <div className="text-xs text-slate-400">
              Samples: {recordingMetricsRef.current.length}
            </div>
          </div>
        )}
      </div>

      {/* Recorded Sessions */}
      {sessions.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <div className="font-semibold">Recorded Sessions ({sessions.length})</div>
            <div className="space-x-2">
              <button
                onClick={exportData}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
              >
                Export JSON
              </button>
              <button
                onClick={clearSessions}
                className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sessions.map((session, idx) => (
              <div key={idx} className="p-2 bg-slate-800 rounded text-xs">
                <div className="font-semibold mb-1 flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      session.config.useAdaptiveLerp
                        ? 'bg-blue-600'
                        : 'bg-green-600'
                    }`}
                  >
                    {session.config.useAdaptiveLerp ? 'AL' : 'OE'}
                  </span>
                  <span className="text-slate-300">
                    {new Date(session.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="space-y-0.5 text-slate-400">
                  <div>Avg Variance: {(session.metrics.avgVariance * 1000).toFixed(2)} mm</div>
                  <div>Std Dev: {(session.metrics.stdDev * 1000).toFixed(2)} mm</div>
                  <div>Max: {(session.metrics.maxVariance * 1000).toFixed(2)} mm</div>
                  <div>Samples: {session.metrics.sampleCount}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison Summary */}
      {sessions.length >= 2 && (
        <div className="p-3 bg-slate-800 rounded">
          <div className="font-semibold mb-2 text-green-400">Comparison</div>
          {(() => {
            const adaptiveLerpSessions = sessions.filter((s) => s.config.useAdaptiveLerp)
            const oneEuroSessions = sessions.filter((s) => !s.config.useAdaptiveLerp)

            if (adaptiveLerpSessions.length === 0 || oneEuroSessions.length === 0) {
              return (
                <div className="text-xs text-slate-400">
                  Record sessions with both modes for comparison
                </div>
              )
            }

            const alAvg =
              adaptiveLerpSessions.reduce((sum, s) => sum + s.metrics.avgVariance, 0) /
              adaptiveLerpSessions.length
            const oeAvg =
              oneEuroSessions.reduce((sum, s) => sum + s.metrics.avgVariance, 0) /
              oneEuroSessions.length

            const improvement = ((oeAvg - alAvg) / oeAvg) * 100
            const winner = improvement > 0 ? 'One Euro Only' : 'Adaptive Lerp'

            return (
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Adaptive Lerp Avg:</span>
                  <span>{(alAvg * 1000).toFixed(2)} mm</span>
                </div>
                <div className="flex justify-between">
                  <span>One Euro Only Avg:</span>
                  <span>{(oeAvg * 1000).toFixed(2)} mm</span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-700">
                  <div className="flex justify-between font-bold">
                    <span>Winner:</span>
                    <span className={improvement > 0 ? 'text-green-400' : 'text-blue-400'}>
                      {winner}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Improvement:</span>
                    <span className={improvement > 0 ? 'text-green-400' : 'text-red-400'}>
                      {Math.abs(improvement).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
