import apiClient from './api-client';
import { useAuthStore } from '@/stores/auth-store';
import { createParser } from 'eventsource-parser';

export interface KnowledgeBase {
  id: string;
  project_id: string;
  name: string;
  description: string;
  document_count: number;
  chunk_count: number;
  created_at: string;
}

export interface KnowledgeDocument {
  id: string;
  knowledge_base_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  chunk_count: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  created_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
}

export async function getKnowledgeBases(projectId: string): Promise<KnowledgeBase[]> {
  const res = await apiClient.get(`/projects/${projectId}/knowledge-bases`);
  return res.data;
}

export async function createKnowledgeBase(
  projectId: string,
  payload: { name: string; description?: string },
): Promise<KnowledgeBase> {
  const res = await apiClient.post(`/projects/${projectId}/knowledge-bases`, payload);
  return res.data;
}

export async function updateKnowledgeBase(
  projectId: string,
  kbId: string,
  payload: { name?: string; description?: string },
): Promise<void> {
  await apiClient.put(`/projects/${projectId}/knowledge-bases/${kbId}`, payload);
}

export async function deleteKnowledgeBase(
  projectId: string,
  kbId: string,
): Promise<void> {
  await apiClient.delete(`/projects/${projectId}/knowledge-bases/${kbId}`);
}

export async function getDocuments(kbId: string): Promise<KnowledgeDocument[]> {
  const res = await apiClient.get(`/knowledge-bases/${kbId}/documents`);
  return res.data;
}

export async function uploadDocument(kbId: string, file: File): Promise<KnowledgeDocument> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post(`/knowledge-bases/${kbId}/documents`, formData);
  return res.data;
}

export async function deleteDocument(docId: string): Promise<void> {
  await apiClient.delete(`/documents/${docId}`);
}

export async function getDocumentChunks(docId: string): Promise<DocumentChunk[]> {
  const res = await apiClient.get(`/documents/${docId}/chunks`);
  return res.data;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function askKnowledgeBase(
  kbId: string,
  question: string,
  onEvent: (event: { type: string; content?: string; references?: unknown }) => void,
  signal?: AbortSignal,
  history?: ChatMessage[],
): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  console.log('askKnowledgeBase - kbId:', kbId, 'token:', token ? 'exists' : 'missing');
  
  const res = await fetch(`/api/knowledge-bases/${kbId}/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ question, history }),
    signal,
  });
  
  console.log('askKnowledgeBase - response status:', res.status);
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`请求失败: ${res.status} ${errorText}`);
  }
  
  if (!res.body) throw new Error('No response body');

  const reader = res.body.getReader();
  const parser = createParser({
    onEvent(event) {
      const eventType = event.event || 'message';
      if (eventType === 'message') {
        onEvent({ type: 'message', content: event.data });
      } else if (eventType === 'done') {
        onEvent({ type: 'done' });
      } else if (eventType === 'error') {
        onEvent({ type: 'error', content: event.data });
      } else if (eventType === 'references') {
        try {
          const refs = JSON.parse(event.data);
          onEvent({ type: 'references', references: refs });
        } catch {
          onEvent({ type: 'references', references: [] });
        }
      }
    },
  });

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    parser.feed(decoder.decode(value, { stream: true }));
  }
}
