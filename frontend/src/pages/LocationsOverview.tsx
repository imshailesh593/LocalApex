import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useLocations } from '../hooks/useLocations'
import { reviewsApi } from '../api/endpoints'
import type { Location } from '../types/api'

interface HealthScore {
  score: number
  grade: string
  avg_rating: number
  total_reviews: number
  response_rate: number
  citation_health: number
}

function HealthCard({ location }: { location: Location }) {
  const { data: health } = useQuery<HealthScore>({
    queryKey: ['location-health', location.id],
    queryFn: () => reviewsApi.healthScore(location.id).then(r => r.data),
    staleTime: 5 * 60_000,
  })

  const grade = health?.grade ?? '—'
  const score = health?.score ?? 0

  const gradeStyle =
    grade === 'A' ? 'bg-green-500' : grade === 'B' ? 'bg-blue-500' :
    grade === 'C' ? 'bg-yellow-500' : grade === 'D' ? 'bg-red-500' : 'bg-gray-300'

  const barColor =
    grade === 'A' ? 'bg-green-500' : grade === 'B' ? 'bg-blue-500' :
    grade === 'C' ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <Link
      to={`/locations/${location.id}`}
      className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-brand-200 transition-all block"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{location.store_name}</p>
          <p className="text-xs text-gray-400 truncate mt-0.5">{location.address}{location.city ? `, ${location.city}` : ''}</p>
        </div>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ml-3 flex-shrink-0 ${gradeStyle}`}>
          {grade}
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">Health score</span>
          <span className="text-xs font-bold text-gray-800">{score}/100</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${score}%` }} />
        </div>
      </div>

      {health && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-50 rounded-lg py-2">
            <p className="text-sm font-bold text-gray-900">{health.avg_rating > 0 ? health.avg_rating : '—'}</p>
            <p className="text-xs text-gray-400">Avg ★</p>
          </div>
          <div className="bg-gray-50 rounded-lg py-2">
            <p className="text-sm font-bold text-gray-900">{health.response_rate}%</p>
            <p className="text-xs text-gray-400">Responded</p>
          </div>
          <div className="bg-gray-50 rounded-lg py-2">
            <p className="text-sm font-bold text-gray-900">{health.total_reviews}</p>
            <p className="text-xs text-gray-400">Reviews</p>
          </div>
        </div>
      )}

      {!health && (
        <div className="grid grid-cols-3 gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      )}
    </Link>
  )
}

export default function LocationsOverview() {
  const { data: locations = [], isLoading } = useLocations()

  if (isLoading) return <div className="py-16 text-center text-gray-400">Loading…</div>

  const avgHealthQuery = useQuery<HealthScore[]>({
    queryKey: ['all-health'],
    queryFn: async () => {
      const results = await Promise.all(
        locations.map(l => reviewsApi.healthScore(l.id).then(r => r.data as HealthScore).catch(() => null))
      )
      return results.filter(Boolean) as HealthScore[]
    },
    enabled: locations.length > 0,
    staleTime: 5 * 60_000,
  })

  const allHealth = avgHealthQuery.data ?? []
  const portfolioScore = allHealth.length
    ? Math.round(allHealth.reduce((s, h) => s + h.score, 0) / allHealth.length)
    : null

  const gradeCount = { A: 0, B: 0, C: 0, D: 0 }
  allHealth.forEach(h => { if (h.grade in gradeCount) gradeCount[h.grade as keyof typeof gradeCount]++ })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Locations Overview</h1>
        <Link to="/locations" className="text-sm text-brand-600 hover:underline">Manage locations →</Link>
      </div>

      {/* Portfolio summary */}
      {portfolioScore !== null && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Portfolio Health</p>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-gray-900">{portfolioScore}</p>
              <p className="text-xs text-gray-400">avg score</p>
            </div>
            <div className="flex-1 grid grid-cols-4 gap-3">
              {(['A', 'B', 'C', 'D'] as const).map(g => (
                <div key={g} className="text-center bg-gray-50 rounded-lg py-2">
                  <p className="text-xl font-bold text-gray-900">{gradeCount[g]}</p>
                  <p className="text-xs text-gray-400">Grade {g}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {locations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
          No locations yet.{' '}
          <Link to="/locations" className="text-brand-600 hover:underline">Add your first location.</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {locations.map(l => <HealthCard key={l.id} location={l} />)}
        </div>
      )}
    </div>
  )
}
