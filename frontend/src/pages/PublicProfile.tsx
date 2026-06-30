import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../api/client'

interface PublicBiz {
  business_name: string
  logo_url: string | null
  brand_color: string
  funnel_url: string
  location: {
    store_name: string
    address: string
    city: string | null
    state: string | null
    country: string
    phone: string | null
    website: string | null
    google_review_url: string | null
  }
  stats: {
    total_reviews: number
    avg_rating: number | null
    star_distribution: Record<string, number>
  }
  reviews: {
    id: string
    reviewer_name: string
    rating: number
    comment: string | null
    ai_response: string | null
    sentiment: string | null
    created_at: string | null
  }[]
}

function Stars({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-xl' : 'text-sm'
  return (
    <span className={sz}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= rating ? 'text-amber-400' : 'text-gray-200'}>★</span>
      ))}
    </span>
  )
}

function RatingBar({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = total ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-3 text-right text-gray-500 font-medium">{star}</span>
      <span className="text-amber-400 text-xs">★</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-right text-xs text-gray-400">{count}</span>
    </div>
  )
}

export default function PublicProfile() {
  const { slug } = useParams<{ slug: string }>()

  const { data, isLoading, isError } = useQuery<PublicBiz>({
    queryKey: ['public-biz', slug],
    queryFn: () => api.get(`/api/v1/public/biz/${slug}`).then(r => r.data),
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-2xl font-bold text-gray-700">Business not found</p>
        <p className="text-gray-400">This profile page doesn't exist or hasn't been set up yet.</p>
      </div>
    )
  }

  const { business_name, logo_url, brand_color, funnel_url, location, stats, reviews } = data
  const fullAddress = [location.address, location.city, location.state].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{ backgroundColor: brand_color }} className="py-10 px-4">
        <div className="max-w-3xl mx-auto flex items-center gap-5">
          {logo_url ? (
            <img src={logo_url} alt={business_name} className="w-16 h-16 rounded-2xl object-contain bg-white p-1 shadow" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white text-2xl font-bold">
              {business_name[0]}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">{business_name}</h1>
            <p className="text-white/80 text-sm mt-0.5">{location.store_name}</p>
            {fullAddress && <p className="text-white/60 text-xs mt-0.5">{fullAddress}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Rating summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="text-center sm:border-r sm:pr-6 sm:border-gray-100">
              <p className="text-6xl font-black text-gray-900 leading-none">
                {stats.avg_rating ?? '—'}
              </p>
              <Stars rating={Math.round(stats.avg_rating ?? 0)} size="lg" />
              <p className="text-sm text-gray-400 mt-1">{stats.total_reviews} reviews</p>
            </div>
            <div className="flex-1 w-full space-y-1.5">
              {[5, 4, 3, 2, 1].map(s => (
                <RatingBar
                  key={s}
                  star={s}
                  count={stats.star_distribution[String(s)] ?? 0}
                  total={stats.total_reviews}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Contact info */}
        {(location.phone || location.website || location.google_review_url) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Contact</h2>
            <div className="flex flex-wrap gap-3">
              {location.phone && (
                <a href={`tel:${location.phone}`}
                  className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600 border border-gray-200 rounded-lg px-3 py-2">
                  📞 {location.phone}
                </a>
              )}
              {location.website && (
                <a href={location.website} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600 border border-gray-200 rounded-lg px-3 py-2">
                  🌐 Website
                </a>
              )}
              {location.google_review_url && (
                <a href={location.google_review_url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600 border border-gray-200 rounded-lg px-3 py-2">
                  📍 Google Maps
                </a>
              )}
            </div>
          </div>
        )}

        {/* Write a review CTA */}
        <Link
          to={funnel_url}
          style={{ backgroundColor: brand_color }}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-white font-semibold text-base shadow-sm hover:opacity-90 transition-opacity"
        >
          ★ Write a Review
        </Link>

        {/* Reviews list */}
        {reviews.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-700">What customers say</h2>
            {reviews.map(r => (
              <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{r.reviewer_name}</p>
                    <Stars rating={r.rating} size="sm" />
                  </div>
                  {r.created_at && (
                    <p className="text-xs text-gray-400">
                      {new Date(r.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
                {r.comment && <p className="text-gray-700 text-sm mt-2 leading-relaxed">{r.comment}</p>}
                {r.ai_response && (
                  <div className="mt-3 pl-3 border-l-2 border-gray-200">
                    <p className="text-xs text-gray-500 font-semibold mb-1">Response from owner</p>
                    <p className="text-gray-600 text-sm leading-relaxed">{r.ai_response}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-300 py-4">
          Powered by <span className="font-semibold">LocalApex</span>
        </p>
      </div>
    </div>
  )
}
