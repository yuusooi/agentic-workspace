import { useState } from 'react';
import { RobotOutlined, HistoryOutlined, AuditOutlined } from '@ant-design/icons';
import AIChatPanel from './AIChatPanel';
import AIChatHistory from './AIChatHistory';
import AIOperationLogs from './AIOperationLogs';

type TabKey = 'chat' | 'history' | 'logs';

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'chat', label: '智能对话', icon: <RobotOutlined /> },
  { key: 'history', label: '对话历史', icon: <HistoryOutlined /> },
  { key: 'logs', label: '操作日志', icon: <AuditOutlined /> },
];

export default function AIPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('chat');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
      <div style={{
        padding: '0 24px',
        borderBottom: '1px solid rgba(0,0,0,.06)',
        display: 'flex',
        alignItems: 'center',
        gap: 0,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginRight: 32,
          padding: '14px 0',
        }}>
          <div style={{
            width: 32,
            height: 32,
            background: 'linear-gradient(135deg, #0075de 0%, #6366f1 100%)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <RobotOutlined style={{ color: '#fff', fontSize: 16 }} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(0,0,0,.95)' }}>
            AI 智能助手
          </span>
        </div>

        <div style={{ display: 'flex', gap: 0 }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '14px 20px',
                fontSize: 13,
                fontWeight: activeTab === tab.key ? 600 : 400,
                color: activeTab === tab.key ? '#0075de' : '#615d59',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid #0075de' : '2px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all .15s',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'chat' && <AIChatPanel />}
        {activeTab === 'history' && <AIChatHistory />}
        {activeTab === 'logs' && <AIOperationLogs />}
      </div>
    </div>
  );
}
