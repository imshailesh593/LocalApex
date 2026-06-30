import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import OnboardingWizard from '../OnboardingWizard'
import { useLocations } from '../../hooks/useLocations'
import { requestFcmToken, onForegroundMessage } from '../../lib/firebase'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'denied') return
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') requestFcmToken()
    })
    const unsub = onForegroundMessage((payload: unknown) => {
      const p = payload as { notification?: { title?: string; body?: string } }
      if (p.notification?.title) {
        new Notification(p.notification.title, { body: p.notification.body ?? '' })
      }
    })
    return () => { if (typeof unsub === 'function') unsub() }
  }, [])
  const { data: locations } = useLocations()
  const [wizardDismissed, setWizardDismissed] = useState(
    () => localStorage.getItem('onboarding_done') === '1'
  )

  const showWizard = !wizardDismissed && locations !== undefined && locations.length === 0

  const dismissWizard = () => {
    localStorage.setItem('onboarding_done', '1')
    setWizardDismissed(true)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed on mobile, static on desktop */}
      <div className={`
        fixed inset-y-0 left-0 z-30 lg:static lg:z-auto
        transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {showWizard && <OnboardingWizard onDone={dismissWizard} />}
    </div>
  )
}
