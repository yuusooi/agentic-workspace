import { useState } from 'react';
import { Avatar } from 'antd';
import { ClockCircleOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import type { TaskStatusHistory, TaskStatus } from '@/lib/task-api';
import { statusConfig } from '@/lib/task-api';

interface StatusHistoryTimelineProps {
  history: TaskStatusHistory[];
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${month}月${day}日 ${hours}:${minutes}`;
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const cfg = statusConfig[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        padding: '1px 8px',
        borderRadius: 9999,
        background: `${cfg.color}10`,
        color: cfg.color,
        fontWeight: 500,
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

export default function StatusHistoryTimeline({ history }: StatusHistoryTimelineProps) {
  const [expanded, setExpanded] = useState(false);

  if (history.length === 0) return null;

  const displayItems = expanded ? history : history.slice(0, 1);
  const hasMore = history.length > 1;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ClockCircleOutlined style={{ fontSize: 13, color: '#a39e98' }} />
          <span style={{ fontSize: 12, color: '#a39e98', fontWeight: 500 }}>
            状态变更记录
          </span>
        </div>
        {hasMore && (
          <span
            onClick={() => setExpanded(!expanded)}
            style={{
              fontSize: 11,
              color: '#0075de',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            {expanded ? (
              <>收起 <UpOutlined style={{ fontSize: 9 }} /></>
            ) : (
              <>共 {history.length} 条 <DownOutlined style={{ fontSize: 9 }} /></>
            )}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {displayItems.map((item, idx) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              gap: 10,
              position: 'relative',
              paddingBottom: idx < displayItems.length - 1 ? 12 : 0,
            }}
          >
            {idx < displayItems.length - 1 && (
              <div
                style={{
                  position: 'absolute',
                  left: 11,
                  top: 28,
                  bottom: 0,
                  width: 1,
                  background: 'rgba(0,0,0,.06)',
                }}
              />
            )}
            <Avatar
              size={22}
              src={item.user.avatar}
              style={{
                backgroundColor: '#31302e',
                fontSize: 10,
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              {item.user.name[0]}
            </Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(0,0,0,.95)' }}>
                  {item.user.name}
                </span>
                {item.old_status ? (
                  <>
                    <StatusBadge status={item.old_status} />
                    <span style={{ fontSize: 11, color: '#a39e98' }}>→</span>
                    <StatusBadge status={item.new_status} />
                  </>
                ) : (
                  <StatusBadge status={item.new_status} />
                )}
              </div>
              <div style={{ fontSize: 11, color: '#a39e98', marginTop: 2 }}>
                {formatDateTime(item.changed_at)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
