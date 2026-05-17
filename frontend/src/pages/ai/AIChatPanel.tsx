import { useState, useRef, useEffect, useCallback } from 'react';
import { Button, Input, Avatar, Spin, Select, Tag } from 'antd';
import { SendOutlined, RobotOutlined, LoadingOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/auth-store';
import { useProjectStore } from '@/stores/project-store';
import * as projectApi from '@/lib/project-api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  loading?: boolean;
  toolCall?: {
    tool: string;
    params: any;
  };
  needsConfirm?: boolean;
  operationId?: string;
}

interface ProjectOption {
  id: string;
  name: string;
}

const TOOL_LABELS: Record<string, string> = {
  search_tasks: '搜索任务',
  update_task: '更新任务',
  update_task_status: '更新状态',
  set_priority: '设置优先级',
  assign_task: '分配负责人',
  create_task: '创建任务',
  batch_update_tasks: '批量更新',
  suggest_tags: '推荐标签',
  estimate_effort: '估算工时',
  recommend_assignee: '推荐负责人',
  generate_summary: '生成摘要',
  analyze_project_health: '分析健康度',
};

export default function AIChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const user = useAuthStore((s) => s.user);
  const currentProject = useProjectStore((s) => s.currentProject);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (currentProject?.id) {
      setSelectedProjectId(currentProject.id);
    }
  }, [currentProject]);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await projectApi.getMyProjects({ size: 100 });
        const options = (res.content || []).map((p: any) => ({
          id: String(p.id),
          name: p.name,
        }));
        setProjectOptions(options);
      } catch {
        // silent
      }
    };
    loadProjects();
  }, []);

  const sendMessage = useCallback(async (prompt: string) => {
    if (!prompt.trim() || sending) return;

    const projectId = selectedProjectId;
    if (!projectId) {
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '请先选择一个项目，这样我才能帮您执行操作。',
      }]);
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setSending(true);

    const assistantMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      loading: true,
    }]);

    let fullContent = '';

    try {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const token = useAuthStore.getState().accessToken;
      const response = await fetch('/api/ai/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          project_id: Number(projectId),
          command: prompt.trim(),
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim();
            continue;
          }
          if (!line.startsWith('data:')) {
            currentEvent = '';
            continue;
          }
          const data = line.slice(5).trim();
          if (!data) continue;

          try {
            const parsed = JSON.parse(data);

            if (currentEvent === 'answer' && parsed.content) {
              fullContent += parsed.content;
              setMessages((prev) => prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: fullContent, loading: false }
                  : msg
              ));
            }

            if (currentEvent === 'thinking' && parsed.content) {
              setMessages((prev) => prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: fullContent || '🤔 ' + parsed.content, loading: true }
                  : msg
              ));
            }

            if (currentEvent === 'tool_call' && parsed.tool) {
              const toolMsgId = `tool-${Date.now()}`;
              setMessages((prev) => [...prev, {
                id: toolMsgId,
                role: 'tool',
                content: '',
                toolCall: { tool: parsed.tool, params: parsed.params },
              }]);
            }

            if (currentEvent === 'confirmation_required' && parsed.operation_id) {
              setMessages((prev) => prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                    ...msg,
                    content: fullContent + '\n\n🔒 以上操作需要您确认后才会执行。',
                    loading: false,
                    needsConfirm: true,
                    operationId: parsed.operation_id,
                  }
                  : msg
              ));
            }

            if (currentEvent === 'diff_preview' && parsed) {
              const diffMsgId = `diff-${Date.now()}`;
              setMessages((prev) => [...prev, {
                id: diffMsgId,
                role: 'tool',
                content: '',
                toolCall: { tool: 'diff_preview', params: parsed },
              }]);
            }

            if (currentEvent === 'error' && parsed.message) {
              fullContent += `\n\n❌ ${parsed.message}`;
              setMessages((prev) => prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: fullContent, loading: false }
                  : msg
              ));
            }
          } catch {
            // skip
          }
          currentEvent = '';
        }
      }

      setMessages((prev) => prev.map((msg) =>
        msg.id === assistantMessageId
          ? { ...msg, content: fullContent || '操作已完成', loading: false }
          : msg
      ));

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setMessages((prev) => prev.map((msg) =>
        msg.id === assistantMessageId
          ? { ...msg, content: '抱歉，AI服务暂时不可用，请稍后重试。', loading: false }
          : msg
      ));
    } finally {
      setSending(false);
      abortControllerRef.current = null;
    }
  }, [sending, selectedProjectId]);

  const handleConfirm = useCallback(async (operationId: string, action: 'confirmed' | 'rejected') => {
    try {
      const token = useAuthStore.getState().accessToken;
      await fetch('/api/ai/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ operation_id: operationId, action }),
      });
      setMessages((prev) => prev.map((msg) =>
        msg.operationId === operationId
          ? {
            ...msg,
            content: msg.content.replace('🔒 以上操作需要您确认后才会执行。', action === 'confirmed' ? '✅ 操作已确认执行。' : '🚫 操作已取消。'),
            needsConfirm: false,
          }
          : msg
      ));
    } catch {
      // silent
    }
  }, []);

  const handleSend = () => {
    sendMessage(inputValue);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
        {messages.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#a39e98',
          }}>
            <div style={{
              width: 56,
              height: 56,
              background: 'linear-gradient(135deg, #0075de 0%, #6366f1 100%)',
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}>
              <RobotOutlined style={{ color: '#fff', fontSize: 28 }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(0,0,0,.88)' }}>欢迎使用 AI 智能助手</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              我可以帮您分析项目、管理任务、执行操作
            </div>
            {projectOptions.length > 0 && (
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#615d59' }}>当前项目：</span>
                <Select
                  value={selectedProjectId || undefined}
                  onChange={setSelectedProjectId}
                  placeholder="选择项目以获取精准回答"
                  allowClear
                  style={{ width: 240 }}
                  options={projectOptions.map((p) => ({ value: p.id, label: p.name }))}
                />
              </div>
            )}
            <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 440 }}>
              {['帮我总结本周工作', '分析项目健康度', '将首页性能优化标记为紧急', '推荐任务负责人'].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  style={{
                    padding: '8px 16px',
                    background: '#f6f5f4',
                    borderRadius: 9999,
                    fontSize: 13,
                    color: '#615d59',
                    border: '1px solid rgba(0,0,0,.06)',
                    cursor: 'pointer',
                    transition: 'all .15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0,117,222,.08)';
                    e.currentTarget.style.color = '#0075de';
                    e.currentTarget.style.borderColor = 'rgba(0,117,222,.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f6f5f4';
                    e.currentTarget.style.color = '#615d59';
                    e.currentTarget.style.borderColor = 'rgba(0,0,0,.06)';
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{ display: 'flex', gap: 12 }}>
                <Avatar
                  size={32}
                  style={{
                    backgroundColor: msg.role === 'user' ? '#31302e' : msg.role === 'tool' ? '#52c41a' : '#0075de',
                    fontSize: 12,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {msg.role === 'user' ? user?.nickname?.[0] || '?' : msg.role === 'tool' ? '⚡' : 'AI'}
                </Avatar>
                <div style={{ maxWidth: '75%' }}>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: msg.role === 'user' ? 'rgba(0,0,0,.95)' : msg.role === 'tool' ? '#52c41a' : '#0075de',
                    marginBottom: 4,
                  }}>
                    {msg.role === 'user' ? user?.nickname : msg.role === 'tool' ? '工具调用' : 'AI 助手'}
                  </div>
                  {msg.role === 'tool' && msg.toolCall ? (
                    <div style={{
                      background: '#f6ffed',
                      border: '1px solid #b7eb8f',
                      padding: '8px 12px',
                      borderRadius: 8,
                      fontSize: 13,
                    }}>
                      <Tag color="green" style={{ marginRight: 4 }}>
                        <ThunderboltOutlined /> {TOOL_LABELS[msg.toolCall.tool] || msg.toolCall.tool}
                      </Tag>
                      <span style={{ color: '#595959' }}>
                        {formatToolParams(msg.toolCall.tool, msg.toolCall.params)}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div style={{
                        background: msg.role === 'user' ? '#0075de' : '#f6f5f4',
                        color: msg.role === 'user' ? '#fff' : 'rgba(0,0,0,.95)',
                        padding: '10px 14px',
                        borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        fontSize: 14,
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                      }}>
                        {msg.loading ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Spin indicator={<LoadingOutlined style={{ fontSize: 14 }} spin />} />
                            <span>正在思考...</span>
                          </div>
                        ) : (
                          msg.content
                        )}
                      </div>
                      {msg.needsConfirm && msg.operationId && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                          <Button
                            type="primary"
                            size="small"
                            onClick={() => handleConfirm(msg.operationId!, 'confirmed')}
                          >
                            ✅ 确认执行
                          </Button>
                          <Button
                            size="small"
                            danger
                            onClick={() => handleConfirm(msg.operationId!, 'rejected')}
                          >
                            🚫 取消操作
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid rgba(0,0,0,.06)',
        background: '#fff',
      }}>
        {projectOptions.length > 0 && (
          <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#a39e98' }}>项目上下文：</span>
            <Select
              value={selectedProjectId || undefined}
              onChange={setSelectedProjectId}
              placeholder="选择项目以获取精准回答"
              allowClear
              size="small"
              style={{ width: 220 }}
              options={projectOptions.map((p) => ({ value: p.id, label: p.name }))}
            />
          </div>
        )}
        <div style={{ display: 'flex', gap: 12 }}>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入您的问题或指令..."
            style={{ flex: 1 }}
            disabled={sending}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            loading={sending}
            disabled={!inputValue.trim() || sending}
          >
            发送
          </Button>
        </div>
        <div style={{
          fontSize: 11,
          color: '#a39e98',
          marginTop: 8,
          textAlign: 'center',
        }}>
          AI 可以执行操作（如修改优先级、更新状态），请根据实际情况判断
        </div>
      </div>
    </div>
  );
}

function formatToolParams(tool: string, params: any): string {
  if (!params) return '';
  switch (tool) {
    case 'set_priority':
      return `任务 #${params.task_id} → 优先级: ${params.priority}`;
    case 'update_task_status':
      return `任务 #${params.task_id} → 状态: ${params.status}`;
    case 'update_task':
      return `任务 #${params.task_id} → ${params.field || ''}: ${params.value || ''}`;
    case 'assign_task':
      return `任务 #${params.task_id} → 分配给用户 #${params.user_id}`;
    case 'create_task':
      return `新建任务: ${params.title}`;
    case 'search_tasks':
      return `搜索项目 #${params.project_id} 的任务`;
    case 'diff_preview':
      return '变更预览';
    default:
      return JSON.stringify(params);
  }
}
