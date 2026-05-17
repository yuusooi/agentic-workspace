import { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Empty, message } from 'antd';
import { AuditOutlined } from '@ant-design/icons';
import * as aiApi from '@/lib/ai-api';

export default function AIOperationLogs() {
  const [logs, setLogs] = useState<aiApi.AIOperationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
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
      title: '操作类型',
      dataIndex: 'operation_type',
      key: 'operation_type',
      width: 120,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: '目标',
      key: 'target',
      width: 120,
      render: (_: unknown, record: aiApi.AIOperationLog) => (
        <div>
          <Tag style={{ fontSize: 10 }}>{record.executed_action}</Tag>
          <span style={{ fontSize: 11, color: '#a39e98' }}>{record.id.slice(0, 8)}...</span>
        </div>
      ),
    },
    {
      title: '详情',
      dataIndex: 'details',
      key: 'details',
      render: (v: string) => (
        <span style={{ fontSize: 12, color: '#615d59', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200, display: 'block' }}>
          {v}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (s: 'success' | 'failed') => (
        <Tag color={s === 'success' ? 'green' : 'red'}>{s === 'success' ? '成功' : '失败'}</Tag>
      ),
    },
    {
      title: '时间',
      dataIndex: 'performed_at',
      key: 'performed_at',
      width: 140,
      render: (v: string) => <span style={{ fontSize: 12, color: '#a39e98' }}>{new Date(v).toLocaleString('zh-CN')}</span>,
    },
  ];

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
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
