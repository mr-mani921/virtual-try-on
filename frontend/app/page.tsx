'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000,transparent)]" />
      
      {/* Header */}
      <header className="relative z-10 px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">TimeVision</span>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/watches" className="text-slate-300 hover:text-white transition-colors">
              Catalog
            </Link>
            <Link href="/demo" className="text-slate-300 hover:text-white transition-colors">
              Demo
            </Link>
            <Link href="/watches">
              <Button size="sm">Try Now</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-20 sm:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-sm text-blue-400 font-medium">AR Technology</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Try Watches
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                Virtually
              </span>
            </h1>

            <p className="text-lg text-slate-400 max-w-lg">
              Experience the future of online shopping with our augmented reality try-on. 
              See how any watch looks on your wrist in real-time, from anywhere.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/watches">
                <Button className="w-full sm:w-auto">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Start Virtual Try-On
                </Button>
              </Link>
              <Link href="/watches">
                <Button variant="ghost" className="w-full sm:w-auto border border-slate-700 hover:border-slate-600">
                  Browse Collection
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-800">
              <div>
                <div className="text-2xl font-bold text-white">20+</div>
                <div className="text-sm text-slate-500">Watch Models</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">Real-Time</div>
                <div className="text-sm text-slate-500">AR Tracking</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">HD</div>
                <div className="text-sm text-slate-500">3D Rendering</div>
              </div>
            </div>
          </div>

          {/* Right Column - Visual */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-8">
              {/* Mock AR Interface */}
              <div className="aspect-[3/4] bg-slate-950 rounded-xl overflow-hidden relative">
                {/* Camera frame */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5" />
                
                {/* Hand outline */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-48 h-48 text-blue-500/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                  </svg>
                </div>

                {/* Watch preview */}
                <div className="absolute bottom-1/3 left-1/2 transform -translate-x-1/2">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800 shadow-2xl border-4 border-slate-500">
                      <div className="absolute inset-2 rounded-full bg-slate-950 flex items-center justify-center">
                        <div className="text-xs text-slate-600">12</div>
                      </div>
                    </div>
                    <div className="absolute -left-3 top-1/2 w-4 h-16 -translate-y-1/2 bg-gradient-to-r from-slate-800 to-slate-700 rounded-l-lg" />
                    <div className="absolute -right-3 top-1/2 w-4 h-16 -translate-y-1/2 bg-gradient-to-l from-slate-800 to-slate-700 rounded-r-lg" />
                  </div>
                </div>

                {/* AR indicators */}
                <div className="absolute top-4 left-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs text-green-400 font-medium">Tracking Active</span>
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl blur-2xl opacity-50" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl blur-3xl opacity-30" />
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-24">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardBody className="p-6">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Mobile Ready</h3>
              <p className="text-sm text-slate-400">
                Works perfectly on any device. Try on watches using your phone's camera anywhere, anytime.
              </p>
            </CardBody>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardBody className="p-6">
              <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Real-Time Tracking</h3>
              <p className="text-sm text-slate-400">
                Advanced hand tracking technology ensures accurate placement and natural movement.
              </p>
            </CardBody>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardBody className="p-6">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">HD Quality</h3>
              <p className="text-sm text-slate-400">
                Photorealistic 3D models with accurate materials, lighting, and reflections.
              </p>
            </CardBody>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="mt-24 text-center">
          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <CardBody className="p-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to Try On Your Perfect Watch?
              </h2>
              <p className="text-slate-400 mb-8 max-w-2xl mx-auto">
                Browse our collection and experience the future of online shopping with augmented reality.
              </p>
              <Link href="/watches">
                <Button size="lg">
                  Explore Collection
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </Link>
            </CardBody>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800 mt-24">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-white">TimeVision</span>
              </div>
              <p className="text-sm text-slate-500">
                Virtual try-on technology for modern watch shopping.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link href="/watches" className="hover:text-white transition-colors">Catalog</Link></li>
                <li><Link href="/demo" className="hover:text-white transition-colors">Demo</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Technology</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>WebGL Rendering</li>
                <li>Hand Tracking</li>
                <li>AR Experience</li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>Browser Requirements</li>
                <li>Camera Setup</li>
                <li>FAQs</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-500">
              © 2024 TimeVision. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-slate-500">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
