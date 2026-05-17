import {
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SwapOutlined,
  TeamOutlined,
  RobotOutlined,
  NotificationOutlined,
} from '@ant-design/icons';
import type { Notification } from '@/lib/notification-api';
import { useNotificationStore } from '@/stores/notification-store';
import { useNavigate } from 'react-router-dom';

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  DEADLINE_REMINDER: { icon: <ClockCircleOutlined />, color: '#dd5b00', label: '截止提醒' },
  OVERDUE: { icon: <ExclamationCircleOutlined />, color: '#dd5b00', label: '逾期' },
  STATUS_CHANGE: { icon: <SwapOutlined />, color: '#0075de', label: '状态变更' },
  MENTION: { icon: <span style={{ fontWeight: 700 }}>@</span>, color: '#9c5ddf', label: '@提及' },
  MEMBER_CHANGE: { icon: <TeamOutlined />, color: '#1aae39', label: '成员变更' },
  AI_OPERATION: { icon: <RobotOutlined />, color: '#0075de', label: 'AI 操作' },
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

interface NotificationItemProps {
  notification: Notification;
  onClose: () => void;
}

export default function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const navigate = useNavigate();
  const config = TYPE_CONFIG[notification.type] || { icon: <NotificationOutlined />, color: '#a39e98', label: '通知' };

  const handleClick = async () => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    if (notification.entity_type && notification.entity_id) {
      onClose();
      if (notification.entity_type === 'PROJECT') {
        navigate(`/projects/${notification.entity_id}`);
      } else if (notification.entity_type === 'TASK') {
        navigate(`/projects/${notification.project_id || ''}`);
      }
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        padding: '12px 16px',
        cursor: notification.entity_id ? 'pointer' : 'default',
        background: notification.is_read ? 'transparent' : 'rgba(0,117,222,.02)',
        transition: 'background .1s',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,.02)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = notification.is_read ? 'transparent' : 'rgba(0,117,222,.02)';
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          background: `${config.color}10`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: config.color,
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        {config.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 11, color: config.color, fontWeight: 500 }}>
            {config.label}
          </span>
          {!notification.isRead && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#0075de',
                flexShrink: 0,
              }}
            />
          )}
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'rgba(0,0,0,.95)',
            fontWeight: notification.isRead ? 400 : 500,
            lineHeight: 1.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {notification.title}
        </div>
        {notification.content && (
          <div
            style={{
              fontSize: 12,
              color: '#615d59',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {notification.content}
          </div>
        )}
        <div style={{ fontSize: 11, color: '#a39e98', marginTop: 4 }}>
          {formatTime(notification.created_at)}
        </div>
      </div>
    </div>
  );
}
