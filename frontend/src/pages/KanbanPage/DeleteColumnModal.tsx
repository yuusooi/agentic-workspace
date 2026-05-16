import { Modal, Select, Form } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';
import { useKanbanStore } from '@/stores/kanban-store';
import type { BoardColumn } from '@/types/kanban';

interface DeleteColumnModalProps {
  open: boolean;
  column: BoardColumn | null;
  onClose: () => void;
}

export default function DeleteColumnModal({ open, column, onClose }: DeleteColumnModalProps) {
  const [form] = Form.useForm();
  const removeColumn = useKanbanStore((s) => s.removeColumn);
  const columns = useKanbanStore((s) => s.columns);

  if (!column) return null;

  const otherColumns = columns.filter((c) => c.id !== column.id);
  const hasTasks = column.tasks.length > 0;

  const handleOk = async () => {
    const targetId = hasTasks
      ? (await form.validateFields()).targetColumnId
      : otherColumns[0]?.id;

    if (!targetId) return;
    await removeColumn(column.id, targetId);
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={
        <span>
          <ExclamationCircleFilled style={{ color: '#dd5b00', marginRight: 8 }} />
          删除列「{column.name}」
        </span>
      }
      open={open}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      okText="确认删除"
      cancelText="取消"
      okButtonProps={{ danger: true }}
    >
      {hasTasks && (
        <p style={{ fontSize: 13, color: '#615d59', marginBottom: 16 }}>
          该列有 <strong>{column.tasks.length}</strong> 个任务，请选择迁移目标列
        </p>
      )}
      {hasTasks && (
        <Form form={form} layout="vertical">
          <Form.Item
            name="targetColumnId"
            label="迁移到"
            rules={[{ required: true, message: '请选择目标列' }]}
          >
            <Select
              placeholder="选择目标列"
              options={otherColumns.map((c) => ({
                value: c.id,
                label: `${c.name}（${c.tasks.length} 个任务）`,
              }))}
            />
          </Form.Item>
        </Form>
      )}
      {!hasTasks && (
        <p style={{ fontSize: 13, color: '#615d59' }}>
          该列没有任务，可以直接删除。
        </p>
      )}
    </Modal>
  );
}
