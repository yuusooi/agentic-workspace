import { useState, useEffect } from 'react';
import { Badge, Button, Tooltip } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useNotificationStore } from '@/stores/notification-store';
import NotificationList from './NotificationList';

const POLL_INTERVAL = 30_000;

export default function NotificationBell() {
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchUnreadCount();
    const timer = setInterval(fetchUnreadCount, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchUnreadCount]);

  return (
    <>
      <Tooltip title="通知">
        <Badge count={unreadCount} size="small" offset={[-2, 0]}>
          <Button
            type="text"
            size="small"
            icon={<BellOutlined style={{ fontSize: 16 }} />}
            onClick={() => setOpen(true)}
            style={{ color: '#615d59', border: 'none', background: 'transparent' }}
          />
        </Badge>
      </Tooltip>
      <NotificationList open={open} onClose={() => setOpen(false)} />
    </>
  );
}
