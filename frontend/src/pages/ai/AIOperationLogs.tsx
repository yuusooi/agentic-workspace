import { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Empty, message } from 'antd';
import { AuditOutlined } from '@ant-design/icons';
import * as aiApi from '@/lib/ai-api';

export default function AIOperationLogs() {
  const [logs, setLogs] = useState<aiApi.AIOperationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await aiApi.getAIOperationLogs({ page, size: 20 });
      setLogs(res.content);
      setTotal(res.totalElements);
    } catch {
      message.error('加载操作日志失败');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const columns = [
    {
      title: '操作人',
      dataIndex: 'user_name',
      key: 'user_name',
      width: 80,
      render: (v: string) => <span style={{ fontSize: 12, fontWeight: 500 }}>{v || '未知'}</span>,
    },
    {
      title: '用户指令',
      dataIndex: 'prompt',
      key: 'prompt',
      width: 180,
      render: (v: string) => (
        <span style={{ fontSize: 12 }} title={v}>
          {v && v.length > 30 ? v.slice(0, 30) + '...' : v}
        </span>
      ),
    },
    {
      title: 'AI输出',
      dataIndex: 'ai_output',
      key: 'ai_output',
      render: (v: string) => (
        <span style={{ fontSize: 12, color: '#615d59', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200, display: 'block' }} title={v}>
          {v}
        </span>
      ),
    },
    {
      title: '工具调用',
      dataIndex: 'tool_calls',
      key: 'tool_calls',
      width: 140,
      render: (v: unknown) => {
        if (!v) return <span style={{ fontSize: 12, color: '#a39e98' }}>无</span>;
        try {
          const obj = typeof v === 'string' ? JSON.parse(v) : v;
          if (Array.isArray(obj)) {
            return (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {obj.map((tc: Record<string, unknown>, i: number) => (
                  <Tag key={i} color="blue" style={{ fontSize: 10 }}>{String(tc.name || tc.tool || 'tool')}</Tag>
                ))}
              </div>
            );
          }
          if (typeof obj === 'object') {
            return <Tag color="blue" style={{ fontSize: 10 }}>{String((obj as Record<string, unknown>).name || (obj as Record<string, unknown>).tool || 'tool')}</Tag>;
          }
          return <Tag style={{ fontSize: 10 }}>{String(obj)}</Tag>;
        } catch {
          return <Tag style={{ fontSize: 10 }}>{String(v)}</Tag>;
        }
      },
    },
    {
      title: '用户操作',
      dataIndex: 'user_action',
      key: 'user_action',
      width: 90,
      render: (v: string) => {
        if (v === 'confirmed') return <Tag color="green">已确认</Tag>;
        if (v === 'rejected') return <Tag color="red">已拒绝</Tag>;
        if (v === 'auto_confirmed') return <Tag color="blue">自动执行</Tag>;
        if (v === 'chat') return <Tag color="default">对话</Tag>;
        if (v === 'pending') return <Tag color="orange">待确认</Tag>;
        if (v === 'error') return <Tag color="red">错误</Tag>;
        return <Tag>{v || '未知'}</Tag>;
      },
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: (v: string) => <span style={{ fontSize: 12, color: '#a39e98' }}>{v ? new Date(v).toLocaleString('zh-CN') : '-'}</span>,
    },
  ];

  return (
    <div className="app-layout-content" style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 20, color: 'rgba(0,0,0,.95)' }}>
          <AuditOutlined style={{ marginRight: 8 }} />
          AI 操作日志
        </h1>

        <Table
          dataSource={logs}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="middle"
          locale={{ emptyText: <Empty description="暂无操作日志" /> }}
          pagination={{
            current: page + 1,
            total,
            pageSize: 20,
            showSizeChanger: false,
            onChange: (p) => setPage(p - 1),
            showTotal: (t) => `共 ${t} 条`,
          }}
        />
      </div>
    </div>
  );
}
