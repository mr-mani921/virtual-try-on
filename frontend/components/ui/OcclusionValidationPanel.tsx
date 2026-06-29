'use client'

import React, { useState } from 'react'

interface ValidationObservation {
  distance: string
  watchScale: string
  watchPosition: string
  occluderScale: string
  occluderPosition: string
  frontFaceAlignment: string
  notes: string
}

export function OcclusionValidationPanel() {
  const [observations, setObservations] = useState<Record<string, ValidationObservation>>({
    '30cm': { distance: '30cm', watchScale: '', watchPosition: '', occluderScale: '', occluderPosition: '', frontFaceAlignment: '', notes: '' },
    '50cm': { distance: '50cm', watchScale: '', watchPosition: '', occluderScale: '', occluderPosition: '', frontFaceAlignment: '', notes: '' },
    '80cm': { distance: '80cm', watchScale: '', watchPosition: '', occluderScale: '', occluderPosition: '', frontFaceAlignment: '', notes: '' },
    '120cm': { distance: '120cm', watchScale: '', watchPosition: '', occluderScale: '', occluderPosition: '', frontFaceAlignment: '', notes: '' },
  })

  const [currentDistance, setCurrentDistance] = useState<string>('30cm')
  const [collapsed, setCollapsed] = useState(false)

  const captureObservation = (distance: string, field: keyof ValidationObservation, value: string) => {
    setObservations(prev => ({
      ...prev,
      [distance]: {
        ...prev[distance],
        [field]: value,
      }
    }))
  }

  const generateReport = () => {
    const report = `
TICKET 44e — Occlusion & Attachment Diagnostic Report
Generated: ${new Date().toLocaleString()}

═══════════════════════════════════════════════════════════════

VALIDATION OBSERVATIONS

${Object.values(observations).map(obs => `
───────────────────────────────────────────────────────────────
Distance: ${obs.distance}
───────────────────────────────────────────────────────────────

Watch Scale: ${obs.watchScale || 'NOT RECORDED'}
Watch Position: ${obs.watchPosition || 'NOT RECORDED'}
Occluder Scale: ${obs.occluderScale || 'NOT RECORDED'}
Occluder Position: ${obs.occluderPosition || 'NOT RECORDED'}
Front Face Alignment: ${obs.frontFaceAlignment || 'NOT RECORDED'}

Observations:
${obs.notes || 'No notes recorded'}

`).join('')}

═══════════════════════════════════════════════════════════════

ROOT CAUSE ANALYSIS

Based on the observations above, identify which component diverges:

[ ] Watch Scale - Incorrect scaling behavior across distances
[ ] Watch Position - Incorrect positioning relative to wrist
[ ] Occluder Scale - Incorrect occluder dimensions across distances
[ ] Occluder Position - Incorrect occluder placement relative to wrist
[ ] Depth Alignment - Incorrect front-face depth calculation

Detailed Findings:
[Fill in based on observations]

Recommended Fix:
[Fill in based on root cause]

═══════════════════════════════════════════════════════════════
    `.trim()

    // Copy to clipboard
    navigator.clipboard.writeText(report).then(() => {
      alert('Report copied to clipboard!')
    })
  }

  if (collapsed) {
    return (
      <div className="bg-gray-900/95 rounded-lg p-3 backdrop-blur-sm border border-yellow-500/30">
        <button
          onClick={() => setCollapsed(false)}
          className="text-xs text-yellow-400 hover:text-yellow-300 font-medium"
        >
          📋 Validation Panel (Click to expand)
        </button>
      </div>
    )
  }

  return (
    <div className="bg-gray-900/95 rounded-lg p-4 backdrop-blur-sm border border-yellow-500/30 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-yellow-400">
          📋 VALIDATION PROCEDURE (44e Part 4)
        </h3>
        <button
          onClick={() => setCollapsed(true)}
          className="text-xs text-gray-400 hover:text-gray-300"
        >
          ✕
        </button>
      </div>

      {/* Distance Selector */}
      <div className="flex gap-2">
        {['30cm', '50cm', '80cm', '120cm'].map(dist => (
          <button
            key={dist}
            onClick={() => setCurrentDistance(dist)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              currentDistance === dist
                ? 'bg-yellow-500 text-black'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {dist}
          </button>
        ))}
      </div>

      {/* Instructions */}
      <div className="bg-yellow-900/20 border border-yellow-500/30 rounded p-2 text-xs text-yellow-200">
        <p className="font-semibold mb-1">Instructions for {currentDistance}:</p>
        <ol className="list-decimal list-inside space-y-1 text-[10px]">
          <li>Position hand at approximately {currentDistance} from camera</li>
          <li>Enable Occlusion Debug mode (red occluder should be visible)</li>
          <li>Check diagnostics panel for current metrics</li>
          <li>Record observations using Quick Capture buttons below</li>
          <li>Test multiple hand poses (palm up/down, rotations)</li>
        </ol>
      </div>

      {/* Quick Capture Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => {
            captureObservation(currentDistance, 'watchScale', '✓ Correct')
          }}
          className="px-2 py-1 bg-green-900/50 hover:bg-green-900/70 text-green-300 text-xs rounded border border-green-500/30"
        >
          ✓ Watch Scale OK
        </button>
        <button
          onClick={() => {
            captureObservation(currentDistance, 'watchScale', '✗ Incorrect')
          }}
          className="px-2 py-1 bg-red-900/50 hover:bg-red-900/70 text-red-300 text-xs rounded border border-red-500/30"
        >
          ✗ Watch Scale Bad
        </button>
        <button
          onClick={() => {
            captureObservation(currentDistance, 'occluderScale', '✓ Correct')
          }}
          className="px-2 py-1 bg-green-900/50 hover:bg-green-900/70 text-green-300 text-xs rounded border border-green-500/30"
        >
          ✓ Occluder Scale OK
        </button>
        <button
          onClick={() => {
            captureObservation(currentDistance, 'occluderScale', '✗ Incorrect / Over-occluding')
          }}
          className="px-2 py-1 bg-red-900/50 hover:bg-red-900/70 text-red-300 text-xs rounded border border-red-500/30"
        >
          ✗ Over-occluding
        </button>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">Observations for {currentDistance}:</label>
        <textarea
          value={observations[currentDistance]?.notes || ''}
          onChange={(e) => captureObservation(currentDistance, 'notes', e.target.value)}
          placeholder="Record specific observations, measurements, or issues..."
          className="w-full bg-gray-800 text-white text-xs p-2 rounded border border-gray-700 focus:border-yellow-500 focus:outline-none resize-none"
          rows={3}
        />
      </div>

      {/* Current Status */}
      <div className="text-xs space-y-1">
        <div className="flex justify-between text-gray-400">
          <span>Progress:</span>
          <span>
            {Object.values(observations).filter(obs => obs.notes).length}/4 distances recorded
          </span>
        </div>
      </div>

      {/* Generate Report */}
      <button
        onClick={generateReport}
        className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-medium text-xs rounded transition-colors"
      >
        📄 Generate & Copy Report
      </button>

      <div className="text-[10px] text-gray-500 text-center">
        Report will be copied to clipboard for analysis
      </div>
    </div>
  )
}
