import { useState, useRef } from 'react';
import { Modal, Spin, message, Progress, Tag, Empty, Button } from 'antd';
import { HeartOutlined, ExclamationCircleOutlined, BulbOutlined } from '@ant-design/icons';
import { streamProjectHealth } from '@/lib/ai-api';
import type { ProjectHealth } from '@/lib/ai-api';

const DIMENSION_LABELS: Record<string, string> = {
  progress: '进度',
  overdue: '逾期',
  workload: '负载',
  blocking: '阻塞',
  priority: '优先级',
};

const SEVERITY_COLORS: Record<string, string> = {
  high: '#dd5b00',
  medium: '#0075de',
  low: '#a39e98',
};

function getScoreColor(score: number): string {
  if (score >= 80) return '#1aae39';
  if (score >= 60) return '#0075de';
  return '#dd5b00';
}

function getGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

interface ProjectHealthPanelProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

export default function ProjectHealthPanel({ open, onClose, projectId }: ProjectHealthPanelProps) {
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<ProjectHealth | null>(null);
  const [thinkingText, setThinkingText] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const loadHealth = async () => {
    if (!projectId) return;
    setLoading(true);
    setHealth(null);
    setThinkingText('');

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      await streamProjectHealth(
        projectId,
        (event) => {
          switch (event.type) {
            case 'thinking':
              setThinkingText((event.content as string) || '正在分析...');
              break;
            case 'answer':
              try {
                const data = typeof event.content === 'string' ? JSON.parse(event.content) : event;
                if (data.score !== undefined) {
                  setHealth(data as ProjectHealth);
                }
              } catch {
                // not JSON, ignore
              }
              break;
            case 'error':
              message.error((event.message as string) || '获取健康度失败');
              break;
          }
        },
        abortController.signal,
      );
    } catch {
      if (!abortController.signal.aborted) {
        message.error('获取健康度失败');
      }
    } finally {
      setLoading(false);
      setThinkingText('');
    }
  };

  const handleClose = () => {
    abortRef.current?.abort();
    onClose();
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <HeartOutlined style={{ color: '#0075de' }} />
          项目健康度
        </div>
      }
      open={open}
      onCancel={handleClose}
      afterOpenChange={(visible) => { if (visible) loadHealth(); }}
      footer={health ? <Button onClick={loadHealth} loading={loading}>重新分析</Button> : null}
      width={600}
    >
      {loading && !health ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          {thinkingText && (
            <div style={{ marginTop: 12, fontSize: 13, color: '#a39e98' }}>{thinkingText}</div>
          )}
        </div>
      ) : !health ? (
        <Empty description="暂无数据" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <Progress
              type="dashboard"
              percent={health.score}
              strokeColor={getScoreColor(health.score)}
              format={(p) => (
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: getScoreColor(health.score) }}>{p}</div>
                  <div style={{ fontSize: 14, color: '#a39e98' }}>{getGrade(health.score)}</div>
                </div>
              )}
              size={140}
            />
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'rgba(0,0,0,.95)' }}>
              五维度指标
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {health.dimensions.map((d) => (
                <div key={d.name} style={{ textAlign: 'center', padding: '8px 4px', background: '#f6f5f4', borderRadius: 8 }}>
                  <Progress
                    type="circle"
                    percent={d.score}
                    size={50}
                    strokeColor={getScoreColor(d.score)}
                    format={(p) => <span style={{ fontSize: 12, fontWeight: 600 }}>{p}</span>}
                  />
                  <div style={{ fontSize: 11, color: '#615d59', marginTop: 4 }}>
                    {d.label || DIMENSION_LABELS[d.name] || d.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {health.risks.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(0,0,0,.95)' }}>
                <ExclamationCircleOutlined style={{ color: '#dd5b00' }} />
                风险项
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {health.risks.map((r) => (
                  <div key={r.id} style={{ padding: '6px 10px', background: '#f6f5f4', borderRadius: 6, fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <Tag color={SEVERITY_COLORS[r.severity]} style={{ fontSize: 10, margin: 0, lineHeight: '16px', padding: '0 4px' }}>
                        {r.severity === 'high' ? '高' : r.severity === 'medium' ? '中' : '低'}
                      </Tag>
                      <span style={{ fontWeight: 500, color: 'rgba(0,0,0,.95)' }}>{r.title}</span>
                    </div>
                    <div style={{ color: '#615d59' }}>{r.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {health.suggestions.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(0,0,0,.95)' }}>
                <BulbOutlined style={{ color: '#0075de' }} />
                AI 建议
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {health.suggestions.map((s) => (
                  <div key={s.id} style={{ padding: '6px 10px', background: 'rgba(0,117,222,.04)', borderRadius: 6, fontSize: 12 }}>
                    <div style={{ fontWeight: 500, color: 'rgba(0,0,0,.95)', marginBottom: 2 }}>{s.title}</div>
                    <div style={{ color: '#615d59' }}>{s.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
