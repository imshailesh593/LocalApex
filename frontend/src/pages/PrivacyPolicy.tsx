export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-4">
        <a href="/" className="text-xl font-bold text-brand-700">LocalApex</a>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12 prose prose-gray">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: July 1, 2026</p>

        <p className="text-gray-700 leading-relaxed">
          LocalApex ("we", "our", or "us") is a Local SEO SaaS platform built and operated by
          Maveric InfoTech. This Privacy Policy explains how we collect, use, disclose, and
          safeguard your information when you use our platform at{' '}
          <a href="https://localapex.mavericinfotech.in" className="text-brand-600">
            localapex.mavericinfotech.in
          </a>.
        </p>

        <hr className="my-6" />

        <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-3">1. Information We Collect</h2>

        <h3 className="text-base font-semibold text-gray-700 mt-5 mb-2">1.1 Account Information</h3>
        <p className="text-gray-700">When you register, we collect your name, email address, and business name.</p>

        <h3 className="text-base font-semibold text-gray-700 mt-5 mb-2">1.2 Google Business Profile Data</h3>
        <p className="text-gray-700">
          When you connect your Google account, LocalApex requests access to your Google Business
          Profile data using the scope{' '}
          <code className="bg-gray-100 px-1 rounded text-sm">https://www.googleapis.com/auth/business.manage</code>.
          This allows us to:
        </p>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 mt-2">
          <li>Read your business location names, addresses, phone numbers, and websites</li>
          <li>Import your Google Business Profile locations into LocalApex</li>
          <li>Read and display your customer reviews for reputation management</li>
          <li>Post updates and offers to your Google Business Profile on your behalf</li>
          <li>Monitor your business listing health and local SEO performance</li>
        </ul>
        <p className="text-gray-700 mt-3">
          We access only the minimum data necessary to provide the features you use. We do not
          sell, rent, or share your Google Business Profile data with any third parties.
        </p>

        <h3 className="text-base font-semibold text-gray-700 mt-5 mb-2">1.3 Usage Data</h3>
        <p className="text-gray-700">
          We collect standard server logs including IP address, browser type, pages visited, and
          timestamps to operate and improve the platform.
        </p>

        <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-3">2. How We Use Your Information</h2>
        <ul className="list-disc pl-6 text-gray-700 space-y-1">
          <li>To import and display your Google Business Profile locations and reviews</li>
          <li>To schedule and publish posts to your connected social accounts</li>
          <li>To send review request emails to your customers on your behalf</li>
          <li>To generate AI-powered responses to reviews</li>
          <li>To provide analytics and local SEO reporting for your business</li>
          <li>To send transactional notifications (new reviews, alerts)</li>
          <li>To improve the LocalApex platform</li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-3">3. Google API Data Usage</h2>
        <p className="text-gray-700">
          LocalApex's use and transfer to any other app of information received from Google APIs
          will adhere to the{' '}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
        <p className="text-gray-700 mt-3">Specifically:</p>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 mt-2">
          <li>We only request Google data necessary for the features described above</li>
          <li>We do not use Google data for advertising or to build user profiles for advertising</li>
          <li>We do not sell Google user data</li>
          <li>We do not transfer Google data to third parties except as necessary to provide the service</li>
          <li>We store Google OAuth refresh tokens securely in our encrypted database</li>
          <li>You can revoke access at any time from your Google Account settings at <a href="https://myaccount.google.com/permissions" className="text-brand-600">myaccount.google.com/permissions</a></li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-3">4. Data Retention</h2>
        <p className="text-gray-700">
          We retain your data for as long as your account is active. If you delete your account,
          we permanently delete all your data within 30 days. Google OAuth tokens are immediately
          revoked when you disconnect your Google account from LocalApex.
        </p>

        <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-3">5. Data Security</h2>
        <p className="text-gray-700">
          We implement industry-standard security measures including encrypted connections (HTTPS),
          hashed passwords (bcrypt), and secure token storage. We do not store Google account
          passwords.
        </p>

        <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-3">6. Third-Party Services</h2>
        <p className="text-gray-700">We use the following third-party services:</p>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 mt-2">
          <li><strong>Google Business Profile API</strong> — to read and manage your business listings</li>
          <li><strong>Zernio</strong> — to schedule and publish social media posts</li>
          <li><strong>Resend</strong> — to send transactional emails</li>
          <li><strong>Razorpay</strong> — to process subscription payments</li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-3">7. Your Rights</h2>
        <p className="text-gray-700">You have the right to:</p>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 mt-2">
          <li>Access the data we hold about you</li>
          <li>Correct inaccurate data</li>
          <li>Delete your account and all associated data</li>
          <li>Export your data (available in Settings → Export Data)</li>
          <li>Revoke Google account access at any time</li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-3">8. Children's Privacy</h2>
        <p className="text-gray-700">
          LocalApex is not directed at children under 13. We do not knowingly collect data from
          children.
        </p>

        <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-3">9. Changes to This Policy</h2>
        <p className="text-gray-700">
          We may update this policy from time to time. We will notify you by email and update the
          "Last updated" date at the top.
        </p>

        <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-3">10. Contact Us</h2>
        <p className="text-gray-700">
          If you have questions about this Privacy Policy or how we handle your data, contact us at:
        </p>
        <div className="bg-gray-50 rounded-lg p-4 mt-3 text-gray-700 text-sm">
          <p><strong>Maveric InfoTech</strong></p>
          <p>Email: <a href="mailto:privacy@mavericinfotech.in" className="text-brand-600">privacy@mavericinfotech.in</a></p>
          <p>Website: <a href="https://mavericinfotech.in" className="text-brand-600">mavericinfotech.in</a></p>
        </div>
      </main>
      <footer className="border-t border-gray-100 px-6 py-6 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} Maveric InfoTech. All rights reserved.
      </footer>
    </div>
  )
}
