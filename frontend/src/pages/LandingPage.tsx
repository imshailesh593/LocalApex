import { Link } from 'react-router-dom'

const FEATURES = [
  {
    icon: '⭐',
    title: 'Smart Review Funnel',
    body: 'Route 4–5 star reviews to Google, capture negative feedback internally. Protect your rating while listening to every customer.',
  },
  {
    icon: '🤖',
    title: 'AI Review Responder',
    body: 'Generate professional, on-brand responses in one click using GPT-4o. Save time and never leave a review unanswered.',
  },
  {
    icon: '🏆',
    title: 'Competitor Analytics',
    body: "Track competitors' ratings and review counts over time. Spot trends and know exactly when you're pulling ahead.",
  },
  {
    icon: '📋',
    title: 'NAP Citation Checker',
    body: 'Scan your business listings across 12+ platforms for Name, Address, and Phone inconsistencies that hurt your local rankings.',
  },
  {
    icon: '📊',
    title: 'GBP Insights Dashboard',
    body: 'Import Google Business Profile data and visualise views, searches, calls, and direction requests with interactive charts.',
  },
  {
    icon: '🔔',
    title: 'Instant Alerts & Webhooks',
    body: 'Get email alerts on new reviews and fire HMAC-signed webhooks to Zapier, Slack, or any HTTP endpoint in real time.',
  },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Add your locations',
    body: 'Import locations via CSV or add them one by one. Each gets its own review funnel URL and NAP profile.',
  },
  {
    step: '02',
    title: 'Share your funnel link',
    body: 'Send the /r/:slug link via SMS, email, or QR code. Happy customers go to Google; unhappy ones go to you first.',
  },
  {
    step: '03',
    title: 'Monitor and respond',
    body: 'Manage reviews, check citation health, track competitors, and respond with AI — all from one dashboard.',
  },
]

const PLANS = [
  {
    name: 'Free',
    price: '₹0',
    period: 'forever',
    features: ['1 location', 'Review funnel', 'Basic dashboard', 'Community support'],
    cta: 'Get started free',
    href: '/register',
    highlight: false,
  },
  {
    name: 'Starter',
    price: '₹799',
    period: '/month',
    features: ['5 locations', 'AI review responder', 'NAP checker', 'Email alerts', 'Webhooks'],
    cta: 'Start free trial',
    href: '/register',
    highlight: true,
  },
  {
    name: 'Pro',
    price: '₹1,999',
    period: '/month',
    features: ['Unlimited locations', 'Competitor analytics', 'GBP insights', 'Team members', 'Priority support'],
    cta: 'Start free trial',
    href: '/register',
    highlight: false,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-brand-700">LocalApex</span>
          <nav className="flex items-center gap-4">
            <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium">Sign in</Link>
            <Link
              to="/register"
              className="bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-700 transition"
            >
              Get started free
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-6 text-center bg-gradient-to-b from-brand-50 to-white">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block bg-brand-100 text-brand-700 text-xs font-semibold px-3 py-1 rounded-full mb-6 tracking-wide uppercase">
            Local SEO · Multi-location · AI-powered
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-6">
            Dominate local search.<br />
            <span className="text-brand-600">Outrank every competitor.</span>
          </h1>
          <p className="text-lg text-gray-500 mb-8 max-w-xl mx-auto">
            LocalApex gives local businesses one dashboard to manage reviews, track competitors,
            fix NAP citations, and grow their Google presence — with AI doing the heavy lifting.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              to="/register"
              className="bg-brand-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-700 transition text-base"
            >
              Start free — no credit card
            </Link>
            <Link
              to="/login"
              className="border border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition text-base"
            >
              Sign in to dashboard →
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-gray-100 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: '10+', label: 'Modules built' },
            { value: '12+', label: 'Citation platforms' },
            { value: 'AI', label: 'Review responder' },
            { value: '100%', label: 'Open source' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-2xl font-extrabold text-brand-700">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">Everything your local business needs</h2>
          <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto">
            From reputation management to citation health — LocalApex covers the full local SEO stack.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-sm transition">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Up and running in minutes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map(s => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">Simple, transparent pricing</h2>
          <p className="text-gray-500 text-center mb-12">Start free. Upgrade as you grow.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map(p => (
              <div
                key={p.name}
                className={`rounded-2xl border p-6 flex flex-col ${
                  p.highlight
                    ? 'border-brand-600 bg-brand-600 text-white shadow-lg'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <p className={`text-sm font-semibold mb-1 ${p.highlight ? 'text-brand-100' : 'text-gray-400'}`}>{p.name}</p>
                <div className="flex items-end gap-1 mb-4">
                  <span className="text-3xl font-extrabold">{p.price}</span>
                  <span className={`text-sm mb-1 ${p.highlight ? 'text-brand-200' : 'text-gray-400'}`}>{p.period}</span>
                </div>
                <ul className="space-y-2 flex-1 mb-6">
                  {p.features.map(f => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${p.highlight ? 'text-brand-50' : 'text-gray-600'}`}>
                      <span className={p.highlight ? 'text-brand-200' : 'text-green-500'}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={p.href}
                  className={`block text-center py-2.5 rounded-xl font-semibold text-sm transition ${
                    p.highlight
                      ? 'bg-white text-brand-700 hover:bg-brand-50'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-brand-600 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to dominate local search?</h2>
          <p className="text-brand-100 mb-8">Join businesses using LocalApex to get more reviews, fix citations, and outrank competitors.</p>
          <Link
            to="/register"
            className="inline-block bg-white text-brand-700 px-8 py-3 rounded-xl font-semibold text-base hover:bg-brand-50 transition"
          >
            Create your free account →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6 text-center text-sm text-gray-400">
        <p>© {new Date().getFullYear()} LocalApex · by <a href="https://mavericinfotech.in" className="hover:text-gray-600">Maveric InfoTech</a></p>
        <div className="flex justify-center gap-6 mt-3">
          <Link to="/login" className="hover:text-gray-600">Sign in</Link>
          <Link to="/register" className="hover:text-gray-600">Register</Link>
          <Link to="/privacy" className="hover:text-gray-600">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-gray-600">Terms of Service</Link>
          <a href="mailto:support@mavericinfotech.in" className="hover:text-gray-600">Contact</a>
        </div>
      </footer>
    </div>
  )
}
