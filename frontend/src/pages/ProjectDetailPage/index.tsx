import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Tag, Button, message, Avatar, Descriptions } from 'antd';
import {
  ArrowLeftOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { getProjectDetail, type ProjectListItem } from '@/lib/project-api';
import { useProjectStore } from '@/stores/project-store';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const [project, setProject] = useState<ProjectListItem | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProject = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getProjectDetail(id);
      setProject(data);
      setCurrentProject({
        id: data.id,
        name: data.name,
        description: data.description,
        icon: data.icon,
        visibility: data.visibility,
        created_by: data.created_by,
        created_at: data.created_at,
        my_role: data.my_role,
        owner: data.owner,
      });
    } catch {
      message.error('加载项目详情失败');
    } finally {
      setLoading(false);
    }
  }, [id, setCurrentProject]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  if (loading) {
    return (
      <>
        <DetailHeader title="" onBack={() => navigate('/projects')} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spin size="large" />
        </div>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <DetailHeader title="项目不存在" onBack={() => navigate('/projects')} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: '#a39e98' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>404</div>
            <div style={{ fontSize: 14, marginBottom: 16 }}>项目不存在或您没有权限访问</div>
            <Button onClick={() => navigate('/projects')}>返回项目列表</Button>
          </div>
        </div>
      </>
    );
  }

  const isOwner = project.my_role === 'PROJECT_OWNER';

  return (
    <>
      <DetailHeader
        title={project.name}
        onBack={() => navigate('/projects')}
        extra={isOwner && (
          <Button icon={<SettingOutlined />} type="text" style={{ color: '#615d59' }}>
            项目设置
          </Button>
        )}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        <div style={{ maxWidth: 800 }}>
          {/* Project header card */}
          <div style={{
            background: '#fff',
            border: '1px solid rgba(0,0,0,.1)',
            borderRadius: 12,
            padding: 24,
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                background: '#0075de',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 24,
                color: '#fff',
                flexShrink: 0,
              }}>
                {project.icon || project.name[0]}
              </div>
              <div style={{ flex: 1 }}>
                <h1 style={{
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: -0.3,
                  margin: 0,
                  marginBottom: 4,
                  color: 'rgba(0,0,0,.95)',
                }}>
                  {project.name}
                </h1>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Tag color={project.visibility === 'PUBLIC' ? 'blue' : 'default'}>
                    {project.visibility === 'PUBLIC' ? '公开' : '私有'}
                  </Tag>
                  <Tag color={isOwner ? 'green' : 'default'}>
                    {isOwner ? '负责人' : '成员'}
                  </Tag>
                </div>
              </div>
            </div>

            {project.description && (
              <div style={{
                fontSize: 14,
                color: '#615d59',
                lineHeight: 1.6,
                marginBottom: 16,
              }}>
                {project.description}
              </div>
            )}

            <Descriptions
              column={2}
              size="small"
              labelStyle={{ color: '#a39e98', fontSize: 12 }}
              contentStyle={{ color: 'rgba(0,0,0,.95)', fontSize: 13 }}
            >
              <Descriptions.Item label="创建者">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Avatar
                    size={20}
                    style={{ backgroundColor: '#31302e', fontSize: 10 }}
                  >
                    {project.owner?.name?.[0] || '?'}
                  </Avatar>
                  {project.owner?.name || '未知'}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {new Date(project.created_at).toLocaleDateString('zh-CN')}
              </Descriptions.Item>
            </Descriptions>
          </div>

          {/* Quick actions */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 12,
          }}>
            <ActionCard
              icon={<TeamOutlined style={{ fontSize: 20 }} />}
              title="成员管理"
              description={`${isOwner ? '邀请、管理项目成员' : '查看项目成员'}`}
              color="#0075de"
            />
          </div>
        </div>
      </div>
    </>
  );
}

function DetailHeader({
  title,
  onBack,
  extra,
}: {
  title: string;
  onBack: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div style={{
      height: 44,
      minHeight: 44,
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 8,
      borderBottom: '1px solid rgba(0,0,0,.06)',
      background: '#fff',
    }}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={onBack}
        style={{ color: '#615d59' }}
      />
      <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{title}</span>
      {extra}
    </div>
  );
}

function ActionCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        background: hovered ? 'rgba(0,117,222,.04)' : '#fff',
        border: `1px solid ${hovered ? 'rgba(0,117,222,.15)' : 'rgba(0,0,0,.06)'}`,
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'all .15s',
      }}
    >
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 8,
        background: `${color}12`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color,
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,.95)' }}>{title}</div>
        <div style={{ fontSize: 12, color: '#a39e98' }}>{description}</div>
      </div>
    </div>
  );
}
