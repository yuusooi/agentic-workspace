import apiClient from './api-client';

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  is_system: boolean;
  columns: { name: string; color: string; status_mapping: string }[];
  created_by: string | null;
  created_at: string;
}

export interface TemplateListResponse {
  content: ProjectTemplate[];
  totalElements: number;
}

export async function getProjectTemplates(params?: {
  category?: string;
  page?: number;
  size?: number;
}): Promise<TemplateListResponse> {
  const res = await apiClient.get('/templates', { params });
  return res.data;
}

export async function createProjectTemplate(payload: {
  name: string;
  description?: string;
  category?: string;
  columns: { name: string; color: string; status_mapping: string }[];
}): Promise<ProjectTemplate> {
  const res = await apiClient.post('/templates', payload);
  return res.data;
}

export async function deleteProjectTemplate(templateId: string): Promise<void> {
  await apiClient.delete(`/templates/${templateId}`);
}

export async function createProjectFromTemplate(payload: {
  template_id: string;
  name: string;
  description?: string;
  icon?: string;
  visibility?: 'PUBLIC' | 'PRIVATE';
}): Promise<{ id: string }> {
  const res = await apiClient.post('/projects/from-template', payload);
  return res.data;
}
