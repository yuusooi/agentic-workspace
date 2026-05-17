import { useState, useEffect } from 'react';
import {
  Drawer, Form, Input, Select, DatePicker, InputNumber,
  Button, Avatar, Divider, Popconfirm, message, Tag, Mentions,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useTaskStore } from '@/stores/task-store';
import { useAuthStore } from '@/stores/auth-store';
import { useProjectStore, isAdmin, isProjectOwnerOrAdmin } from '@/stores/project-store';
import * as taskApi from '@/lib/task-api';
import MarkdownEditor from './MarkdownEditor';
import TagSelector from './TagSelector';
import AttachmentUploader from './AttachmentUploader';
import AttachmentList from './AttachmentList';
import StatusHistoryTimeline from './StatusHistoryTimeline';
import AISuggestTags from '@/components/ai/AISuggestTags';
import AISuggestEffort from '@/components/ai/AISuggestEffort';
import AISuggestAssignee from '@/components/ai/AISuggestAssignee';
import AISummary from '@/components/ai/AISummary';

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: '低' },
  { value: 'MEDIUM', label: '中' },
  { value: 'HIGH', label: '高' },
  { value: 'URGENT', label: '紧急' },
];

const STATUS_OPTIONS = [
  { value: 'TODO', label: '待办' },
  { value: 'IN_PROGRESS', label: '进行中' },
  { value: 'DONE', label: '已完成' },
];

export default function TaskDrawer() {
  const drawerOpen = useTaskStore((s) => s.drawerOpen);
  const drawerMode = useTaskStore((s) => s.drawerMode);
  const currentTask = useTaskStore((s) => s.currentTask);
  const closeDrawer = useTaskStore((s) => s.closeDrawer);
  const projectTags = useTaskStore((s) => s.projectTags);
  const updateTaskInList = useTaskStore((s) => s.updateTaskInList);
  const removeTaskFromList = useTaskStore((s) => s.removeTaskFromList);
  const addTaskToList = useTaskStore((s) => s.addTaskToList);
  const setCurrentTask = useTaskStore((s) => s.setCurrentTask);

  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [comments, setComments] = useState<taskApi.TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const user = useAuthStore((s) => s.user);
  const currentProject = useProjectStore((s) => s.currentProject);
  const projectMembers = useProjectStore((s) => s.members);

  const isViewMode = drawerMode === 'view';
  const isCreateMode = drawerMode === 'create';
  const isEditMode = drawerMode === 'edit';

  const canEditTask = (() => {
    if (!user || !currentTask) return false;
    if (isAdmin(user) || isProjectOwnerOrAdmin(user, currentProject)) return true;
    if (currentTask.created_by === user.id || currentTask.assignees.some((a) => a.id === user.id)) return true;
    return false;
  })();

  const canDeleteTask = isAdmin(user) || isProjectOwnerOrAdmin(user, currentProject);

  useEffect(() => {
    if (drawerOpen && currentTask) {
      form.setFieldsValue({
        title: currentTask.title,
        priority: currentTask.priority,
        status: currentTask.status,
        deadline: currentTask.deadline ? new Date(currentTask.deadline) : null,
        estimated_hours: currentTask.estimated_hours,
        actual_hours: currentTask.actual_hours,
      });
      setEditDescription(currentTask.description || '');
      setEditTags(currentTask.tags.map((t) => t.id));
      loadComments(currentTask.id);
    } else if (drawerOpen && isCreateMode) {
      form.resetFields();
      setEditDescription('');
      setEditTags([]);
    }
  }, [drawerOpen, currentTask, drawerMode]);

  const loadComments = async (taskId: string) => {
    try {
      const data = await taskApi.getTaskComments(taskId);
      setComments(data);
    } catch {
      // silent
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      if (isCreateMode) {
        const projectId = currentTask?.project_id;
        if (!projectId) return;
        const payload: taskApi.CreateTaskPayload = {
          title: values.title,
          description: editDescription || undefined,
          priority: values.priority,
          deadline: values.deadline?.toISOString() || null,
          estimated_hours: values.estimated_hours || null,
          tag_ids: editTags,
        };
        const task = await taskApi.createTask(projectId, payload);
        addTaskToList(task);
        message.success('任务创建成功');
        closeDrawer();
      } else if (isEditMode && currentTask) {
        const payload: taskApi.UpdateTaskPayload = {
          title: values.title,
          description: editDescription,
          priority: values.priority,
          deadline: values.deadline?.toISOString() || null,
          estimated_hours: values.estimated_hours || null,
          actual_hours: values.actual_hours || null,
          status: values.status,
          version: currentTask.version,
        };
        const updated = await taskApi.updateTask(currentTask.id, payload);
        updateTaskInList(currentTask.id, updated);
        if (editTags.length !== currentTask.tags.length || editTags.some((id) => !currentTask.tags.find((t) => t.id === id))) {
          await taskApi.setTaskTags(currentTask.id, editTags);
        }
        message.success('任务已更新');
        closeDrawer();
      }
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentTask) return;
    try {
      await taskApi.deleteTask(currentTask.id);
      removeTaskFromList(currentTask.id);
      message.success('任务已删除');
      closeDrawer();
    } catch {
      message.error('删除失败');
    }
  };

  const handleAddComment = async () => {
    if (!currentTask || !newComment.trim()) return;
    try {
      const comment = await taskApi.addTaskComment(currentTask.id, newComment.trim());
      setComments((prev) => [...prev, comment]);
      setNewComment('');
    } catch {
      message.error('添加进度失败');
    }
  };

  const handleCreateTag = async (name: string, color: string) => {
    if (!currentTask?.project_id) return;
    try {
      return await taskApi.createProjectTag(currentTask.project_id, { name, color });
    } catch {
      message.error('创建标签失败');
      return undefined;
    }
  };

  const handleAttachmentUploaded = (attachment: taskApi.TaskAttachment) => {
    if (currentTask) {
      setCurrentTask({
        ...currentTask,
        attachments: [...currentTask.attachments, attachment],
      });
    }
  };

  const handleAttachmentDeleted = (attachmentId: string) => {
    if (currentTask) {
      setCurrentTask({
        ...currentTask,
        attachments: currentTask.attachments.filter((a) => a.id !== attachmentId),
      });
    }
  };

  const renderMentions = (text: string) => {
    const parts = text.split(/(@\S+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const name = part.slice(1);
        return <span key={i} style={{ color: '#0075de', fontWeight: 500 }}>{'@'}{name}</span>;
      }
      return part;
    });
  };

  const drawerTitle = () => {
    if (isCreateMode) return '创建任务';
    if (isEditMode) return '编辑任务';
    return currentTask?.title || '任务详情';
  };

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isEditMode && <EditOutlined style={{ color: '#0075de' }} />}
          {drawerTitle()}
        </div>
      }
      open={drawerOpen}
      onClose={closeDrawer}
      width={560}
      styles={{ body: { padding: '0 16px 16px' } }}
      extra={
        <div style={{ display: 'flex', gap: 8 }}>
          {isViewMode && currentTask && canEditTask && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                const store = useTaskStore.getState();
                store.openDrawer('edit', currentTask);
              }}
              style={{ color: '#0075de' }}
            >
              编辑
            </Button>
          )}
          {(isEditMode || isCreateMode) && (
            <>
              <Button onClick={closeDrawer} icon={<CloseOutlined />}>
                取消
              </Button>
              <Button
                type="primary"
                onClick={handleSave}
                loading={saving}
                icon={<CheckOutlined />}
              >
                {isCreateMode ? '创建' : '保存'}
              </Button>
            </>
          )}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Form form={form} layout="vertical" style={{ maxWidth: '100%' }}>
            <Form.Item
              name="title"
              label="标题"
              rules={[{ required: true, message: '请输入标题', max: 100 }]}
            >
              <Input
                placeholder="任务标题"
                maxLength={100}
                readOnly={isViewMode}
                style={isViewMode ? { border: 'none', background: 'transparent', paddingLeft: 0, fontWeight: 600, fontSize: 15 } : undefined}
              />
            </Form.Item>

            <div style={{ display: 'flex', gap: 12 }}>
              <Form.Item name="status" label="状态" style={{ flex: 1 }}>
                <Select
                  options={STATUS_OPTIONS}
                  disabled={isViewMode}
                />
              </Form.Item>
              <Form.Item name="priority" label="优先级" style={{ flex: 1 }}>
                <Select
                  options={PRIORITY_OPTIONS}
                  disabled={isViewMode}
                />
              </Form.Item>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <Form.Item name="deadline" label="截止日期" style={{ flex: 1 }}>
                <DatePicker
                  style={{ width: '100%' }}
                  disabled={isViewMode}
                  placeholder="选择日期"
                />
              </Form.Item>
              <Form.Item name="estimated_hours" label="预估工时(h)" style={{ flex: 1 }}>
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={999}
                  precision={1}
                  disabled={isViewMode}
                  placeholder="0"
                />
              </Form.Item>
              {(isEditMode || isViewMode) && (
                <Form.Item name="actual_hours" label="实际工时(h)" style={{ flex: 1 }}>
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    max={999}
                    precision={1}
                    disabled={isViewMode}
                    placeholder="0"
                  />
                </Form.Item>
              )}
            </div>

            {!isViewMode && (
              <Form.Item label="标签">
                <TagSelector
                  tags={projectTags}
                  selectedTagIds={editTags}
                  onChange={setEditTags}
                  onCreateTag={handleCreateTag}
                />
              </Form.Item>
            )}
            {isViewMode && currentTask && currentTask.tags.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#a39e98', marginBottom: 6 }}>标签</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {currentTask.tags.map((tag) => (
                    <Tag key={tag.id} color={tag.color} style={{ borderRadius: 9999 }}>
                      {tag.name}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
          </Form>

          <div>
            <div style={{ fontSize: 12, color: '#a39e98', marginBottom: 6 }}>描述</div>
            <MarkdownEditor
              value={editDescription}
              onChange={setEditDescription}
              readOnly={isViewMode}
              minRows={3}
            />
          </div>

          {currentTask && !isCreateMode && currentTask.id && (
            <>
              <Divider style={{ margin: '4px 0' }} />
              <div>
                <div style={{ fontSize: 12, color: '#a39e98', marginBottom: 8 }}>AI 辅助</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <AISuggestTags
                    taskId={currentTask.id}
                    disabled={isViewMode}
                  />
                  <AISuggestEffort
                    taskId={currentTask.id}
                    disabled={isViewMode}
                  />
                  <AISuggestAssignee
                    taskId={currentTask.id}
                    disabled={isViewMode}
                  />
                  <AISummary taskId={currentTask.id} />
                </div>
              </div>
            </>
          )}

          {currentTask && !isCreateMode && (
            <>
              <Divider style={{ margin: '4px 0' }} />

              <div>
                <div style={{ fontSize: 12, color: '#a39e98', marginBottom: 8 }}>附件</div>
                <AttachmentList
                  attachments={currentTask.attachments}
                  onDelete={handleAttachmentDeleted}
                  editable={!isViewMode}
                  currentUserId={user?.id}
                  isAdminOrOwner={canDeleteTask}
                />
                {!isViewMode && (
                  <AttachmentUploader
                    taskId={currentTask.id}
                    onUploaded={handleAttachmentUploaded}
                  />
                )}
              </div>

              <Divider style={{ margin: '4px 0' }} />

              <div>
                <div style={{ fontSize: 12, color: '#a39e98', marginBottom: 8 }}>进度</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                  {comments.map((c) => (
                    <div key={c.id} style={{ display: 'flex', gap: 8 }}>
                      <Avatar size={24} src={c.user.avatar} style={{ backgroundColor: '#31302e', fontSize: 10, flexShrink: 0 }}>
                        {c.user.name[0]}
                      </Avatar>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(0,0,0,.95)' }}>{c.user.name}</span>
                          <span style={{ fontSize: 11, color: '#a39e98' }}>
                            {new Date(c.created_at).toLocaleDateString('zh-CN')}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: '#615d59', lineHeight: 1.5, marginTop: 2 }}>
                          {renderMentions(c.content)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Mentions
                    value={newComment}
                    onChange={setNewComment}
                    placeholder="添加进度... 输入 @提及成员"
                    onPressEnter={(e) => {
                      if (!e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                    maxLength={2000}
                    rows={2}
                    style={{ flex: 1 }}
                    options={(projectMembers || []).map((m) => ({
                      value: m.user.name,
                      label: m.user.name,
                    }))}
                  />
                  <Button type="primary" onClick={handleAddComment} disabled={!newComment.trim()}>
                    发送
                  </Button>
                </div>
              </div>

              {isViewMode && (
                <>
                  <Divider style={{ margin: '4px 0' }} />
                  <StatusHistoryTimeline history={currentTask.status_history || []} />
                  <Divider style={{ margin: '4px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Popconfirm
                      title="确认删除此任务？此操作不可撤销"
                      onConfirm={handleDelete}
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                    >
                      <Button danger type="text" icon={<DeleteOutlined />} size="small">
                        删除任务
                      </Button>
                    </Popconfirm>
                  </div>
                </>
              )}
            </>
          )}
        </div>
    </Drawer>
  );
}
