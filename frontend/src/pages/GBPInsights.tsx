import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import api from '../api/client'

interface MetricSeries {
  metric: string
  label: string
  total: number
  change_pct: number
  daily: { date: string; value: number }[]
}

interface InsightsData {
  location_name: string
  period_days: number
  start_date: string
  end_date: string
  summary: {
    total_views: number
    total_searches: number
    total_map_views: number
    total_calls: number
    total_website_clicks: number
    total_directions: number
  }
  metrics: MetricSeries[]
}

const METRIC_ICONS: Record<string, string> = {
  BUSINESS_IMPRESSIONS_DESKTOP_MAPS: '🗺️',
  BUSINESS_IMPRESSIONS_DESKTOP_SEARCH: '🔍',
  BUSINESS_IMPRESSIONS_MOBILE_MAPS: '📱',
  BUSINESS_IMPRESSIONS_MOBILE_SEARCH: '🔎',
  CALL_CLICKS: '📞',
  WEBSITE_CLICKS: '🌐',
  BUSINESS_DIRECTION_REQUESTS: '📍',
  BUSINESS_BOOKINGS: '📅',
  BUSINESS_FOOD_ORDERS: '🍽️',
}

const METRIC_COLORS: Record<string, string> = {
  BUSINESS_IMPRESSIONS_DESKTOP_MAPS: '#3b82f6',
  BUSINESS_IMPRESSIONS_DESKTOP_SEARCH: '#8b5cf6',
  BUSINESS_IMPRESSIONS_MOBILE_MAPS: '#06b6d4',
  BUSINESS_IMPRESSIONS_MOBILE_SEARCH: '#a855f7',
  CALL_CLICKS: '#10b981',
  WEBSITE_CLICKS: '#f59e0b',
  BUSINESS_DIRECTION_REQUESTS: '#ef4444',
  BUSINESS_BOOKINGS: '#ec4899',
  BUSINESS_FOOD_ORDERS: '#f97316',
}

function ChangeChip({ pct }: { pct: number }) {
  if (pct === 0) return <span className="text-xs text-gray-400">No change</span>
  const up = pct > 0
  return (
    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${up ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct)}%
    </span>
  )
}

// Merge multiple daily series into one chart-ready array
function mergeSeries(series: MetricSeries[]): { date: string; [key: string]: any }[] {
  const dateMap: Record<string, any> = {}
  for (const s of series) {
    for (const point of s.daily) {
      if (!dateMap[point.date]) dateMap[point.date] = { date: point.date.slice(5) } // MM-DD
      dateMap[point.date][s.metric] = point.value
    }
  }
  return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date))
}

export default function GBPInsights() {
  const { id: locationId } = useParams<{ id: string }>()
  const [days, setDays] = useState(90)
  const [activeMetric, setActiveMetric] = useState<string | null>(null)

  const { data, isLoading, isError, error } = useQuery<InsightsData>({
    queryKey: ['gbp-insights', locationId, days],
    queryFn: () => api.get(`/gbp/locations/${locationId}/insights`, { params: { days } }).then(r => r.data),
    retry: false,
  })

  const viewMetrics = data?.metrics.filter(m =>
    m.metric.startsWith('BUSINESS_IMPRESSIONS')
  ) ?? []
  const actionMetrics = data?.metrics.filter(m =>
    !m.metric.startsWith('BUSINESS_IMPRESSIONS')
  ) ?? []

  const viewsChartData = mergeSeries(viewMetrics)
  const actionsChartData = mergeSeries(actionMetrics)

  const selectedSeries = activeMetric
    ? data?.metrics.find(m => m.metric === activeMetric)
    : null

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">GBP Insights</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data ? `${data.location_name} · ${data.start_date} → ${data.end_date}` : 'Real performance data from Google Business Profile'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/locations/${locationId}`} className="text-sm text-gray-400 hover:text-gray-600">← Location</Link>
          <select value={days} onChange={e => setDays(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 6 months</option>
            <option value={365}>Last 12 months</option>
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="py-20 text-center text-gray-400">
          <p className="text-2xl mb-2">📊</p>
          <p>Fetching insights from Google…</p>
        </div>
      )}

      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
          <p className="text-red-600 font-medium">Could not load insights</p>
          <p className="text-sm text-gray-500 mt-1">{(error as any)?.response?.data?.detail ?? 'Make sure this location is linked to Google Business Profile and the Business Profile Performance API is enabled in Google Cloud.'}</p>
        </div>
      )}

      {data && (
        <>
          {/* Summary KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total Views', value: data.summary.total_views, icon: '👁️', color: 'text-blue-600' },
              { label: 'Search Views', value: data.summary.total_searches, icon: '🔍', color: 'text-purple-600' },
              { label: 'Map Views', value: data.summary.total_map_views, icon: '🗺️', color: 'text-cyan-600' },
              { label: 'Phone Calls', value: data.summary.total_calls, icon: '📞', color: 'text-green-600' },
              { label: 'Website Clicks', value: data.summary.total_website_clicks, icon: '🌐', color: 'text-amber-600' },
              { label: 'Directions', value: data.summary.total_directions, icon: '📍', color: 'text-red-500' },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span>{card.icon}</span>
                  <p className="text-xs text-gray-400 font-medium">{card.label}</p>
                </div>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value.toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* Views chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Profile Views Over Time</h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={viewsChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickCount={8} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                {viewMetrics.map(m => (
                  <Area key={m.metric} type="monotone" dataKey={m.metric}
                    name={m.label} stackId="1"
                    stroke={METRIC_COLORS[m.metric]} fill={METRIC_COLORS[m.metric]}
                    fillOpacity={0.15} strokeWidth={1.5} dot={false} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Actions chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Customer Actions Over Time</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={actionsChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickCount={8} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                {actionMetrics.filter(m => m.total > 0).map(m => (
                  <Bar key={m.metric} dataKey={m.metric} name={m.label}
                    fill={METRIC_COLORS[m.metric]} radius={[2, 2, 0, 0]} maxBarSize={20} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Individual metric cards */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">All Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.metrics.map(m => (
                <button key={m.metric}
                  onClick={() => setActiveMetric(activeMetric === m.metric ? null : m.metric)}
                  className={`bg-white rounded-xl border p-4 text-left hover:shadow-sm transition-all ${activeMetric === m.metric ? 'border-brand-400 ring-1 ring-brand-300' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{METRIC_ICONS[m.metric]}</span>
                      <span className="text-sm font-medium text-gray-700">{m.label}</span>
                    </div>
                    <ChangeChip pct={m.change_pct} />
                  </div>
                  <p className="text-2xl font-bold" style={{ color: METRIC_COLORS[m.metric] }}>
                    {m.total.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">last {days} days</p>

                  {/* Mini sparkline */}
                  <div className="mt-3 h-14">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={m.daily.map(d => ({ date: d.date.slice(5), v: d.value }))}>
                        <Area type="monotone" dataKey="v" stroke={METRIC_COLORS[m.metric]}
                          fill={METRIC_COLORS[m.metric]} fillOpacity={0.1} strokeWidth={1.5} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Drilldown for selected metric */}
          {selectedSeries && (
            <div className="bg-white rounded-xl border border-brand-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                {METRIC_ICONS[selectedSeries.metric]} {selectedSeries.label} — Daily Breakdown
              </h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={selectedSeries.daily.map(d => ({ date: d.date.slice(5), value: d.value }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickCount={10} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill={METRIC_COLORS[selectedSeries.metric]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}
