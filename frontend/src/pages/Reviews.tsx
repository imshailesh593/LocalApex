import { useState } from 'react'
import { useReviews, useGenerateReviewResponse, useReviewStats } from '../hooks/useReviews'
import { useLocations } from '../hooks/useLocations'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { reviewsApi, templatesApi } from '../api/endpoints'
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
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedAI, setExpandedAI] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
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

  const routed = reviews.filter(r => r.is_routed).length
  const suppressed = reviews.filter(r => !r.is_routed).length
  const totalReviews = stats?.total ?? 0

  const exportCsv = () => {
    const header = 'Reviewer,Email,Rating,Status,Comment,AI Response,Date'
    const rows = reviews.map(r =>
      [r.reviewer_name ?? '', r.reviewer_email ?? '', r.rating, r.status,
        `"${(r.comment ?? '').replace(/"/g, '""')}"`,
        `"${(r.ai_response ?? '').replace(/"/g, '""')}"`,
        r.created_at.slice(0, 10),
      ].join(',')
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `reviews-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Reviews</h1>
        <div className="flex gap-3 text-sm items-center">
          <span className="text-green-600 font-medium">{routed} routed to Google</span>
          <span className="text-gray-400">·</span>
          <span className="text-red-500 font-medium">{suppressed} suppressed</span>
          {reviews.length > 0 && (
            <button onClick={exportCsv} className="ml-2 border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50">
              Export CSV
            </button>
          )}
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
        {(locationId || statusFilter || ratingFilter) && (
          <button
            onClick={() => { setLocationId(''); setStatusFilter(''); setRatingFilter(''); setPage(1) }}
            className="text-sm text-gray-400 hover:text-gray-600 px-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-brand-50 border border-brand-200 rounded-xl px-4 py-3">
          <span className="text-sm font-medium text-brand-700">{selected.size} selected</span>
          <button
            onClick={() => bulkMarkResponded.mutate([...selected])}
            disabled={bulkMarkResponded.isPending}
            className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50"
          >
            {bulkMarkResponded.isPending ? 'Updating…' : 'Mark as Responded'}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm text-gray-500 hover:text-gray-700 ml-auto"
          >
            Clear selection
          </button>
        </div>
      )}

      <DataTable<Review> data={reviews} columns={columns} loading={isLoading} />
      <Pagination
        page={page}
        perPage={PER_PAGE}
        total={totalReviews}
        onChange={p => setPage(p)}
      />
    </div>
  )
}
