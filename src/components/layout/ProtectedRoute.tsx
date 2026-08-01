import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from '../../hooks/useAuth';

export function ProtectedRoute() {
  const { data: session, isLoading } = useSession();

  if (isLoading) {
    return <div className="p-4 text-sm text-slate-300">Checking session...</div>;
  }

  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}
