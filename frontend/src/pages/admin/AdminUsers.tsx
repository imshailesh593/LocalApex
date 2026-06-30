import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adminApi } from '../../api/endpoints'
import { useToast } from '../../context/ToastContext'

interface AdminUser {
  id: string; name: string; email: string; role: string; tenant_id: string; created_at: string
}

export default function AdminUsers() {
  const qc = useQueryClient()
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery<{ total: number; users: AdminUser[] }>({
    queryKey: ['admin-users', page, search],
    queryFn: () => adminApi.users({ page, search }).then(r => r.data),
  })

  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminApi.setUserRole(id, role),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Role updated') },
  })

  const users = data?.users ?? []
  const total = data?.total ?? 0
  const perPage = 50

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">All Users <span className="text-gray-400 font-normal text-base ml-2">{total}</span></h1>
        <Link to="/admin" className="text-sm text-gray-400 hover:text-gray-600">← Overview</Link>
      </div>

      <input
        value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
        placeholder="Search by name or email…"
        className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm"
      />

      {isLoading ? <div className="py-10 text-center text-gray-400">Loading…</div> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Name', 'Email', 'Role', 'Tenant', 'Joined'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={e => setRole.mutate({ id: u.id, role: e.target.value })}
                      className="text-xs border border-gray-200 rounded px-2 py-1"
                    >
                      {['owner', 'admin', 'viewer', 'superadmin'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/admin/tenants/${u.tenant_id}`} className="text-xs text-brand-600 hover:underline font-mono">
                      {u.tenant_id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
