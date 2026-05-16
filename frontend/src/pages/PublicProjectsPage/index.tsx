import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Empty, Spin, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { getPublicProjects, type ProjectListItem } from '@/lib/project-api';

const ICON_COLORS = ['#0075de', '#615d59', '#31302e', '#a39e98', '#1aae39', '#dd5b00'];

export default function PublicProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPublicProjects();
      setProjects(data);
    } catch {
      message.error('加载公开项目失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filtered = keyword.trim()
    ? projects.filter(
        (p) =>
          p.name.toLowerCase().includes(keyword.toLowerCase()) ||
          p.description?.toLowerCase().includes(keyword.toLowerCase())
      )
    : projects;

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
        <span style={{ fontSize: 14, fontWeight: 600 }}>公开项目</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
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
              公开项目
            </div>
            <div style={{ fontSize: 14, color: '#a39e98', marginTop: 2 }}>
              浏览所有公开项目
            </div>
          </div>
          <Input
            placeholder="搜索项目..."
            prefix={<SearchOutlined style={{ color: '#a39e98' }} />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 260 }}
            allowClear
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin size="large" />
          </div>
        ) : filtered.length === 0 ? (
          <Empty
            description={keyword ? '未找到匹配的项目' : '暂无公开项目'}
            style={{ marginTop: 60 }}
          />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}>
            {filtered.map((project, idx) => (
              <PublicProjectCard
                key={project.id}
                project={project}
                color={ICON_COLORS[idx % ICON_COLORS.length]}
                onClick={() => navigate(`/projects/${project.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function PublicProjectCard({
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
        <div style={{ flex: 1, minWidth: 0 }}>
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
      </div>

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

      <div style={{
        display: 'flex',
        gap: 16,
        fontSize: 12,
        color: '#a39e98',
      }}>
        <span>创建者: {project.owner?.name || '未知'}</span>
        {project.my_role && (
          <span>{project.my_role === 'PROJECT_OWNER' ? '负责人' : '成员'}</span>
        )}
      </div>
    </div>
  );
}
