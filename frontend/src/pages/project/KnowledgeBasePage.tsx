import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Button, Table, Tag, Empty, Spin, message, Modal, Form, Input, Upload, Drawer, InputNumber, Collapse,
} from 'antd';
import {
  ArrowLeftOutlined, PlusOutlined, DeleteOutlined, FileOutlined, SearchOutlined, UploadOutlined,
} from '@ant-design/icons';
import * as kbApi from '@/lib/knowledge-api';

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  PENDING: { color: 'default', label: '待处理' },
  PROCESSING: { color: 'processing', label: '处理中' },
  COMPLETED: { color: 'success', label: '已完成' },
  FAILED: { color: 'error', label: '失败' },
};

export default function KnowledgeBasePage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [knowledgeBases, setKnowledgeBases] = useState<kbApi.KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedKb, setSelectedKb] = useState<kbApi.KnowledgeBase | null>(null);
  const [documents, setDocuments] = useState<kbApi.KnowledgeDocument[]>([]);
  const [docLoading, setDocLoading] = useState(false);
  const [qaOpen, setQaOpen] = useState(false);
  const [qaQuestion, setQaQuestion] = useState('');
  const [qaAnswer, setQaAnswer] = useState('');
  const [qaReferences, setQaReferences] = useState<{ document: string; snippet: string }[]>([]);
  const [qaStreaming, setQaStreaming] = useState(false);
  const [form] = Form.useForm();

  const loadKBs = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await kbApi.getKnowledgeBases(projectId);
      setKnowledgeBases(data);
    } catch {
      message.error('加载知识库失败');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadKBs(); }, [loadKBs]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      if (!projectId) return;
      await kbApi.createKnowledgeBase(projectId, values);
      message.success('创建成功');
      setCreateOpen(false);
      form.resetFields();
      loadKBs();
    } catch {
      // validation
    }
  };

  const handleDelete = async (kbId: string) => {
    if (!projectId) return;
    try {
      await kbApi.deleteKnowledgeBase(projectId, kbId);
      message.success('已删除');
      loadKBs();
      if (selectedKb?.id === kbId) setSelectedKb(null);
    } catch {
      message.error('删除失败');
    }
  };

  const handleViewDocs = async (kb: kbApi.KnowledgeBase) => {
    setSelectedKb(kb);
    setDocLoading(true);
    try {
      const docs = await kbApi.getDocuments(kb.id);
      setDocuments(docs);
    } catch {
      message.error('加载文档失败');
    } finally {
      setDocLoading(false);
    }
  };

  const handleUpload = async (kbId: string, file: File) => {
    try {
      await kbApi.uploadDocument(kbId, file);
      message.success('上传成功');
      const docs = await kbApi.getDocuments(kbId);
      setDocuments(docs);
    } catch {
      message.error('上传失败');
    }
    return false;
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      await kbApi.deleteDocument(docId);
      message.success('已删除');
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch {
      message.error('删除失败');
    }
  };

  const handleAsk = async () => {
    if (!selectedKb || !qaQuestion.trim()) return;
    setQaStreaming(true);
    setQaAnswer('');
    setQaReferences([]);
    try {
      await kbApi.askKnowledgeBase(selectedKb.id, qaQuestion.trim(), (event) => {
        if (event.type === 'answer') {
          setQaAnswer((prev) => prev + (event.content as string));
        }
        if (event.type === 'references') {
          const refs = (event.references || []) as { document: string; snippet: string }[];
          setQaReferences(refs);
        }
      });
    } catch {
      setQaAnswer('问答失败，请稍后重试');
    } finally {
      setQaStreaming(false);
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} />
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>知识库</h1>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            创建知识库
          </Button>
          {selectedKb && (
            <Button icon={<SearchOutlined />} onClick={() => setQaOpen(true)}>
              知识问答
            </Button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : knowledgeBases.length === 0 ? (
          <Empty description="暂无知识库" />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {knowledgeBases.map((kb) => (
              <Card
                key={kb.id}
                hoverable
                onClick={() => handleViewDocs(kb)}
                style={{
                  borderRadius: 8,
                  border: selectedKb?.id === kb.id ? '2px solid #0075de' : undefined,
                }}
                styles={{ body: { padding: 16 } }}
              >
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: 'rgba(0,0,0,.95)' }}>{kb.name}</div>
                {kb.description && <div style={{ fontSize: 12, color: '#a39e98', marginBottom: 8 }}>{kb.description}</div>}
                <div style={{ display: 'flex', gap: 8, fontSize: 11, color: '#615d59' }}>
                  <span>{kb.document_count} 文档</span>
                  <span>{kb.chunk_count} 分块</span>
                </div>
                <div style={{ marginTop: 8, textAlign: 'right' }}>
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={(e) => { e.stopPropagation(); handleDelete(kb.id); }}
                  />
                </div>
              </Card>
            ))}
          </div>
        )}

        {selectedKb && (
          <div style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
              {selectedKb.name} - 文档列表
            </h3>
            <Upload
              beforeUpload={(file) => handleUpload(selectedKb.id, file)}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />} size="small" style={{ marginBottom: 12 }}>
                上传文档
              </Button>
            </Upload>
            {docLoading ? <Spin /> : (
              <Table
                dataSource={documents}
                rowKey="id"
                size="small"
                pagination={false}
                locale={{ emptyText: <Empty description="暂无文档" /> }}
                columns={[
                  { title: '文件名', dataIndex: 'file_name', render: (v: string) => <span style={{ fontSize: 12 }}><FileOutlined /> {v}</span> },
                  { title: '大小', dataIndex: 'file_size', width: 80, render: (v: number) => <span style={{ fontSize: 11, color: '#a39e98' }}>{(v / 1024).toFixed(0)}KB</span> },
                  { title: '分块', dataIndex: 'chunk_count', width: 60, render: (v: number) => v },
                  {
                    title: '状态', dataIndex: 'status', width: 80,
                    render: (s: string) => { const cfg = STATUS_MAP[s] || STATUS_MAP.PENDING; return <Tag color={cfg.color} style={{ fontSize: 10 }}>{cfg.label}</Tag>; },
                  },
                  {
                    title: '操作', width: 60,
                    render: (_: unknown, record: kbApi.KnowledgeDocument) => (
                      <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => handleDeleteDoc(record.id)} />
                    ),
                  },
                ]}
              />
            )}
          </div>
        )}
      </div>

      <Modal title="创建知识库" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={handleCreate} okText="创建" width={520}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input placeholder="知识库名称" /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea placeholder="可选描述" rows={2} /></Form.Item>
          <Collapse ghost items={[{
            key: 'advanced',
            label: <span style={{ fontSize: 12, color: '#a39e98' }}>高级分块配置（可选）</span>,
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <Form.Item name="chunk_size" label={<span style={{ fontSize: 12 }}>分块大小</span>} style={{ flex: 1 }} initialValue={1024}>
                    <InputNumber min={128} max={4096} step={128} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name="chunk_overlap" label={<span style={{ fontSize: 12 }}>重叠量</span>} style={{ flex: 1 }} initialValue={128}>
                    <InputNumber min={0} max={512} step={16} style={{ width: '100%' }} />
                  </Form.Item>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <Form.Item name="top_k" label={<span style={{ fontSize: 12 }}>检索数</span>} style={{ flex: 1 }} initialValue={5}>
                    <InputNumber min={1} max={20} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name="similarity_threshold" label={<span style={{ fontSize: 12 }}>相似度阈值</span>} style={{ flex: 1 }} initialValue={0.7}>
                    <InputNumber min={0} max={1} step={0.05} style={{ width: '100%' }} />
                  </Form.Item>
                </div>
              </div>
            ),
          }]} />
        </Form>
      </Modal>

      <Drawer title={`知识问答 - ${selectedKb?.name || ''}`} open={qaOpen} onClose={() => { setQaOpen(false); setQaAnswer(''); setQaReferences([]); }} width={500}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              value={qaQuestion}
              onChange={(e) => setQaQuestion(e.target.value)}
              placeholder="输入问题..."
              onPressEnter={handleAsk}
            />
            <Button type="primary" onClick={handleAsk} loading={qaStreaming}>提问</Button>
          </div>
          {qaAnswer && (
            <div style={{ padding: 12, background: '#f6f5f4', borderRadius: 8, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {qaAnswer}
            </div>
          )}
          {qaReferences.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: '#a39e98', marginBottom: 6 }}>参考来源</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {qaReferences.map((ref, i) => (
                  <div key={i} style={{ padding: 8, background: 'rgba(0,117,222,.04)', borderRadius: 6, fontSize: 12 }}>
                    <div style={{ fontWeight: 500, color: '#0075de', marginBottom: 2 }}>{ref.document}</div>
                    <div style={{ color: '#615d59', fontSize: 11 }}>{ref.snippet}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
}
