import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import { useToast } from '../context/ToastContext'

interface GBPReview {
  id: string
  google_review_id: string
  reviewer_name: string
  reviewer_photo_url: string
  rating: number
  comment: string
  sentiment: string
  google_reply: string | null
  google_reply_at: string | null
  review_url: string
  status: string
  created_at: string
}

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n)
const sentimentColor = (s: string) =>
  s === 'positive' ? 'text-green-600 bg-green-50' : s === 'negative' ? 'text-red-500 bg-red-50' : 'text-gray-500 bg-gray-50'

export default function GBPReviews() {
  const { id: locationId } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const toast = useToast()
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'responded'>('all')

  const { data: reviews = [], isLoading } = useQuery<GBPReview[]>({
    queryKey: ['gbp-reviews', locationId],
    queryFn: () => api.get(`/gbp/locations/${locationId}/reviews`).then(r => r.data),
  })

  const sync = useMutation({
    mutationFn: () => api.post(`/gbp/locations/${locationId}/reviews/sync`),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['gbp-reviews', locationId] })
      toast.success(`Synced: ${r.data.synced} new, ${r.data.updated} updated from Google`)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'Sync failed'),
  })

  const reply = useMutation({
    mutationFn: ({ reviewId, text }: { reviewId: string; text: string }) =>
      api.post(`/gbp/locations/${locationId}/reviews/${reviewId}/reply`, { reply: text }),
    onSuccess: (_, { reviewId }) => {
      qc.invalidateQueries({ queryKey: ['gbp-reviews', locationId] })
      setReplyingTo(null)
      setReplyDrafts(d => { const n = { ...d }; delete n[reviewId]; return n })
      toast.success('Reply posted to Google ✓')
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'Reply failed'),
  })

  const deleteReply = useMutation({
    mutationFn: (reviewId: string) =>
      api.delete(`/gbp/locations/${locationId}/reviews/${reviewId}/reply`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gbp-reviews', locationId] }); toast.success('Reply deleted from Google') },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'Delete failed'),
  })

  const filtered = reviews.filter(r =>
    filter === 'all' ? true : filter === 'responded' ? !!r.google_reply : !r.google_reply
  )

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—'
  const respondedPct = reviews.length ? Math.round((reviews.filter(r => r.google_reply).length / reviews.length) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Google Reviews</h1>
          <p className="text-sm text-gray-500 mt-0.5">Real reviews from your Google Business Profile listing</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/locations/${locationId}`} className="text-sm text-gray-400 hover:text-gray-600 self-center">← Location</Link>
          <button
            onClick={() => sync.mutate()}
            disabled={sync.isPending}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 flex items-center gap-2"
          >
            {sync.isPending ? '⟳ Syncing…' : '⟳ Sync from Google'}
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-amber-500">{avgRating}</p>
          <p className="text-xs text-gray-400 mt-1">Avg Rating</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-brand-600">{reviews.length}</p>
          <p className="text-xs text-gray-400 mt-1">Total Reviews</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{respondedPct}%</p>
          <p className="text-xs text-gray-400 mt-1">Response Rate</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(['all', 'pending', 'responded'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {f} {f === 'pending' ? `(${reviews.filter(r => !r.google_reply).length})` : f === 'responded' ? `(${reviews.filter(r => !!r.google_reply).length})` : `(${reviews.length})`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <p className="text-4xl mb-3">⭐</p>
          <p className="font-medium text-gray-600">No reviews yet</p>
          <p className="text-sm mt-1">Click "Sync from Google" to pull your real reviews</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(review => (
            <div key={review.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex gap-3">
                {/* Reviewer avatar */}
                <div className="flex-shrink-0">
                  {review.reviewer_photo_url
                    ? <img src={review.reviewer_photo_url} className="w-10 h-10 rounded-full" alt={review.reviewer_name} />
                    : <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold">{review.reviewer_name?.[0] ?? '?'}</div>
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-semibold text-gray-800">{review.reviewer_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-amber-400 text-sm">{stars(review.rating)}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${sentimentColor(review.sentiment)}`}>{review.sentiment}</span>
                        <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {review.review_url && (
                        <a href={review.review_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-gray-400 hover:text-brand-600">View on Google ↗</a>
                      )}
                      {!review.google_reply ? (
                        <button onClick={() => setReplyingTo(replyingTo === review.id ? null : review.id)}
                          className="text-xs bg-brand-600 text-white px-3 py-1 rounded-lg hover:bg-brand-700">
                          Reply
                        </button>
                      ) : (
                        <button onClick={() => { if (confirm('Delete this reply from Google?')) deleteReply.mutate(review.id) }}
                          className="text-xs text-red-400 hover:text-red-600">Delete reply</button>
                      )}
                    </div>
                  </div>

                  {/* Review text */}
                  {review.comment && <p className="text-sm text-gray-700 mt-2 leading-relaxed">{review.comment}</p>}

                  {/* Existing reply */}
                  {review.google_reply && (
                    <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                      <p className="text-xs font-semibold text-blue-700 mb-1">Your reply (posted to Google)</p>
                      <p className="text-sm text-gray-700">{review.google_reply}</p>
                      {review.google_reply_at && (
                        <p className="text-xs text-gray-400 mt-1">{new Date(review.google_reply_at).toLocaleString()}</p>
                      )}
                    </div>
                  )}

                  {/* Reply composer */}
                  {replyingTo === review.id && (
                    <div className="mt-3 space-y-2">
                      <textarea
                        rows={3}
                        value={replyDrafts[review.id] ?? ''}
                        onChange={e => setReplyDrafts(d => ({ ...d, [review.id]: e.target.value }))}
                        placeholder="Write your reply… This will be posted directly to Google."
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-400"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => reply.mutate({ reviewId: review.id, text: replyDrafts[review.id] ?? '' })}
                          disabled={!replyDrafts[review.id]?.trim() || reply.isPending}
                          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                        >
                          {reply.isPending ? 'Posting…' : 'Post to Google'}
                        </button>
                        <button onClick={() => setReplyingTo(null)}
                          className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
