import { useEffect } from 'react';
import { Drawer, Button, Empty, Spin, Divider, message } from 'antd';
import { CheckOutlined, BellOutlined } from '@ant-design/icons';
import { useNotificationStore } from '@/stores/notification-store';
import NotificationItem from './NotificationItem';

interface NotificationListProps {
  open: boolean;
  onClose: () => void;
}

export default function NotificationList({ open, onClose }: NotificationListProps) {
  const notifications = useNotificationStore((s) => s.notifications);
  const loading = useNotificationStore((s) => s.loading);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);

  useEffect(() => {
    if (open) fetchNotifications(0);
  }, [open, fetchNotifications]);

  const handleMarkAll = async () => {
    await markAllAsRead();
    message.success('已全部标为已读');
  };

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BellOutlined />
          通知
          {unreadCount > 0 && (
            <span style={{ fontSize: 12, color: '#a39e98', fontWeight: 400 }}>
              ({unreadCount} 条未读)
            </span>
          )}
        </div>
      }
      open={open}
      onClose={onClose}
      width={420}
      styles={{ body: { padding: 0 } }}
      extra={
        unreadCount > 0 ? (
          <Button
            type="text"
            size="small"
            icon={<CheckOutlined />}
            onClick={handleMarkAll}
            style={{ color: '#0075de', fontSize: 12 }}
          >
            全部已读
          </Button>
        ) : null
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : notifications.length === 0 ? (
        <Empty description="暂无通知" style={{ marginTop: 60 }} />
      ) : (
        <div>
          {notifications.map((n, idx) => (
            <div key={n.id}>
              <NotificationItem notification={n} onClose={onClose} />
              {idx < notifications.length - 1 && (
                <Divider style={{ margin: 0 }} />
              )}
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}
