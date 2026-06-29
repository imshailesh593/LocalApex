import { useRef, useState } from 'react'
import { useInsights, useRecordInsight, useInsightTimeseries, useImportInsightCsv } from '../hooks/useInsights'
import { useReviews } from '../hooks/useReviews'
import { useLocations } from '../hooks/useLocations'
import StatCard from '../components/ui/StatCard'
import type { InsightSummary } from '../types/api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid,
} from 'recharts'

const METRICS = ['views', 'searches', 'clicks', 'calls', 'directions', 'bookings'] as const
type Metric = typeof METRICS[number]

const METRIC_COLORS: Record<string, string> = {
  views: '#2563eb', searches: '#7c3aed', clicks: '#0891b2',
  calls: '#059669', directions: '#d97706', bookings: '#dc2626',
}

const today = new Date().toISOString().split('T')[0]
const thirtyDaysAgo = new Date(Date.now() - 29 * 86400000).toISOString().split('T')[0]

export default function Dashboard() {
  const { data: locations = [] } = useLocations()
  const { data: reviews = [] } = useReviews()
  const [locationFilter, setLocationFilter] = useState('')
  const { data: insights = [] } = useInsights(locationFilter || undefined)
  const recordInsight = useRecordInsight()
  const importCsv = useImportInsightCsv()

  const [tab, setTab] = useState<'overview' | 'trends'>('overview')
  const [trendMetric, setTrendMetric] = useState<Metric>('views')
  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo)
  const [dateTo, setDateTo] = useState(today)
  const { data: trendData = [] } = useInsightTimeseries(
    trendMetric, locationFilter || undefined, dateFrom, dateTo
  )

  const [showSeed, setShowSeed] = useState(false)
  const [seedForm, setSeedForm] = useState({ location_id: '', metric: 'views' as Metric, value: '', date: today })
  const [importLocId, setImportLocId] = useState('')
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null)
  const csvRef = useRef<HTMLInputElement>(null)

  const get = (metric: string) => insights.find((i: InsightSummary) => i.metric === metric)?.total ?? 0

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '—'
  const routedCount = reviews.filter(r => r.is_routed).length

  const chartData = METRICS.map(m => ({ metric: m, total: get(m) })).filter(d => d.total > 0)
  const nonZeroTrend = trendData.some(d => d.value > 0)

  const handleSeed = async (e: React.FormEvent) => {
    e.preventDefault()
    await recordInsight.mutateAsync({ ...seedForm, value: Number(seedForm.value) })
    setSeedForm({ location_id: '', metric: 'views', value: '', date: today })
  }

  const handleCsvUpload = async (file: File) => {
    if (!importLocId) return
    const result = await importCsv.mutateAsync({ locationId: importLocId, file })
    setImportResult(result)
  }

  const trendNonEmpty = trendData.filter(d => d.value > 0)
  const trendXTick = trendData.length > 14
    ? (_: unknown, i: number) => i % 7 === 0 ? trendData[i]?.date.slice(5) ?? '' : ''
    : undefined

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All locations</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.store_name}</option>)}
          </select>
          <button onClick={() => setShowSeed(!showSeed)} className="text-sm text-brand-600 hover:underline font-medium">
            + Record Insight
          </button>
          <button onClick={() => csvRef.current?.click()} className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg px-3 py-2">
            Import CSV
          </button>
          <input
            ref={csvRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleCsvUpload(e.target.files[0]); e.target.value = '' }}
          />
        </div>
      </div>

      {/* CSV import location picker */}
      {importCsv.isPending || importResult ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm">
          {importCsv.isPending ? 'Importing…' : importResult ? (
            <span>
              Imported <strong>{importResult.imported}</strong> rows.
              {importResult.errors.length > 0 && <span className="text-red-500 ml-2">{importResult.errors.length} errors.</span>}
              <button onClick={() => setImportResult(null)} className="ml-3 text-gray-400 hover:text-gray-600">Dismiss</button>
            </span>
          ) : null}
        </div>
      ) : null}

      {!importLocId && (
        <div className="hidden">
          <select value={importLocId} onChange={e => setImportLocId(e.target.value)}>
            {locations.map(l => <option key={l.id} value={l.id}>{l.store_name}</option>)}
          </select>
        </div>
      )}

      {/* CSV location picker shown when CSV button clicked */}
      {!importLocId && locations.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm flex items-center gap-3">
          <span className="text-gray-600">Select location for CSV import:</span>
          <select
            value={importLocId}
            onChange={e => setImportLocId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1 text-sm"
          >
            <option value="">Select…</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.store_name}</option>)}
          </select>
        </div>
      )}

      {showSeed && (
        <form onSubmit={handleSeed} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
            <select value={seedForm.location_id} onChange={e => setSeedForm({ ...seedForm, location_id: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm" required>
              <option value="">Select…</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.store_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Metric</label>
            <select value={seedForm.metric} onChange={e => setSeedForm({ ...seedForm, metric: e.target.value as Metric })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm capitalize">
              {METRICS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Value</label>
            <input type="number" min="0" value={seedForm.value} onChange={e => setSeedForm({ ...seedForm, value: e.target.value })}
              placeholder="e.g. 1250" className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-28" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input type="date" value={seedForm.date} onChange={e => setSeedForm({ ...seedForm, date: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm" required />
          </div>
          <button type="submit" disabled={recordInsight.isPending}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-60">
            {recordInsight.isPending ? 'Saving…' : 'Record'}
          </button>
          <button type="button" onClick={() => setShowSeed(false)} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
        </form>
      )}

      {/* Onboarding checklist — shown only while setup is incomplete */}
      {locations.length === 0 && (
        <div className="bg-gradient-to-br from-brand-50 to-indigo-50 border border-brand-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Welcome to LocalApex! Let's get you set up.</h2>
          <p className="text-sm text-gray-500 mb-4">Complete these steps to start managing your local presence.</p>
          <div className="space-y-3">
            {[
              { done: locations.length > 0, label: 'Add your first location', href: '/locations' },
              { done: false, label: 'Set a funnel slug and Google review URL', href: '/locations' },
              { done: reviews.length > 0, label: 'Collect your first review via the funnel', href: '/reviews' },
              { done: false, label: 'Track a competitor', href: '/competitors' },
              { done: false, label: 'Add a citation to monitor NAP consistency', href: '/citations' },
            ].map((step, i) => (
              <a key={i} href={step.href}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors
                  ${step.done ? 'border-green-200 bg-white opacity-60 pointer-events-none' : 'border-white bg-white hover:border-brand-300'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                  ${step.done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {step.done ? '✓' : i + 1}
                </span>
                <span className={`text-sm ${step.done ? 'line-through text-gray-400' : 'text-gray-700 font-medium'}`}>
                  {step.label}
                </span>
                {!step.done && <span className="ml-auto text-brand-500 text-sm">→</span>}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Profile Views" value={get('views').toLocaleString()} icon="👁️" />
        <StatCard label="Searches" value={get('searches').toLocaleString()} icon="🔍" />
        <StatCard label="Calls" value={get('calls').toLocaleString()} icon="📞" />
        <StatCard label="Directions" value={get('directions').toLocaleString()} icon="🗺️" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Locations" value={locations.length} icon="📍" />
        <StatCard label="Avg Rating" value={avgRating} icon="⭐" />
        <StatCard label="Reviews" value={reviews.length} icon="💬" />
        <StatCard label="Routed to Google" value={routedCount} icon="✅" />
      </div>

      {/* Review Funnel widget */}
      {reviews.length > 0 && (() => {
        const total = reviews.length
        const routed = routedCount
        const captured = total - routed
        const responded = reviews.filter(r => r.status === 'responded').length
        const steps = [
          { label: 'Reviews received', value: total, pct: 100, color: 'bg-brand-500' },
          { label: 'Routed to Google (4–5 ★)', value: routed, pct: Math.round((routed / total) * 100), color: 'bg-green-500' },
          { label: 'Captured internally (<4 ★)', value: captured, pct: Math.round((captured / total) * 100), color: 'bg-yellow-500' },
          { label: 'Responded', value: responded, pct: Math.round((responded / total) * 100), color: 'bg-purple-500' },
        ]
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Review Funnel</h2>
            <div className="space-y-2.5">
              {steps.map(s => (
                <div key={s.label}>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>{s.label}</span>
                    <span className="font-medium text-gray-700">{s.value} <span className="text-gray-400">({s.pct}%)</span></span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${s.color} rounded-full transition-all`} style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Chart tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['overview', 'trends'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize
                  ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {t}
              </button>
            ))}
          </div>

          {tab === 'trends' && (
            <div className="flex items-center gap-2 flex-wrap">
              <select value={trendMetric} onChange={e => setTrendMetric(e.target.value as Metric)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm capitalize">
                {METRICS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
              <span className="text-gray-400 text-sm">—</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
            </div>
          )}
        </div>

        {tab === 'overview' ? (
          chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 space-y-2">
              <p className="text-sm">No insight data yet.</p>
              <button onClick={() => setShowSeed(true)} className="text-xs text-brand-600 hover:underline">Record your first insight →</button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barSize={32}>
                <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => v.toLocaleString()} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {chartData.map(d => <Cell key={d.metric} fill={METRIC_COLORS[d.metric] ?? '#6b7280'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )
        ) : (
          !nonZeroTrend ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              No data for {trendMetric} in this date range.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={trendXTick ?? (v => String(v).slice(5))} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => v.toLocaleString()} labelFormatter={l => `Date: ${l}`} />
                <Line
                  type="monotone" dataKey="value" stroke={METRIC_COLORS[trendMetric] ?? '#2563eb'}
                  dot={trendNonEmpty.length < 20}
                  strokeWidth={2} activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )
        )}
      </div>

      {/* Recent reviews */}
      {reviews.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent Reviews</h2>
          <div className="divide-y divide-gray-100">
            {reviews.slice(0, 5).map(r => (
              <div key={r.id} className="py-3 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{r.reviewer_name ?? 'Anonymous'}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{r.comment ?? '—'}</p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-sm">{r.rating}⭐</span>
                  <span className={`text-xs font-medium ${r.is_routed ? 'text-green-600' : 'text-red-500'}`}>
                    {r.is_routed ? 'Routed' : 'Suppressed'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
