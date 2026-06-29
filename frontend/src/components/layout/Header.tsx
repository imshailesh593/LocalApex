import { useAuth } from '../../context/AuthContext'
import { useTenant } from '../../context/TenantContext'
import { useNavigate } from 'react-router-dom'
import SearchBar from './SearchBar'
import NotificationBell from './NotificationBell'

interface Props {
  onMenuClick?: () => void
}

export default function Header({ onMenuClick }: Props) {
  const { user, logout } = useAuth()
  const { tenant } = useTenant()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div>
          <p className="text-sm font-medium text-gray-900">{tenant?.business_name ?? 'LocalApex'}</p>
          <p className="text-xs text-gray-500 capitalize">{tenant?.plan_type} plan</p>
        </div>
      </div>
      <SearchBar />
      <div className="flex items-center gap-2">
        <NotificationBell />
        <span className="text-sm text-gray-700 hidden sm:block ml-2">{user?.name}</span>
        <button
          onClick={handleLogout}
          className="ml-2 text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Logout
        </button>
      </div>
    </header>
  )
}
