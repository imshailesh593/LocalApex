import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../api/client'

interface LocationRow {
  id: string
  store_name: string
  city: string | null
  reviews: number
  avg_rating: number | null
  citations: number
  citation_health: number | null
}

interface LocationReport {
  location: { id: string; store_name: string; address: string; city: string | null; phone: string | null; funnel_slug: string | null; google_review_url: string | null }
  reviews: { total: number; avg_rating: number | null; routed: number; routed_pct: number }
  citations: { total: number; consistent: number; health_pct: number | null }
  competitors: { total: number }
  insights: Record<string, number>
}

const INSIGHT_LABELS: Record<string, string> = {
  views: 'Profile Views',
  searches: 'Searches',
  clicks: 'Website Clicks',
  calls: 'Phone Calls',
  directions: 'Directions',
  bookings: 'Bookings',
}

const healthColor = (pct: number | null) => {
  if (pct === null) return 'text-gray-400'
  if (pct >= 80) return 'text-green-600'
  if (pct >= 50) return 'text-yellow-600'
  return 'text-red-500'
}

const ratingColor = (r: number | null) => {
  if (!r) return 'text-gray-400'
  if (r >= 4) return 'text-green-600'
  if (r >= 3) return 'text-yellow-600'
  return 'text-red-500'
}

export default function Reports() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: overview = [] } = useQuery<LocationRow[]>({
    queryKey: ['reports-overview'],
    queryFn: () => api.get('/reports/overview').then(r => r.data),
  })

  const { data: detail } = useQuery<LocationReport>({
    queryKey: ['reports-location', selectedId],
    queryFn: () => api.get(`/reports/location/${selectedId}`).then(r => r.data),
    enabled: !!selectedId,
  })

  const print = () => window.print()

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Reports</h1>
        <button
          onClick={print}
          className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          Print / Save PDF
        </button>
      </div>

      {/* Overview table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">All Locations Overview</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Location', 'Reviews', 'Avg Rating', 'Citations', 'NAP Health', 'Detail'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {overview.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No locations yet</td></tr>
            ) : overview.map(row => (
              <tr
                key={row.id}
                className={`hover:bg-gray-50 cursor-pointer ${selectedId === row.id ? 'bg-brand-50' : ''}`}
                onClick={() => setSelectedId(row.id === selectedId ? null : row.id)}
              >
                <td className="px-4 py-3 font-medium text-gray-900">
                  {row.store_name}
                  {row.city && <span className="ml-1 text-gray-400 font-normal text-xs">({row.city})</span>}
                </td>
                <td className="px-4 py-3 text-gray-600">{row.reviews}</td>
                <td className={`px-4 py-3 font-semibold ${ratingColor(row.avg_rating)}`}>
                  {row.avg_rating ? `${row.avg_rating} ⭐` : '—'}
                </td>
                <td className="px-4 py-3 text-gray-600">{row.citations}</td>
                <td className={`px-4 py-3 font-semibold ${healthColor(row.citation_health)}`}>
                  {row.citation_health !== null ? `${row.citation_health}%` : '—'}
                </td>
                <td className="px-4 py-3">
                  <button className="text-xs text-brand-600 hover:underline">
                    {selectedId === row.id ? 'Close ▲' : 'View ▼'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail panel */}
      {detail && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{detail.location.store_name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {[detail.location.address, detail.location.city].filter(Boolean).join(', ')}
                {detail.location.phone && ` · ${detail.location.phone}`}
              </p>
            </div>
            {detail.location.funnel_slug && (
              <a
                href={`${window.location.origin}/r/${detail.location.funnel_slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-600 hover:underline border border-brand-200 rounded-lg px-3 py-1.5"
              >
                Review Funnel ↗
              </a>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{detail.reviews.total}</p>
              <p className="text-xs text-gray-500 mt-1">Total Reviews</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${ratingColor(detail.reviews.avg_rating)}`}>
                {detail.reviews.avg_rating ? `${detail.reviews.avg_rating}⭐` : '—'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Avg Rating</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{detail.reviews.routed_pct}%</p>
              <p className="text-xs text-gray-500 mt-1">Routed to Google</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${healthColor(detail.citations.health_pct)}`}>
                {detail.citations.health_pct !== null ? `${detail.citations.health_pct}%` : '—'}
              </p>
              <p className="text-xs text-gray-500 mt-1">NAP Health</p>
            </div>
          </div>

          {Object.keys(detail.insights).length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">GBP Insights</h3>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {Object.entries(detail.insights).map(([metric, value]) => (
                  <div key={metric} className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-blue-700">{value.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-blue-500 mt-0.5">{INSIGHT_LABELS[metric] ?? metric}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="border border-gray-200 rounded-lg p-3">
              <p className="text-lg font-bold text-gray-800">{detail.citations.total}</p>
              <p className="text-xs text-gray-500">Citations tracked</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-3">
              <p className="text-lg font-bold text-gray-800">{detail.citations.consistent}</p>
              <p className="text-xs text-gray-500">NAP consistent</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-3">
              <p className="text-lg font-bold text-gray-800">{detail.competitors.total}</p>
              <p className="text-xs text-gray-500">Competitors tracked</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
