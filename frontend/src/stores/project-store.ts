import { create } from 'zustand';
import type { ProjectMember } from '@/lib/project-api';

export interface ProjectInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  created_by: string;
  created_at: string;
  my_role: 'PROJECT_OWNER' | 'PROJECT_MEMBER';
  owner: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

interface ProjectState {
  currentProject: ProjectInfo | null;
  members: ProjectMember[];
  setCurrentProject: (project: ProjectInfo | null) => void;
  setMembers: (members: ProjectMember[]) => void;
  clearCurrentProject: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProject: null,
  members: [],
  setCurrentProject: (project) => set({ currentProject: project }),
  setMembers: (members) => set({ members }),
  clearCurrentProject: () => set({ currentProject: null, members: [] }),
}));

/** Permission helpers */
export function isAdmin(user: { role: string } | null): boolean {
  return user?.role === 'ADMIN';
}

export function isProjectOwner(project: ProjectState['currentProject']): boolean {
  return project?.my_role === 'PROJECT_OWNER';
}

export function canCreateProject(user: { role: string; can_create_project: boolean } | null): boolean {
  return user?.role === 'ADMIN' || user?.can_create_project === true;
}

export function isProjectOwnerOrAdmin(user: { role: string } | null, project: ProjectState['currentProject']): boolean {
  return isAdmin(user) || isProjectOwner(project);
}
