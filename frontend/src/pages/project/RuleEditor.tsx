import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import * as autoApi from '@/lib/automation-api';
import type { AutomationRule, RuleCondition, RuleAction, TriggerType, ActionType } from '@/lib/automation-api';

interface RuleEditorProps {
  open: boolean;
  rule: AutomationRule | null;
  onClose: () => void;
  onSave: (values: {
    name: string;
    description?: string;
    trigger_type: TriggerType;
    conditions: RuleCondition[];
    actions: RuleAction[];
  }) => void;
}

export default function RuleEditor({ open, rule, onClose, onSave }: RuleEditorProps) {
  const [form] = Form.useForm();
  const [triggerType, setTriggerType] = useState<TriggerType>('TASK_CREATED');
  const [conditions, setConditions] = useState<RuleCondition[]>([]);
  const [actions, setActions] = useState<RuleAction[]>([]);

  useEffect(() => {
    if (open && rule) {
      form.setFieldsValue({ name: rule.name, description: rule.description, trigger_type: rule.trigger_type });
      setTriggerType(rule.trigger_type);
      setConditions(rule.conditions);
      setActions(rule.actions);
    } else if (open) {
      form.resetFields();
      setTriggerType('TASK_CREATED');
      setConditions([]);
      setActions([]);
    }
  }, [open, rule, form]);

  const availableFields = autoApi.TRIGGER_CONDITIONS[triggerType] || [];

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      onSave({ ...values, conditions, actions });
    } catch {
      // validation error
    }
  };

  return (
    <Modal
      title={rule ? '编辑规则' : '新建规则'}
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      okText="保存"
      width={600}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="规则名称" rules={[{ required: true, message: '请输入名称' }]}>
          <Input placeholder="规则名称" maxLength={50} />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <Input placeholder="可选描述" maxLength={200} />
        </Form.Item>
        <Form.Item name="trigger_type" label="触发器" rules={[{ required: true }]}>
          <Select
            options={autoApi.TRIGGER_OPTIONS}
            onChange={(v: TriggerType) => { setTriggerType(v); setConditions([]); }}
          />
        </Form.Item>
      </Form>

      <Divider style={{ margin: '12px 0' }} />

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,.95)', marginBottom: 8 }}>条件</div>
        {conditions.map((c, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
            <Select
              value={c.field}
              onChange={(v) => {
                const updated = [...conditions];
                updated[idx] = { ...updated[idx], field: v };
                setConditions(updated);
              }}
              options={availableFields.map((f) => ({ value: f.value, label: f.label }))}
              style={{ width: 120 }}
              placeholder="字段"
              size="small"
            />
            <Select
              value={c.operator}
              onChange={(v) => {
                const updated = [...conditions];
                updated[idx] = { ...updated[idx], operator: v as RuleCondition['operator'] };
                setConditions(updated);
              }}
              options={(availableFields.find((f) => f.value === c.field)?.operators || []).map((o) => ({ value: o.value, label: o.label }))}
              style={{ width: 80 }}
              placeholder="运算符"
              size="small"
            />
            <Input
              value={c.value}
              onChange={(e) => {
                const updated = [...conditions];
                updated[idx] = { ...updated[idx], value: e.target.value };
                setConditions(updated);
              }}
              style={{ flex: 1 }}
              placeholder="值"
              size="small"
            />
            <DeleteOutlined
              onClick={() => setConditions((prev) => prev.filter((_, i) => i !== idx))}
              style={{ color: '#a39e98', cursor: 'pointer' }}
            />
          </div>
        ))}
        <Button
          type="dashed"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => setConditions((prev) => [...prev, { field: '', operator: 'eq', value: '' }])}
          style={{ width: '100%', fontSize: 11 }}
        >
          添加条件
        </Button>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,.95)', marginBottom: 8 }}>动作</div>
        {actions.map((a, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
            <Select
              value={a.type}
              onChange={(v: ActionType) => {
                const updated = [...actions];
                updated[idx] = { ...updated[idx], type: v, config: {} };
                setActions(updated);
              }}
              options={autoApi.ACTION_OPTIONS}
              style={{ width: 120 }}
              size="small"
            />
            <Input
              value={a.config.value || ''}
              onChange={(e) => {
                const updated = [...actions];
                updated[idx] = { ...updated[idx], config: { ...updated[idx].config, value: e.target.value } };
                setActions(updated);
              }}
              style={{ flex: 1 }}
              placeholder="配置值"
              size="small"
            />
            <DeleteOutlined
              onClick={() => setActions((prev) => prev.filter((_, i) => i !== idx))}
              style={{ color: '#a39e98', cursor: 'pointer' }}
            />
          </div>
        ))}
        <Button
          type="dashed"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => setActions((prev) => [...prev, { type: 'UPDATE_FIELD', config: {} }])}
          style={{ width: '100%', fontSize: 11 }}
        >
          添加动作
        </Button>
      </div>
    </Modal>
  );
}
