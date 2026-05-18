import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Empty, Spin, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/auth-store';
import { canCreateProject } from '@/stores/project-store';
import { getMyProjects, type ProjectListItem } from '@/lib/project-api';
import CreateProjectModal from '@/components/CreateProjectModal';

const ICON_COLORS = ['#0075de', '#615d59', '#31302e', '#a39e98', '#1aae39', '#dd5b00'];

export default function ProjectListPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMyProjects();
      setProjects(data.content || []);
    } catch {
      message.error('加载项目列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const showCreate = canCreateProject(user);

  return (
    <>
      {/* Header */}
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
        <span style={{ fontSize: 14, fontWeight: 600 }}>项目列表</span>
      </div>

      {/* Content */}
      <div className="app-layout-content" style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        {/* Title bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}>
          <div>
            <div style={{
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: -0.3,
              color: 'rgba(0,0,0,.95)',
            }}>
              项目列表
            </div>
            <div style={{ fontSize: 14, color: '#a39e98', marginTop: 2 }}>
              你参与的 {projects.length} 个项目
            </div>
          </div>
          {showCreate && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalOpen(true)}
            >
              创建项目
            </Button>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin size="large" />
          </div>
        ) : projects.length === 0 ? (
          <Empty
            description="暂无项目"
            style={{ marginTop: 60 }}
          >
            {showCreate && (
              <Button type="primary" onClick={() => setModalOpen(true)}>
                创建第一个项目
              </Button>
            )}
          </Empty>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}>
            {projects.map((project, idx) => {
              const colorIdx = idx % ICON_COLORS.length;
              return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  color={ICON_COLORS[colorIdx]}
                  onClick={() => navigate(`/projects/${project.id}`)}
                />
              );
            })}
          </div>
        )}
      </div>

      <CreateProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          setModalOpen(false);
          fetchProjects();
        }}
      />
    </>
  );
}

function ProjectCard({
  project,
  color,
  onClick,
}: {
  project: ProjectListItem;
  color: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        border: `1px solid ${hovered ? 'rgba(0,0,0,.15)' : 'rgba(0,0,0,.1)'}`,
        borderRadius: 12,
        padding: 20,
        cursor: 'pointer',
        transition: 'all .15s',
        boxShadow: hovered ? '0 4px 24px rgba(0,0,0,.12)' : '0 1px 2px rgba(0,0,0,.04)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 16,
          color: '#fff',
          flexShrink: 0,
        }}>
          {project.icon || project.name[0]}
        </div>
        <div style={{
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: -0.2,
          color: 'rgba(0,0,0,.95)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {project.name}
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <div style={{
          fontSize: 13,
          color: '#615d59',
          marginBottom: 12,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: 1.5,
        }}>
          {project.description}
        </div>
      )}

      {/* Stats */}
      <div style={{
        display: 'flex',
        gap: 16,
        fontSize: 12,
        color: '#a39e98',
      }}>
        <span>{project.visibility === 'PUBLIC' ? '公开' : '私有'}</span>
        <span>{project.myRole === 'PROJECT_OWNER' ? '负责人' : '成员'}</span>
      </div>
    </div>
  );
}
