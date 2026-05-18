import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Button, Table, Tag, Empty, Spin, message, Modal, Form, Input, Upload, Drawer, InputNumber, Collapse,
} from 'antd';
import {
  ArrowLeftOutlined, PlusOutlined, DeleteOutlined, FileOutlined, SearchOutlined, UploadOutlined, EyeOutlined,
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
  const [qaHistory, setQaHistory] = useState<{ question: string; answer: string; references: { document: string; snippet: string }[] }[]>([]);
  const [qaStreaming, setQaStreaming] = useState(false);
  const [viewDocOpen, setViewDocOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<kbApi.KnowledgeDocument | null>(null);
  const [viewChunks, setViewChunks] = useState<kbApi.DocumentChunk[]>([]);
  const [viewLoading, setViewLoading] = useState(false);
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

  const handleViewDoc = async (doc: kbApi.KnowledgeDocument) => {
    setViewDoc(doc);
    setViewDocOpen(true);
    setViewLoading(true);
    try {
      const chunks = await kbApi.getDocumentChunks(doc.id);
      setViewChunks(chunks);
    } catch {
      message.error('加载文档内容失败');
    } finally {
      setViewLoading(false);
    }
  };

  const handleAsk = async () => {
    if (!selectedKb || !qaQuestion.trim()) return;
    const currentQuestion = qaQuestion.trim();
    setQaQuestion('');
    setQaStreaming(true);
    let currentAnswer = '';
    let currentRefs: { document: string; snippet: string }[] = [];
    
    const history: kbApi.ChatMessage[] = qaHistory.map(item => [
      { role: 'user' as const, content: item.question },
      { role: 'assistant' as const, content: item.answer },
    ]).flat();
    
    try {
      await kbApi.askKnowledgeBase(selectedKb.id, currentQuestion, (event) => {
        if (event.type === 'message') {
          currentAnswer += event.content as string;
        }
        if (event.type === 'references') {
          currentRefs = (event.references || []) as { document: string; snippet: string }[];
        }
      }, undefined, history);
      setQaHistory((prev) => [...prev, { question: currentQuestion, answer: currentAnswer, references: currentRefs }]);
    } catch (error) {
      setQaHistory((prev) => [...prev, { question: currentQuestion, answer: '问答失败: ' + (error as Error).message, references: [] }]);
    } finally {
      setQaStreaming(false);
    }
  };

  return (
    <div className="app-layout-content" style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/projects/${projectId}`)} />
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
                    title: '操作', width: 100,
                    render: (_: unknown, record: kbApi.KnowledgeDocument) => (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => handleViewDoc(record)} />
                        <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => handleDeleteDoc(record.id)} />
                      </div>
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

      <Drawer 
        title={`知识问答 - ${selectedKb?.name || ''}`} 
        open={qaOpen} 
        onClose={() => { setQaOpen(false); setQaHistory([]); }} 
        width={600}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
            {qaHistory.length === 0 ? (
              <Empty description="开始提问吧" style={{ marginTop: 40 }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {qaHistory.map((item, idx) => (
                  <div key={idx}>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 12, color: '#0075de', marginBottom: 4 }}>问：{item.question}</div>
                      <div style={{ padding: 12, background: '#f6f5f4', borderRadius: 8, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {item.answer}
                      </div>
                    </div>
                    {item.references.length > 0 && (
                      <div style={{ marginLeft: 12, marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: '#a39e98', marginBottom: 4 }}>参考: {item.references.map(r => r.document).join('、')}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
            <Input
              value={qaQuestion}
              onChange={(e) => setQaQuestion(e.target.value)}
              placeholder="输入问题..."
              onPressEnter={handleAsk}
              disabled={qaStreaming}
            />
            <Button type="primary" onClick={handleAsk} loading={qaStreaming}>提问</Button>
          </div>
        </div>
      </Drawer>

      <Modal
        title={`查看文档 - ${viewDoc?.file_name || ''}`}
        open={viewDocOpen}
        onCancel={() => { setViewDocOpen(false); setViewDoc(null); setViewChunks([]); }}
        footer={null}
        width={800}
      >
        {viewLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : viewChunks.length === 0 ? (
          <Empty description="文档暂无内容" />
        ) : (
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            {viewChunks.map((chunk, index) => (
              <div key={chunk.id} style={{ marginBottom: 16, padding: 12, background: '#f6f5f4', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#a39e98', marginBottom: 4 }}>分块 {index + 1}</div>
                <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{chunk.content}</div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
