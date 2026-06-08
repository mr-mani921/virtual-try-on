'use client'

import { Card, CardBody } from './Card'
import { Button } from './Button'
import type { WatchConfig } from '@/hooks/useWatchConfig'

interface WatchControlsProps {
  config: WatchConfig
  onScaleChange: (scale: number) => void
  onPositionChange: (axis: 'x' | 'y' | 'z', value: number) => void
  onRotationChange: (axis: 'x' | 'y' | 'z', value: number) => void
  onWristFitBiasChange: (bias: number) => void
  onOccluderOffsetChange: (axis: 'x' | 'y' | 'z', value: number) => void
  onSmoothingChange: (smoothing: number) => void
  onReset: () => void
  onLoadPreset: (preset: string) => void
  presets: Record<string, { name: string; description: string }>
}

export function WatchControls({
  config,
  onScaleChange,
  onPositionChange,
  onRotationChange,
  onWristFitBiasChange,
  onOccluderOffsetChange,
  onSmoothingChange,
  onReset,
  onLoadPreset,
  presets,
}: WatchControlsProps) {
  return (
    <Card>
      <CardBody className="py-4 px-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Watch Placement</h3>
            <Button variant="ghost" size="sm" onClick={onReset}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset
            </Button>
          </div>

          {/* Presets */}
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Catalog</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(presets).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => onLoadPreset(key)}
                  className="px-3 py-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-white rounded transition-colors text-left"
                >
                  <div className="font-medium">{preset.name}</div>
                  <div className="text-zinc-400 text-[10px]">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Scale */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">
              Scale: {config.scale.toFixed(2)}
            </label>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.05"
              value={config.scale}
              onChange={(e) => onScaleChange(parseFloat(e.target.value))}
              className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          {/* Position Offset */}
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Position Offset</label>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                  <span>X (Left/Right)</span>
                  <span>{config.positionOffset.x.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="-0.5"
                  max="0.5"
                  step="0.01"
                  value={config.positionOffset.x}
                  onChange={(e) => onPositionChange('x', parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                  <span>Y (Up/Down)</span>
                  <span>{config.positionOffset.y.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="-0.5"
                  max="0.5"
                  step="0.01"
                  value={config.positionOffset.y}
                  onChange={(e) => onPositionChange('y', parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                  <span>Z (Forward/Back)</span>
                  <span>{config.positionOffset.z.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="-0.5"
                  max="0.5"
                  step="0.01"
                  value={config.positionOffset.z}
                  onChange={(e) => onPositionChange('z', parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Rotation Offset */}
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Rotation Offset</label>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                  <span>X (Pitch)</span>
                  <span>{(config.rotationOffset.x * 180 / Math.PI).toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min={-Math.PI}
                  max={Math.PI}
                  step="0.01"
                  value={config.rotationOffset.x}
                  onChange={(e) => onRotationChange('x', parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                  <span>Y (Yaw)</span>
                  <span>{(config.rotationOffset.y * 180 / Math.PI).toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min={-Math.PI}
                  max={Math.PI}
                  step="0.01"
                  value={config.rotationOffset.y}
                  onChange={(e) => onRotationChange('y', parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                  <span>Z (Roll)</span>
                  <span>{(config.rotationOffset.z * 180 / Math.PI).toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min={-Math.PI}
                  max={Math.PI}
                  step="0.01"
                  value={config.rotationOffset.z}
                  onChange={(e) => onRotationChange('z', parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Wrist Fit Bias */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">
              Wrist Fit Bias: {config.wristFitBias.toFixed(3)}
            </label>
            <input
              type="range"
              min="-0.1"
              max="0.1"
              step="0.005"
              value={config.wristFitBias}
              onChange={(e) => onWristFitBiasChange(parseFloat(e.target.value))}
              className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
              <span>Slim / surface</span>
              <span>Bulky / deep</span>
            </div>
          </div>

          {/* Occluder Offset (Y = depth, most commonly tuned axis) */}
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Occluder Fine-Tune</label>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                  <span>Depth (Y into wrist)</span>
                  <span>{config.occluderOffset.y.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="-0.1"
                  max="0.1"
                  step="0.005"
                  value={config.occluderOffset.y}
                  onChange={(e) => onOccluderOffsetChange('y', parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                  <span>Lateral (X)</span>
                  <span>{config.occluderOffset.x.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="-0.1"
                  max="0.1"
                  step="0.005"
                  value={config.occluderOffset.x}
                  onChange={(e) => onOccluderOffsetChange('x', parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                  <span>Forearm (Z)</span>
                  <span>{config.occluderOffset.z.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="-0.2"
                  max="0.2"
                  step="0.005"
                  value={config.occluderOffset.z}
                  onChange={(e) => onOccluderOffsetChange('z', parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Smoothing */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">
              Smoothing: {config.smoothing.toFixed(2)}
            </label>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={config.smoothing}
              onChange={(e) => onSmoothingChange(parseFloat(e.target.value))}
              className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
              <span>Responsive</span>
              <span>Smooth</span>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
