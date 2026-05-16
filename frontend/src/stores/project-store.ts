import { create } from 'zustand';

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
  setCurrentProject: (project: ProjectInfo | null) => void;
  clearCurrentProject: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProject: null,
  setCurrentProject: (project) => set({ currentProject: project }),
  clearCurrentProject: () => set({ currentProject: null }),
}));

/** Permission helpers */
export function isProjectOwner(project: ProjectState['currentProject']): boolean {
  return project?.my_role === 'PROJECT_OWNER';
}

export function canCreateProject(user: { role: string; can_create_project: boolean } | null): boolean {
  return user?.role === 'ADMIN' || user?.can_create_project === true;
}
