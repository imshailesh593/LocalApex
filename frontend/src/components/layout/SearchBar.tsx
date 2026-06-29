import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'
import { useDebounce } from '../../hooks/useDebounce'

interface SearchResult {
  id: string
  type: 'location' | 'review' | 'qa' | 'citation' | 'competitor'
  name?: string
  city?: string
  comment?: string
  rating?: number
  status?: string
  question?: string
  platform?: string
}

interface SearchResults {
  locations: SearchResult[]
  reviews: SearchResult[]
  qa: SearchResult[]
  citations: SearchResult[]
  competitors: SearchResult[]
}

const TYPE_ROUTE: Record<string, string> = {
  location: '/locations',
  review: '/reviews',
  qa: '/qa',
  citation: '/citations',
  competitor: '/competitors',
}

const TYPE_LABEL: Record<string, string> = {
  location: 'Location',
  review: 'Review',
  qa: 'Q&A',
  citation: 'Citation',
  competitor: 'Competitor',
}

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    if (debouncedQuery.length < 2) { setResults(null); return }
    setLoading(true)
    api.get('/search', { params: { q: debouncedQuery } })
      .then(r => { setResults(r.data); setOpen(true) })
      .finally(() => setLoading(false))
  }, [debouncedQuery])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const allResults: SearchResult[] = results
    ? [
        ...results.locations.map(r => ({ ...r, type: 'location' as const })),
        ...results.reviews.map(r => ({ ...r, type: 'review' as const })),
        ...results.qa.map(r => ({ ...r, type: 'qa' as const })),
        ...results.citations.map(r => ({ ...r, type: 'citation' as const })),
        ...results.competitors.map(r => ({ ...r, type: 'competitor' as const })),
      ]
    : []

  const label = (r: SearchResult) => {
    if (r.type === 'location') return `${r.name}${r.city ? `, ${r.city}` : ''}`
    if (r.type === 'review') return `${r.name ?? 'Anonymous'} — ${r.rating}⭐`
    if (r.type === 'qa') return r.question ?? ''
    if (r.type === 'citation') return `${r.platform} (${r.status})`
    if (r.type === 'competitor') return `${r.name}${r.rating ? ` — ${r.rating}⭐` : ''}`
    return ''
  }

  const go = (r: SearchResult) => {
    setQuery('')
    setOpen(false)
    navigate(TYPE_ROUTE[r.type])
  }

  return (
    <div ref={ref} className="relative w-full max-w-xs hidden md:block">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => allResults.length > 0 && setOpen(true)}
          placeholder="Search reviews, Q&A, locations…"
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {open && allResults.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {allResults.map(r => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => go(r)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left"
            >
              <span className="text-xs font-semibold text-gray-400 uppercase w-16 shrink-0">
                {TYPE_LABEL[r.type]}
              </span>
              <span className="text-sm text-gray-800 truncate">{label(r)}</span>
            </button>
          ))}
        </div>
      )}

      {open && query.length >= 2 && !loading && allResults.length === 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 px-4 py-3 text-sm text-gray-400">
          No results for "{query}"
        </div>
      )}
    </div>
  )
}
