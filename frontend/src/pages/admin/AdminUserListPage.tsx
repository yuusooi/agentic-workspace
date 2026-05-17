import { useState, useEffect, useCallback } from 'react';
import {
  Table, Input, Select, Switch, Avatar, message, Button,
} from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import * as adminApi from '@/lib/admin-api';
import type { AdminUser } from '@/lib/admin-api';

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: '管理员' },
  { value: 'USER', label: '普通用户' },
];

export default function AdminUserListPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAdminUsers({ page: currentPage, size: 20, keyword: keyword || undefined });
      setUsers(res.content);
      setTotalElements(res.totalElements);
    } catch {
      message.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  }, [currentPage, keyword]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleRoleChange = async (userId: string, role: 'ADMIN' | 'USER') => {
    try {
      await adminApi.updateAdminUserRole(userId, role);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
      message.success('角色已更新');
    } catch {
      message.error('更新角色失败');
    }
  };

  const handleStatusToggle = async (userId: string, checked: boolean) => {
    try {
      const newStatus = checked ? 1 : 0;
      await adminApi.toggleAdminUserStatus(userId, newStatus);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u)));
      message.success(checked ? '已启用' : '已禁用');
    } catch {
      message.error('更新状态失败');
    }
  };

  const handleCanCreateToggle = async (userId: string, canCreate: boolean) => {
    try {
      await adminApi.updateAdminUserCanCreateProject(userId, canCreate);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, canCreateProject: canCreate } : u)));
      message.success('已更新');
    } catch {
      message.error('更新失败');
    }
  };

  const columns = [
    {
      title: '用户',
      key: 'user',
      render: (_: unknown, record: AdminUser) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar size={28} src={record.avatar} style={{ backgroundColor: '#31302e', fontSize: 12 }}>
            {record.nickname[0]}
          </Avatar>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(0,0,0,.95)' }}>{record.nickname}</div>
            <div style={{ fontSize: 11, color: '#a39e98' }}>@{record.username}</div>
          </div>
        </div>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200,
      render: (email: string) => <span style={{ fontSize: 12, color: '#615d59' }}>{email}</span>,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: 'ADMIN' | 'USER', record: AdminUser) => (
        <Select
          value={role}
          onChange={(v) => handleRoleChange(record.id, v)}
          options={ROLE_OPTIONS}
          size="small"
          style={{ width: 100 }}
        />
      ),
    },
    {
      title: '创建项目',
      dataIndex: 'canCreateProject',
      key: 'canCreateProject',
      width: 90,
      render: (can: boolean, record: AdminUser) => (
        <Switch
          size="small"
          checked={can}
          onChange={(v) => handleCanCreateToggle(record.id, v)}
        />
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: number, record: AdminUser) => (
        <Switch
          size="small"
          checked={status === 1}
          onChange={(v) => handleStatusToggle(record.id, v)}
        />
      ),
    },
  ];

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3, margin: 0, marginBottom: 20, color: 'rgba(0,0,0,.95)' }}>
          用户管理
        </h1>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Input
            placeholder="搜索用户名或邮箱..."
            prefix={<SearchOutlined style={{ color: '#a39e98' }} />}
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setCurrentPage(0); }}
            allowClear
            style={{ width: 300 }}
          />
          <Button icon={<ReloadOutlined />} onClick={loadUsers}>
            刷新
          </Button>
        </div>

        <Table
          dataSource={users}
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
