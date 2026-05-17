import { create } from 'zustand';
import type { ProjectMember } from '@/lib/project-api';

export interface ProjectInfo {
  id: string;
  name: string;
  description: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  ownerId: string;
  ownerName: string;
  myRole: 'PROJECT_OWNER' | 'PROJECT_MEMBER' | null;
  createdAt: string;
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

export function isAdmin(user: { role: string } | null): boolean {
  return user?.role === 'ADMIN';
}

export function isProjectOwner(project: ProjectState['currentProject']): boolean {
  return project?.myRole === 'PROJECT_OWNER';
}

export function canCreateProject(user: { role: string; canCreateProject: boolean } | null): boolean {
  return user?.role === 'ADMIN' || user?.canCreateProject === true;
}

export function isProjectOwnerOrAdmin(user: { role: string } | null, project: ProjectState['currentProject']): boolean {
  return isAdmin(user) || isProjectOwner(project);
}
