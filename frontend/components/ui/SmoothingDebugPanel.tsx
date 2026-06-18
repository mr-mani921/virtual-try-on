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
}

export function SmoothingDebugPanel({
  metrics,
  onToggleAdaptiveLerp,
  useAdaptiveLerp = true,
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
          <span className="font-semibold">Smoothing Mode:</span>
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
        <div className="text-xs text-slate-400">
          {useAdaptiveLerp
            ? 'Two-layer: One Euro Filter + Adaptive Lerp'
            : 'Single-layer: One Euro Filter only'}
        </div>
      </div>

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
