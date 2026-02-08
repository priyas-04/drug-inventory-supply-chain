import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { AppRole } from '@/types/roles';

interface Props {
  children: React.ReactNode;
  requiredRoles?: AppRole[];
}

export default function ProtectedRoute({ children, requiredRoles }: Props) {
  const { user, loading, roles } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (requiredRoles && requiredRoles.length > 0) {
    const hasAccess = requiredRoles.some(r => roles.includes(r));
    if (!hasAccess) return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
