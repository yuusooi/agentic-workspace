import { useState, useEffect, useRef } from 'react';
import { Input, Button, Spin, message } from 'antd';
import {
  SendOutlined,
  CloseOutlined,
  CheckOutlined,
  StopOutlined,
  RobotOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useProjectStore } from '@/stores/project-store';
import { sendAICommand, confirmAIAction } from '@/lib/ai-api';
import type { AIToolCall, AIDiffPreview } from '@/lib/ai-api';

interface PanelMessage {
  role: 'user' | 'assistant';
  content: string;
  thinking?: boolean;
  toolCalls?: AIToolCall[];
  diffPreviews?: AIDiffPreview[];
  confirmationRequired?: boolean;
  operationId?: string;
  error?: boolean;
}

interface AICommandPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function AICommandPanel({ open, onClose }: AICommandPanelProps) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<PanelMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [thinking, setThinking] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentProject = useProjectStore((s) => s.currentProject);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleSend = async () => {
    if (!query.trim() || streaming || !currentProject?.id) return;

    const userMessage: PanelMessage = { role: 'user', content: query.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setQuery('');
    setStreaming(true);
    setThinking(true);

    const assistantMessage: PanelMessage = {
      role: 'assistant',
      content: '',
      thinking: true,
    };
    setMessages((prev) => [...prev, assistantMessage]);

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      await sendAICommand(
        currentProject.id,
        userMessage.content,
        (event) => {
          switch (event.type) {
            case 'thinking':
              setThinking(true);
              break;

            case 'answer':
              setThinking(false);
              if (event.content) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last.role === 'assistant') {
                    updated[updated.length - 1] = {
                      ...last,
                      content: last.content + (event.content as string),
                      thinking: false,
                    };
                  }
                  return updated;
                });
              }
              break;

            case 'tool_call':
              setThinking(false);
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    thinking: false,
                    toolCalls: [...(last.toolCalls || []), event as unknown as AIToolCall],
                  };
                }
                return updated;
              });
              break;

            case 'diff_preview':
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === 'assistant') {
                  const changes = (event.changes || []) as AIDiffPreview[];
                  updated[updated.length - 1] = {
                    ...last,
                    diffPreviews: [...(last.diffPreviews || []), ...changes],
                  };
                }
                return updated;
              });
              break;

            case 'confirmation_required':
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    confirmationRequired: true,
                    operationId: event.operation_id as string,
                  };
                }
                return updated;
              });
              break;

            case 'error':
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    content: (event.message as string) || '发生未知错误',
                    error: true,
                    thinking: false,
                  };
                }
                return updated;
              });
              break;
          }
        },
        abortController.signal,
      );
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              content: '连接失败，请稍后重试',
              error: true,
              thinking: false,
            };
          }
          return updated;
        });
      }
    } finally {
      setStreaming(false);
      setThinking(false);
      abortRef.current = null;
    }
  };

  const handleConfirm = async (operationId: string, action: 'confirmed' | 'rejected') => {
    try {
      await confirmAIAction(operationId, action);
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === 'assistant') {
          updated[updated.length - 1] = {
            ...last,
            confirmationRequired: false,
            content: last.content + (action === 'confirmed' ? '\n\n✅ 已确认执行' : '\n\n❌ 已拒绝操作'),
          };
        }
        return updated;
      });
      message.success(action === 'confirmed' ? '已确认执行' : '已拒绝操作');
    } catch {
      message.error('操作失败');
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setStreaming(false);
    setThinking(false);
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,.3)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        paddingTop: 80,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 600,
          maxHeight: 'calc(100vh - 160px)',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(0,0,0,.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <ThunderboltOutlined style={{ color: '#0075de', fontSize: 16 }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>AI 助手</span>
          <span style={{ fontSize: 11, color: '#a39e98' }}>Ctrl+K</span>
          <div style={{ flex: 1 }} />
          <Button type="text" size="small" icon={<CloseOutlined />} onClick={onClose} style={{ color: '#a39e98' }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.length === 0 && !streaming && (
            <div style={{ textAlign: 'center', padding: 40, color: '#a39e98' }}>
              <RobotOutlined style={{ fontSize: 32, marginBottom: 12, display: 'block' }} />
              <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(0,0,0,.95)', marginBottom: 4 }}>
                有什么可以帮你？
              </div>
              <div style={{ fontSize: 12 }}>
                输入自然语言指令，AI 帮你管理任务
              </div>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              {msg.role === 'assistant' && (
                <div style={{
                  width: 24, height: 24, borderRadius: 6, background: '#0075de',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
                }}>
                  <ThunderboltOutlined style={{ color: '#fff', fontSize: 12 }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                {msg.thinking && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#a39e98', fontSize: 12 }}>
                    <Spin size="small" />
                    <span>思考中...</span>
                  </div>
                )}
                {msg.content && (
                  <div style={{
                    fontSize: 13, lineHeight: 1.6,
                    color: msg.error ? '#dd5b00' : 'rgba(0,0,0,.95)',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {msg.content}
                  </div>
                )}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                    {msg.toolCalls.map((tc, i) => (
                      <div key={i} style={{
                        padding: '6px 10px', background: '#f6f5f4', borderRadius: 6, fontSize: 12,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <span style={{ color: '#0075de', fontWeight: 500 }}>{tc.tool}</span>
                        <span style={{ color: '#a39e98' }}>{JSON.stringify(tc.params)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {msg.diffPreviews && msg.diffPreviews.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                    {msg.diffPreviews.map((dp, i) => (
                      <div key={i} style={{
                        padding: '8px 10px', background: '#f6f5f4', borderRadius: 6, fontSize: 12,
                        border: '1px solid rgba(0,0,0,.06)',
                      }}>
                        <div style={{ fontWeight: 500, marginBottom: 4, color: 'rgba(0,0,0,.95)' }}>{dp.task}</div>
                        <div style={{ fontSize: 11, color: '#615d59', marginBottom: 2 }}>{dp.field}</div>
                        <div style={{ color: '#dd5b00', textDecoration: 'line-through', fontSize: 11 }}>{dp.old || '(空)'}</div>
                        <div style={{ color: '#1aae39', fontSize: 11 }}>{dp.new}</div>
                      </div>
                    ))}
                  </div>
                )}
                {msg.confirmationRequired && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => msg.operationId && handleConfirm(msg.operationId, 'confirmed')}>
                      确认执行
                    </Button>
                    <Button size="small" danger icon={<CloseOutlined />} onClick={() => msg.operationId && handleConfirm(msg.operationId, 'rejected')}>
                      拒绝
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(0,0,0,.06)',
          display: 'flex',
          gap: 8,
        }}>
          <Input
            ref={inputRef as never}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入指令，如：创建一个高优先级任务..."
            onPressEnter={handleSend}
            disabled={streaming}
            style={{ flex: 1 }}
            maxLength={500}
          />
          {streaming ? (
            <Button icon={<StopOutlined />} onClick={handleStop} danger>停止</Button>
          ) : (
            <Button type="primary" icon={<SendOutlined />} onClick={handleSend} disabled={!query.trim()}>
              发送
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
