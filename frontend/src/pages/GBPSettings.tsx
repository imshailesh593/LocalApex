import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import { useToast } from '../context/ToastContext'

// ── Place Actions ─────────────────────────────────────────────────────────────

const ACTION_ICONS: Record<string, string> = {
  APPOINTMENT: '📅', ONLINE_APPOINTMENT: '💻', DINING_RESERVATION: '🍽️',
  FOOD_ORDERING: '🥡', FOOD_DELIVERY: '🛵', FOOD_TAKEOUT: '🥡', SHOP_ONLINE: '🛍️',
}

function PlaceActionsPanel({ locationId }: { locationId: string }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [showAdd, setShowAdd] = useState(false)
  const [newType, setNewType] = useState('')
  const [newUrl, setNewUrl] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['gbp-actions', locationId],
    queryFn: () => api.get(`/gbp/locations/${locationId}/actions`).then(r => r.data),
    retry: false,
  })

  const add = useMutation({
    mutationFn: () => api.post(`/gbp/locations/${locationId}/actions`, { action_type: newType, uri: newUrl }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gbp-actions', locationId] }); toast.success('CTA link added to Google listing ✓'); setShowAdd(false); setNewUrl('') },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'Failed'),
  })

  const remove = useMutation({
    mutationFn: (name: string) => api.delete(`/gbp/locations/${locationId}/actions/${encodeURIComponent(name)}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gbp-actions', locationId] }); toast.success('Link removed from Google') },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'Failed'),
  })

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">📍 CTA / Booking Links</h2>
          <p className="text-xs text-gray-400 mt-0.5">Action buttons that appear on your Google listing (Book, Order, Reserve)</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700">+ Add Link</button>
      </div>

      {isError && <p className="text-xs text-red-500">Could not load — make sure Place Actions API is enabled in Google Cloud.</p>}

      {showAdd && data && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Action Type</label>
              <select value={newType} onChange={e => setNewType(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Select type…</option>
                {(data.available_types ?? []).map((t: any) => (
                  <option key={t.type} value={t.type}>{ACTION_ICONS[t.type] ?? '🔗'} {t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">URL</label>
              <input value={newUrl} onChange={e => setNewUrl(e.target.value)}
                placeholder="https://your-booking-url.com"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => add.mutate()} disabled={!newType || !newUrl || add.isPending}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {add.isPending ? 'Adding…' : 'Add to Google'}
            </button>
            <button onClick={() => setShowAdd(false)} className="text-sm text-gray-500 hover:bg-gray-100 px-3 py-2 rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      {isLoading ? <p className="text-xs text-gray-400">Loading…</p> : (
        data?.actions?.length === 0 ? (
          <p className="text-sm text-gray-400">No CTA links yet. Add a booking or ordering link to increase customer conversions.</p>
        ) : (
          <div className="space-y-2">
            {(data?.actions ?? []).map((a: any) => (
              <div key={a.name} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{ACTION_ICONS[a.type] ?? '🔗'} {a.label}</p>
                  <p className="text-xs text-gray-400 truncate max-w-xs">{a.uri}</p>
                </div>
                {a.is_editable && (
                  <button onClick={() => { if (confirm('Remove this link from Google?')) remove.mutate(a.name) }}
                    className="text-xs text-red-400 hover:text-red-600">Remove</button>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

// ── Verification ──────────────────────────────────────────────────────────────

function VerificationPanel({ locationId }: { locationId: string }) {
  const toast = useToast()
  const [requestMethod, setRequestMethod] = useState('')
  const [pin, setPin] = useState('')
  const [verificationName, setVerificationName] = useState('')
  const [step, setStep] = useState<'check' | 'request' | 'pin'>('check')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['gbp-verification', locationId],
    queryFn: () => api.get(`/gbp/locations/${locationId}/verification`).then(r => r.data),
    retry: false,
  })

  const requestVerif = useMutation({
    mutationFn: () => api.post(`/gbp/locations/${locationId}/verification/request`, { method: requestMethod }),
    onSuccess: (r) => {
      setVerificationName(r.data?.verification?.name ?? '')
      toast.success('Verification initiated. Check your phone/mail/email.')
      setStep('pin')
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'Request failed'),
  })

  const completeVerif = useMutation({
    mutationFn: () => api.post(`/gbp/locations/${locationId}/verification/complete`, { verification_name: verificationName, pin }),
    onSuccess: () => { toast.success('Listing verified ✓'); refetch(); setStep('check') },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'PIN incorrect'),
  })

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-800">✅ Listing Verification</h2>
        <p className="text-xs text-gray-400 mt-0.5">Verified listings rank higher and display the verified badge on Google</p>
      </div>

      {isError && <p className="text-xs text-red-500">Could not load — make sure Verifications API is enabled in Google Cloud.</p>}

      {isLoading ? <p className="text-xs text-gray-400">Checking verification status…</p> : data && (
        <>
          <div className={`flex items-center gap-3 rounded-lg px-4 py-3 ${data.is_verified ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
            <span className="text-2xl">{data.is_verified ? '✅' : '⚠️'}</span>
            <div>
              <p className={`font-semibold text-sm ${data.is_verified ? 'text-green-700' : 'text-amber-700'}`}>
                {data.is_verified ? 'Listing is Verified' : 'Listing is NOT Verified'}
              </p>
              <p className={`text-xs ${data.is_verified ? 'text-green-600' : 'text-amber-600'}`}>
                {data.is_verified ? 'Your listing shows the verified badge on Google Maps and Search.' : 'Unverified listings may not appear in local search results.'}
              </p>
            </div>
          </div>

          {!data.is_verified && step === 'check' && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Choose verification method:</p>
              <div className="space-y-2">
                {(data.available_methods ?? []).map((m: any) => (
                  <label key={m.method} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${requestMethod === m.method ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input type="radio" name="method" value={m.method} checked={requestMethod === m.method}
                      onChange={() => setRequestMethod(m.method)} className="mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{m.method.replace('_', ' ')}</p>
                      <p className="text-xs text-gray-400">{m.description}</p>
                      {m.display_data?.businessAddress && (
                        <p className="text-xs text-gray-500 mt-0.5">{m.display_data.businessAddress}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
              <button onClick={() => requestVerif.mutate()} disabled={!requestMethod || requestVerif.isPending}
                className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {requestVerif.isPending ? 'Requesting…' : 'Start Verification'}
              </button>
            </div>
          )}

          {step === 'pin' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">Enter the PIN you received:</p>
              <div className="flex gap-2">
                <input value={pin} onChange={e => setPin(e.target.value)} placeholder="5-digit PIN"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-40" maxLength={10} />
                <button onClick={() => completeVerif.mutate()} disabled={!pin || completeVerif.isPending}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                  {completeVerif.isPending ? 'Verifying…' : 'Confirm PIN'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Notification Settings ─────────────────────────────────────────────────────

function NotificationsPanel() {
  const qc = useQueryClient()
  const toast = useToast()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['gbp-notifications'],
    queryFn: () => api.get('/gbp/notifications/settings').then(r => r.data),
    retry: false,
  })

  const update = useMutation({
    mutationFn: (enabled: string[]) => api.patch('/gbp/notifications/settings', { enabled_types: enabled }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gbp-notifications'] }); toast.success('Notification settings saved to Google ✓') },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? 'Failed'),
  })

  const toggle = (type: string, current: boolean) => {
    if (!data) return
    const currently = data.notifications.filter((n: any) => n.enabled).map((n: any) => n.type)
    const next = current ? currently.filter((t: string) => t !== type) : [...currently, type]
    update.mutate(next)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-800">🔔 Google Notification Settings</h2>
        <p className="text-xs text-gray-400 mt-0.5">Control which events Google sends you alerts for</p>
      </div>

      {isError && <p className="text-xs text-red-500">Could not load — make sure Notifications API is enabled in Google Cloud.</p>}

      {isLoading ? <p className="text-xs text-gray-400">Loading…</p> : (
        <div className="space-y-2">
          {(data?.notifications ?? []).map((n: any) => (
            <div key={n.type} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
              <p className="text-sm text-gray-700">{n.label}</p>
              <button
                onClick={() => toggle(n.type, n.enabled)}
                disabled={update.isPending}
                className={`relative w-11 h-6 rounded-full transition-colors ${n.enabled ? 'bg-brand-600' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${n.enabled ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function GBPSettings() {
  const { id: locationId } = useParams<{ id: string }>()

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">GBP Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Verification, booking links & notification preferences</p>
        </div>
        <Link to={`/locations/${locationId}`} className="text-sm text-gray-400 hover:text-gray-600">← Location</Link>
      </div>

      <VerificationPanel locationId={locationId!} />
      <PlaceActionsPanel locationId={locationId!} />
      <NotificationsPanel />
    </div>
  )
}
