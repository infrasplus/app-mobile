import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

function isStandalone() {
  // iOS Safari
  const iosStandalone = (window as any).navigator?.standalone === true
  // All platforms supporting display-mode
  const mqStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches
  return iosStandalone || mqStandalone
}

function isIOS() {
  const ua = window.navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(ua)
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any | null>(null)
  const [visible, setVisible] = useState(false)
  const dismissedRef = useRef<boolean>(false)

  const alreadyInstalled = useMemo(() => isStandalone(), [])

  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-prompt-dismissed') === '1'
    dismissedRef.current = dismissed
    if (!alreadyInstalled && !dismissed) {
      // Android/Chrome
      const onBIP = (e: any) => {
        e.preventDefault()
        setDeferredPrompt(e)
        setVisible(true)
      }
      window.addEventListener('beforeinstallprompt', onBIP)

      // iOS (no event)
      if (isIOS()) {
        // show gentle prompt after a short delay
        const t = setTimeout(() => setVisible(true), 1200)
        return () => {
          window.removeEventListener('beforeinstallprompt', onBIP)
          clearTimeout(t)
        }
      }
      return () => window.removeEventListener('beforeinstallprompt', onBIP)
    }
  }, [alreadyInstalled])

  useEffect(() => {
    const onInstalled = () => setVisible(false)
    window.addEventListener('appinstalled', onInstalled)
    return () => window.removeEventListener('appinstalled', onInstalled)
  }, [])

  if (alreadyInstalled || !visible) return null

  const onDismiss = () => {
    localStorage.setItem('pwa-prompt-dismissed', '1')
    setVisible(false)
  }

  const onInstallClick = async () => {
    if (!deferredPrompt) {
      onDismiss()
      return
    }
    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome !== 'accepted') {
        // keep it subtle – if declined, don't show again
        localStorage.setItem('pwa-prompt-dismissed', '1')
      }
    } catch {}
    setVisible(false)
  }

  const isIos = isIOS()

  return (
    <div className="fixed inset-x-0 bottom-2 z-50 px-4">
      <div className="mx-auto max-w-md rounded-xl border bg-card text-card-foreground shadow-lg">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h3 className="text-sm font-medium">Instale o app Secretária Plus</h3>
              {isIos ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  No iPhone, toque em Compartilhar e escolha "Adicionar à Tela de Início" para ter acesso rápido ao app.
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Adicione o atalho à tela inicial para uma experiência mais rápida e completa.
                </p>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onDismiss}>Agora não</Button>
            {!isIos && (
              <Button size="sm" onClick={onInstallClick}>Instalar</Button>
            )}
            {isIos && (
              <Button size="sm" onClick={onDismiss}>Ok, entendi</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
