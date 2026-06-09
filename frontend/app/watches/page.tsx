'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getAllWatches, getWatchesByCategory } from '@/lib/watches/registry'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function WatchesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isLoading] = useState(false)

  const allWatches = getAllWatches()
  const filteredWatches =
    selectedCategory && selectedCategory !== 'all'
      ? getWatchesByCategory(selectedCategory as any)
      : allWatches

  const categories = [
    { id: 'all', name: 'All Watches', count: allWatches.length },
    { id: 'sports', name: 'Sports', count: getWatchesByCategory('sports').length },
    { id: 'luxury', name: 'Luxury', count: getWatchesByCategory('luxury').length },
    { id: 'casual', name: 'Casual', count: getWatchesByCategory('casual').length },
    { id: 'smart', name: 'Smart', count: getWatchesByCategory('smart').length },
  ]

  // Generate a unique gradient for each watch based on category
  const getCategoryGradient = (category: string) => {
    const gradients = {
      sports: 'from-red-500/20 via-slate-800/20 to-slate-900/20',
      luxury: 'from-amber-500/20 via-slate-800/20 to-slate-900/20',
      casual: 'from-blue-500/20 via-slate-800/20 to-slate-900/20',
      smart: 'from-cyan-500/20 via-slate-800/20 to-slate-900/20',
    }
    return gradients[category as keyof typeof gradients] || 'from-slate-800 to-slate-900'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />

      {/* Header */}
      <header className="relative z-10 px-4 sm:px-6 py-4 sm:py-6 backdrop-blur-xl bg-slate-900/50 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">TimeVision</h1>
                <p className="text-xs sm:text-sm text-slate-400">Choose your perfect watch</p>
              </div>
            </div>

            <Link href="/">
              <Button variant="ghost" size="sm">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="hidden sm:inline ml-2">Back</span>
              </Button>
            </Link>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id === 'all' ? null : category.id)}
                className={`
                  flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium
                  transition-all whitespace-nowrap
                  ${
                    (selectedCategory === category.id || (selectedCategory === null && category.id === 'all'))
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }
                `}
              >
                <span>{category.name}</span>
                <span className="text-xs opacity-75">({category.count})</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Loading watches...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredWatches.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <Card className="max-w-md">
              <CardBody className="text-center py-12">
                <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Watches Found</h3>
                <p className="text-slate-400 mb-6">Try selecting a different category</p>
                <Button onClick={() => setSelectedCategory(null)}>
                  View All Watches
                </Button>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Watch Grid */}
        {!isLoading && filteredWatches.length > 0 && (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white">
                {selectedCategory ? `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Watches` : 'All Watches'}
              </h2>
              <p className="text-sm text-slate-400">{filteredWatches.length} watches available</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {filteredWatches.map((watch) => (
                <Link key={watch.id} href={`/try-on/${watch.id}`}>
                  <Card className="group hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 cursor-pointer h-full">
                    <CardBody className="p-0 h-full flex flex-col">
                      {/* Watch Image */}
                      <div className="relative aspect-square bg-gradient-to-br overflow-hidden">
                        {/* Gradient Background based on category */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${getCategoryGradient(watch.category || 'casual')}`} />
                        
                        {/* Display actual watch image */}
                        <div className="absolute inset-0 flex items-center justify-center p-8">
                          <img
                            src={watch.thumbnail || '/images/watch-placeholder.png'}
                            alt={watch.name}
                            className="object-contain w-full h-full rounded-full shadow-2xl border-4 border-slate-700 bg-slate-950"
                          />
                        </div>
                  

                        {/* Category Badge */}
                        <div className="absolute top-3 left-3">
                          <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs font-medium text-white border border-white/20 capitalize">
                            {watch.category}
                          </span>
                        </div>

                        {/* Shine effect on hover */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        {/* Try On hint on hover */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/20">
                            <p className="text-white font-semibold text-sm flex items-center gap-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Try On
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Watch Info */}
                      <div className="p-4 flex-1 flex flex-col">
                        <div className="flex-1">
                          <h3 className="text-base sm:text-lg font-bold text-white mb-1 line-clamp-1 group-hover:text-blue-400 transition-colors">
                            {watch.name}
                          </h3>
                          <p className="text-sm text-slate-400 mb-2">{watch.brand}</p>
                          
                          {watch.description && (
                            <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                              {watch.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                          {watch.price && (
                            <p className="text-lg font-bold text-blue-400">{watch.price}</p>
                          )}
                          
                          <div className="flex items-center gap-1 text-blue-400 text-sm font-medium group-hover:gap-2 transition-all">
                            <span>Try On</span>
                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-12 sm:mt-20 py-6 border-t border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs sm:text-sm text-slate-500">
            © 2024 TimeVision. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
