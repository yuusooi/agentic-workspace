import { useState } from 'react';
import { Modal, Input, Select, Form, message } from 'antd';
import { createProject } from '@/lib/project-api';

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateProjectModal({ open, onClose, onCreated }: CreateProjectModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await createProject({
        name: values.name,
        description: values.description || '',
        icon: values.icon || values.name[0],
        visibility: values.visibility || 'PRIVATE',
      });
      message.success('项目创建成功');
      form.resetFields();
      onCreated();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        message.error(axiosErr.response?.data?.message || '创建失败');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={null}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="创建"
      cancelText="取消"
      width={480}
      styles={{
        body: { paddingTop: 8 },
      }}
      destroyOnClose
    >
      <div style={{
        fontSize: 18,
        fontWeight: 700,
        marginBottom: 6,
        letterSpacing: -0.2,
        color: 'rgba(0,0,0,.95)',
      }}>
        创建项目
      </div>
      <div style={{ fontSize: 13, color: '#615d59', marginBottom: 20 }}>
        填写项目基本信息
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={{ visibility: 'PRIVATE' }}
        requiredMark={false}
      >
        <Form.Item
          name="name"
          label="项目名称"
          rules={[{ required: true, message: '请输入项目名称' }]}
        >
          <Input placeholder="输入项目名称" />
        </Form.Item>

        <Form.Item name="description" label="项目描述">
          <Input.TextArea
            placeholder="输入项目描述"
            autoSize={{ minRows: 3, maxRows: 6 }}
            style={{ resize: 'vertical' }}
          />
        </Form.Item>

        <Form.Item name="icon" label="项目图标">
          <Input placeholder="输入图标文字（如：电、A）" maxLength={2} />
        </Form.Item>

        <Form.Item name="visibility" label="可见性">
          <Select
            options={[
              { value: 'PRIVATE', label: '私有（仅成员可见）' },
              { value: 'PUBLIC', label: '公开（所有人可见）' },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
