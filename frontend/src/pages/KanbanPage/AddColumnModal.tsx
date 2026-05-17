import { Modal, Form, Input, Select } from 'antd';
import { useKanbanStore } from '@/stores/kanban-store';

const COLORS = [
  '#a39e98', '#0075de', '#1aae39', '#dd5b00',
  '#615d59', '#9c5ddf', '#e8590c', '#0ca678',
];

interface AddColumnModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AddColumnModal({ open, onClose }: AddColumnModalProps) {
  const [form] = Form.useForm();
  const addColumn = useKanbanStore((s) => s.addColumn);
  const columns = useKanbanStore((s) => s.columns);

  const handleOk = async () => {
    const values = await form.validateFields();
    await addColumn(values.name, values.status_mapping, values.color);
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="添加看板列"
      open={open}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      okText="添加"
      cancelText="取消"
      okButtonProps={{ disabled: columns.length >= 10 }}
    >
      {columns.length >= 10 && (
        <p style={{ color: '#dd5b00', fontSize: 13, marginBottom: 16 }}>
          每个项目最多 10 列
        </p>
      )}
      <Form form={form} layout="vertical" initialValues={{ color: '#a39e98', status_mapping: 'TODO' }}>
        <Form.Item name="name" label="列名称" rules={[{ required: true, message: '请输入列名称' }]}>
          <Input placeholder="例如：审核中" maxLength={20} />
        </Form.Item>
        <Form.Item name="color" label="颜色">
          <ColorPickerField colors={COLORS} />
        </Form.Item>
        <Form.Item name="status_mapping" label="状态映射" rules={[{ required: true }]}>
          <Select
            options={[
              { value: 'TODO', label: '待办 (TODO)' },
              { value: 'IN_PROGRESS', label: '进行中 (IN_PROGRESS)' },
              { value: 'DONE', label: '已完成 (DONE)' },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function ColorPickerField({ colors }: { colors: string[] }) {
  return (
    <div className="color-swatches">
      {colors.map((c) => (
        <Form.Item key={c} name="color" noStyle>
          <ColorSwatch color={c} />
        </Form.Item>
      ))}
    </div>
  );
}

function ColorSwatch({ color }: { color: string }) {
  return (
    <label>
      <input type="radio" name="color" value={color} style={{ display: 'none' }} />
      <span
        className="color-swatch"
        style={{ background: color }}
        onClick={(e) => {
          const form = (e.target as HTMLElement).closest('form');
          if (form) {
            const input = form.querySelector(`input[value="${color}"]`) as HTMLInputElement;
            if (input) input.click();
          }
        }}
      />
    </label>
  );
}
