import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { useReviewStats } from '../../hooks/useReviews'
import { useTenant } from '../../context/TenantContext'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/locations', label: 'Locations', icon: '📍' },
  { to: '/reviews', label: 'Reviews', icon: '⭐', badge: 'unread' },
  { to: '/competitors', label: 'Competitors', icon: '🏆' },
  { to: '/citations', label: 'Citations', icon: '📋' },
  { to: '/qa', label: 'Q&A Manager', icon: '💬' },
  { to: '/media', label: 'Media', icon: '🖼️' },
  { to: '/campaigns', label: 'Campaigns', icon: '📧' },
  { to: '/locations/overview', label: 'All Locations', icon: '🗺️' },
  { to: '/reports', label: 'Reports', icon: '📈' },
  { to: '/activity', label: 'Activity', icon: '🕐' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
  { to: '/plan', label: 'Upgrade Plan', icon: '💎' },
]

interface Props {
  onClose?: () => void
}

export default function Sidebar({ onClose }: Props) {
  const { data: stats } = useReviewStats()
  const { tenant } = useTenant()
  const unread = stats?.unread ?? 0

  return (
    <aside className="w-56 h-full bg-white border-r border-gray-200 flex flex-col">
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
        {tenant?.logo_url
          ? <img src={tenant.logo_url} alt={tenant.business_name} className="h-8 max-w-[120px] object-contain" />
          : <span className="text-xl font-bold text-brand-700">LocalApex</span>
        }
        <button
          onClick={onClose}
          className="lg:hidden text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-100'
              )
            }
          >
            <span>{icon}</span>
            <span className="flex-1">{label}</span>
            {badge === 'unread' && unread > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
