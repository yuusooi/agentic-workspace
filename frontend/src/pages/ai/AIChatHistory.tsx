import { useState, useEffect, useCallback } from 'react';
import { List, Empty, Spin, message, Drawer, Tag } from 'antd';
import { HistoryOutlined, RobotOutlined } from '@ant-design/icons';
import * as aiApi from '@/lib/ai-api';

export default function AIChatHistory() {
  const [conversations, setConversations] = useState<aiApi.AIChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<aiApi.AIChatMessage[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await aiApi.getAIChatSessions({ page, size: 20 });
      setConversations(res.content);
      setTotal(res.totalElements);
    } catch {
      message.error('加载对话历史失败');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleViewDetail = async (id: string) => {
    setDetailOpen(true);
    setLoadingDetail(true);
    try {
      const data = await aiApi.getAIChatSessionDetail(id);
      setSelectedMessages(data.messages);
    } catch {
      message.error('加载对话详情失败');
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <>
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 20, color: 'rgba(0,0,0,.95)' }}>
            <HistoryOutlined style={{ marginRight: 8 }} />
            AI 对话历史
          </h1>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          ) : conversations.length === 0 ? (
            <Empty description="暂无对话记录" />
          ) : (
            <List
              dataSource={conversations}
              renderItem={(item) => (
                <List.Item
                  style={{ cursor: 'pointer', padding: '12px 16px', borderRadius: 8 }}
                  onClick={() => handleViewDetail(item.id)}
                >
                  <List.Item.Meta
                    avatar={
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: '#0075de', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <RobotOutlined style={{ color: '#fff' }} />
                      </div>
                    }
                    title={<span style={{ fontSize: 13, fontWeight: 500 }}>{item.title || 'AI 对话'}</span>}
                    description={
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#a39e98' }}>
                          {new Date(item.created_at).toLocaleString('zh-CN')}
                        </span>
                        <Tag style={{ fontSize: 10 }}>{item.message_count} 条消息</Tag>
                      </div>
                    }
                  />
                </List.Item>
              )}
              pagination={{
                current: page + 1,
                total,
                pageSize: 20,
                showSizeChanger: false,
                onChange: (p) => setPage(p - 1),
              }}
            />
          )}
        </div>
      </div>

      <Drawer
        title="对话详情"
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={500}
      >
        {loadingDetail ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {selectedMessages.map((msg, idx) => (
              <div key={idx} style={{
                padding: '10px 12px',
                background: msg.role === 'user' ? '#f6f5f4' : 'rgba(0,117,222,.04)',
                borderRadius: 8,
                fontSize: 13,
                lineHeight: 1.6,
              }}>
                <div style={{ fontSize: 11, color: '#a39e98', marginBottom: 4, fontWeight: 500 }}>
                  {msg.role === 'user' ? '👤 你' : '🤖 AI'}
                </div>
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</div>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </>
  );
}
