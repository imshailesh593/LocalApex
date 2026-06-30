import { useState } from 'react'
import { useReviews, useGenerateReviewResponse, useReviewStats } from '../hooks/useReviews'
import { useLocations } from '../hooks/useLocations'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { reviewsApi, templatesApi, authApi } from '../api/endpoints'
import { downloadCsv } from '../utils/downloadCsv'
import { useToast } from '../context/ToastContext'
import DataTable, { Column } from '../components/ui/DataTable'
import Pagination from '../components/ui/Pagination'
import Badge from '../components/ui/Badge'
import type { Review, ResponseTemplate } from '../types/api'

const ratingVariant = (r: number) => r >= 4 ? 'green' : r === 3 ? 'yellow' : 'red'
const statusVariant = (s: string) => s === 'routed' ? 'green' : s === 'suppressed' ? 'red' : s === 'responded' ? 'blue' : 'gray'

const locationName = (locations: ReturnType<typeof useLocations>['data'], id: string) =>
  (locations ?? []).find(l => l.id === id)?.store_name ?? '—'

export default function Reviews() {
  const { data: locations = [] } = useLocations()
  const [locationId, setLocationId] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [ratingFilter, setRatingFilter] = useState('')
  const [sentimentFilter, setSentimentFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedAI, setExpandedAI] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [notesReviewId, setNotesReviewId] = useState<string | null>(null)
  const [newNote, setNewNote] = useState('')
  const [assignReviewId, setAssignReviewId] = useState<string | null>(null)
  const PER_PAGE = 20

  const { data: stats } = useReviewStats()
  const { data: templates = [] } = useQuery<ResponseTemplate[]>({
    queryKey: ['templates'],
    queryFn: () => templatesApi.list().then(r => r.data),
  })
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [applyTplId, setApplyTplId] = useState<string | null>(null)

  const filters = {
    ...(locationId ? { location_id: locationId } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(ratingFilter === 'positive' ? { min_rating: 4 } : ratingFilter === 'negative' ? { max_rating: 3 } : {}),
    ...(sentimentFilter ? { sentiment: sentimentFilter } : {}),
  }

  const qc = useQueryClient()
  const { data: reviews = [], isLoading } = useReviews(
    Object.keys(filters).length
      ? { ...filters, page, per_page: PER_PAGE }
      : { page, per_page: PER_PAGE }
  )
  const generateResponse = useGenerateReviewResponse()
  const markResponded = useMutation({
    mutationFn: (id: string) => reviewsApi.update(id, { status: 'responded' }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews'] }),
  })

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const allSelected = reviews.length > 0 && reviews.every(r => selected.has(r.id))
  const toggleAll = () => {
    if (allSelected) {
      setSelected(prev => { const next = new Set(prev); reviews.forEach(r => next.delete(r.id)); return next })
    } else {
      setSelected(prev => { const next = new Set(prev); reviews.forEach(r => next.add(r.id)); return next })
    }
  }

  const bulkMarkResponded = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await reviewsApi.update(id, { status: 'responded' })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews'] })
      setSelected(new Set())
    },
  })

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await reviewsApi.update(id, { is_deleted: true })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews'] })
      setSelected(new Set())
      toast.success('Reviews deleted')
    },
    onError: () => toast.error('Delete failed'),
  })

  const bulkMarkRead = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await reviewsApi.update(id, { is_read: true })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews'] })
      setSelected(new Set())
    },
  })

  const { data: notes = [] } = useQuery<{ id: string; author_name: string; body: string; created_at: string }[]>({
    queryKey: ['review-notes', notesReviewId],
    queryFn: () => reviewsApi.notes(notesReviewId!).then(r => r.data),
    enabled: !!notesReviewId,
  })

  const addNote = useMutation({
    mutationFn: () => reviewsApi.addNote(notesReviewId!, newNote).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['review-notes', notesReviewId] }); setNewNote('') },
  })

  const deleteNote = useMutation({
    mutationFn: (noteId: string) => reviewsApi.deleteNote(notesReviewId!, noteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['review-notes', notesReviewId] }),
  })

  const { data: teamMembers = [] } = useQuery<{ id: string; name: string; email: string }[]>({
    queryKey: ['users'],
    queryFn: () => authApi.listUsers().then(r => r.data),
    staleTime: 60_000,
  })

  const assignReview = useMutation({
    mutationFn: ({ reviewId, userId }: { reviewId: string; userId: string | null }) =>
      reviewsApi.assign(reviewId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews'] })
      setAssignReviewId(null)
      toast.success('Review assigned')
    },
  })

  const columns: Column<Review>[] = [
    {
      key: 'id',
      label: (
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          className="rounded border-gray-300 text-brand-600"
        />
      ),
      render: (val) => (
        <input
          type="checkbox"
          checked={selected.has(String(val))}
          onChange={() => toggleSelect(String(val))}
          className="rounded border-gray-300 text-brand-600"
        />
      ),
    },
    {
      key: 'reviewer_name',
      label: 'Reviewer',
      render: (val) => <span className="font-medium">{String(val ?? 'Anonymous')}</span>,
    },
    {
      key: 'location_id',
      label: 'Location',
      render: (val) => <span className="text-xs text-gray-500">{locationName(locations, String(val))}</span>,
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (val) => <Badge label={`${val} ⭐`} variant={ratingVariant(Number(val))} />,
    },
    {
      key: 'comment',
      label: 'Comment',
      render: (val) => (
        <span className="text-gray-600 line-clamp-2 max-w-xs">{String(val ?? '—')}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <Badge label={String(val)} variant={statusVariant(String(val))} />,
    },
    {
      key: 'sentiment',
      label: 'Sentiment',
      render: (val) => {
        if (!val) return <span className="text-gray-300 text-xs">—</span>
        const s = String(val)
        const cls = s === 'positive' ? 'text-green-600 bg-green-50' : s === 'negative' ? 'text-red-500 bg-red-50' : 'text-gray-500 bg-gray-100'
        return <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${cls}`}>{s}</span>
      },
    },
    {
      key: 'id',
      label: 'AI Response',
      render: (val, row) => (
        <div className="space-y-1 min-w-[200px]">
          <div className="flex flex-wrap gap-x-2 gap-y-1 items-center">
            <button
              onClick={() => { generateResponse.mutate(String(val)); setExpandedId(String(val)) }}
              disabled={generateResponse.isPending && expandedId === String(val)}
              className="text-xs text-brand-600 hover:underline disabled:opacity-50"
            >
              {generateResponse.isPending && expandedId === String(val) ? 'Generating…' : 'AI Generate'}
            </button>
            {templates.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setApplyTplId(applyTplId === String(val) ? null : String(val))}
                  className="text-xs text-purple-600 hover:underline"
                >
                  Use template ▾
                </button>
                {applyTplId === String(val) && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[160px]">
                    {templates.map(t => (
                      <button
                        key={t.id}
                        onClick={() => {
                          reviewsApi.update(String(val), { ai_response: t.body }).then(() => {
                            qc.invalidateQueries({ queryKey: ['reviews'] })
                          })
                          setApplyTplId(null)
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 border-b border-gray-50 last:border-0"
                      >
                        <span className="font-medium">{t.name}</span>
                        <span className="ml-1 text-gray-400 capitalize">({t.tone})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {row.ai_response && row.status !== 'responded' && (
              <button
                onClick={() => markResponded.mutate(String(val))}
                disabled={markResponded.isPending}
                className="text-xs text-green-600 hover:underline disabled:opacity-50"
              >
                Mark Responded
              </button>
            )}
            <button
              onClick={() => setNotesReviewId(notesReviewId === String(val) ? null : String(val))}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Notes
            </button>
            <button
              onClick={() => setAssignReviewId(assignReviewId === String(val) ? null : String(val))}
              className="text-xs text-purple-500 hover:text-purple-700"
            >
              {row.assigned_to ? 'Reassign' : 'Assign'}
            </button>
            {assignReviewId === String(val) && (
              <div className="mt-1 flex items-center gap-2">
                <select
                  defaultValue={row.assigned_to ?? ''}
                  onChange={e => assignReview.mutate({ reviewId: String(val), userId: e.target.value || null })}
                  className="text-xs border border-gray-200 rounded px-2 py-1"
                >
                  <option value="">Unassign</option>
                  {teamMembers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            )}
          </div>
          {row.ai_response && (
            <div className="mt-1">
              <p className={`text-xs text-gray-500 max-w-xs ${expandedAI === String(val) ? '' : 'line-clamp-2'}`}>
                {row.ai_response}
              </p>
              <div className="flex gap-2 mt-0.5">
                <button
                  onClick={() => setExpandedAI(expandedAI === String(val) ? null : String(val))}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  {expandedAI === String(val) ? 'Show less' : 'Show more'}
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(row.ai_response!)
                    setCopiedId(String(val))
                    setTimeout(() => setCopiedId(null), 2000)
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  {copiedId === String(val) ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>
      ),
    },
  ]

  const toast = useToast()
  const routed = reviews.filter(r => r.is_routed).length
  const suppressed = reviews.filter(r => !r.is_routed).length
  const totalReviews = stats?.total ?? 0

  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestForm, setRequestForm] = useState({ location_id: '', emails: '', custom_message: '' })
  const [requestSending, setRequestSending] = useState(false)

  const handleSendRequests = async (e: React.FormEvent) => {
    e.preventDefault()
    const emails = requestForm.emails.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
    if (!emails.length) { toast.error('Enter at least one email'); return }
    setRequestSending(true)
    try {
      const res = await reviewsApi.requestReviews({
        location_id: requestForm.location_id,
        emails,
        custom_message: requestForm.custom_message,
      })
      toast.success(`Sent ${res.data.sent} review request${res.data.sent !== 1 ? 's' : ''}`)
      setShowRequestModal(false)
      setRequestForm({ location_id: '', emails: '', custom_message: '' })
    } catch {
      toast.error('Failed to send requests')
    } finally {
      setRequestSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Reviews</h1>
        <div className="flex gap-3 text-sm items-center">
          <span className="text-green-600 font-medium">{routed} routed to Google</span>
          <span className="text-gray-400">·</span>
          <span className="text-red-500 font-medium">{suppressed} suppressed</span>
          <button
            onClick={() => downloadCsv('/reviews/export', `reviews-${new Date().toISOString().slice(0,10)}.csv`).catch(() => toast.error('Export failed'))}
            className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50"
          >
            Export CSV
          </button>
          <button
            onClick={() => setShowRequestModal(true)}
            className="bg-brand-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-brand-700"
          >
            Request Reviews
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        <select
          value={locationId}
          onChange={e => setLocationId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All locations</option>
          {locations.map(l => <option key={l.id} value={l.id}>{l.store_name}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="routed">Routed</option>
          <option value="suppressed">Suppressed</option>
          <option value="responded">Responded</option>
          <option value="pending">Pending</option>
        </select>
        <select
          value={ratingFilter}
          onChange={e => setRatingFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All ratings</option>
          <option value="positive">Positive (4-5 ⭐)</option>
          <option value="negative">Negative (1-3 ⭐)</option>
        </select>
        <select
          value={sentimentFilter}
          onChange={e => setSentimentFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All sentiments</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </select>
        {(locationId || statusFilter || ratingFilter || sentimentFilter) && (
          <button
            onClick={() => { setLocationId(''); setStatusFilter(''); setRatingFilter(''); setSentimentFilter(''); setPage(1) }}
            className="text-sm text-gray-400 hover:text-gray-600 px-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 flex-wrap">
          <span className="text-sm font-medium text-brand-700">{selected.size} selected</span>
          <button
            onClick={() => bulkMarkRead.mutate([...selected])}
            disabled={bulkMarkRead.isPending}
            className="text-sm border border-gray-300 bg-white text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Mark Read
          </button>
          <button
            onClick={() => bulkMarkResponded.mutate([...selected])}
            disabled={bulkMarkResponded.isPending}
            className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50"
          >
            {bulkMarkResponded.isPending ? 'Updating…' : 'Mark Responded'}
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete ${selected.size} review${selected.size !== 1 ? 's' : ''}?`)) {
                bulkDelete.mutate([...selected])
              }
            }}
            disabled={bulkDelete.isPending}
            className="text-sm bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 disabled:opacity-50"
          >
            {bulkDelete.isPending ? 'Deleting…' : 'Delete'}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm text-gray-500 hover:text-gray-700 ml-auto"
          >
            Clear
          </button>
        </div>
      )}

      {/* Star distribution */}
      {stats && stats.total > 0 && (() => {
        const dist = (stats as unknown as { star_distribution?: Record<string, number> }).star_distribution ?? {}
        const max = Math.max(...Object.values(dist), 1)
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 mb-3">Rating breakdown</p>
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map(star => {
                const count = dist[star] ?? 0
                const pct = Math.round((count / max) * 100)
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-6 text-right">{star}★</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${star >= 4 ? 'bg-green-400' : star === 3 ? 'bg-yellow-400' : 'bg-red-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-6">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      <DataTable<Review> data={reviews} columns={columns} loading={isLoading} />
      <Pagination
        page={page}
        perPage={PER_PAGE}
        total={totalReviews}
        onChange={p => setPage(p)}
      />

      {/* Request Reviews modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Request Reviews</h2>
              <button onClick={() => setShowRequestModal(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>
            <p className="text-sm text-gray-500">
              Send a personalised email to your customers with a link to your review funnel.
            </p>
            <form onSubmit={handleSendRequests} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
                <select
                  value={requestForm.location_id}
                  onChange={e => setRequestForm(f => ({ ...f, location_id: e.target.value }))}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select location…</option>
                  {locations.filter(l => l.funnel_slug).map(l => (
                    <option key={l.id} value={l.id}>{l.store_name} (/r/{l.funnel_slug})</option>
                  ))}
                </select>
                {locations.filter(l => l.funnel_slug).length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Set a funnel slug on a location first.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Customer emails <span className="text-gray-400">(comma or line separated)</span>
                </label>
                <textarea
                  value={requestForm.emails}
                  onChange={e => setRequestForm(f => ({ ...f, emails: e.target.value }))}
                  placeholder="customer1@example.com&#10;customer2@example.com"
                  rows={4}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Custom message <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={requestForm.custom_message}
                  onChange={e => setRequestForm(f => ({ ...f, custom_message: e.target.value }))}
                  placeholder="We'd love to hear about your visit!"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowRequestModal(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                <button
                  type="submit"
                  disabled={requestSending}
                  className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
                >
                  {requestSending ? 'Sending…' : 'Send emails'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notes drawer */}
      {notesReviewId && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setNotesReviewId(null)} />
          <div className="relative bg-white w-80 flex flex-col h-full shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-900">Internal Notes</h3>
              <button onClick={() => setNotesReviewId(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notes.length === 0 && (
                <p className="text-xs text-gray-400">No notes yet. Add one below.</p>
              )}
              {notes.map(n => (
                <div key={n.id} className="bg-gray-50 rounded-lg p-3 space-y-1 group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">{n.author_name}</span>
                    <button
                      onClick={() => deleteNote.mutate(n.id)}
                      className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Delete
                    </button>
                  </div>
                  <p className="text-xs text-gray-600">{n.body}</p>
                  <p className="text-xs text-gray-400">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
            <form
              onSubmit={e => { e.preventDefault(); if (newNote.trim()) addNote.mutate() }}
              className="border-t border-gray-200 p-4 space-y-2"
            >
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Add a private note…"
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="submit"
                disabled={addNote.isPending || !newNote.trim()}
                className="w-full bg-brand-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
              >
                {addNote.isPending ? 'Saving…' : 'Add Note'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
