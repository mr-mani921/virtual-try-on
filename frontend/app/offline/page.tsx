'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />

      <Card className="max-w-md relative z-10">
        <CardBody className="text-center py-12">
          <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">You're Offline</h2>
          <p className="text-slate-400 mb-6">
            No internet connection detected. Some features may be unavailable until you're back online.
          </p>

          <div className="space-y-3">
            <Button
              onClick={() => window.location.reload()}
              className="w-full"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try Again
            </Button>

            <Link href="/" className="block">
              <Button variant="ghost" className="w-full">
                Go to Home
              </Button>
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-700">
            <p className="text-sm text-slate-500">
              TimeVision works best with an internet connection for AR features and real-time hand tracking.
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
