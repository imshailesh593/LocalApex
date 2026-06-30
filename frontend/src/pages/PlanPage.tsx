import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billingApi, tenantApi } from '../api/endpoints'
import { useToast } from '../context/ToastContext'

declare global {
  interface Window {
    Razorpay: new (opts: object) => { open(): void }
  }
}

const PLAN_INFO: Record<string, { name: string; color: string; features: string[] }> = {
  free: {
    name: 'Free',
    color: 'gray',
    features: ['1 location', '50 reviews/mo', 'Basic analytics', 'Email support'],
  },
  starter: {
    name: 'Starter',
    color: 'blue',
    features: ['5 locations', '500 reviews/mo', 'Competitor tracking', 'CSV import/export', 'Priority support'],
  },
  pro: {
    name: 'Pro',
    color: 'purple',
    features: ['Unlimited locations', 'Unlimited reviews', 'AI response drafts', 'Webhooks + API', 'Weekly digest emails', 'Dedicated support'],
  },
}

function loadRazorpay(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true)
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

type BillingInterval = 'monthly' | 'annual'

export default function PlanPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const [interval, setInterval] = useState<BillingInterval>('monthly')

  const { data: tenant } = useQuery({ queryKey: ['tenant'], queryFn: () => tenantApi.me().then(r => r.data) })
  const { data: plans } = useQuery({ queryKey: ['billing-plans'], queryFn: () => billingApi.plans().then(r => r.data) })

  const subscribe = useMutation({
    mutationFn: async (plan_key: string) => {
      const loaded = await loadRazorpay()
      if (!loaded) throw new Error('Could not load Razorpay')

      const res = await billingApi.createSubscription(plan_key)
      const sub = res.data as {
        subscription_id: string
        razorpay_key: string
        amount: number
        currency: string
        plan_key: string
        tier: string
      }

      return new Promise<void>((resolve, reject) => {
        const rz = new window.Razorpay({
          key: sub.razorpay_key,
          subscription_id: sub.subscription_id,
          name: 'LocalApex',
          description: `${PLAN_INFO[sub.tier]?.name} Plan`,
          image: '/vite.svg',
          theme: { color: '#1d4ed8' },
          handler: async (response: {
            razorpay_payment_id: string
            razorpay_subscription_id: string
            razorpay_signature: string
          }) => {
            try {
              await billingApi.verifyPayment({ ...response, plan_key: sub.plan_key })
              qc.invalidateQueries({ queryKey: ['tenant'] })
              toast.success(`Upgraded to ${PLAN_INFO[sub.tier]?.name}!`)
              resolve()
            } catch {
              reject(new Error('Payment verification failed'))
            }
          },
          modal: { ondismiss: () => reject(new Error('dismissed')) },
        })
        rz.open()
      })
    },
    onError: (err: Error) => {
      if (err.message !== 'dismissed') toast.error(err.message || 'Upgrade failed')
    },
  })

  const currentPlan = (tenant as { plan_type?: string } | undefined)?.plan_type ?? 'free'

  const planKey = (tier: string) =>
    tier === 'free' ? null : `${tier}_${interval === 'annual' ? 'annual' : 'monthly'}`

  const annualSaving = (monthlyPaise: number) =>
    Math.round((monthlyPaise * 12 - Math.round(monthlyPaise * 12 * 0.75)) / 100)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Plans & Billing</h1>
        <p className="text-sm text-gray-500 mt-1">
          Current plan: <span className="font-semibold capitalize text-brand-700">{currentPlan}</span>
        </p>
      </div>

      {/* Interval toggle */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['monthly', 'annual'] as BillingInterval[]).map(i => (
          <button
            key={i}
            onClick={() => setInterval(i)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              interval === i ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {i === 'monthly' ? 'Monthly' : 'Annual'}
            {i === 'annual' && <span className="ml-1.5 text-xs text-green-600 font-semibold">Save 25%</span>}
          </button>
        ))}
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {(['free', 'starter', 'pro'] as const).map(tier => {
          const key = planKey(tier)
          const planData = plans && key ? (plans as Record<string, { amount_display: string }>)[key] : null
          const isActive = currentPlan === tier
          const info = PLAN_INFO[tier]

          return (
            <div
              key={tier}
              className={`bg-white rounded-2xl border-2 p-6 flex flex-col gap-4 transition-shadow ${
                tier === 'pro'
                  ? 'border-purple-400 shadow-lg shadow-purple-100'
                  : isActive
                  ? 'border-brand-400'
                  : 'border-gray-200'
              }`}
            >
              {tier === 'pro' && (
                <span className="self-start text-xs font-bold text-purple-600 bg-purple-100 px-2.5 py-1 rounded-full">
                  Most Popular
                </span>
              )}
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{info.name}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {tier === 'free' ? (
                    'Free'
                  ) : planData ? (
                    <>
                      {planData.amount_display}
                      <span className="text-sm font-normal text-gray-400">
                        /{interval === 'annual' ? 'yr' : 'mo'}
                      </span>
                    </>
                  ) : '—'}
                </p>
                {tier !== 'free' && interval === 'annual' && plans && (
                  <p className="text-xs text-green-600 mt-0.5">
                    Save ₹{annualSaving((plans as Record<string, { amount: number }>)[`${tier}_monthly`]?.amount ?? 0)} vs monthly
                  </p>
                )}
              </div>

              <ul className="space-y-2 flex-1">
                {info.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {isActive ? (
                <div className="text-center text-sm text-gray-400 font-medium py-2 border border-gray-200 rounded-xl">
                  Current Plan
                </div>
              ) : tier === 'free' ? (
                <div className="text-center text-sm text-gray-300 py-2">No payment needed</div>
              ) : (
                <button
                  onClick={() => key && subscribe.mutate(key)}
                  disabled={subscribe.isPending}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${
                    tier === 'pro'
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-brand-600 text-white hover:bg-brand-700'
                  }`}
                >
                  {subscribe.isPending ? 'Opening…' : `Upgrade to ${info.name}`}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-gray-400 text-center">
        Secured by Razorpay · Cancel anytime · Prices in INR incl. GST
      </p>
    </div>
  )
}
