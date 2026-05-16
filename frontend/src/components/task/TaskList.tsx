import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Table, Tag, Avatar, Empty, Spin, message } from 'antd';
import { useTaskStore, buildQueryParams } from '@/stores/task-store';
import * as taskApi from '@/lib/task-api';
import type { Task } from '@/lib/task-api';
import TagBadge from './TagBadge';

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#a39e98',
  MEDIUM: '#615d59',
  HIGH: '#0075de',
  URGENT: '#dd5b00',
};

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  TODO: { bg: 'rgba(163,158,152,.08)', color: '#a39e98', label: '待办' },
  IN_PROGRESS: { bg: 'rgba(0,117,222,.06)', color: '#0075de', label: '进行中' },
  DONE: { bg: 'rgba(26,174,57,.06)', color: '#1aae39', label: '已完成' },
};

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function TaskList() {
  const { id: projectId } = useParams<{ id: string }>();
  const tasks = useTaskStore((s) => s.tasks);
  const totalElements = useTaskStore((s) => s.totalElements);
  const currentPage = useTaskStore((s) => s.currentPage);
  const pageSize = useTaskStore((s) => s.pageSize);
  const loading = useTaskStore((s) => s.loading);
  const filter = useTaskStore((s) => s.filter);
  const setTasks = useTaskStore((s) => s.setTasks);
  const setPage = useTaskStore((s) => s.setPage);
  const setLoading = useTaskStore((s) => s.setLoading);
  const openDrawer = useTaskStore((s) => s.openDrawer);
  const setProjectTags = useTaskStore((s) => s.setProjectTags);

  const loadTasks = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const params = buildQueryParams({ filter, currentPage, pageSize });
      const res = await taskApi.getTasks(projectId, params);
      setTasks(res.content, res.totalElements, res.totalPages);
    } catch {
      message.error('加载任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    if (!projectId) return;
    try {
      const tags = await taskApi.getProjectTags(projectId);
      setProjectTags(tags);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    loadTasks();
  }, [projectId, filter, currentPage, pageSize]);

  useEffect(() => {
    loadTags();
  }, [projectId]);

  const columns = [
    {
      title: '任务',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Task) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: PRIORITY_COLORS[record.priority] || '#a39e98',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'rgba(0,0,0,.95)',
              cursor: 'pointer',
            }}
            onClick={() => {
              taskApi.getTaskDetail(record.id).then((detail) => {
                openDrawer('view', detail);
              });
            }}
          >
            {title}
          </span>
          {record.ai_summary && (
            <Tag style={{ fontSize: 10, background: '#f2f9ff', color: '#0075de', borderRadius: 9999, padding: '0 4px', margin: 0, lineHeight: '18px' }}>
              AI
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 200,
      render: (tags: taskApi.TaskTag[]) => (
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {tags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} />
          ))}
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: taskApi.TaskStatus) => {
        const cfg = STATUS_STYLES[status] || STATUS_STYLES.TODO;
        return (
          <span
            style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 9999,
              background: cfg.bg,
              color: cfg.color,
              fontWeight: 500,
            }}
          >
            {cfg.label}
          </span>
        );
      },
    },
    {
      title: '截止日期',
      dataIndex: 'deadline',
      key: 'deadline',
      width: 90,
      render: (deadline: string | null, record: Task) => {
        const isOverdue = deadline && new Date(deadline) < new Date() && record.status !== 'DONE';
        return (
          <span style={{
            fontSize: 12,
            color: isOverdue ? '#dd5b00' : '#a39e98',
            fontWeight: isOverdue ? 500 : 400,
          }}>
            {formatDate(deadline)}
          </span>
        );
      },
    },
    {
      title: '负责人',
      dataIndex: 'assignees',
      key: 'assignees',
      width: 100,
      render: (assignees: taskApi.TaskAssignee[]) => (
        <div style={{ display: 'flex' }}>
          {assignees.slice(0, 3).map((a, i) => (
            <Avatar
              key={a.id}
              size={22}
              src={a.avatar}
              style={{
                marginLeft: i > 0 ? -4 : 0,
                backgroundColor: '#31302e',
                fontSize: 10,
                border: '2px solid #fff',
              }}
            >
              {a.name[0]}
            </Avatar>
          ))}
          {assignees.length > 3 && (
            <span style={{ fontSize: 11, color: '#a39e98', marginLeft: 4 }}>
              +{assignees.length - 3}
            </span>
          )}
        </div>
      ),
    },
  ];

  if (loading && tasks.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin />
      </div>
    );
  }

  if (!loading && tasks.length === 0) {
    return (
      <Empty description="暂无任务" style={{ marginTop: 40 }} />
    );
  }

  return (
    <Table
      dataSource={tasks}
      columns={columns}
      rowKey="id"
      loading={loading}
      size="middle"
      pagination={{
        current: currentPage + 1,
        pageSize,
        total: totalElements,
        showSizeChanger: false,
        onChange: (page) => setPage(page - 1),
        showTotal: (total) => `共 ${total} 条`,
        style: { margin: '8px 0' },
      }}
      onRow={(record) => ({
        onClick: () => {
          taskApi.getTaskDetail(record.id).then((detail) => {
            openDrawer('view', detail);
          });
        },
        style: { cursor: 'pointer' },
      })}
      style={{ fontSize: 13 }}
    />
  );
}
