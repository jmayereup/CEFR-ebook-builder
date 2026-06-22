import { Loader2 } from 'lucide-react';
import { lazy, Suspense } from 'react';

const AdminUsersDashboard = lazy(
  () => import('../components/AdminUsersDashboard'),
);

interface AdminPageProps {
  currentAdminEmail: string | null;
  showAlert: (
    title: string,
    message: string,
    type?: 'info' | 'error' | 'warning',
  ) => void;
  onRefreshCache?: () => void;
}

export default function AdminPage({
  currentAdminEmail,
  showAlert,
  onRefreshCache,
}: AdminPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center p-12 bg-tj-bg-card rounded-2xl border border-tj-border-main shadow-sm text-tj-text-muted">
          <Loader2 className="h-8 w-8 animate-spin text-[#4f46e5] dark:text-[#6366f1] mb-2" />
          <p className="text-sm font-medium">Loading admin dashboard...</p>
        </div>
      }
    >
      <AdminUsersDashboard
        currentAdminEmail={currentAdminEmail}
        onShowAlert={showAlert}
        onRefreshCache={onRefreshCache}
      />
    </Suspense>
  );
}
