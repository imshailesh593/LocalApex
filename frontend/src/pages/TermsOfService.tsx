export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-4">
        <a href="/" className="text-xl font-bold text-brand-700">LocalApex</a>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12 prose prose-gray">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: July 1, 2026</p>

        <p className="text-gray-700 leading-relaxed">
          These Terms of Service ("Terms") govern your access to and use of LocalApex, a product
          of Maveric InfoTech ("Company", "we", "our"). By creating an account or using LocalApex,
          you agree to these Terms.
        </p>

        <hr className="my-6" />

        <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-3">1. Description of Service</h2>
        <p className="text-gray-700">
          LocalApex is a multi-tenant Local SEO SaaS platform that helps businesses manage their
          Google Business Profile listings, monitor and respond to customer reviews, schedule social
          media posts, manage citations, and improve local search rankings.
        </p>

        <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-3">2. Account Registration</h2>
        <p className="text-gray-700">
          You must provide accurate information when creating an account. You are responsible for
          maintaining the confidentiality of your login credentials and for all activity under your
          account.
        </p>

        <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-3">3. Google Account Integration</h2>
        <p className="text-gray-700">
          LocalApex allows you to connect your Google account to access your Google Business Profile
          data. By connecting your Google account, you authorize LocalApex to:
        </p>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 mt-2">
          <li>Read your Google Business Profile locations, addresses, and contact information</li>
          <li>Read and display your customer reviews</li>
          <li>Post updates to your Google Business Profile on your explicit instruction</li>
        </ul>
        <p className="text-gray-700 mt-3">
          You may disconnect your Google account at any time from Settings. LocalApex will
          immediately stop accessing your Google data upon disconnection.
        </p>

        <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-3">4. Acceptable Use</h2>
        <p className="text-gray-700">You agree not to:</p>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 mt-2">
          <li>Use LocalApex to post false, misleading, or defamatory content</li>
          <li>Use the platform to send unsolicited communications (spam)</li>
          <li>Attempt to access other users' accounts or data</li>
          <li>Reverse-engineer, copy, or resell the LocalApex platform</li>
          <li>Violate Google's Terms of Service or Business Profile policies</li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-3">5. Subscription and Billing</h2>
        <p className="text-gray-700">
          LocalApex offers free and paid subscription plans. Paid plans are billed through
          Razorpay. Subscriptions auto-renew unless cancelled before the renewal date. No refunds
          are provided for partial billing periods.
        </p>

        <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-3">6. Data Ownership</h2>
        <p className="text-gray-700">
          You retain full ownership of your business data. LocalApex does not claim ownership of
          any content you create or import. You grant LocalApex a limited license to process your
          data solely to provide the service.
        </p>

        <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-3">7. Service Availability</h2>
        <p className="text-gray-700">
          We aim for 99.5% uptime but do not guarantee uninterrupted service. We are not liable
          for downtime caused by third-party services (Google APIs, Razorpay, etc.).
        </p>

        <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-3">8. Limitation of Liability</h2>
        <p className="text-gray-700">
          To the maximum extent permitted by law, Maveric InfoTech is not liable for any indirect,
          incidental, or consequential damages arising from your use of LocalApex.
        </p>

        <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-3">9. Termination</h2>
        <p className="text-gray-700">
          You may delete your account at any time from Settings. We may suspend or terminate
          accounts that violate these Terms. Upon termination, your data is deleted within 30 days.
        </p>

        <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-3">10. Governing Law</h2>
        <p className="text-gray-700">
          These Terms are governed by the laws of India. Any disputes shall be subject to the
          exclusive jurisdiction of courts in Pune, Maharashtra.
        </p>

        <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-3">11. Contact</h2>
        <div className="bg-gray-50 rounded-lg p-4 mt-3 text-gray-700 text-sm">
          <p><strong>Maveric InfoTech</strong></p>
          <p>Email: <a href="mailto:legal@mavericinfotech.in" className="text-brand-600">legal@mavericinfotech.in</a></p>
          <p>Website: <a href="https://mavericinfotech.in" className="text-brand-600">mavericinfotech.in</a></p>
        </div>
      </main>
      <footer className="border-t border-gray-100 px-6 py-6 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} Maveric InfoTech. All rights reserved.
      </footer>
    </div>
  )
}
