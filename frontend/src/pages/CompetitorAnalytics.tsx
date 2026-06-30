import { useState } from 'react'
import { useCompetitors, useAddCompetitor, useDeleteCompetitor } from '../hooks/useCompetitors'
import { useLocations } from '../hooks/useLocations'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { competitorsApi, competitorHistoryApi } from '../api/endpoints'
import Badge from '../components/ui/Badge'
import RatingChart from '../components/ui/RatingChart'
import type { Competitor } from '../types/api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

export default function CompetitorAnalytics() {
  const qc = useQueryClient()
  const { data: competitors = [], isLoading } = useCompetitors()
  const { data: locations = [] } = useLocations()
  const addCompetitor = useAddCompetitor()
  const deleteCompetitor = useDeleteCompetitor()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ current_rating: '', review_count: '', map_rank: '' })
  const [form, setForm] = useState({ competitor_name: '', location_id: '', track_keywords: '', competitor_place_id: '' })
  const [historyId, setHistoryId] = useState<string | null>(null)
  const { data: historyData = [] } = useQuery({
    queryKey: ['competitor-history', historyId],
    queryFn: () => competitorHistoryApi.get(historyId!).then(r => r.data),
    enabled: !!historyId,
  })

  const updateCompetitor = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) =>
      competitorsApi.update(id, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['competitors'] })
      setEditingId(null)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await addCompetitor.mutateAsync(form)
    setShowForm(false)
    setForm({ competitor_name: '', location_id: '', track_keywords: '', competitor_place_id: '' })
  }

  const startEdit = (c: Competitor) => {
    setEditingId(c.id)
    setEditForm({
      current_rating: String(c.current_rating ?? ''),
      review_count: String(c.review_count ?? 0),
      map_rank: String(c.map_rank ?? ''),
    })
  }

  const saveEdit = () => {
    updateCompetitor.mutate({
      id: editingId!,
      data: {
        current_rating: editForm.current_rating ? Number(editForm.current_rating) : null,
        review_count: editForm.review_count ? Number(editForm.review_count) : 0,
        map_rank: editForm.map_rank ? Number(editForm.map_rank) : null,
      },
    })
  }

  const chartData = competitors
    .filter(c => c.current_rating != null)
    .map(c => ({
      name: c.competitor_name.length > 12 ? c.competitor_name.slice(0, 12) + '…' : c.competitor_name,
      rating: c.current_rating,
      reviews: c.review_count,
    }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Competitor Analytics</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          + Track Competitor
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
            <select value={form.location_id} onChange={e => setForm({ ...form, location_id: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required>
              <option value="">Select location…</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.store_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Competitor Name</label>
            <input value={form.competitor_name} onChange={e => setForm({ ...form, competitor_name: e.target.value })}
              placeholder="e.g. Rival Café" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Google Place ID</label>
            <input value={form.competitor_place_id} onChange={e => setForm({ ...form, competitor_place_id: e.target.value })}
              placeholder="ChIJ… (optional)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Track Keywords</label>
            <input value={form.track_keywords} onChange={e => setForm({ ...form, track_keywords: e.target.value })}
              placeholder="cafe, coffee, pune" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="col-span-2 flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" disabled={addCompetitor.isPending}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-60">
              {addCompetitor.isPending ? 'Adding…' : 'Add Competitor'}
            </button>
          </div>
        </form>
      )}

      {/* Chart */}
      {chartData.length >= 2 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Rating & Review Count Comparison</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={24}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} domain={[0, 5]} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="left" dataKey="rating" name="Rating" fill="#2563eb" radius={[3, 3, 0, 0]} />
              <Bar yAxisId="right" dataKey="reviews" name="Reviews" fill="#7c3aed" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="py-12 text-center text-gray-400">Loading…</div>
      ) : competitors.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-gray-400">
          No competitors tracked yet. Add your first one above.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Competitor', 'Rating', 'Reviews', 'Map Rank', 'Keywords', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {competitors.map((c: Competitor) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.competitor_name}</td>
                  <td className="px-4 py-3">
                    {editingId === c.id ? (
                      <input type="number" step="0.1" min="0" max="5" value={editForm.current_rating}
                        onChange={e => setEditForm({ ...editForm, current_rating: e.target.value })}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-16" />
                    ) : c.current_rating != null ? (
                      <span className="font-medium">{c.current_rating} ⭐</span>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === c.id ? (
                      <input type="number" min="0" value={editForm.review_count}
                        onChange={e => setEditForm({ ...editForm, review_count: e.target.value })}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-20" />
                    ) : c.review_count}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === c.id ? (
                      <input type="number" min="1" value={editForm.map_rank}
                        onChange={e => setEditForm({ ...editForm, map_rank: e.target.value })}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-16" />
                    ) : c.map_rank != null ? (
                      <Badge label={`#${c.map_rank}`} variant="blue" />
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {c.track_keywords ? (
                      <div className="flex flex-wrap gap-1">
                        {c.track_keywords.split(',').map(k => (
                          <span key={k} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{k.trim()}</span>
                        ))}
                      </div>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === c.id ? (
                      <div className="flex gap-2">
                        <button onClick={saveEdit} disabled={updateCompetitor.isPending}
                          className="text-xs text-brand-600 hover:underline font-medium disabled:opacity-50">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button onClick={() => startEdit(c)} className="text-xs text-brand-600 hover:underline font-medium">
                          Update
                        </button>
                        <button onClick={() => setHistoryId(c.id)} className="text-xs text-purple-600 hover:underline">
                          History
                        </button>
                        <button
                          onClick={() => { if (confirm(`Delete "${c.competitor_name}"?`)) deleteCompetitor.mutate(c.id) }}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Rating history modal */}
      {historyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Rating History</h3>
                <p className="text-xs text-gray-400">
                  {competitors.find(c => c.id === historyId)?.competitor_name} — last 30 days
                </p>
              </div>
              <button onClick={() => setHistoryId(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <RatingChart data={historyData as { date: string; rating: number }[]} height={140} />
            {(historyData as unknown[]).length === 0 && (
              <p className="text-xs text-gray-400 mt-2">
                No history yet. Update a competitor's rating to start tracking changes.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
