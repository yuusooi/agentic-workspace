import apiClient from './api-client';
import { useAuthStore } from '@/stores/auth-store';
import { createParser } from 'eventsource-parser';

export interface AIToolCall {
  tool: string;
  params: Record<string, unknown>;
  result_count?: number;
}

export interface AIDiffPreview {
  task: string;
  field: string;
  old: string;
  new: string;
}

export interface AIChatSession {
  id: number;
  user_id: number;
  project_id: number;
  title: string;
  created_at: string;
  message_count: number;
}

export interface AIChatMessage {
  id: number;
  session_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tool_calls: unknown;
  references: unknown;
  created_at: string;
}

export interface AIOperationLog {
  id: number;
  user_id: number;
  user_name: string;
  prompt: string;
  ai_thinking: string;
  tool_calls: unknown;
  ai_output: string;
  diff_preview: unknown;
  user_action: string;
  executed_action: unknown;
  created_at: string;
}

export interface SSEEvent {
  type: 'thinking' | 'tool_call' | 'answer' | 'diff_preview' | 'confirmation_required' | 'error';
  [key: string]: unknown;
}

export type SSEEventHandler = (event: SSEEvent) => void;

export async function getAIChatSessions(params?: {
  page?: number;
  size?: number;
}): Promise<{ content: AIChatSession[]; totalElements: number; totalPages: number }> {
  const res = await apiClient.get('/ai/chat-sessions', { params });
  return res.data;
}

export async function getAIChatSessionDetail(id: number): Promise<AIChatSession & { messages: AIChatMessage[] }> {
  const res = await apiClient.get(`/ai/chat-sessions/${id}`);
  return res.data;
}

export async function deleteAIChatSession(id: number): Promise<void> {
  await apiClient.delete(`/ai/chat-sessions/${id}`);
}

export async function confirmAIAction(operationId: string, action: 'confirmed' | 'rejected' | 'modified', modifications?: Record<string, unknown>): Promise<void> {
  await apiClient.post('/ai/confirm', { operation_id: operationId, action, modifications });
}

export async function getAIOperationLogs(params?: {
  page?: number;
  size?: number;
}): Promise<{ content: AIOperationLog[]; totalElements: number; totalPages: number }> {
  const res = await apiClient.get('/ai/logs', { params });
  return res.data;
}

export async function suggestTags(data: { task_id: string }): Promise<{ suggested_tags: { name: string; confidence: number }[] }> {
  const res = await apiClient.post('/ai/suggest/tags', data);
  return res.data;
}

export async function suggestEffort(data: { task_id: string }): Promise<{ estimated_hours: { min: number; max: number; reason: string } }> {
  const res = await apiClient.post('/ai/suggest/effort', data);
  return res.data;
}

export async function suggestAssignee(data: { task_id: string }): Promise<{ suggested_assignee: { user_id: string; name: string; reason: string }[] }> {
  const res = await apiClient.post('/ai/suggest/assignee', data);
  return res.data;
}

export async function generateSummary(data: { task_id: string }): Promise<{ summary: string }> {
  const res = await apiClient.post('/ai/summary', data);
  return res.data;
}

export function sendAICommand(
  projectId: string,
  command: string,
  onEvent: SSEEventHandler,
  signal?: AbortSignal,
): Promise<void> {
  const token = useAuthStore.getState().accessToken;

  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch('/api/ai/command', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ project_id: projectId, command }),
        signal,
      });

      if (!response.ok || !response.body) {
        reject(new Error('SSE connection failed'));
        return;
      }

      const reader = response.body.getReader();
      const parser = createParser({
        onEvent(event) {
          try {
            const data = JSON.parse(event.data || '{}') as SSEEvent;
            data.type = (event.event || 'answer') as SSEEvent['type'];
            onEvent(data);
          } catch {
            // skip malformed JSON
          }
        },
      });

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.feed(decoder.decode(value, { stream: true }));
      }
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

export function streamProjectHealth(
  projectId: string,
  onEvent: SSEEventHandler,
  signal?: AbortSignal,
): Promise<void> {
  const token = useAuthStore.getState().accessToken;

  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/health`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        signal,
      });

      if (!response.ok || !response.body) {
        reject(new Error('SSE connection failed'));
        return;
      }

      const reader = response.body.getReader();
      const parser = createParser({
        onEvent(event) {
          try {
            const data = JSON.parse(event.data || '{}') as SSEEvent;
            data.type = (event.event || 'answer') as SSEEvent['type'];
            onEvent(data);
          } catch {
            // skip
          }
        },
      });

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.feed(decoder.decode(value, { stream: true }));
      }
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

export interface HealthDimension {
  name: string;
  score: number;
  label: string;
}

export interface HealthRisk {
  id: string;
  title: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
}

export interface HealthSuggestion {
  id: string;
  title: string;
  description: string;
}

export interface ProjectHealth {
  score: number;
  dimensions: HealthDimension[];
  risks: HealthRisk[];
  suggestions: HealthSuggestion[];
}
