import { useState, useEffect } from 'react';
import { Drawer, Avatar, Select, Popconfirm, Input, message, Empty, Spin } from 'antd';
import { DeleteOutlined, TeamOutlined } from '@ant-design/icons';
import * as projectApi from '@/lib/project-api';
import { useAuthStore } from '@/stores/auth-store';

interface MemberDrawerProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  myRole: 'PROJECT_OWNER' | 'PROJECT_MEMBER' | null;
  onMemberClick?: (userId: string) => void;
}

const ROLE_OPTIONS = [
  { value: 'PROJECT_OWNER', label: '负责人' },
  { value: 'PROJECT_MEMBER', label: '成员' },
];

export default function MemberDrawer({
  open,
  onClose,
  projectId,
  myRole,
  onMemberClick,
}: MemberDrawerProps) {
  const [members, setMembers] = useState<projectApi.ProjectMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviting, setInviting] = useState(false);
  const user = useAuthStore((s) => s.user);
  const isOwner = myRole === 'PROJECT_OWNER';

  const loadMembers = async () => {
    setLoading(true);
    try {
      const list = await projectApi.getProjectMembers(projectId);
      setMembers(list);
    } catch {
      message.error('加载成员列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && projectId) loadMembers();
  }, [open, projectId]);

  const handleInvite = async () => {
    if (!inviteUsername.trim()) return;
    setInviting(true);
    try {
      const member = await projectApi.inviteProjectMember(projectId, inviteUsername.trim());
      setMembers((prev) => [...prev, member]);
      setInviteUsername('');
      message.success('邀请成功');
    } catch {
      message.error('邀请失败，请检查用户名');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, role: 'PROJECT_OWNER' | 'PROJECT_MEMBER') => {
    try {
      await projectApi.updateMemberRole(projectId, memberId, role);
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role } : m)),
      );
      message.success('角色已更新');
    } catch {
      message.error('更新角色失败');
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      await projectApi.removeProjectMember(projectId, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      message.success('已移除成员');
    } catch {
      message.error('移除失败');
    }
  };

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TeamOutlined />
          成员管理
          <span style={{ fontSize: 12, color: '#a39e98', fontWeight: 400 }}>
            ({members.length} 人)
          </span>
        </div>
      }
      open={open}
      onClose={onClose}
      width={400}
      styles={{ body: { padding: '12px 0' } }}
    >
      {isOwner && (
        <div style={{ padding: '0 16px 12px', borderBottom: '1px solid rgba(0,0,0,.06)', marginBottom: 8 }}>
          <Input.Search
            value={inviteUsername}
            onChange={(e) => setInviteUsername(e.target.value)}
            placeholder="输入用户名邀请成员"
            enterButton="邀请"
            loading={inviting}
            onSearch={handleInvite}
            maxLength={30}
          />
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : members.length === 0 ? (
        <Empty description="暂无成员" style={{ marginTop: 40 }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {members.map((member) => {
            const isSelf = member.user_id === user?.id;
            return (
              <div
                key={member.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 16px',
                  cursor: onMemberClick ? 'pointer' : undefined,
                  transition: 'background .1s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,.02)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
                onClick={() => onMemberClick?.(member.user_id)}
              >
                <Avatar
                  size={32}
                  src={member.user.avatar}
                  style={{
                    backgroundColor: '#31302e',
                    fontSize: 13,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {member.user.name[0]}
                </Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(0,0,0,.95)' }}>
                    {member.user.name}
                    {isSelf && (
                      <span style={{ fontSize: 11, color: '#a39e98', marginLeft: 4, fontWeight: 400 }}>
                        (你)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#a39e98' }}>
                    {member.user.email}
                  </div>
                </div>
                {isOwner && !isSelf ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={member.role}
                      onChange={(role) => handleRoleChange(member.id, role)}
                      options={ROLE_OPTIONS}
                      size="small"
                      style={{ width: 90 }}
                      popupMatchSelectWidth={false}
                    />
                    <Popconfirm
                      title={`确认移除成员「${member.user.name}」？`}
                      onConfirm={() => handleRemove(member.id)}
                      okText="移除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                    >
                      <DeleteOutlined
                        style={{ color: '#a39e98', cursor: 'pointer', fontSize: 13 }}
                      />
                    </Popconfirm>
                  </div>
                ) : (
                  <span
                    style={{
                      fontSize: 11,
                      color: member.role === 'PROJECT_OWNER' ? '#0075de' : '#a39e98',
                      background: member.role === 'PROJECT_OWNER' ? 'rgba(0,117,222,.06)' : '#f6f5f4',
                      padding: '1px 8px',
                      borderRadius: 9999,
                      fontWeight: 500,
                    }}
                  >
                    {member.role === 'PROJECT_OWNER' ? '负责人' : '成员'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}
