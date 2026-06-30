import { useState, useEffect } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import OnboardingWizard from '../OnboardingWizard'
import { useLocations } from '../../hooks/useLocations'
import { requestFcmToken, onForegroundMessage } from '../../lib/firebase'
import { firebaseAuthApi } from '../../api/endpoints'

const MOBILE_NAV = [
  { to: '/', label: 'Home', icon: '📊', exact: true },
  { to: '/reviews', label: 'Reviews', icon: '⭐' },
  { to: '/locations', label: 'Locations', icon: '📍' },
  { to: '/campaigns', label: 'Campaigns', icon: '📧' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'denied') return
    Notification.requestPermission().then(async perm => {
      if (perm === 'granted') {
        const token = await requestFcmToken()
        if (token) firebaseAuthApi.saveFcmToken(token).catch(() => {})
      }
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
        <main className="flex-1 overflow-y-auto p-4 pb-20 lg:pb-6 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 flex lg:hidden">
        {MOBILE_NAV.map(({ to, label, icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-2 text-xs font-medium gap-0.5 transition-colors ${
                isActive ? 'text-brand-600' : 'text-gray-400'
              }`
            }
          >
            <span className="text-xl leading-none">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {showWizard && <OnboardingWizard onDone={dismissWizard} />}
    </div>
  )
}
