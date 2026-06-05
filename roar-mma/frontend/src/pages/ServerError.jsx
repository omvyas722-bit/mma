import { Link } from 'react-router-dom';

export default function ServerError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Server Error</h1>
        <p className="text-sm text-gray-600 mb-6">Something went wrong on our end. Please try again later.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => window.location.reload()} className="btn-primary text-sm">Refresh Page</button>
          <Link to="/dashboard" className="btn-secondary text-sm">Go to Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
