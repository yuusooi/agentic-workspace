import type { ReactNode } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useProjectStore, isProjectOwner } from '@/stores/project-store';

export function isAdmin(): boolean {
  return useAuthStore.getState().user?.role === 'ADMIN';
}

export function canCreateProject(): boolean {
  const user = useAuthStore.getState().user;
  return user?.role === 'ADMIN' || user?.canCreateProject === true;
}

export function isProjectOwnerOfCurrent(): boolean {
  return isProjectOwner(useProjectStore.getState().currentProject);
}

export function canManageProject(): boolean {
  const user = useAuthStore.getState().user;
  const project = useProjectStore.getState().currentProject;
  return user?.role === 'ADMIN' || project?.myRole === 'PROJECT_OWNER';
}

interface CanAccessProps {
  children: ReactNode;
  admin?: boolean;
  projectOwner?: boolean;
  projectMember?: boolean;
  canCreate?: boolean;
  fallback?: ReactNode;
}

export function CanAccess({
  children,
  admin,
  projectOwner,
  projectMember,
  canCreate,
  fallback = null,
}: CanAccessProps) {
  const user = useAuthStore((s) => s.user);
  const project = useProjectStore((s) => s.currentProject);

  if (admin && user?.role !== 'ADMIN') return <>{fallback}</>;
  if (canCreate && !canCreateProject()) return <>{fallback}</>;
  if (projectOwner && project?.myRole !== 'PROJECT_OWNER' && user?.role !== 'ADMIN') return <>{fallback}</>;
  if (projectMember && !project?.myRole && user?.role !== 'ADMIN') return <>{fallback}</>;

  return <>{children}</>;
}

interface ShowForOwnerProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ShowForOwner({ children, fallback = null }: ShowForOwnerProps) {
  const user = useAuthStore((s) => s.user);
  const project = useProjectStore((s) => s.currentProject);

  if (user?.role === 'ADMIN' || project?.myRole === 'PROJECT_OWNER') {
    return <>{children}</>;
  }
  return <>{fallback}</>;
}
