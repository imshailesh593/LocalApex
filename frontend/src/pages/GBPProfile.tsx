import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import { useToast } from '../context/ToastContext'

const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu',
  FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun',
}
const DAYS = Object.keys(DAY_LABELS)

export default function GBPProfile() {
  const { id: locationId } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const toast = useToast()
  const [saving, setSaving] = useState(false)

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['gbp-profile', locationId],
    queryFn: () => api.get(`/gbp/locations/${locationId}/profile`).then(r => r.data),
    retry: false,
  })

  const [form, setForm] = useState<any>(null)

  // Initialise form once profile loads
  if (profile && !form) {
    const hours: Record<string, { open: string; close: string; closed: boolean }> = {}
    const periods = profile.regularHours?.periods ?? []
    DAYS.forEach(day => {
      const p = periods.find((x: any) => x.openDay === day)
      hours[day] = p
        ? { open: `${String(p.openTime?.hours ?? 9).padStart(2, '0')}:${String(p.openTime?.minutes ?? 0).padStart(2, '0')}`, close: `${String(p.closeTime?.hours ?? 18).padStart(2, '0')}:${String(p.closeTime?.minutes ?? 0).padStart(2, '0')}`, closed: false }
        : { open: '09:00', close: '18:00', closed: true }
    })
    setForm({
      title: profile.title ?? '',
      websiteUri: profile.websiteUri ?? '',
      phone: profile.phoneNumbers?.primaryPhone ?? '',
      description: profile.profile?.description ?? '',
      hours,
      labels: (profile.labels ?? []).join(', '),
      primaryCategory: profile.categories?.primaryCategory?.displayName ?? '',
    })
  }

  const save = async () => {
    if (!form) return
    setSaving(true)
    try {
      // Build hours payload
      const periods = DAYS
        .filter(day => !form.hours[day]?.closed)
        .map(day => {
          const [oh, om] = form.hours[day].open.split(':').map(Number)
          const [ch, cm] = form.hours[day].close.split(':').map(Number)
          return {
            openDay: day, closeDay: day,
            openTime: { hours: oh, minutes: om },
            closeTime: { hours: ch, minutes: cm },
          }
        })

      await api.patch(`/gbp/locations/${locationId}/profile`, {
        title: form.title || undefined,
        websiteUri: form.websiteUri || undefined,
        phone: form.phone || undefined,
        description: form.description || undefined,
        regularHours: { periods },
        labels: form.labels ? form.labels.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined,
      })
      qc.invalidateQueries({ queryKey: ['gbp-profile', locationId] })
      toast.success('Google Business Profile updated ✓')
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <div className="py-16 text-center text-gray-400">Loading GBP profile…</div>
  if (isError) return (
    <div className="py-16 text-center">
      <p className="text-red-500 font-medium">Could not load GBP profile</p>
      <p className="text-sm text-gray-400 mt-2">Make sure this location is connected to Google Business Profile.</p>
      <Link to={`/locations/${locationId}`} className="text-brand-600 text-sm mt-3 inline-block">← Back to location</Link>
    </div>
  )

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">GBP Profile & SEO</h1>
          <p className="text-sm text-gray-500 mt-0.5">Changes are saved directly to your Google Business Profile</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/locations/${locationId}`} className="text-sm text-gray-400 hover:text-gray-600 self-center">← Location</Link>
          <button onClick={save} disabled={saving || !form}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
            {saving ? 'Saving to Google…' : 'Save to Google'}
          </button>
        </div>
      </div>

      {form && (
        <div className="space-y-4">
          {/* Basic Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Basic Information</h2>
            <div className="grid grid-cols-1 gap-3">
              {[
                { key: 'title', label: 'Business Name', placeholder: 'Maveric InfoTech' },
                { key: 'websiteUri', label: 'Website', placeholder: 'https://mavericinfotech.in' },
                { key: 'phone', label: 'Phone Number', placeholder: '+91 98765 43210' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-gray-500">{label}</label>
                  <input
                    value={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* SEO Description */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <div className="flex items-start justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Business Description</h2>
              <span className={`text-xs ${form.description.length > 750 ? 'text-red-500' : 'text-gray-400'}`}>
                {form.description.length}/750
              </span>
            </div>
            <textarea
              rows={4}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              maxLength={750}
              placeholder="Describe your business. Include key services, location, and what makes you unique. This appears on your Google listing and affects local SEO."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            />
            <p className="text-xs text-gray-400">Tip: Include your main keywords naturally. Google uses this for local search ranking.</p>
          </div>

          {/* Labels / Keywords */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Labels / Tags</h2>
            <input
              value={form.labels}
              onChange={e => setForm({ ...form, labels: e.target.value })}
              placeholder="web development, mobile apps, digital marketing (comma separated)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <p className="text-xs text-gray-400">Internal labels for managing multiple locations. Not visible to customers.</p>
          </div>

          {/* Primary Category */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Primary Category (read-only)</h2>
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700">
              {form.primaryCategory || '—'}
            </div>
            <p className="text-xs text-gray-400">Category changes must be made directly in Google Business Profile. It's one of the strongest local SEO signals.</p>
          </div>

          {/* Business Hours */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Business Hours</h2>
            <div className="space-y-2">
              {DAYS.map(day => (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-10">{DAY_LABELS[day]}</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={!form.hours[day]?.closed}
                      onChange={e => setForm({ ...form, hours: { ...form.hours, [day]: { ...form.hours[day], closed: !e.target.checked } } })}
                      className="rounded" />
                    <span className="text-xs text-gray-500">Open</span>
                  </label>
                  {!form.hours[day]?.closed ? (
                    <>
                      <input type="time" value={form.hours[day]?.open ?? '09:00'}
                        onChange={e => setForm({ ...form, hours: { ...form.hours, [day]: { ...form.hours[day], open: e.target.value } } })}
                        className="border border-gray-300 rounded px-2 py-1 text-sm" />
                      <span className="text-gray-400 text-sm">–</span>
                      <input type="time" value={form.hours[day]?.close ?? '18:00'}
                        onChange={e => setForm({ ...form, hours: { ...form.hours, [day]: { ...form.hours[day], close: e.target.value } } })}
                        className="border border-gray-300 rounded px-2 py-1 text-sm" />
                    </>
                  ) : (
                    <span className="text-xs text-gray-400">Closed</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
