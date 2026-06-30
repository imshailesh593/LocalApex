import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adminApi } from '../../api/endpoints'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface AdminStats {
  total_tenants: number
  active_tenants: number
  trial_tenants: number
  total_users: number
  total_locations: number
  total_reviews: number
  plan_breakdown: Record<string, number>
  signup_trend: { date: string; count: number }[]
}

const PLAN_COLORS: Record<string, string> = {
  free: '#9ca3af', starter: '#3b82f6', pro: '#8b5cf6', enterprise: '#f59e0b',
}

export default function AdminDashboard() {
  const { data: stats, isLoading, isError } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.stats().then(r => r.data),
  })

  if (isLoading) return <div className="py-16 text-center text-gray-400">Loading…</div>
  if (isError) return <div className="py-16 text-center text-red-500">Access denied or server error.</div>

  const planData = Object.entries(stats!.plan_breakdown).map(([plan, count]) => ({ plan, count }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">Real-time metrics across all tenants.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Total Businesses', value: stats!.total_tenants, color: 'text-blue-600' },
          { label: 'Active', value: stats!.active_tenants, color: 'text-green-600' },
          { label: 'Trial', value: stats!.trial_tenants, color: 'text-amber-600' },
          { label: 'Total Users', value: stats!.total_users, color: 'text-purple-600' },
          { label: 'Locations', value: stats!.total_locations, color: 'text-indigo-600' },
          { label: 'Reviews', value: stats!.total_reviews, color: 'text-rose-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 font-medium uppercase">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Plan breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Plan Breakdown</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={planData} barSize={40}>
              <XAxis dataKey="plan" tick={{ fontSize: 12 }} tickFormatter={v => v.charAt(0).toUpperCase() + v.slice(1)} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {planData.map(d => <Cell key={d.plan} fill={PLAN_COLORS[d.plan] ?? '#6b7280'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Signup trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">New Signups (last 30 days)</h2>
          {stats!.signup_trend.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">No signups yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats!.signup_trend} barSize={12}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip labelFormatter={l => `Date: ${l}`} />
                <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <Link to="/admin/tenants" className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700">
          Manage Tenants →
        </Link>
        <Link to="/admin/users" className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
          All Users →
        </Link>
      </div>
    </div>
  )
}
