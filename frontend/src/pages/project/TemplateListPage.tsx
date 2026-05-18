import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Button, Input, Tag, Empty, Spin, message, Modal, Form, Tabs, Popconfirm, Select,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, SearchOutlined,
} from '@ant-design/icons';
import * as templateApi from '@/lib/template-api';
import type { ProjectTemplate } from '@/lib/template-api';
import ColumnConfigEditor from './ColumnConfigEditor';

const CATEGORIES = ['全部', '软件开发', '产品设计', '市场营销', '运营管理', '通用'];

const SYSTEM_TEMPLATE_COLORS = [
  '#0075de', '#1aae39', '#dd5b00', '#9c5ddf', '#e8590c', '#0ca678', '#615d59', '#a39e98',
];

export default function TemplateListPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('全部');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [useTemplateOpen, setUseTemplateOpen] = useState<ProjectTemplate | null>(null);
  const [form] = Form.useForm();

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await templateApi.getProjectTemplates({
        category: category !== '全部' ? category : undefined,
        size: 100,
      });
      setTemplates(res.content);
    } catch {
      message.error('加载模板失败');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const handleCreateTemplate = async () => {
    try {
      const values = await form.validateFields();
      await templateApi.createProjectTemplate(values);
      message.success('模板创建成功');
      setCreateOpen(false);
      form.resetFields();
      loadTemplates();
    } catch {
      // validation
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await templateApi.deleteProjectTemplate(id);
      message.success('已删除');
      loadTemplates();
    } catch {
      message.error('删除失败');
    }
  };

  const handleUseTemplate = async () => {
    if (!useTemplateOpen) return;
    try {
      const values = await form.validateFields();
      const res = await templateApi.createProjectFromTemplate({
        template_id: useTemplateOpen.id,
        ...values,
      });
      message.success('项目创建成功');
      setUseTemplateOpen(null);
      form.resetFields();
      navigate(`/projects/${res.id}`);
    } catch {
      // validation
    }
  };

  const filtered = search
    ? templates.filter((t) => t.name.includes(search) || t.description?.includes(search))
    : templates;

  return (
    <div className="app-layout-content" style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>项目模板</h1>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setCreateOpen(true); }}>
            创建模板
          </Button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <Input
            placeholder="搜索模板..."
            prefix={<SearchOutlined style={{ color: '#a39e98' }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: 250 }}
          />
          <Tabs
            activeKey={category}
            onChange={setCategory}
            items={CATEGORIES.map((c) => ({ key: c, label: c }))}
            style={{ marginBottom: 0 }}
            size="small"
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : filtered.length === 0 ? (
          <Empty description="暂无模板" />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {filtered.map((tpl, idx) => (
              <Card
                key={tpl.id}
                hoverable
                onClick={() => { form.resetFields(); setUseTemplateOpen(tpl); }}
                style={{ borderRadius: 8 }}
                styles={{ body: { padding: 16 } }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 8,
                  background: SYSTEM_TEMPLATE_COLORS[idx % SYSTEM_TEMPLATE_COLORS.length],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 10, color: '#fff', fontSize: 18, fontWeight: 700,
                }}>
                  {tpl.name[0]}
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: 'rgba(0,0,0,.95)' }}>{tpl.name}</div>
                {tpl.description && (
                  <div style={{ fontSize: 12, color: '#a39e98', marginBottom: 6, lineHeight: 1.4 }}>
                    {tpl.description}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Tag style={{ fontSize: 10, margin: 0 }}>{tpl.columns.length} 列</Tag>
                    {tpl.category && <Tag style={{ fontSize: 10, margin: 0 }}>{tpl.category}</Tag>}
                  </div>
                  {!tpl.is_system && (
                    <Popconfirm title="确认删除？" onConfirm={(e) => { e?.stopPropagation(); handleDelete(tpl.id); }} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
                      <DeleteOutlined
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: '#a39e98', fontSize: 12, cursor: 'pointer' }}
                      />
                    </Popconfirm>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        title="创建自定义模板"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreateTemplate}
        okText="创建"
        width={560}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="模板名称" rules={[{ required: true }]}><Input placeholder="模板名称" /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={2} placeholder="可选描述" /></Form.Item>
          <Form.Item name="category" label="分类"><Input placeholder="可选分类" /></Form.Item>
          <Form.Item name="columns" label="列配置" rules={[{ required: true }]}><ColumnConfigEditor /></Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`使用模板: ${useTemplateOpen?.name || ''}`}
        open={!!useTemplateOpen}
        onCancel={() => { setUseTemplateOpen(null); form.resetFields(); }}
        onOk={handleUseTemplate}
        okText="创建项目"
        width={480}
      >
        {useTemplateOpen && (
          <div>
            <div style={{ fontSize: 12, color: '#a39e98', marginBottom: 12 }}>
              将基于此模板创建项目，包含 {useTemplateOpen.columns.length} 个预设列
            </div>
            <Form form={form} layout="vertical">
              <Form.Item name="name" label="项目名称" rules={[{ required: true }]}><Input placeholder="项目名称" /></Form.Item>
              <Form.Item name="description" label="描述"><Input.TextArea rows={2} /></Form.Item>
              <Form.Item name="visibility" label="可见性" initialValue="PRIVATE">
                <Select
                  options={[
                    { value: 'PUBLIC', label: '公开' },
                    { value: 'PRIVATE', label: '私有' },
                  ]}
                />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
}
