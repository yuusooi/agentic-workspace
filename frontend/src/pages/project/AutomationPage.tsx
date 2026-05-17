import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Table, Switch, Button, Tag, Empty, message, Popconfirm, Drawer,
} from 'antd';
import {
  ArrowLeftOutlined, PlusOutlined, DeleteOutlined, HistoryOutlined,
} from '@ant-design/icons';
import * as autoApi from '@/lib/automation-api';
import type { AutomationRule, RuleCondition, RuleAction, TriggerType } from '@/lib/automation-api';
import RuleEditor from './RuleEditor';

export default function AutomationPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [execLogOpen, setExecLogOpen] = useState(false);
  const [executions, setExecutions] = useState<autoApi.RuleExecution[]>([]);

  const loadRules = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await autoApi.getAutomationRules(projectId);
      setRules(data);
    } catch {
      message.error('加载规则失败');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleToggle = async (rule: AutomationRule, active: boolean) => {
    if (!projectId) return;
    try {
      await autoApi.toggleAutomationRule(projectId, rule.id, active);
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, is_active: active } : r)));
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!projectId) return;
    try {
      await autoApi.deleteAutomationRule(projectId, ruleId);
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      message.success('已删除');
    } catch {
      message.error('删除失败');
    }
  };

  const handleViewLogs = async () => {
    if (!projectId) return;
    setExecLogOpen(true);
    try {
      const data = await autoApi.getRuleExecutions(projectId);
      setExecutions(data);
    } catch {
      message.error('加载执行记录失败');
    }
  };

  const handleSaveRule = async (values: {
    name: string;
    description?: string;
    trigger_type: TriggerType;
    conditions: RuleCondition[];
    actions: RuleAction[];
  }) => {
    if (!projectId) return;
    try {
      if (editingRule) {
        await autoApi.updateAutomationRule(projectId, editingRule.id, values);
        message.success('规则已更新');
      } else {
        await autoApi.createAutomationRule(projectId, { ...values, is_active: true, description: values.description || '' });
        message.success('规则已创建');
      }
      setEditorOpen(false);
      setEditingRule(null);
      loadRules();
    } catch {
      message.error('保存失败');
    }
  };

  const columns = [
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: AutomationRule) => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(0,0,0,.95)' }}>{name}</div>
          {record.description && (
            <div style={{ fontSize: 11, color: '#a39e98' }}>{record.description}</div>
          )}
        </div>
      ),
    },
    {
      title: '触发器',
      dataIndex: 'trigger_type',
      key: 'trigger_type',
      width: 120,
      render: (tt: TriggerType) => {
        const opt = autoApi.TRIGGER_OPTIONS.find((o) => o.value === tt);
        return <Tag>{opt?.label || tt}</Tag>;
      },
    },
    {
      title: '启用',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 70,
      render: (active: boolean, record: AutomationRule) => (
        <Switch size="small" checked={active} onChange={(v) => handleToggle(record, v)} />
      ),
    },
    {
      title: '执行次数',
      dataIndex: 'execution_count',
      key: 'execution_count',
      width: 80,
      render: (count: number) => <span style={{ fontSize: 12, color: '#615d59' }}>{count}</span>,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: AutomationRule) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <Button
            type="link"
            size="small"
            onClick={() => { setEditingRule(record); setEditorOpen(true); }}
            style={{ fontSize: 12, padding: 0 }}
          >
            编辑
          </Button>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
            <Button type="link" danger size="small" icon={<DeleteOutlined />} style={{ fontSize: 12, padding: 0 }} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} />
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'rgba(0,0,0,.95)' }}>
            自动化规则
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => { setEditingRule(null); setEditorOpen(true); }}
          >
            新建规则
          </Button>
          <Button icon={<HistoryOutlined />} onClick={handleViewLogs}>
            执行记录
          </Button>
        </div>

        <Table
          dataSource={rules}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="middle"
          locale={{ emptyText: <Empty description="暂无自动化规则" /> }}
          pagination={false}
        />
      </div>

      <RuleEditor
        open={editorOpen}
        rule={editingRule}
        onClose={() => { setEditorOpen(false); setEditingRule(null); }}
        onSave={handleSaveRule}
      />

      <Drawer
        title="执行记录（最近 10 次）"
        open={execLogOpen}
        onClose={() => setExecLogOpen(false)}
        width={500}
      >
        {executions.length === 0 ? (
          <Empty description="暂无执行记录" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {executions.map((ex) => (
              <div key={ex.id} style={{ padding: '8px 10px', background: '#f6f5f4', borderRadius: 6, fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Tag color={ex.status === 'success' ? 'green' : 'red'} style={{ fontSize: 10, margin: 0 }}>
                    {ex.status === 'success' ? '成功' : '失败'}
                  </Tag>
                  <span style={{ fontWeight: 500 }}>{ex.rule_name}</span>
                </div>
                <div style={{ color: '#615d59' }}>{ex.details}</div>
                <div style={{ color: '#a39e98', fontSize: 11, marginTop: 2 }}>
                  {new Date(ex.executed_at).toLocaleString('zh-CN')}
                </div>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  );
}
