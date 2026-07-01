import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adminApi } from '../../api/endpoints'
import { useToast } from '../../context/ToastContext'

interface TenantRow {
  id: string
  business_name: string
  plan_type: string
  status: string
  locations: number
  gbp_connected: boolean
  gbp_locations: number
  reviews: number
  google_reviews: number
  response_rate: number
  users: number
  created_at: string
  razorpay_subscription_id: string | null
}

const planColor = (p: string) =>
  p === 'pro' ? 'bg-purple-100 text-purple-700' :
  p === 'starter' ? 'bg-blue-100 text-blue-700' :
  p === 'enterprise' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'

const statusColor = (s: string) =>
  s === 'active' ? 'text-green-600 bg-green-50' :
  s === 'suspended' ? 'text-red-500 bg-red-50' : 'text-amber-600 bg-amber-50'

export default function AdminTenants() {
  const qc = useQueryClient()
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading } = useQuery<{ total: number; tenants: TenantRow[] }>({
    queryKey: ['admin-tenants', page, search, planFilter, statusFilter],
    queryFn: () => adminApi.tenants({ page, search, plan: planFilter, status: statusFilter }).then(r => r.data),
  })

  const updateTenant = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => adminApi.updateTenant(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-tenants'] }); toast.success('Updated') },
  })

  const impersonate = useMutation({
    mutationFn: (id: string) => adminApi.impersonate(id).then(r => r.data),
    onSuccess: (data: { token: string; tenant: string; user: string }) => {
      const prev = localStorage.getItem('token')
      localStorage.setItem('impersonate_prev_token', prev ?? '')
      localStorage.setItem('token', data.token)
      toast.success(`Logged in as ${data.user} (${data.tenant})`)
      window.location.href = '/'
    },
    onError: () => toast.error('Impersonation failed'),
  })

  const tenants = data?.tenants ?? []
  const total = data?.total ?? 0
  const perPage = 25

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">All Tenants <span className="text-gray-400 font-normal text-base ml-2">{total}</span></h1>
        <Link to="/admin" className="text-sm text-gray-400 hover:text-gray-600">← Overview</Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search business name…"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-48"
        />
        <select value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(1) }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All plans</option>
          {['free', 'starter', 'pro', 'enterprise'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {['trial', 'active', 'suspended'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-gray-400">Loading…</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Business', 'Plan', 'Status', 'GBP', 'Locations', 'Reviews', 'Response %', 'Users', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tenants.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/admin/tenants/${t.id}`} className="font-medium text-brand-600 hover:underline">
                      {t.business_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={t.plan_type}
                      onChange={e => updateTenant.mutate({ id: t.id, body: { plan_type: e.target.value } })}
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full border-0 capitalize cursor-pointer ${planColor(t.plan_type)}`}
                    >
                      {['free', 'starter', 'pro', 'enterprise'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={t.status}
                      onChange={e => updateTenant.mutate({ id: t.id, body: { status: e.target.value } })}
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full border-0 capitalize cursor-pointer ${statusColor(t.status)}`}
                    >
                      {['trial', 'active', 'suspended'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${t.gbp_connected ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      {t.gbp_connected ? '✓ Connected' : '✗ Not connected'}
                    </span>
                    {t.gbp_connected && <p className="text-xs text-gray-400 mt-0.5">{t.gbp_locations} location{t.gbp_locations !== 1 ? 's' : ''}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.locations}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <span>{t.google_reviews} <span className="text-gray-400 text-xs">Google</span></span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${t.response_rate >= 80 ? 'text-green-600' : t.response_rate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                      {t.response_rate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.users}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(t.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link to={`/admin/tenants/${t.id}`} className="text-xs text-brand-600 hover:underline">View</Link>
                      <button
                        onClick={() => { if (confirm(`Impersonate ${t.business_name}?`)) impersonate.mutate(t.id) }}
                        className="text-xs text-amber-600 hover:underline"
                      >
                        Login as
                      </button>
                      {t.gbp_connected && (
                        <button
                          onClick={() => {
                            if (confirm(`Login as ${t.business_name} and open GBP manager?`)) {
                              adminApi.impersonate(t.id).then(r => {
                                const prev = localStorage.getItem('token')
                                localStorage.setItem('impersonate_prev_token', prev ?? '')
                                localStorage.setItem('token', r.data.token)
                                window.location.href = '/locations'
                              })
                            }
                          }}
                          className="text-xs text-green-600 hover:underline"
                        >
                          Manage GBP
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > perPage && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {page} of {Math.ceil(total / perPage)}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Prev</button>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / perPage)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next →</button>
          </div>
        </div>
      )}
    </div>
  )
}
