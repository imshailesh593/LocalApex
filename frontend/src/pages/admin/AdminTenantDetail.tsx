import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../api/endpoints'

interface TenantDetail {
  tenant: {
    id: string; business_name: string; plan_type: string; status: string
    notification_email: string | null; logo_url: string | null; brand_color: string
    razorpay_subscription_id: string | null; zernio_profile_id: string | null
    created_at: string
  }
  users: { id: string; name: string; email: string; role: string; created_at: string }[]
  locations: { id: string; store_name: string; city: string | null; funnel_slug: string | null }[]
  recent_reviews: { rating: number; sentiment: string | null; status: string; created_at: string }[]
}

const planColor = (p: string) =>
  p === 'pro' ? 'bg-purple-100 text-purple-700' : p === 'starter' ? 'bg-blue-100 text-blue-700' :
  p === 'enterprise' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'

export default function AdminTenantDetail() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading } = useQuery<TenantDetail>({
    queryKey: ['admin-tenant', id],
    queryFn: () => adminApi.tenantDetail(id!).then(r => r.data),
  })

  if (isLoading) return <div className="py-16 text-center text-gray-400">Loading…</div>
  if (!data) return <div className="py-16 text-center text-red-500">Not found</div>

  const { tenant, users, locations, recent_reviews } = data
  const sentimentCount = { positive: 0, neutral: 0, negative: 0 }
  recent_reviews.forEach(r => { if (r.sentiment) sentimentCount[r.sentiment as keyof typeof sentimentCount]++ })

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/admin/tenants" className="text-sm text-gray-400 hover:text-gray-600">← Tenants</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">{tenant.business_name}</h1>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${planColor(tenant.plan_type)}`}>
          {tenant.plan_type}
        </span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
          tenant.status === 'active' ? 'bg-green-50 text-green-600' : tenant.status === 'suspended' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'
        }`}>{tenant.status}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tenant info */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Tenant Info</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Tenant ID', tenant.id],
              ['Created', new Date(tenant.created_at).toLocaleString()],
              ['Notification Email', tenant.notification_email ?? '—'],
              ['Brand Color', tenant.brand_color],
              ['Razorpay Sub', tenant.razorpay_subscription_id ?? '—'],
              ['Zernio Profile', tenant.zernio_profile_id ?? '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-gray-400 font-medium">{label}</p>
                <p className="text-gray-700 truncate font-mono text-xs mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Review sentiment summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent Reviews (last 10)</h2>
          {recent_reviews.length === 0 ? <p className="text-xs text-gray-400">No reviews yet</p> : (
            <>
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div className="bg-green-50 rounded-lg py-2"><p className="text-lg font-bold text-green-600">{sentimentCount.positive}</p><p className="text-xs text-gray-400">Positive</p></div>
                <div className="bg-gray-50 rounded-lg py-2"><p className="text-lg font-bold text-gray-600">{sentimentCount.neutral}</p><p className="text-xs text-gray-400">Neutral</p></div>
                <div className="bg-red-50 rounded-lg py-2"><p className="text-lg font-bold text-red-500">{sentimentCount.negative}</p><p className="text-xs text-gray-400">Negative</p></div>
              </div>
              <div className="space-y-1">
                {recent_reviews.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-amber-400">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    <span className={`px-1.5 rounded font-medium ${r.sentiment === 'positive' ? 'text-green-600 bg-green-50' : r.sentiment === 'negative' ? 'text-red-500 bg-red-50' : 'text-gray-500 bg-gray-50'}`}>{r.sentiment ?? '—'}</span>
                    <span className="text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Users */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-700">Users ({users.length})</h2></div>
          {users.length === 0 ? <p className="px-5 py-4 text-xs text-gray-400">No users</p> : (
            <div className="divide-y divide-gray-50">
              {users.map(u => (
                <div key={u.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700">
                    {u.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                  <span className="text-xs text-gray-500 capitalize">{u.role}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Locations */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-700">Locations ({locations.length})</h2></div>
          {locations.length === 0 ? <p className="px-5 py-4 text-xs text-gray-400">No locations</p> : (
            <div className="divide-y divide-gray-50">
              {locations.map(l => (
                <div key={l.id} className="px-5 py-3">
                  <p className="text-sm font-medium text-gray-800">{l.store_name}</p>
                  <div className="flex gap-3 mt-0.5">
                    {l.city && <span className="text-xs text-gray-400">{l.city}</span>}
                    {l.funnel_slug && <span className="text-xs text-brand-500">/{l.funnel_slug}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
