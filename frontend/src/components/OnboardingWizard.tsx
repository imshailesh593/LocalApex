import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { locationsApi, tenantApi } from '../api/endpoints'
import { useTenant } from '../context/TenantContext'

interface Props {
  onDone: () => void
}

const STEPS = [
  { title: 'Name your business', desc: 'Confirm your business name in LocalApex' },
  { title: 'Add your first location', desc: 'Enter your store name, address, and phone' },
  { title: 'Set up review funnel', desc: 'Create a shareable link for customer reviews' },
  { title: 'Set notification email', desc: 'Get emailed when a new review arrives' },
]

export default function OnboardingWizard({ onDone }: Props) {
  const [step, setStep] = useState(0)
  const [bizName, setBizName] = useState('')
  const [loc, setLoc] = useState({ store_name: '', address: '', city: '', phone: '' })
  const [slug, setSlug] = useState('')
  const [notifEmail, setNotifEmail] = useState('')
  const { tenant, refresh } = useTenant()
  const qc = useQueryClient()

  const updateTenant = useMutation({ mutationFn: (d: object) => tenantApi.update(d) })
  const createLoc = useMutation({ mutationFn: (d: object) => locationsApi.create(d) })
  const [locId, setLocId] = useState<string | null>(null)
  const updateLoc = useMutation({ mutationFn: ({ id, d }: { id: string; d: object }) => locationsApi.update(id, d) })

  const next = async () => {
    if (step === 0) {
      if (bizName.trim()) {
        await updateTenant.mutateAsync({ business_name: bizName.trim() })
        await refresh()
      }
    } else if (step === 1) {
      const res = await createLoc.mutateAsync(loc)
      setLocId((res as { data: { id: string } }).data.id)
      qc.invalidateQueries({ queryKey: ['locations'] })
    } else if (step === 2 && slug && locId) {
      await updateLoc.mutateAsync({ id: locId, d: { funnel_slug: slug } })
      qc.invalidateQueries({ queryKey: ['locations'] })
    } else if (step === 3) {
      if (notifEmail.trim()) {
        await updateTenant.mutateAsync({ notification_email: notifEmail.trim() })
        await refresh()
      }
    }

    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      onDone()
    }
  }

  const progress = ((step) / STEPS.length) * 100

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-brand-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-6">
          <div className="flex gap-1 mb-6">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full ${i <= step ? 'bg-brand-600' : 'bg-gray-200'}`}
              />
            ))}
          </div>

          <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-1">
            Step {step + 1} of {STEPS.length}
          </p>
          <h2 className="text-xl font-bold text-gray-900 mb-1">{STEPS[step].title}</h2>
          <p className="text-sm text-gray-500 mb-6">{STEPS[step].desc}</p>

          {step === 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Business Name</label>
              <input
                value={bizName}
                onChange={e => setBizName(e.target.value)}
                placeholder={tenant?.business_name ?? 'My Business'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              {(['store_name', 'address', 'city', 'phone'] as const).map(f => (
                <div key={f}>
                  <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">{f.replace('_', ' ')}</label>
                  <input
                    value={loc[f]}
                    onChange={e => setLoc({ ...loc, [f]: e.target.value })}
                    required={f === 'store_name' || f === 'address'}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Review Funnel Slug</label>
              <div className="flex items-center gap-2 border border-gray-300 rounded-lg overflow-hidden px-3 focus-within:ring-2 focus-within:ring-brand-500">
                <span className="text-sm text-gray-400 select-none">/r/</span>
                <input
                  value={slug}
                  onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  placeholder="my-business-name"
                  className="flex-1 py-2 text-sm focus:outline-none"
                />
              </div>
              {slug && (
                <p className="text-xs text-brand-600 mt-1">
                  {window.location.origin}/r/{slug}
                </p>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notification Email</label>
              <input
                type="email"
                value={notifEmail}
                onChange={e => setNotifEmail(e.target.value)}
                placeholder="you@yourbusiness.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-xs text-gray-400 mt-1">You'll get an email whenever a new review is submitted via your funnel.</p>
            </div>
          )}

          <div className="flex items-center justify-between mt-8">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← Back
              </button>
            ) : <span />}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => step === STEPS.length - 1 ? onDone() : setStep(s => s + 1)}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={next}
                className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700"
              >
                {step === STEPS.length - 1 ? 'Finish setup' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
