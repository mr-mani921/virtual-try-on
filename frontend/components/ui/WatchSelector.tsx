'use client'

import Image from 'next/image'
import type { WatchLoaderState } from '@/lib/watches/types'

interface WatchSelectorProps {
  watches: Array<{
    id: string
    name: string
    description: string
    thumbnail: string
  }>
  selectedWatchId: string
  onSelect: (watchId: string) => void
  loaderState?: WatchLoaderState
  className?: string
}

export function WatchSelector({
  watches,
  selectedWatchId,
  onSelect,
  loaderState,
  className = '',
}: WatchSelectorProps) {
  const isLoading = loaderState?.status === 'loading'
  const hasError = loaderState?.status === 'error'

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-xs font-semibold text-white uppercase tracking-wide">
          Watches
        </h3>
        {isLoading && (
          <span className="text-[10px] text-sky-400 animate-pulse">
            Loading {Math.round((loaderState?.progress ?? 0) * 100)}%
          </span>
        )}
        {hasError && (
          <span className="text-[10px] text-red-400">Load failed</span>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700">
        {watches.map((watch) => {
          const isSelected = watch.id === selectedWatchId
          return (
            <button
              key={watch.id}
              type="button"
              onClick={() => onSelect(watch.id)}
              className={`flex-shrink-0 w-20 rounded-xl border transition-all text-left overflow-hidden ${
                isSelected
                  ? 'border-purple-500 bg-purple-500/20 ring-2 ring-purple-500/40'
                  : 'border-white/10 bg-zinc-800/80 hover:border-white/25 hover:bg-zinc-700/80'
              }`}
              aria-pressed={isSelected}
              aria-label={`Select ${watch.name}`}
            >
              <div className="relative w-full aspect-square bg-zinc-900">
                <Image
                  src={watch.thumbnail}
                  alt=""
                  fill
                  className="object-cover p-2"
                  sizes="80px"
                />
              </div>
              <div className="px-2 py-1.5">
                <p className="text-[10px] font-medium text-white truncate">{watch.name}</p>
                <p className="text-[9px] text-zinc-500 truncate">{watch.description}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
