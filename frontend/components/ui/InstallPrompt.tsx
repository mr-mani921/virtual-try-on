'use client'

import { useState, useEffect } from 'react'
import { Button } from './Button'
import { Card, CardBody } from './Card'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Listen for beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)
      
      // Show prompt after 3 seconds delay
      setTimeout(() => {
        setShowPrompt(true)
      }, 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Listen for app installed event
    const installedHandler = () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()

    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
    }

    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Remember dismissal for 7 days
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  // Don't show if already installed or no prompt available
  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null
  }

  // Check if user dismissed recently (within 7 days)
  const dismissedTime = localStorage.getItem('pwa-install-dismissed')
  if (dismissedTime) {
    const daysSinceDismissal = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24)
    if (daysSinceDismissal < 7) {
      return null
    }
  }

  return (
    <div className="fixed bottom-6 left-6 right-6 z-50 md:left-auto md:right-6 md:max-w-md animate-slide-up">
      <Card className="shadow-2xl border-2 border-blue-500/30">
        <CardBody className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-1">
                Install TimeVision
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Install our app for quick access and a better experience. Works offline!
              </p>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleInstallClick}
                  size="sm"
                  className="flex-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Install
                </Button>
                <Button 
                  onClick={handleDismiss}
                  variant="ghost"
                  size="sm"
                >
                  Not Now
                </Button>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
