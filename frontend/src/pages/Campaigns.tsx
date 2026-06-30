import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { campaignsApi, reviewsImportApi } from '../api/endpoints'
import { useLocations } from '../hooks/useLocations'
import { useToast } from '../context/ToastContext'

interface Campaign {
  id: string
  name: string
  location_id: string
  emails: string[]
  custom_message: string | null
  scheduled_at: string
  sent_at: string | null
  sent_count: number
  status: 'pending' | 'sent' | 'cancelled' | 'failed'
  created_at: string
}

const statusColor = (s: string) =>
  s === 'sent' ? 'text-green-600 bg-green-50' : s === 'pending' ? 'text-blue-600 bg-blue-50' :
  s === 'failed' ? 'text-red-500 bg-red-50' : 'text-gray-400 bg-gray-100'

export default function Campaigns() {
  const qc = useQueryClient()
  const toast = useToast()
  const { data: locations = [] } = useLocations()
  const importRef = useRef<HTMLInputElement>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', location_id: '', emails: '', custom_message: '', scheduled_at: '',
  })

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: () => campaignsApi.list().then(r => r.data),
  })

  const createCampaign = useMutation({
    mutationFn: (data: object) => campaignsApi.create(data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success('Campaign scheduled')
      setShowForm(false)
      setForm({ name: '', location_id: '', emails: '', custom_message: '', scheduled_at: '' })
    },
    onError: () => toast.error('Failed to schedule campaign'),
  })

  const cancelCampaign = useMutation({
    mutationFn: (id: string) => campaignsApi.cancel(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Campaign cancelled') },
  })

  const importReviews = useMutation({
    mutationFn: (file: File) => reviewsImportApi.importCsv(file).then(r => r.data),
    onSuccess: (data: { imported: number; errors: string[] }) => {
      qc.invalidateQueries({ queryKey: ['reviews'] })
      toast.success(`Imported ${data.imported} review${data.imported !== 1 ? 's' : ''}`)
      if (data.errors.length) toast.error(`${data.errors.length} rows skipped`)
    },
    onError: () => toast.error('Import failed'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const emails = form.emails.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
    if (!emails.length) { toast.error('Enter at least one email'); return }
    createCampaign.mutate({
      name: form.name,
      location_id: form.location_id,
      emails,
      custom_message: form.custom_message,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Review Campaigns</h1>
          <p className="text-sm text-gray-500 mt-0.5">Schedule bulk review request emails to customers.</p>
        </div>
        <div className="flex items-center gap-3">
          <input ref={importRef} type="file" accept=".csv" className="hidden"
            onChange={e => e.target.files?.[0] && importReviews.mutate(e.target.files[0])} />
          <button
            onClick={() => importRef.current?.click()}
            disabled={importReviews.isPending}
            className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {importReviews.isPending ? 'Importing…' : 'Import Reviews CSV'}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
          >
            + Schedule Campaign
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">New Campaign</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Campaign Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Post-purchase follow-up"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
              <select value={form.location_id} onChange={e => setForm({ ...form, location_id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required>
                <option value="">Select location…</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.store_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Schedule Date & Time</label>
              <input type="datetime-local" value={form.scheduled_at}
                onChange={e => setForm({ ...form, scheduled_at: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Custom Message (optional)</label>
              <input value={form.custom_message} onChange={e => setForm({ ...form, custom_message: e.target.value })}
                placeholder="Thank you for visiting us!"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Customer Emails <span className="text-gray-400">(one per line or comma-separated)</span>
            </label>
            <textarea value={form.emails} onChange={e => setForm({ ...form, emails: e.target.value })}
              rows={4} placeholder="customer1@gmail.com&#10;customer2@gmail.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" required />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Cancel</button>
            <button type="submit" disabled={createCampaign.isPending}
              className="bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-60">
              {createCampaign.isPending ? 'Scheduling…' : 'Schedule'}
            </button>
          </div>
        </form>
      )}

      {/* CSV format hint */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-xs font-semibold text-blue-700 mb-1">Review Import CSV format</p>
        <code className="text-xs text-blue-600">reviewer_name, rating, comment, reviewer_email, location_id, date</code>
        <p className="text-xs text-blue-500 mt-1">Only <code>rating</code> is required. location_id defaults to your first location.</p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-400">Loading…</div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-gray-400">
          No campaigns yet. Schedule your first one above.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Campaign', 'Location', 'Recipients', 'Scheduled', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {locations.find(l => l.id === c.location_id)?.store_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.status === 'sent' ? `${c.sent_count} sent` : `${c.emails.length} recipient${c.emails.length !== 1 ? 's' : ''}`}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {c.sent_at
                      ? new Date(c.sent_at).toLocaleString()
                      : new Date(c.scheduled_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusColor(c.status)}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.status === 'pending' && (
                      <button
                        onClick={() => { if (confirm('Cancel this campaign?')) cancelCampaign.mutate(c.id) }}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
