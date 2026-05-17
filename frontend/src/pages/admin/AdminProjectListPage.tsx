import { useState, useEffect, useCallback } from 'react';
import { Table, Input, Tag, Avatar, message, Button } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import * as adminApi from '@/lib/admin-api';
import type { AdminProject } from '@/lib/admin-api';

export default function AdminProjectListPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAdminProjects({ page: currentPage, size: 20, keyword: keyword || undefined });
      setProjects(res.content);
      setTotalElements(res.totalElements);
    } catch {
      message.error('加载项目列表失败');
    } finally {
      setLoading(false);
    }
  }, [currentPage, keyword]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const columns = [
    {
      title: '项目',
      key: 'project',
      render: (_: unknown, record: AdminProject) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#0075de',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              color: '#fff',
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            {record.icon || record.name[0]}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(0,0,0,.95)' }}>{record.name}</div>
            {record.description && (
              <div style={{ fontSize: 11, color: '#a39e98', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                {record.description}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: '可见性',
      dataIndex: 'visibility',
      key: 'visibility',
      width: 80,
      render: (v: string) => (
        <Tag color={v === 'PUBLIC' ? 'blue' : 'default'} style={{ fontSize: 11 }}>
          {v === 'PUBLIC' ? '公开' : '私有'}
        </Tag>
      ),
    },
    {
      title: '创建者',
      key: 'owner',
      width: 120,
      render: (_: unknown, record: AdminProject) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Avatar size={20} src={record.owner.avatar} style={{ backgroundColor: '#31302e', fontSize: 9 }}>
            {record.owner.name[0]}
          </Avatar>
          <span style={{ fontSize: 12 }}>{record.owner.name}</span>
        </div>
      ),
    },
    {
      title: '成员',
      dataIndex: 'member_count',
      key: 'member_count',
      width: 70,
      render: (count: number) => <span style={{ fontSize: 12, color: '#615d59' }}>{count}</span>,
    },
    {
      title: '任务',
      dataIndex: 'task_count',
      key: 'task_count',
      width: 70,
      render: (count: number) => <span style={{ fontSize: 12, color: '#615d59' }}>{count}</span>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 100,
      render: (iso: string) => (
        <span style={{ fontSize: 12, color: '#a39e98' }}>
          {new Date(iso).toLocaleDateString('zh-CN')}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 70,
      render: (_: unknown, record: AdminProject) => (
        <Button
          type="link"
          size="small"
          onClick={() => navigate(`/projects/${record.id}`)}
          style={{ fontSize: 12, padding: 0 }}
        >
          查看
        </Button>
      ),
    },
  ];

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3, margin: 0, marginBottom: 20, color: 'rgba(0,0,0,.95)' }}>
          全部项目
        </h1>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Input
            placeholder="搜索项目名称..."
            prefix={<SearchOutlined style={{ color: '#a39e98' }} />}
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setCurrentPage(0); }}
            allowClear
            style={{ width: 300 }}
          />
          <Button icon={<ReloadOutlined />} onClick={loadProjects}>
            刷新
          </Button>
        </div>

        <Table
          dataSource={projects}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="middle"
          pagination={{
            current: currentPage + 1,
            pageSize: 20,
            total: totalElements,
            showSizeChanger: false,
            onChange: (page) => setCurrentPage(page - 1),
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </div>
    </div>
  );
}
