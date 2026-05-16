import { useState, useEffect } from 'react';
import { LockOutlined } from '@ant-design/icons';

interface LockOverlayProps {
  lockUntil: number;
  onUnlock: () => void;
}

export default function LockOverlay({ lockUntil, onUnlock }: LockOverlayProps) {
  const [remaining, setRemaining] = useState(lockUntil - Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = lockUntil - Date.now();
      if (diff <= 0) {
        clearInterval(timer);
        onUnlock();
        return;
      }
      setRemaining(diff);
    }, 1000);

    return () => clearInterval(timer);
  }, [lockUntil, onUnlock]);

  const formatCountdown = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0) {
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${seconds} 秒`;
  };

  return (
    <div className="lock-overlay">
      <div className="lock-icon">
        <LockOutlined />
      </div>
      <h2 className="lock-title">账户已锁定</h2>
      <p className="lock-msg">由于多次登录失败，账户已被临时锁定</p>
      <div className="lock-countdown">{formatCountdown(remaining)}</div>
      <p className="lock-hint">后自动解锁</p>
    </div>
  );
}
