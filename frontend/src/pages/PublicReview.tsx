import { useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/client'

type Step = 'rating' | 'comment' | 'done_positive' | 'done_negative'

interface FunnelResult {
  is_routed: boolean
  google_review_url: string | null
  message: string
}

export default function PublicReview() {
  const { slug } = useParams<{ slug: string }>()
  const [step, setStep] = useState<Step>('rating')
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [form, setForm] = useState({ reviewer_name: '', reviewer_email: '', comment: '' })
  const [result, setResult] = useState<FunnelResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const ratingLabel = (r: number) => ['', 'Very Poor', 'Poor', 'Average', 'Good', 'Excellent'][r] ?? ''

  const handleRatingSelect = (r: number) => {
    setRating(r)
    setTimeout(() => setStep('comment'), 300)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rating) return
    setSubmitting(true)
    setError('')
    try {
      const res = await api.post(`/reviews/public/${slug}`, { ...form, rating })
      const data = res.data as FunnelResult
      setResult(data)
      setStep(data.is_routed ? 'done_positive' : 'done_negative')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">

        {/* Rating step */}
        {step === 'rating' && (
          <div className="text-center space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">How was your experience?</h1>
              <p className="text-gray-500 mt-1 text-sm">Your feedback helps us improve</p>
            </div>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(v => (
                <button
                  key={v}
                  onMouseEnter={() => setHover(v)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => handleRatingSelect(v)}
                  className={`text-5xl transition-all duration-100 hover:scale-110 ${(hover || rating) >= v ? 'opacity-100' : 'opacity-25'}`}
                  aria-label={`${v} star`}
                >
                  ⭐
                </button>
              ))}
            </div>
            {(hover || rating) > 0 && (
              <p className="text-brand-600 font-semibold text-lg">{ratingLabel(hover || rating)}</p>
            )}
          </div>
        )}

        {/* Comment step */}
        {step === 'comment' && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="text-center">
              <div className="text-4xl mb-1">{['', '😞', '😕', '😐', '😊', '🤩'][rating]}</div>
              <h2 className="text-xl font-bold text-gray-900">{ratingLabel(rating)}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {rating >= 4 ? 'We\'re thrilled! Would you mind sharing more?' : 'We\'re sorry to hear that. Please tell us what happened.'}
              </p>
            </div>

            <div className="space-y-3">
              <input
                value={form.reviewer_name}
                onChange={e => setForm({ ...form, reviewer_name: e.target.value })}
                placeholder="Your name (optional)"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <input
                type="email"
                value={form.reviewer_email}
                onChange={e => setForm({ ...form, reviewer_email: e.target.value })}
                placeholder="Email address (optional)"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <textarea
                value={form.comment}
                onChange={e => setForm({ ...form, comment: e.target.value })}
                placeholder={rating >= 4 ? 'Tell us what you loved…' : 'Tell us what went wrong…'}
                rows={4}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setStep('rating'); setRating(0) }}
                className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3 text-sm font-medium hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-brand-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-brand-700 disabled:opacity-60"
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </form>
        )}

        {/* Positive outcome → push to Google */}
        {step === 'done_positive' && result && (
          <div className="text-center space-y-6">
            <div className="text-6xl">🎉</div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Thank you!</h2>
              <p className="text-gray-500 mt-2 text-sm">{result.message}</p>
            </div>
            {result.google_review_url ? (
              <a
                href={result.google_review_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-brand-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-brand-700 text-center"
              >
                Post on Google Reviews ↗
              </a>
            ) : (
              <p className="text-sm text-gray-400">Your review has been recorded. Thank you!</p>
            )}
          </div>
        )}

        {/* Negative outcome → internal only */}
        {step === 'done_negative' && result && (
          <div className="text-center space-y-6">
            <div className="text-6xl">🙏</div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">We hear you.</h2>
              <p className="text-gray-500 mt-2 text-sm">{result.message}</p>
            </div>
            <p className="text-xs text-gray-400">We take every piece of feedback seriously and will be in touch soon.</p>
          </div>
        )}

        <p className="text-center text-xs text-gray-300 mt-6">Powered by LocalApex</p>
      </div>
    </div>
  )
}
