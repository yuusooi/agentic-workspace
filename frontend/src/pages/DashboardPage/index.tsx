import { useAuthStore } from '@/stores/auth-store';
import { Button } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#f6f5f4',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 8,
        padding: '40px 48px',
        boxShadow: '0 4px 24px rgba(0,0,0,.12)',
        textAlign: 'center',
        maxWidth: 480,
        width: '100%',
      }}>
        <h1 style={{
          fontFamily: "'Noto Serif SC', Georgia, serif",
          fontSize: 24,
          fontWeight: 700,
          marginBottom: 8,
          color: 'rgba(0,0,0,.95)',
        }}>
          Agentic Workspace
        </h1>
        <p style={{ color: '#615d59', marginBottom: 24 }}>
          Dashboard — 页面占位
        </p>
        {user && (
          <div style={{ marginBottom: 24, fontSize: 14, color: '#615d59' }}>
            <p>用户名: <strong>{user.username}</strong></p>
            <p>邮箱: <strong>{user.email}</strong></p>
            <p>角色: <strong>{user.role}</strong></p>
          </div>
        )}
        <Button
          icon={<LogoutOutlined />}
          onClick={() => {
            logout();
            window.location.href = '/login';
          }}
        >
          退出登录
        </Button>
      </div>
    </div>
  );
}
