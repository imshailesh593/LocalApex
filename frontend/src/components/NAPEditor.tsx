import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { locationsApi } from '../api/endpoints'
import { useToast } from '../context/ToastContext'
import SlideOver from './ui/SlideOver'
import type { Location } from '../types/api'

interface Props {
  location: Location | null
  onClose: () => void
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

interface DayHours {
  closed: boolean
  open: string
  close: string
}

type WeekHours = Record<string, DayHours>

const defaultWeek = (): WeekHours =>
  Object.fromEntries(
    DAYS.map(d => [d, { closed: d === 'Sunday', open: '09:00', close: '18:00' }])
  )

function parseHours(raw: string | null): WeekHours {
  if (!raw) return defaultWeek()
  try {
    return JSON.parse(raw)
  } catch {
    return defaultWeek()
  }
}

function serializeHours(hours: WeekHours): string {
  return JSON.stringify(hours)
}

export default function NAPEditor({ location, onClose }: Props) {
  const qc = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState({
    store_name: '',
    address: '',
    city: '',
    state: '',
    phone: '',
    website: '',
    google_review_url: '',
    funnel_slug: '',
    special_hours: '',
  })
  const [weekHours, setWeekHours] = useState<WeekHours>(defaultWeek())
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (location) {
      setForm({
        store_name: location.store_name ?? '',
        address: location.address ?? '',
        city: location.city ?? '',
        state: location.state ?? '',
        phone: location.phone ?? '',
        website: location.website ?? '',
        google_review_url: location.google_review_url ?? '',
        funnel_slug: location.funnel_slug ?? '',
        special_hours: location.special_hours ?? '',
      })
      setWeekHours(parseHours(location.business_hours))
    }
  }, [location])

  const update = useMutation({
    mutationFn: (data: object) => locationsApi.update(location!.id, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] })
      setSaved(true)
      toast.success('Location updated')
      setTimeout(() => setSaved(false), 2000)
    },
    onError: () => toast.error('Failed to save changes'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    update.mutate({ ...form, business_hours: serializeHours(weekHours) })
  }

  const funnelUrl = form.funnel_slug
    ? `${window.location.origin}/r/${form.funnel_slug}`
    : null

  const copyFunnelLink = () => {
    if (!funnelUrl) return
    navigator.clipboard.writeText(funnelUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const field = (key: keyof typeof form, label: string, placeholder = '', type: 'input' | 'textarea' = 'input') => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {type === 'textarea' ? (
        <textarea
          value={form[key]}
          onChange={e => setForm({ ...form, [key]: e.target.value })}
          placeholder={placeholder}
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      ) : (
        <input
          value={form[key]}
          onChange={e => setForm({ ...form, [key]: e.target.value })}
          placeholder={placeholder}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      )}
    </div>
  )

  const setDay = (day: string, patch: Partial<DayHours>) => {
    setWeekHours(prev => ({ ...prev, [day]: { ...prev[day], ...patch } }))
  }

  return (
    <SlideOver open={!!location} onClose={onClose} title={`NAP Editor — ${location?.store_name ?? ''}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Business Info (NAP)</p>
        {field('store_name', 'Business Name', 'MG Road Café')}
        {field('address', 'Address', '123 MG Road, Pune')}
        {field('city', 'City', 'Pune')}
        {field('state', 'State', 'Maharashtra')}
        {field('phone', 'Phone', '+91 98765 43210')}
        {field('website', 'Website', 'https://example.com')}

        <hr className="border-gray-100" />
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Google Business Profile</p>
        {field('google_review_url', 'Google Review URL', 'https://g.page/r/…/review')}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Review Funnel Slug</label>
          <div className="flex gap-2 items-center">
            <input
              value={form.funnel_slug}
              onChange={e => setForm({ ...form, funnel_slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
              placeholder="mg-road-pune"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {funnelUrl && (
              <button
                type="button"
                onClick={copyFunnelLink}
                className="shrink-0 border border-gray-300 text-gray-600 px-3 py-2 rounded-lg text-xs font-medium hover:bg-gray-50"
              >
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            )}
          </div>
          {funnelUrl && (
            <a
              href={funnelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-600 hover:underline mt-1 block truncate"
            >
              {funnelUrl}
            </a>
          )}
        </div>

        <hr className="border-gray-100" />
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Business Hours</p>
        <div className="space-y-2">
          {DAYS.map(day => {
            const dh = weekHours[day] ?? { closed: false, open: '09:00', close: '18:00' }
            return (
              <div key={day} className="flex items-center gap-2 text-sm">
                <span className="w-24 text-gray-600 shrink-0">{day.slice(0, 3)}</span>
                <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dh.closed}
                    onChange={e => setDay(day, { closed: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  Closed
                </label>
                {!dh.closed && (
                  <>
                    <input
                      type="time"
                      value={dh.open}
                      onChange={e => setDay(day, { open: e.target.value })}
                      className="border border-gray-300 rounded px-2 py-1 text-xs w-28"
                    />
                    <span className="text-gray-400">–</span>
                    <input
                      type="time"
                      value={dh.close}
                      onChange={e => setDay(day, { close: e.target.value })}
                      className="border border-gray-300 rounded px-2 py-1 text-xs w-28"
                    />
                  </>
                )}
              </div>
            )
          })}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Special / Holiday Hours</label>
          <textarea
            value={form.special_hours}
            onChange={e => setForm({ ...form, special_hours: e.target.value })}
            placeholder="Dec 25: Closed&#10;Jan 1: 10am–4pm"
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={update.isPending}
            className="w-full bg-brand-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-brand-700 disabled:opacity-60"
          >
            {saved ? 'Saved!' : update.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </SlideOver>
  )
}
