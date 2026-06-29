'use client'

import React, { useState, useCallback } from 'react'

/**
 * TICKET 44f: Occluder Derivation Audit Panel
 * Captures live pipeline snapshots and exports all samples in the report.
 */

export interface OccluderAuditSample {
  id: number
  timestamp: string
  selectedDistance: string
  pose: string
  measuredDepthCm: number

  // Measurements
  knuckleWidthRaw: number
  knuckleWidthStabilized: number
  worldKnuckleWidth: number
  screenKnuckleWidth: number
  wristDepth: number

  // Pipeline
  baseScaleX: number
  baseScaleY: number
  baseScaleZ: number
  watchScale: number
  depthRatio: number
  depthDampening: number

  // Final occluder
  finalScaleX: number
  finalScaleY: number
  finalScaleZ: number
  occluderWorldX: number
  occluderWorldY: number
  occluderWorldZ: number
  palmRetreat: number
  basePalmOffset: number
  frontFaceY: number
  backFaceY: number

  // Watch (for comparison)
  watchDynamicScale: number
  watchWorldX: number
  watchWorldY: number
  watchWorldZ: number
}

export interface LiveAuditSnapshot {
  occluder: {
    scaleX: number
    scaleY: number
    scaleZ: number
    position: { x: number; y: number; z: number }
    knuckleWidth: number
    baseScaleX: number
    baseScaleY: number
    baseScaleZ: number
    depthRatio: number
    depthDampening: number
    watchScale: number
    palmRetreat: number
    basePalmOffset: number
    frontFaceY: number
    backFaceY: number
  } | null
  watch: {
    scale: number
    position: { x: number; y: number; z: number }
  } | null
  diagnostics: {
    worldKnuckleWidth: number
    screenKnuckleWidth: number
    wristDepth: number
    stabilizationRaw: number
    stabilizationStabilized: number
  } | null
}

interface OccluderAuditPanelProps {
  getLiveSnapshot: () => LiveAuditSnapshot
  hasHandTracking: boolean
}

const DISTANCES = ['30cm', '50cm', '80cm', '120cm'] as const
const POSES = [
  'palm_up',
  'palm_down',
  'side_left',
  'side_right',
  'fingers_together',
  'fingers_spread',
] as const

function fmt(n: number, digits = 4): string {
  return Number.isFinite(n) ? n.toFixed(digits) : 'N/A'
}

function buildReport(samples: OccluderAuditSample[]): string {
  const lines: string[] = []

  lines.push('TICKET 44f — Occluder Derivation Audit Report')
  lines.push(`Generated: ${new Date().toLocaleString()}`)
  lines.push(`Total Samples: ${samples.length}`)
  lines.push('')
  lines.push('═══════════════════════════════════════════════════════════════')
  lines.push('RAW CAPTURED SAMPLES')
  lines.push('═══════════════════════════════════════════════════════════════')
  lines.push('')

  if (samples.length === 0) {
    lines.push('No samples captured.')
    return lines.join('\n')
  }

  // Header
  lines.push(
    [
      '#',
      'Distance',
      'Pose',
      'MeasDepth',
      'kW(raw)',
      'kW(stab)',
      'kW(world)',
      'watchScale',
      'depthDamp',
      'scaleX',
      'scaleY',
      'scaleZ',
      'frontFaceY',
      'backFaceY',
    ].join('\t')
  )

  samples.forEach((s, i) => {
    lines.push(
      [
        String(i + 1),
        s.selectedDistance,
        s.pose,
        `${s.measuredDepthCm}cm`,
        fmt(s.knuckleWidthRaw, 4),
        fmt(s.knuckleWidthStabilized, 4),
        fmt(s.worldKnuckleWidth, 4),
        fmt(s.watchScale, 3),
        fmt(s.depthDampening, 3),
        fmt(s.finalScaleX, 4),
        fmt(s.finalScaleY, 4),
        fmt(s.finalScaleZ, 4),
        fmt(s.frontFaceY, 4),
        fmt(s.backFaceY, 4),
      ].join('\t')
    )
  })

  lines.push('')
  lines.push('═══════════════════════════════════════════════════════════════')
  lines.push('DETAILED SAMPLE RECORDS')
  lines.push('═══════════════════════════════════════════════════════════════')

  samples.forEach((s, i) => {
    lines.push('')
    lines.push(`--- Sample ${i + 1} ---`)
    lines.push(`Timestamp:         ${s.timestamp}`)
    lines.push(`Selected Distance: ${s.selectedDistance}`)
    lines.push(`Pose:              ${s.pose}`)
    lines.push(`Measured Depth:    ${s.measuredDepthCm}cm (${fmt(s.wristDepth, 3)}m)`)
    lines.push('')
    lines.push('Measurements:')
    lines.push(`  knuckleWidth (raw):        ${fmt(s.knuckleWidthRaw)}`)
    lines.push(`  knuckleWidth (stabilized): ${fmt(s.knuckleWidthStabilized)}`)
    lines.push(`  worldKnuckleWidth:         ${fmt(s.worldKnuckleWidth)}`)
    lines.push(`  screenKnuckleWidth:        ${fmt(s.screenKnuckleWidth)}`)
    lines.push('')
    lines.push('Pipeline:')
    lines.push(`  baseScaleX:      ${fmt(s.baseScaleX)}  (= kW × 0.9)`)
    lines.push(`  baseScaleY:      ${fmt(s.baseScaleY)}  (= kW × 1.2)`)
    lines.push(`  baseScaleZ:      ${fmt(s.baseScaleZ)}  (= kW × 0.16)`)
    lines.push(`  watchScale:      ${fmt(s.watchScale, 3)}`)
    lines.push(`  depthRatio:      ${fmt(s.depthRatio, 3)}`)
    lines.push(`  depthDampening:  ${fmt(s.depthDampening, 3)}`)
    lines.push('')
    lines.push('Final Occluder:')
    lines.push(`  scaleX: ${fmt(s.finalScaleX)}  scaleY: ${fmt(s.finalScaleY)}  scaleZ: ${fmt(s.finalScaleZ)}`)
    lines.push(`  worldPos: (${fmt(s.occluderWorldX)}, ${fmt(s.occluderWorldY)}, ${fmt(s.occluderWorldZ)})`)
    lines.push(`  palmRetreat: ${fmt(s.palmRetreat)}  basePalmOffset: ${fmt(s.basePalmOffset)}`)
    lines.push(`  frontFaceY: ${fmt(s.frontFaceY)}  backFaceY: ${fmt(s.backFaceY)}`)
    lines.push('')
    lines.push('Watch (comparison):')
    lines.push(`  scale: ${fmt(s.watchDynamicScale, 3)}  worldPos: (${fmt(s.watchWorldX)}, ${fmt(s.watchWorldY)}, ${fmt(s.watchWorldZ)})`)
  })

  // Summary by selected distance
  lines.push('')
  lines.push('═══════════════════════════════════════════════════════════════')
  lines.push('SUMMARY BY SELECTED DISTANCE')
  lines.push('═══════════════════════════════════════════════════════════════')

  for (const dist of DISTANCES) {
    const group = samples.filter(s => s.selectedDistance === dist)
    if (group.length === 0) continue

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
    const std = (arr: number[]) => {
      const m = avg(arr)
      return Math.sqrt(arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / arr.length)
    }

    lines.push('')
    lines.push(`${dist} — ${group.length} sample(s)`)
    lines.push(`  Measured depth:    ${avg(group.map(s => s.measuredDepthCm)).toFixed(0)}cm avg`)
    lines.push(`  worldKnuckleWidth: ${fmt(avg(group.map(s => s.worldKnuckleWidth)))} ± ${fmt(std(group.map(s => s.worldKnuckleWidth)))}`)
    lines.push(`  finalScaleZ:       ${fmt(avg(group.map(s => s.finalScaleZ)))} ± ${fmt(std(group.map(s => s.finalScaleZ)))}`)
    lines.push(`  depthDampening:    ${fmt(avg(group.map(s => s.depthDampening)), 3)} ± ${fmt(std(group.map(s => s.depthDampening)), 3)}`)
    lines.push(`  watchScale:        ${fmt(avg(group.map(s => s.watchScale)), 3)} ± ${fmt(std(group.map(s => s.watchScale)), 3)}`)
  }

  // Variance ranking
  lines.push('')
  lines.push('═══════════════════════════════════════════════════════════════')
  lines.push('VARIANCE ANALYSIS (all samples)')
  lines.push('═══════════════════════════════════════════════════════════════')

  const cv = (arr: number[]) => {
    const m = arr.reduce((a, b) => a + b, 0) / arr.length
    if (m === 0) return NaN
    const s = Math.sqrt(arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / arr.length)
    return (s / m) * 100
  }

  const metrics = [
    { name: 'worldKnuckleWidth', values: samples.map(s => s.worldKnuckleWidth) },
    { name: 'baseScaleZ', values: samples.map(s => s.baseScaleZ) },
    { name: 'watchScale', values: samples.map(s => s.watchScale) },
    { name: 'depthDampening', values: samples.map(s => s.depthDampening) },
    { name: 'finalScaleZ', values: samples.map(s => s.finalScaleZ) },
  ]

  for (const m of metrics) {
    const cvVal = cv(m.values)
    const flag = Number.isNaN(cvVal) ? 'N/A' : cvVal > 15 ? '⚠️ HIGH' : '✓ OK'
    lines.push(`  ${m.name.padEnd(20)} CV=${Number.isNaN(cvVal) ? 'N/A' : cvVal.toFixed(1) + '%'}  ${flag}`)
  }

  lines.push('')
  lines.push('═══════════════════════════════════════════════════════════════')
  lines.push('ROOT CAUSE RANKING (based on captured data)')
  lines.push('═══════════════════════════════════════════════════════════════')
  lines.push('')
  lines.push('Review RAW SAMPLES above. Check which variable diverges first across distances/poses.')
  lines.push('')
  lines.push('[ ] Occluder Scale   — finalScaleX/Y/Z vs watch scale at same distance')
  lines.push('[ ] Occluder Position — occluderWorld vs watchWorld offset')
  lines.push('[ ] Occluder Rotation — not captured in this panel (use occlusion debug visuals)')
  lines.push('[ ] Front Face Placement — frontFaceY vs watch face position')
  lines.push('[ ] knuckleWidth instability — worldKnuckleWidth CV across poses')
  lines.push('[ ] depthDampening curve — depthDampening vs measured depth mismatch')
  lines.push('')
  lines.push('═══════════════════════════════════════════════════════════════')

  return lines.join('\n')
}

export function OccluderAuditPanel({
  getLiveSnapshot,
  hasHandTracking,
}: OccluderAuditPanelProps) {
  const [samples, setSamples] = useState<OccluderAuditSample[]>([])
  const [selectedDistance, setSelectedDistance] = useState<string>('30cm')
  const [currentPose, setCurrentPose] = useState<string>('palm_up')
  const [reportText, setReportText] = useState<string>('')
  const [collapsed, setCollapsed] = useState(false)
  const [captureError, setCaptureError] = useState<string | null>(null)

  const captureCurrentState = useCallback(() => {
    setCaptureError(null)

    const snap = getLiveSnapshot()

    if (!snap.occluder) {
      setCaptureError('Occluder data not ready — enable debug mode and show your hand.')
      return
    }

    const oc = snap.occluder
    const watch = snap.watch
    const diag = snap.diagnostics

    const measuredDepthCm = diag?.wristDepth
      ? Math.round(diag.wristDepth * 100)
      : 0

    const sample: OccluderAuditSample = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      selectedDistance,
      pose: currentPose,
      measuredDepthCm,

      knuckleWidthRaw: diag?.stabilizationRaw ?? oc.knuckleWidth,
      knuckleWidthStabilized: diag?.stabilizationStabilized ?? oc.knuckleWidth,
      worldKnuckleWidth: diag?.worldKnuckleWidth ?? oc.knuckleWidth,
      screenKnuckleWidth: diag?.screenKnuckleWidth ?? 0,
      wristDepth: diag?.wristDepth ?? 0,

      baseScaleX: oc.baseScaleX,
      baseScaleY: oc.baseScaleY,
      baseScaleZ: oc.baseScaleZ,
      watchScale: oc.watchScale,
      depthRatio: oc.depthRatio,
      depthDampening: oc.depthDampening,

      finalScaleX: oc.scaleX,
      finalScaleY: oc.scaleY,
      finalScaleZ: oc.scaleZ,
      occluderWorldX: oc.position.x,
      occluderWorldY: oc.position.y,
      occluderWorldZ: oc.position.z,
      palmRetreat: oc.palmRetreat,
      basePalmOffset: oc.basePalmOffset,
      frontFaceY: oc.frontFaceY,
      backFaceY: oc.backFaceY,

      watchDynamicScale: watch?.scale ?? oc.watchScale,
      watchWorldX: watch?.position.x ?? 0,
      watchWorldY: watch?.position.y ?? 0,
      watchWorldZ: watch?.position.z ?? 0,
    }

    setSamples(prev => [...prev, sample])
  }, [getLiveSnapshot, selectedDistance, currentPose])

  const generateReport = useCallback(() => {
    const report = buildReport(samples)
    setReportText(report)
    console.log(report)

    navigator.clipboard.writeText(report).catch(() => {
      // Clipboard may fail on non-HTTPS — report still visible in panel
    })
  }, [samples])

  const downloadReport = useCallback(() => {
    const report = reportText || buildReport(samples)
    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `occluder-audit-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [reportText, samples])

  const clearData = () => {
    if (confirm('Clear all captured samples?')) {
      setSamples([])
      setReportText('')
      setCaptureError(null)
    }
  }

  if (collapsed) {
    return (
      <div className="bg-purple-900/95 rounded-lg p-3 backdrop-blur-sm border border-purple-500/30">
        <button
          onClick={() => setCollapsed(false)}
          className="text-xs text-purple-400 hover:text-purple-300 font-medium"
        >
          🔬 Occluder Audit ({samples.length} samples)
        </button>
      </div>
    )
  }

  const liveSnap = getLiveSnapshot()
  const liveOc = liveSnap.occluder
  const liveDiag = liveSnap.diagnostics

  return (
    <div className="bg-purple-900/95 rounded-lg p-4 backdrop-blur-sm border border-purple-500/30 space-y-3 max-h-[85vh] overflow-y-auto w-[420px]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-purple-300">
          🔬 OCCLUDER AUDIT (44f)
        </h3>
        <button
          onClick={() => setCollapsed(true)}
          className="text-xs text-gray-400 hover:text-gray-300"
        >
          ─
        </button>
      </div>

      {/* Manual distance selector — user picks, not auto-guessed */}
      <div>
        <div className="text-xs text-purple-400 mb-1">Select Distance (manual):</div>
        <div className="flex gap-1">
          {DISTANCES.map(dist => (
            <button
              key={dist}
              onClick={() => setSelectedDistance(dist)}
              className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                selectedDistance === dist
                  ? 'bg-purple-500 text-white'
                  : 'bg-purple-950 text-purple-300 hover:bg-purple-800'
              }`}
            >
              {dist}
            </button>
          ))}
        </div>
        {liveDiag?.wristDepth && (
          <div className="text-[10px] text-purple-400 mt-1">
            Measured depth: {Math.round(liveDiag.wristDepth * 100)}cm
          </div>
        )}
      </div>

      {/* Pose selector */}
      <div>
        <div className="text-xs text-purple-400 mb-1">Select Pose:</div>
        <select
          value={currentPose}
          onChange={(e) => setCurrentPose(e.target.value)}
          className="w-full bg-purple-950 text-white text-xs px-2 py-1.5 rounded border border-purple-700"
        >
          {POSES.map(p => (
            <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Live pipeline */}
      <div className="bg-purple-950/40 rounded p-2 space-y-0.5 text-[10px] font-mono">
        <div className="text-purple-300 font-bold mb-1">Live Pipeline:</div>
        {liveOc ? (
          <>
            <div>worldKnuckleWidth: {fmt(liveDiag?.worldKnuckleWidth ?? liveOc.knuckleWidth)}</div>
            <div>baseScaleZ: {fmt(liveOc.baseScaleZ)}</div>
            <div>watchScale: {fmt(liveOc.watchScale, 3)}</div>
            <div>depthDampening: {fmt(liveOc.depthDampening, 3)}</div>
            <div className="text-yellow-400 mt-1">
              final scaleZ: {fmt(liveOc.scaleZ)}
            </div>
          </>
        ) : (
          <div className="text-red-400">Waiting for occluder data...</div>
        )}
      </div>

      {captureError && (
        <div className="text-xs text-red-400 bg-red-900/30 rounded p-2">{captureError}</div>
      )}

      <button
        onClick={captureCurrentState}
        disabled={!hasHandTracking}
        className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 disabled:text-purple-600 text-white font-medium text-xs rounded transition-colors"
      >
        📸 Capture Sample ({samples.length})
      </button>

      {/* Captured samples list — all samples visible */}
      {samples.length > 0 && (
        <div className="bg-purple-950/40 rounded p-2 max-h-36 overflow-y-auto">
          <div className="text-xs text-purple-300 font-semibold mb-1">
            Captured Samples ({samples.length})
          </div>
          <div className="space-y-0.5 text-[9px] font-mono">
            {samples.map((s, i) => (
              <div key={s.id} className="text-purple-200 border-b border-purple-800/50 pb-0.5">
                #{i + 1} {s.selectedDistance}/{s.pose} meas:{s.measuredDepthCm}cm
                {' '}kW:{fmt(s.worldKnuckleWidth, 3)} sZ:{fmt(s.finalScaleZ, 3)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report output */}
      <div className="flex gap-2">
        <button
          onClick={generateReport}
          disabled={samples.length === 0}
          className="flex-1 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white font-medium text-xs rounded"
        >
          📄 Build Report
        </button>
        <button
          onClick={downloadReport}
          disabled={samples.length === 0}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white text-xs rounded"
          title="Download .txt"
        >
          ⬇
        </button>
        <button
          onClick={clearData}
          disabled={samples.length === 0}
          className="px-3 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-900 text-white text-xs rounded"
        >
          🗑
        </button>
      </div>

      {reportText && (
        <div>
          <div className="text-xs text-green-400 mb-1">
            Report ready — copied to clipboard. Paste into logs.txt:
          </div>
          <textarea
            readOnly
            value={reportText}
            className="w-full h-40 bg-black/60 text-green-300 text-[9px] font-mono p-2 rounded border border-green-800 resize-none"
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
        </div>
      )}

      <div className="text-[9px] text-purple-500 text-center">
        1. Pick distance + pose → 2. Capture → 3. Build Report → paste into logs.txt
      </div>
    </div>
  )
}
