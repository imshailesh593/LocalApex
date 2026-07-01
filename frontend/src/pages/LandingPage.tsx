import { useState } from 'react'
import { Link } from 'react-router-dom'

const FEATURES = [
  {
    icon: '🔗',
    title: 'Google Business Profile — Full Control',
    body: 'Connect your GBP account and manage everything from one place: sync real reviews, reply to customers, upload photos, edit hours, and track performance — all without opening Google.',
  },
  {
    icon: '⭐',
    title: 'Smart Review Funnel',
    body: 'QR code + link routes happy customers (4–5★) to your Google listing, captures unhappy feedback privately. Protect your public rating while hearing every customer.',
  },
  {
    icon: '📊',
    title: 'GBP Performance Insights',
    body: 'Real analytics from Google: profile views, search appearances, map views, phone calls, website clicks, and direction requests — all in one interactive dashboard.',
  },
  {
    icon: '🤖',
    title: 'AI Review Responder',
    body: 'Generate professional, on-brand responses in one click. Reply to Google reviews directly from LocalApex — no copy-paste, no switching tabs.',
  },
  {
    icon: '📍',
    title: 'CTA & Booking Links',
    body: 'Add Book Appointment, Reserve a Table, Order Food, and other action buttons directly to your Google listing — increasing customer conversions automatically.',
  },
  {
    icon: '✅',
    title: 'Listing Verification',
    body: 'Check if your Google listing is verified and trigger postcard, phone, or SMS verification — and submit the PIN — directly from the dashboard.',
  },
  {
    icon: '📡',
    title: 'Social Posting — 15 Platforms',
    body: 'Schedule and publish posts to Google Business Profile, Instagram, Facebook, LinkedIn, X, TikTok, and 9 more platforms in a single workflow.',
  },
  {
    icon: '🏆',
    title: 'Competitor Analytics',
    body: "Track competitors' ratings and review counts over time. Historical charts show exactly when you're pulling ahead — or falling behind.",
  },
  {
    icon: '📋',
    title: 'NAP Citation Health',
    body: 'Scan your listings across 12+ directories for Name, Address, and Phone inconsistencies. Fix them before they hurt your local search rankings.',
  },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: '🔑',
    title: 'Connect your Google account',
    body: 'Sign in and click "Import from Google". LocalApex connects to your Google Business Profile and automatically imports all your locations, reviews, and photos.',
  },
  {
    step: '02',
    icon: '📊',
    title: 'See everything in one place',
    body: 'Your reviews, insights (views, calls, clicks), photos, Q&A, business hours, and competitors all appear in a single unified dashboard — no more switching between tools.',
  },
  {
    step: '03',
    icon: '🚀',
    title: 'Manage and grow',
    body: 'Reply to reviews directly on Google, upload photos, edit your listing, schedule social posts, and track what\'s working — all without leaving LocalApex.',
  },
]

const PLANS = [
  {
    name: 'Free',
    price: '₹0',
    period: 'forever',
    features: [
      '1 location',
      'GBP location import',
      'Review funnel (QR + link)',
      'Basic dashboard',
      'Community support',
    ],
    cta: 'Get started free',
    href: '/register',
    highlight: false,
    badge: null,
  },
  {
    name: 'Starter',
    price: '₹799',
    period: '/month',
    features: [
      '5 locations',
      'Google review sync & replies',
      'AI review responder',
      'GBP photo manager',
      'NAP citation checker',
      'Email alerts',
    ],
    cta: 'Start free trial',
    href: '/register',
    highlight: true,
    badge: 'Most popular',
  },
  {
    name: 'Pro',
    price: '₹1,999',
    period: '/month',
    features: [
      'Unlimited locations',
      'GBP performance insights',
      'Social posting (15 platforms)',
      'Competitor analytics',
      'Team members & roles',
      'Webhooks & API',
      'Priority support',
    ],
    cta: 'Start free trial',
    href: '/register',
    highlight: false,
    badge: null,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    features: [
      'Everything in Pro',
      'Multi-brand / agency support',
      'White-label dashboard',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
    ],
    cta: 'Contact us',
    href: 'mailto:sales@mavericinfotech.in',
    highlight: false,
    badge: null,
  },
]

const FAQS = [
  {
    q: 'How does the Google Business Profile integration work?',
    a: 'You connect your Google account via OAuth — LocalApex gets permission to read and manage your GBP listings. We import your locations, reviews, and photos automatically. You can reply to reviews, upload photos, and edit your listing directly from LocalApex.',
  },
  {
    q: 'Is my Google data safe?',
    a: 'Yes. We only request the business.manage scope — we have no access to personal Gmail, Drive, or other Google services. Your OAuth token is stored encrypted and is never shared with third parties. You can disconnect at any time from Settings.',
  },
  {
    q: 'Do I need technical knowledge to use LocalApex?',
    a: 'No. LocalApex is built for business owners and marketing teams. Setup takes less than 5 minutes — connect your Google account, your locations import automatically, and you\'re ready to go.',
  },
  {
    q: 'Can I manage multiple locations?',
    a: 'Yes — LocalApex is built for multi-location businesses. Each location gets its own review funnel, QR code, GBP management panel, and performance insights. The Locations Overview gives you a portfolio-wide health score.',
  },
  {
    q: 'What social platforms can I post to?',
    a: 'Google Business Profile, Instagram, Facebook, LinkedIn, X (Twitter), TikTok, YouTube, Pinterest, Reddit, Bluesky, Threads, Telegram, WhatsApp, Discord, and Snapchat — all from one scheduler.',
  },
]

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex flex-col leading-tight">
            <span className="text-xl font-bold text-brand-700">LocalApex</span>
            <span className="text-[10px] text-gray-400 font-medium tracking-wide">by Maveric InfoTech</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600 font-medium">
            <a href="#features" className="hover:text-gray-900 transition">Features</a>
            <a href="#how-it-works" className="hover:text-gray-900 transition">How it works</a>
            <a href="#pricing" className="hover:text-gray-900 transition">Pricing</a>
            <a href="#faq" className="hover:text-gray-900 transition">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium hidden sm:block">Sign in</Link>
            <Link to="/register" className="bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-700 transition">
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-24 px-6 text-center bg-gradient-to-b from-brand-50 via-white to-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-100/40 to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto relative">
          <span className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-green-200">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Powered by Google Business Profile API
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            Your Google listing.<br />
            <span className="text-brand-600">Fully under control.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            LocalApex connects directly to Google Business Profile so you can manage reviews,
            photos, insights, and your listing — all from one dashboard built for Indian businesses.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link to="/register"
              className="bg-brand-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-brand-700 transition text-base shadow-lg shadow-brand-200">
              Start free — no credit card
            </Link>
            <Link to="/login"
              className="border border-gray-300 text-gray-700 px-8 py-3.5 rounded-xl font-semibold hover:bg-gray-50 transition text-base">
              Sign in →
            </Link>
          </div>
          <p className="text-xs text-gray-400 mt-4">Free plan available · No setup fee · Cancel anytime</p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-gray-100 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
          {[
            { value: '8', label: 'GBP APIs integrated' },
            { value: '15', label: 'Social platforms' },
            { value: '12+', label: 'Citation directories' },
            { value: 'AI', label: 'Review responder' },
            { value: '∞', label: 'Locations on Pro' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-2xl font-extrabold text-brand-700">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything for local SEO — in one place</h2>
            <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed">
              Built specifically for businesses that live and die by their Google listing.
              No generic marketing suite — just deep local SEO tools that actually move the needle.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={f.title}
                className={`bg-white border rounded-2xl p-6 hover:shadow-md transition-shadow ${i === 0 ? 'border-brand-200 bg-brand-50/30' : 'border-gray-200'}`}>
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Google Integration Block */}
      <section className="py-20 px-6 bg-gradient-to-br from-blue-50 to-white border-y border-blue-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Deep Google Business Profile integration</h2>
            </div>
            <p className="text-gray-500 max-w-2xl mx-auto">
              LocalApex integrates all 8 Google Business Profile APIs — not just a surface-level connection.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { icon: '⭐', label: 'Review sync & replies' },
              { icon: '📊', label: 'Views, calls & clicks' },
              { icon: '🖼️', label: 'Photo management' },
              { icon: '✏️', label: 'Profile & hours editor' },
              { icon: '❓', label: 'Q&A management' },
              { icon: '📍', label: 'Booking & CTA links' },
              { icon: '✅', label: 'Listing verification' },
              { icon: '🔔', label: 'Google notifications' },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-xl border border-blue-100 p-4 text-center shadow-sm">
                <div className="text-2xl mb-2">{item.icon}</div>
                <p className="text-xs font-medium text-gray-700 leading-tight">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-blue-100 p-6 shadow-sm">
            <p className="text-sm font-semibold text-gray-700 mb-4">Our data commitment</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                'Only requests business.manage scope — no Gmail or personal data access',
                'OAuth token encrypted at rest, never shared with third parties',
                'Google data used solely to provide LocalApex features — never for ads',
                'Disconnect your Google account anytime from Settings',
                'Complies with Google API Services User Data Policy (Limited Use)',
                'All stored Google data deleted within 30 days of account deletion',
              ].map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-green-500 font-bold shrink-0 mt-0.5">✓</span>
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3">Up and running in 5 minutes</h2>
          <p className="text-gray-500 text-center mb-14">No technical setup required. Connect your Google account and you're done.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map(s => (
              <div key={s.step} className="relative">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center text-xl font-bold shrink-0">
                    {s.icon}
                  </div>
                  <span className="text-4xl font-black text-gray-100">{s.step}</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3">Simple, transparent pricing</h2>
          <p className="text-gray-500 text-center mb-14">Start free. Upgrade as your business grows. All plans include GBP integration.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLANS.map(p => (
              <div key={p.name}
                className={`rounded-2xl border p-6 flex flex-col relative ${
                  p.highlight ? 'border-brand-600 bg-brand-600 text-white shadow-xl shadow-brand-200' : 'border-gray-200 bg-white'
                }`}>
                {p.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
                    {p.badge}
                  </span>
                )}
                <p className={`text-sm font-bold mb-1 ${p.highlight ? 'text-brand-100' : 'text-gray-400'}`}>{p.name}</p>
                <div className="flex items-end gap-1 mb-5">
                  <span className="text-3xl font-extrabold">{p.price}</span>
                  {p.period && <span className={`text-sm mb-1 ${p.highlight ? 'text-brand-200' : 'text-gray-400'}`}>{p.period}</span>}
                </div>
                <ul className="space-y-2.5 flex-1 mb-6">
                  {p.features.map(f => (
                    <li key={f} className={`flex items-start gap-2 text-sm ${p.highlight ? 'text-brand-50' : 'text-gray-600'}`}>
                      <span className={`shrink-0 mt-0.5 ${p.highlight ? 'text-brand-200' : 'text-green-500'}`}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to={p.href}
                  className={`block text-center py-2.5 rounded-xl font-semibold text-sm transition ${
                    p.highlight ? 'bg-white text-brand-700 hover:bg-brand-50' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400 mt-6">All prices in INR + GST. Annual billing available at 20% off.</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently asked questions</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
                >
                  <span className="font-medium text-gray-900 text-sm">{faq.q}</span>
                  <span className={`text-gray-400 text-lg shrink-0 transition-transform ${openFaq === i ? 'rotate-45' : ''}`}>+</span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-brand-600 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to take control of your Google listing?</h2>
          <p className="text-brand-200 mb-10 text-lg">
            Join businesses across India using LocalApex to manage their Google presence, respond to reviews, and grow locally.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link to="/register"
              className="bg-white text-brand-700 px-8 py-3.5 rounded-xl font-bold text-base hover:bg-brand-50 transition shadow-lg">
              Create your free account →
            </Link>
            <a href="mailto:sales@mavericinfotech.in"
              className="border border-brand-400 text-white px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-brand-700 transition">
              Talk to us
            </a>
          </div>
          <p className="text-brand-300 text-sm mt-6">Free plan · No credit card · Setup in 5 minutes</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="font-bold text-gray-800 text-lg">LocalApex</p>
              <p className="text-sm text-gray-400">A product by <a href="https://mavericinfotech.in" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">Maveric InfoTech</a></p>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
              <Link to="/privacy" className="hover:text-gray-700">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-gray-700">Terms of Service</Link>
              <a href="mailto:support@mavericinfotech.in" className="hover:text-gray-700">Support</a>
              <a href="mailto:sales@mavericinfotech.in" className="hover:text-gray-700">Sales</a>
              <Link to="/login" className="hover:text-gray-700">Sign in</Link>
            </div>
          </div>
          <div className="border-t border-gray-100 mt-6 pt-6 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} Maveric InfoTech. All rights reserved. · GST: 27XXXXX0000X1Z5
          </div>
        </div>
      </footer>

    </div>
  )
}
