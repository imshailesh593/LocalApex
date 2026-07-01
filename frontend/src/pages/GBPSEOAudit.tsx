import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../api/client'

interface AuditCheck {
  id: string
  category: string
  title: string
  status: 'pass' | 'warn' | 'fail'
  detail: string
  impact: string
  action: string | null
  weight: number
  score: number
}

interface CategoryScore {
  score: number
  max: number
  pct: number
  checks: AuditCheck[]
}

interface AuditResult {
  location: { id: string; name: string; city: string }
  score: number
  grade: string
  total_checks: number
  passed: number
  failed: number
  warnings: number
  categories: Record<string, CategoryScore>
  priority_actions: AuditCheck[]
}

const STATUS_ICON = { pass: '✓', warn: '⚠', fail: '✗' }
const STATUS_COLOR = {
  pass: 'text-green-600 bg-green-50 border-green-200',
  warn: 'text-amber-600 bg-amber-50 border-amber-200',
  fail: 'text-red-500 bg-red-50 border-red-200',
}
const IMPACT_COLOR: Record<string, string> = {
  High: 'text-red-500 bg-red-50',
  Medium: 'text-amber-600 bg-amber-50',
  Low: 'text-gray-500 bg-gray-50',
}
const CATEGORY_ICONS: Record<string, string> = {
  Relevance: '🎯',
  Prominence: '⭐',
  Activity: '⚡',
}
const GRADE_COLOR: Record<string, string> = {
  A: 'text-green-600', B: 'text-blue-600', C: 'text-amber-500', D: 'text-orange-500', F: 'text-red-600',
}

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const r = 54, circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#f3f4f6" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none"
          stroke={score >= 75 ? '#16a34a' : score >= 60 ? '#2563eb' : score >= 40 ? '#d97706' : '#ef4444'}
          strokeWidth="10" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-black ${GRADE_COLOR[grade]}`}>{grade}</span>
        <span className="text-sm font-bold text-gray-600">{score}/100</span>
      </div>
    </div>
  )
}

function CategoryBar({ name, data }: { name: string; data: CategoryScore }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-700">{CATEGORY_ICONS[name]} {name}</span>
        <span className="text-sm font-bold text-gray-700">{data.pct}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all ${data.pct >= 75 ? 'bg-green-500' : data.pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
          style={{ width: `${data.pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1">{data.score}/{data.max} points</p>
    </div>
  )
}

export default function GBPSEOAudit() {
  const { id: locationId } = useParams<{ id: string }>()

  const { data, isLoading, isError, error } = useQuery<AuditResult>({
    queryKey: ['seo-audit', locationId],
    queryFn: () => api.get(`/gbp/locations/${locationId}/seo-audit`).then(r => r.data),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Local SEO Audit</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Scores your listing across Relevance, Prominence, and Activity — the 3 Google local ranking factors
          </p>
        </div>
        <Link to={`/locations/${locationId}`} className="text-sm text-gray-400 hover:text-gray-600">← Location</Link>
      </div>

      {isLoading && (
        <div className="py-20 text-center text-gray-400">
          <p className="text-3xl mb-3">🔍</p>
          <p className="font-medium">Running SEO audit…</p>
          <p className="text-sm mt-1">Checking profile, reviews, photos, Q&A, and more</p>
        </div>
      )}

      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
          <p className="text-red-600 font-medium">Could not run audit</p>
          <p className="text-sm text-gray-500 mt-1">{(error as any)?.response?.data?.detail ?? 'Make sure this location is linked to Google Business Profile.'}</p>
        </div>
      )}

      {data && (
        <>
          {/* Score card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="text-center">
                <ScoreRing score={data.score} grade={data.grade} />
                <p className="text-sm text-gray-500 mt-3">
                  {data.score >= 75 ? 'Great — keep optimising' : data.score >= 60 ? 'Good — a few things to fix' : data.score >= 40 ? 'Needs work — act on the list below' : 'Critical — take action now'}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-2xl font-bold text-green-600">{data.passed}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Passed</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-2xl font-bold text-amber-500">{data.warnings}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Warnings</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3">
                  <p className="text-2xl font-bold text-red-500">{data.failed}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Failed</p>
                </div>
              </div>

              <div className="space-y-4">
                {Object.entries(data.categories).map(([name, cat]) => (
                  <CategoryBar key={name} name={name} data={cat} />
                ))}
              </div>
            </div>
          </div>

          {/* Priority action list */}
          {data.priority_actions.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800">Priority Actions</h2>
                <p className="text-xs text-gray-400 mt-0.5">Fix these in order — highest impact first</p>
              </div>
              <div className="divide-y divide-gray-50">
                {data.priority_actions.map((action) => (
                  <div key={action.id} className="px-5 py-4 flex items-start gap-4">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 border ${STATUS_COLOR[action.status]}`}>
                      {STATUS_ICON[action.status]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-semibold text-gray-800">{action.title}</p>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${IMPACT_COLOR[action.impact]}`}>
                          {action.impact} impact
                        </span>
                        <span className="text-xs text-gray-400">{action.category}</span>
                      </div>
                      <p className="text-sm text-gray-600">{action.action}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {action.id === 'description' && (
                        <Link to={`/locations/${locationId}/profile`}
                          className="text-xs text-brand-600 hover:underline font-medium">Fix →</Link>
                      )}
                      {action.id === 'review_count' && (
                        <Link to="/campaigns"
                          className="text-xs text-brand-600 hover:underline font-medium">Campaigns →</Link>
                      )}
                      {action.id === 'response_rate' && (
                        <Link to={`/locations/${locationId}/reviews`}
                          className="text-xs text-brand-600 hover:underline font-medium">Reply →</Link>
                      )}
                      {(action.id === 'photos' || action.id === 'cover_photo') && (
                        <Link to={`/locations/${locationId}/photos`}
                          className="text-xs text-brand-600 hover:underline font-medium">Upload →</Link>
                      )}
                      {action.id === 'qa' && (
                        <Link to={`/locations/${locationId}/questions`}
                          className="text-xs text-brand-600 hover:underline font-medium">Answer →</Link>
                      )}
                      {action.id === 'cta_links' && (
                        <Link to={`/locations/${locationId}/settings`}
                          className="text-xs text-brand-600 hover:underline font-medium">Add →</Link>
                      )}
                      {(action.id === 'hours' || action.id === 'website' || action.id === 'phone' || action.id === 'services' || action.id === 'category') && (
                        <Link to={`/locations/${locationId}/profile`}
                          className="text-xs text-brand-600 hover:underline font-medium">Edit →</Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full checklist by category */}
          {Object.entries(data.categories).map(([catName, cat]) => (
            <div key={catName} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-800">{CATEGORY_ICONS[catName]} {catName}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {catName === 'Relevance' && 'How well your listing matches what customers search for'}
                    {catName === 'Prominence' && 'How trusted and well-known your business appears to Google'}
                    {catName === 'Activity' && 'How actively maintained your listing is'}
                  </p>
                </div>
                <div className={`text-lg font-black ${cat.pct >= 75 ? 'text-green-600' : cat.pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                  {cat.pct}%
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {cat.checks.map(check => (
                  <div key={check.id} className="px-5 py-3.5 flex items-center gap-4">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 ${STATUS_COLOR[check.status]}`}>
                      {STATUS_ICON[check.status]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{check.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{check.detail}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-gray-500">{check.score}/{check.weight} pts</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
