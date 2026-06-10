'use client'

import { useState } from 'react'
import type { WatchConfiguration } from '@/lib/watches/types'
import { Card, CardBody } from './Card'
import { Button } from './Button'

interface WatchSelectorProps {
  watches: WatchConfiguration[]
  currentWatchId: string | null
  onSelectWatch: (watchId: string) => void
  isLoading?: boolean
}

export function WatchSelector({
  watches,
  currentWatchId,
  onSelectWatch,
  isLoading = false,
}: WatchSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categories = [
    { id: 'all', name: 'All', icon: '🕐' },
    { id: 'sports', name: 'Sports', icon: '⚡' },
    { id: 'luxury', name: 'Luxury', icon: '💎' },
    { id: 'casual', name: 'Casual', icon: '👔' },
    { id: 'smart', name: 'Smart', icon: '📱' },
  ]

  const filteredWatches =
    selectedCategory && selectedCategory !== 'all'
      ? watches.filter((watch) => watch.category === selectedCategory)
      : watches

  return (
    <Card>
      <CardBody className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Select Watch</h3>
            <span className="text-xs text-zinc-400">
              {filteredWatches.length} available
            </span>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() =>
                  setSelectedCategory(
                    category.id === 'all' ? null : category.id
                  )
                }
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  transition-all whitespace-nowrap
                  ${
                    (selectedCategory === category.id ||
                      (selectedCategory === null && category.id === 'all'))
                      ? 'bg-sky-500 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                  }
                `}
              >
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </button>
            ))}
          </div>

          {/* Watch Grid */}
          <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
            {filteredWatches.map((watch) => (
              <button
                key={watch.id}
                onClick={() => onSelectWatch(watch.id)}
                disabled={isLoading}
                className={`
                  relative group rounded-lg overflow-hidden transition-all
                  ${
                    currentWatchId === watch.id
                      ? 'ring-2 ring-sky-500 ring-offset-2 ring-offset-zinc-900'
                      : 'hover:ring-2 hover:ring-zinc-600 hover:ring-offset-2 hover:ring-offset-zinc-900'
                  }
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                  {/* Placeholder icon - replace with actual thumbnails */}
                  <div className="text-4xl">
                    {watch.category === 'sports' && '⚡'}
                    {watch.category === 'luxury' && '💎'}
                    {watch.category === 'casual' && '👔'}
                    {watch.category === 'smart' && '📱'}
                  </div>

                  {/* Selected indicator */}
                  {currentWatchId === watch.id && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}

                  {/* Loading overlay */}
                  {isLoading && currentWatchId === watch.id && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Watch Info */}
                <div className="p-2 bg-zinc-800/80 backdrop-blur">
                  <p className="text-xs font-semibold text-white truncate">
                    {watch.name}
                  </p>
                  <p className="text-xs text-zinc-400 truncate">{watch.brand}</p>
                  {watch.price && (
                    <p className="text-xs text-sky-400 font-medium mt-0.5">
                      {watch.price}
                    </p>
                  )}
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </button>
            ))}
          </div>

          {/* Empty state */}
          {filteredWatches.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-zinc-400">No watches found</p>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  )
}
