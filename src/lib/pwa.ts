import { registerSW } from 'virtual:pwa-register'
import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  // registerSW (from vite-plugin-pwa) resolves the correct worker path in
  // both dev (a virtual dev-sw path) and prod (/sw.js) — a hardcoded
  // navigator.serviceWorker.register('/sw.js') only works in prod.
  registerSW({ immediate: true })
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export async function subscribeToPush(userId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications are not supported in this browser')
  }
  if (!VAPID_PUBLIC_KEY) {
    throw new Error('Push is not configured (missing VITE_VAPID_PUBLIC_KEY)')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted')
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })

  const { error } = await supabase
    .from('profiles')
    .update({ push_subscription: subscription.toJSON() })
    .eq('id', userId)
  if (error) throw error
}

export async function isPushSubscribed() {
  if (!('serviceWorker' in navigator)) return false
  const registration = await navigator.serviceWorker.ready.catch(() => null)
  if (!registration) return false
  const subscription = await registration.pushManager.getSubscription()
  return !!subscription
}

// ── Add-to-home-screen prompt ──

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
}

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null
const installListeners = new Set<(available: boolean) => void>()

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredInstallPrompt = e as BeforeInstallPromptEvent
  installListeners.forEach((cb) => cb(true))
})

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null
  installListeners.forEach((cb) => cb(false))
})

export function onInstallAvailabilityChange(cb: (available: boolean) => void) {
  installListeners.add(cb)
  cb(!!deferredInstallPrompt)
  return () => installListeners.delete(cb)
}

export async function promptInstall() {
  if (!deferredInstallPrompt) return
  await deferredInstallPrompt.prompt()
  deferredInstallPrompt = null
}
