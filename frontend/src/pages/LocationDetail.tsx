import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../api/client'
import { citationsApi, reviewsApi } from '../api/endpoints'

interface HealthScore {
  score: number; grade: string; avg_rating: number
  total_reviews: number; response_rate: number; citation_health: number
}

const API_BASE = 'http://localhost:8000/api/v1'

interface LocationReport {
  location: {
    id: string; store_name: string; address: string; city: string | null
    phone: string | null; funnel_slug: string | null; google_review_url: string | null
  }
  reviews: { total: number; avg_rating: number | null; routed: number; routed_pct: number }
  citations: { total: number; consistent: number; health_pct: number | null }
  competitors: { total: number }
  insights: Record<string, number>
}

interface Review {
  id: string; reviewer_name: string | null; rating: number; comment: string | null
  status: string; is_routed: boolean; created_at: string
}

interface Citation {
  id: string; platform: string; listed_name: string | null; status: string; nap_issues: string | null
}

type Tab = 'overview' | 'reviews' | 'citations' | 'qr'

const star = (n: number) => '⭐'.repeat(n)
const statusColor: Record<string, string> = {
  consistent: 'text-green-600 bg-green-50',
  inconsistent: 'text-red-600 bg-red-50',
  missing: 'text-yellow-600 bg-yellow-50',
  unchecked: 'text-gray-500 bg-gray-100',
}

export default function LocationDetail() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<Tab>('overview')

  const { data: report, isLoading } = useQuery<LocationReport>({
    queryKey: ['location-report', id],
    queryFn: () => api.get(`/reports/location/${id}`).then(r => r.data),
    enabled: !!id,
  })

  const { data: health } = useQuery<HealthScore>({
    queryKey: ['location-health', id],
    queryFn: () => reviewsApi.healthScore(id!).then(r => r.data),
    enabled: !!id,
  })

  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: ['reviews', id],
    queryFn: () => reviewsApi.list({ location_id: id!, per_page: 50 }).then(r => r.data),
    enabled: !!id && tab === 'reviews',
  })

  const { data: citations = [] } = useQuery<Citation[]>({
    queryKey: ['citations', id],
    queryFn: () => citationsApi.list({ location_id: id!, per_page: 100 }).then(r => r.data),
    enabled: !!id && tab === 'citations',
  })

  if (isLoading) return <div className="text-center py-16 text-gray-400">Loading…</div>
  if (!report) return <div className="text-center py-16 text-gray-400">Location not found.</div>

  const { location, reviews: rv, citations: ct, insights } = report

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'reviews', label: `Reviews (${rv.total})` },
    { key: 'citations', label: `Citations (${ct.total})` },
    { key: 'qr', label: 'QR Code' },
  ]

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to="/locations" className="hover:text-gray-600">Locations</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">{location.store_name}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{location.store_name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {[location.address, location.city].filter(Boolean).join(', ')}
              {location.phone && <span className="ml-3">· {location.phone}</span>}
            </p>
            {location.funnel_slug && (
              <span className="inline-block mt-2 text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded font-mono">
                /r/{location.funnel_slug}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {location.google_review_url && (
              <a href={location.google_review_url} target="_blank" rel="noreferrer"
                className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                Google listing ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Health score */}
          {health && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-6">
              <div className="flex-shrink-0 text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white ${
                  health.grade === 'A' ? 'bg-green-500' : health.grade === 'B' ? 'bg-blue-500' : health.grade === 'C' ? 'bg-yellow-500' : 'bg-red-500'
                }`}>
                  {health.grade}
                </div>
                <p className="text-xs text-gray-400 mt-1">Health</p>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-700">Overall Score</span>
                  <span className="text-lg font-bold text-gray-900">{health.score}/100</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all ${health.grade === 'A' ? 'bg-green-500' : health.grade === 'B' ? 'bg-blue-500' : health.grade === 'C' ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${health.score}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs text-gray-500">
                  <span>Response rate: <b className="text-gray-800">{health.response_rate}%</b></span>
                  <span>Citation health: <b className="text-gray-800">{health.citation_health}%</b></span>
                  <span>Reviews: <b className="text-gray-800">{health.total_reviews}</b></span>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Reviews', value: rv.total, icon: '💬' },
              { label: 'Avg Rating', value: rv.avg_rating ? `${rv.avg_rating}⭐` : '—', icon: '⭐' },
              { label: 'Routed to Google', value: `${rv.routed} (${rv.routed_pct}%)`, icon: '✅' },
              { label: 'NAP Health', value: ct.health_pct != null ? `${ct.health_pct}%` : '—', icon: '📋' },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-400 font-medium mb-1">{c.label}</p>
                <p className="text-2xl font-bold text-gray-900">{String(c.value)}</p>
              </div>
            ))}
          </div>

          {Object.keys(insights).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">GBP Insights (all-time)</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(insights).map(([k, v]) => (
                  <div key={k} className="bg-gray-50 rounded-lg px-4 py-3">
                    <p className="text-xs text-gray-400 capitalize">{k}</p>
                    <p className="text-lg font-bold text-gray-900 mt-0.5">{v.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reviews tab */}
      {tab === 'reviews' && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {reviews.length === 0
            ? <p className="text-center py-12 text-gray-400 text-sm">No reviews yet for this location.</p>
            : reviews.map(r => (
              <div key={r.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">{r.reviewer_name ?? 'Anonymous'}</span>
                    <span className="text-sm">{star(r.rating)}</span>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2">{r.comment ?? '—'}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.is_routed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {r.is_routed ? 'Routed' : 'Captured'}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">{r.created_at.slice(0, 10)}</p>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* Citations tab */}
      {tab === 'citations' && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {citations.length === 0
            ? <p className="text-center py-12 text-gray-400 text-sm">No citations tracked for this location.</p>
            : citations.map(c => (
              <div key={c.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{c.platform}</p>
                  {c.listed_name && <p className="text-xs text-gray-400">{c.listed_name}</p>}
                </div>
                <div className="flex items-center gap-3">
                  {c.nap_issues && <p className="text-xs text-red-500 max-w-[160px] text-right">{c.nap_issues}</p>}
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[c.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {c.status}
                  </span>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* Google Business Profile management hub */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-0">
          {[
            { to: `/locations/${id}/insights`, icon: '📊', title: 'Insights', desc: 'Views, searches, calls, clicks & directions' },
            { to: `/locations/${id}/reviews`, icon: '⭐', title: 'Google Reviews', desc: 'Sync, view & reply to real Google reviews' },
            { to: `/locations/${id}/photos`, icon: '🖼️', title: 'Photos', desc: 'Upload & manage photos on your GBP listing' },
            { to: `/locations/${id}/profile`, icon: '✏️', title: 'Profile & SEO', desc: 'Edit hours, description, categories & labels' },
          ].map(card => (
            <Link key={card.to} to={card.to}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:border-brand-300 hover:shadow-sm transition-all flex items-start gap-3">
              <span className="text-2xl mt-0.5">{card.icon}</span>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{card.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{card.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* QR Code tab */}
      {tab === 'qr' && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col items-center gap-5">
          {location.funnel_slug ? (
            <>
              <p className="text-sm text-gray-500 text-center">
                Print and display this QR code on receipts, menus, or your counter.<br />
                Customers scan it to leave a review.
              </p>
              <img
                src={`${API_BASE}/locations/${id}/qrcode`}
                alt="Review funnel QR code"
                className="w-56 h-56 rounded-xl border border-gray-200 p-2"
                style={{ imageRendering: 'pixelated' }}
              />
              <p className="text-xs font-mono text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg">
                {window.location.origin}/r/{location.funnel_slug}
              </p>
              <a
                href={`${API_BASE}/locations/${id}/qrcode`}
                download={`qr-${location.funnel_slug}.png`}
                className="bg-brand-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-brand-700 transition"
              >
                Download PNG
              </a>

              {/* Embed snippet */}
              <div className="w-full max-w-md border border-gray-200 rounded-xl p-4 bg-gray-50 text-left">
                <p className="text-xs font-semibold text-gray-500 mb-2">Website embed snippet</p>
                <code className="text-xs text-gray-700 break-all whitespace-pre-wrap block mb-3">
                  {`<iframe src="${window.location.origin}/widget/${location.funnel_slug}" width="300" height="320" frameborder="0" style="border:none;border-radius:12px"></iframe>`}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `<iframe src="${window.location.origin}/widget/${location.funnel_slug}" width="300" height="320" frameborder="0" style="border:none;border-radius:12px"></iframe>`
                    )
                  }}
                  className="text-xs text-brand-600 hover:underline font-medium"
                >
                  Copy snippet
                </button>
              </div>

              {/* Public profile link */}
              <div className="w-full max-w-md border border-gray-200 rounded-xl p-4 bg-gray-50 text-left">
                <p className="text-xs font-semibold text-gray-500 mb-2">Public business profile</p>
                <code className="text-xs text-gray-700 break-all block mb-3">
                  {`${window.location.origin}/biz/${location.funnel_slug}`}
                </code>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/biz/${location.funnel_slug}`)}
                    className="text-xs text-brand-600 hover:underline font-medium"
                  >
                    Copy link
                  </button>
                  <a
                    href={`/biz/${location.funnel_slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-gray-500 hover:underline"
                  >
                    Preview →
                  </a>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center space-y-2">
              <p className="text-4xl">🔗</p>
              <p className="text-gray-600 font-medium">No funnel slug set</p>
              <p className="text-sm text-gray-400">Add a funnel slug to this location in the Locations tab to generate a QR code.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
