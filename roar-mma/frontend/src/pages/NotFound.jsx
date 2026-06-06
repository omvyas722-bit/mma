import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
        <p className="text-sm text-gray-600 mb-6">The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/dashboard" className="btn-primary text-sm">Go to Dashboard</Link>
      </div>
    </div>
  );
}
