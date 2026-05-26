// Loading Skeleton Components for Better UX
export default function Skeleton({ width, height, className = '', variant = 'rectangular' }) {
  const variants = {
    rectangular: 'rounded',
    circular: 'rounded-full',
    text: 'rounded h-4',
  };

  return (
    <div
      className={`animate-pulse bg-gray-200 ${variants[variant]} ${className}`}
      style={{ width, height }}
    />
  );
}

// Text skeleton
export function TextSkeleton({ lines = 1, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? '80%' : '100%'}
        />
      ))}
    </div>
  );
}

// Card skeleton
export function CardSkeleton({ className = '' }) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="space-y-4">
        <Skeleton width="60%" height="24px" />
        <TextSkeleton lines={3} />
        <div className="flex gap-2">
          <Skeleton width="80px" height="32px" />
          <Skeleton width="80px" height="32px" />
        </div>
      </div>
    </div>
  );
}

// Table skeleton
export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-6 py-3">
                <Skeleton width="80%" height="16px" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-6 py-4">
                  <Skeleton width="90%" height="16px" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// List skeleton
export function ListSkeleton({ items = 5, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-lg shadow">
          <Skeleton variant="circular" width="48px" height="48px" />
          <div className="flex-1 space-y-2">
            <Skeleton width="40%" height="16px" />
            <Skeleton width="60%" height="14px" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Profile skeleton
export function ProfileSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start gap-6">
        <Skeleton variant="circular" width="80px" height="80px" />
        <div className="flex-1 space-y-4">
          <Skeleton width="200px" height="32px" />
          <TextSkeleton lines={2} />
          <div className="flex gap-2">
            <Skeleton width="100px" height="36px" />
            <Skeleton width="100px" height="36px" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Stats card skeleton
export function StatsCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-3">
          <Skeleton width="60%" height="16px" />
          <Skeleton width="40%" height="32px" />
          <Skeleton width="50%" height="14px" />
        </div>
        <Skeleton variant="circular" width="48px" height="48px" />
      </div>
    </div>
  );
}

// Chart skeleton
export function ChartSkeleton({ className = '' }) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <Skeleton width="40%" height="24px" className="mb-6" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-end gap-2">
            <Skeleton
              width="100%"
              height={`${Math.random() * 100 + 50}px`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Calendar skeleton
export function CalendarSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <Skeleton width="32px" height="32px" />
          <Skeleton width="150px" height="24px" />
          <Skeleton width="32px" height="32px" />
        </div>
      </div>
      <div className="grid grid-cols-7 border-b">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="p-3 text-center border-r">
            <Skeleton width="40px" height="16px" className="mx-auto" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="min-h-32 border-r border-b p-2">
            <Skeleton width="24px" height="24px" className="mb-2" />
            <div className="space-y-1">
              <Skeleton width="100%" height="20px" />
              <Skeleton width="80%" height="20px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Form skeleton
export function FormSkeleton({ fields = 4 }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <Skeleton width="40%" height="28px" className="mb-6" />
      <div className="space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i}>
            <Skeleton width="30%" height="16px" className="mb-2" />
            <Skeleton width="100%" height="40px" />
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-6 pt-6 border-t">
        <Skeleton width="100px" height="40px" />
        <Skeleton width="100px" height="40px" />
      </div>
    </div>
  );
}

// Dashboard skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton width="200px" height="36px" />

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

// Page skeleton with header
export function PageSkeleton({ children }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton width="200px" height="36px" />
        <Skeleton width="120px" height="40px" />
      </div>
      {children || <TableSkeleton />}
    </div>
  );
}

// Usage examples:
/*
import { TableSkeleton, CardSkeleton, DashboardSkeleton } from './components/Shared/LoadingSkeleton';

// In your component:
function MembersPage() {
  const { data: members, isLoading } = useQuery(['members']);

  if (isLoading) {
    return <TableSkeleton rows={10} columns={6} />;
  }

  return (
    <table>
      {members.map(member => (
        <tr key={member.id}>...</tr>
      ))}
    </table>
  );
}

// Dashboard
function Dashboard() {
  const { isLoading } = useQuery(['dashboard']);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return <div>...</div>;
}

// Custom skeleton
<div className="space-y-4">
  <Skeleton width="200px" height="32px" />
  <TextSkeleton lines={3} />
  <div className="flex gap-2">
    <Skeleton width="100px" height="40px" />
    <Skeleton width="100px" height="40px" />
  </div>
</div>
*/
