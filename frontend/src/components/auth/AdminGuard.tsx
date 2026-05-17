import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';

interface AdminGuardProps {
  children: ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const user = useAuthStore((s) => s.user);

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
