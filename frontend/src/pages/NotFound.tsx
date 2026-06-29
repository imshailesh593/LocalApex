import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <p className="text-7xl font-bold text-gray-200">404</p>
        <h1 className="text-xl font-semibold text-gray-800">Page not found</h1>
        <p className="text-sm text-gray-500">The page you're looking for doesn't exist.</p>
        <Link to="/" className="inline-block bg-brand-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700">
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
