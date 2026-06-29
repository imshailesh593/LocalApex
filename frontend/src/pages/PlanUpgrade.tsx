import { useTenant } from '../context/TenantContext'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    color: 'gray',
    features: [
      '1 location',
      'Up to 50 reviews',
      'Basic citations (10)',
      'Q&A manager',
      'Media library',
    ],
    cta: 'Current',
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 799,
    color: 'blue',
    features: [
      '3 locations',
      'Unlimited reviews',
      'Citation tracking (50)',
      'Competitor tracking (5)',
      'AI review responses',
      'CSV insights import',
    ],
    cta: 'Upgrade to Starter',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 1999,
    color: 'brand',
    popular: true,
    features: [
      '10 locations',
      'Unlimited everything',
      'Multi-team members',
      'Smart review funnel',
      'AI review responder',
      'GBP sync integration',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    color: 'purple',
    features: [
      'Unlimited locations',
      'White-label dashboard',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
      'API access',
    ],
    cta: 'Contact Sales',
  },
]

const CHECK = (
  <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
)

export default function PlanUpgrade() {
  const { tenant } = useTenant()
  const current = tenant?.plan_type ?? 'free'

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Plans & Billing</h1>
      <p className="text-gray-500 mb-8 text-sm">
        You're on the <span className="font-semibold capitalize">{current}</span> plan.
        Upgrade anytime — all plans include a 14-day free trial.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {PLANS.map(plan => {
          const isActive = plan.id === current
          const isPopular = plan.popular

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 p-5 flex flex-col ${
                isActive
                  ? 'border-brand-500 bg-brand-50'
                  : isPopular
                  ? 'border-brand-400 bg-white shadow-lg'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {isPopular && !isActive && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                  Most popular
                </span>
              )}
              {isActive && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                  Current plan
                </span>
              )}

              <div className="mb-4">
                <h2 className="text-lg font-bold text-gray-900">{plan.name}</h2>
                {plan.price === null ? (
                  <p className="text-2xl font-extrabold text-gray-900 mt-1">Custom</p>
                ) : plan.price === 0 ? (
                  <p className="text-2xl font-extrabold text-gray-900 mt-1">Free</p>
                ) : (
                  <p className="text-2xl font-extrabold text-gray-900 mt-1">
                    ₹{plan.price.toLocaleString('en-IN')}
                    <span className="text-sm font-normal text-gray-400">/mo</span>
                  </p>
                )}
              </div>

              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    {CHECK}
                    {f}
                  </li>
                ))}
              </ul>

              <button
                disabled={isActive}
                className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-gray-100 text-gray-400 cursor-default'
                    : 'bg-brand-600 hover:bg-brand-700 text-white'
                }`}
              >
                {isActive ? 'Current plan' : plan.cta}
              </button>
            </div>
          )
        })}
      </div>

      <p className="mt-6 text-xs text-gray-400 text-center">
        Prices in INR. All plans include SSL, daily backups, and 99.9% uptime SLA. Cancel anytime.
      </p>
    </div>
  )
}
