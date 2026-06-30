import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { widgetApi } from '../api/endpoints'

interface WidgetData {
  business_name: string
  logo_url: string | null
  avg_rating: number
  total_reviews: number
  star_distribution: Record<string, number>
  funnel_url: string
}

export default function WidgetEmbed() {
  const { slug } = useParams<{ slug: string }>()
  const { data, isLoading, isError } = useQuery<WidgetData>({
    queryKey: ['widget', slug],
    queryFn: () => widgetApi.data(slug!).then(r => r.data),
    enabled: !!slug,
    staleTime: 60_000,
  })

  if (isLoading) return <div className="p-4 text-sm text-gray-400">Loading…</div>
  if (isError || !data) return <div className="p-4 text-sm text-red-400">Widget not found.</div>

  const dist = data.star_distribution
  const maxCount = Math.max(...Object.values(dist).map(Number), 1)

  return (
    <div className="min-h-screen bg-transparent flex items-start justify-start p-2">
      <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm w-full max-w-xs">
        {data.logo_url && (
          <img src={data.logo_url} alt="Logo" className="h-8 object-contain mb-3" />
        )}
        <p className="text-sm font-semibold text-gray-700 mb-3">{data.business_name}</p>

        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-4xl font-bold text-gray-900">{data.avg_rating}</span>
          <span className="text-yellow-400 text-xl">
            {'★'.repeat(Math.round(data.avg_rating))}
            {'☆'.repeat(5 - Math.round(data.avg_rating))}
          </span>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          {data.total_reviews} review{data.total_reviews !== 1 ? 's' : ''}
        </p>

        <div className="space-y-1.5 mb-5">
          {[5, 4, 3, 2, 1].map(star => {
            const count = Number(dist[star] ?? 0)
            const pct = Math.round((count / maxCount) * 100)
            const color = star >= 4 ? '#22c55e' : star === 3 ? '#eab308' : '#ef4444'
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-5 text-right">{star}★</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div style={{ width: `${pct}%`, background: color }} className="h-full rounded-full transition-all" />
                </div>
                <span className="text-xs text-gray-400 w-4">{count}</span>
              </div>
            )
          })}
        </div>

        <a
          href={data.funnel_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center bg-brand-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-700 transition-colors"
        >
          Leave a Review →
        </a>
      </div>
    </div>
  )
}
