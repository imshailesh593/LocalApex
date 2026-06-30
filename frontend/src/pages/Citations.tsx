import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { citationsApi } from '../api/endpoints'
import { useLocations } from '../hooks/useLocations'
import Badge from '../components/ui/Badge'
import Pagination from '../components/ui/Pagination'
import { downloadCsv } from '../utils/downloadCsv'
import { useToast } from '../context/ToastContext'
import type { Citation } from '../types/api'

type BadgeVariant = 'green' | 'red' | 'yellow' | 'blue' | 'gray'
const statusVariant = (s: string): BadgeVariant =>
  s === 'consistent' ? 'green' : s === 'inconsistent' ? 'red' : s === 'missing' ? 'yellow' : 'gray'

const POPULAR_PLATFORMS = [
  { name: 'Google Business Profile', url: 'https://business.google.com' },
  { name: 'JustDial', url: 'https://www.justdial.com' },
  { name: 'IndiaMart', url: 'https://www.indiamart.com' },
  { name: 'Sulekha', url: 'https://www.sulekha.com' },
  { name: 'Yellow Pages', url: 'https://www.yellowpages.com' },
  { name: 'Yelp', url: 'https://www.yelp.com' },
  { name: 'Foursquare', url: 'https://foursquare.com' },
  { name: 'Bing Places', url: 'https://www.bingplaces.com' },
  { name: 'Apple Maps', url: 'https://mapsconnect.apple.com' },
  { name: 'Facebook Business', url: 'https://business.facebook.com' },
  { name: 'TradeIndia', url: 'https://www.tradeindia.com' },
  { name: 'Zomato', url: 'https://www.zomato.com' },
]

const PER_PAGE = 20

export default function Citations() {
  const [page, setPage] = useState(1)
  const qc = useQueryClient()
  const toast = useToast()
  const { data: citations = [], isLoading } = useQuery<Citation[]>({
    queryKey: ['citations', page],
    queryFn: () => citationsApi.list({ page, per_page: PER_PAGE }).then(r => r.data),
  })
  const { data: locations = [] } = useLocations()

  const addCitation = useMutation({
    mutationFn: (data: object) => citationsApi.create(data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['citations'] }),
  })

  const checkNAP = useMutation({
    mutationFn: (id: string) => citationsApi.check(id).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['citations'] }),
  })

  const deleteCitation = useMutation({
    mutationFn: (id: string) => citationsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['citations'] }),
  })

  const checkAllNAP = async () => {
    const unchecked = citations.filter(c => c.status === 'unchecked' || c.status === 'inconsistent')
    for (const c of unchecked) {
      await citationsApi.check(c.id)
    }
    qc.invalidateQueries({ queryKey: ['citations'] })
  }

  const [showForm, setShowForm] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [form, setForm] = useState({
    location_id: '', platform_name: '', platform_url: '',
    listed_name: '', listed_address: '', listed_phone: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await addCitation.mutateAsync(form)
    setShowForm(false)
    setForm({ location_id: '', platform_name: '', platform_url: '', listed_name: '', listed_address: '', listed_phone: '' })
  }

  const consistent = citations.filter(c => c.status === 'consistent').length
  const issues = citations.filter(c => c.status !== 'consistent' && c.status !== 'unchecked').length
  const unchecked = citations.filter(c => c.status === 'unchecked').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Local Citations</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-green-600 font-medium">{consistent} consistent</span>
          {issues > 0 && <span className="text-sm text-red-500 font-medium">{issues} issues</span>}
          {unchecked > 0 && <span className="text-sm text-gray-400">{unchecked} unchecked</span>}
          {citations.length > 0 && (
            <>
              <button
                onClick={() => downloadCsv('/citations/export', `citations-${new Date().toISOString().slice(0,10)}.csv`).catch(() => toast.error('Export failed'))}
                className="border border-gray-300 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Export CSV
              </button>
              <button
                onClick={checkAllNAP}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Check All NAP
              </button>
            </>
          )}
          <button
            onClick={() => { setShowPresets(!showPresets); setShowForm(false) }}
            className="border border-brand-600 text-brand-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-50"
          >
            Quick Add
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setShowPresets(false) }}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
          >
            + Add Citation
          </button>
        </div>
      </div>

      {showPresets && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase">Select a platform to pre-fill</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {POPULAR_PLATFORMS.map(p => (
              <button
                key={p.name}
                onClick={() => {
                  setForm(f => ({ ...f, platform_name: p.name, platform_url: p.url }))
                  setShowPresets(false)
                  setShowForm(true)
                }}
                className="text-left text-sm px-3 py-2 border border-gray-200 rounded-lg hover:border-brand-400 hover:bg-brand-50 transition-colors"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
            <select
              value={form.location_id}
              onChange={e => setForm({ ...form, location_id: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              required
            >
              <option value="">Select location…</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.store_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Platform</label>
            <input
              value={form.platform_name}
              onChange={e => setForm({ ...form, platform_name: e.target.value })}
              placeholder="e.g. JustDial, IndiaMART"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Platform URL</label>
            <input
              value={form.platform_url}
              onChange={e => setForm({ ...form, platform_url: e.target.value })}
              placeholder="https://…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Listed Name</label>
            <input
              value={form.listed_name}
              onChange={e => setForm({ ...form, listed_name: e.target.value })}
              placeholder="Name as shown on platform"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Listed Address</label>
            <input
              value={form.listed_address}
              onChange={e => setForm({ ...form, listed_address: e.target.value })}
              placeholder="Address as shown on platform"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Listed Phone</label>
            <input
              value={form.listed_phone}
              onChange={e => setForm({ ...form, listed_phone: e.target.value })}
              placeholder="Phone as shown on platform"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="col-span-2 flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" disabled={addCitation.isPending} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-60">
              {addCitation.isPending ? 'Saving…' : 'Save Citation'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-gray-400">Loading…</div>
      ) : citations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-gray-400">
          No citations tracked yet. Add your first one above.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Platform', 'Listed Name', 'Listed Address', 'Phone', 'NAP Status', 'Match', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {citations.map((c: Citation) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {c.platform_url
                      ? <a href={c.platform_url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">{c.platform_name}</a>
                      : c.platform_name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.listed_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{c.listed_address ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.listed_phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge label={c.status ?? 'unchecked'} variant={statusVariant(c.status ?? 'unchecked')} />
                  </td>
                  <td className="px-4 py-3">
                    {c.status === 'unchecked'
                      ? <span className="text-gray-400 text-xs">—</span>
                      : c.nap_match
                        ? <Badge label="Match" variant="green" />
                        : <Badge label="Mismatch" variant="red" />
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => checkNAP.mutate(c.id)}
                        disabled={checkNAP.isPending}
                        className="text-xs text-brand-600 hover:underline disabled:opacity-50 font-medium"
                      >
                        Check NAP
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete ${c.platform_name}?`)) deleteCitation.mutate(c.id) }}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        page={page}
        perPage={PER_PAGE}
        total={citations.length < PER_PAGE ? (page - 1) * PER_PAGE + citations.length : page * PER_PAGE + 1}
        onChange={p => setPage(p)}
      />
    </div>
  )
}
