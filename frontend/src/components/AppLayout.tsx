import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Avatar, Button, Tooltip } from 'antd';
import {
  AppstoreOutlined,
  GlobalOutlined,
  LogoutOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/stores/auth-store';

const navItems = [
  { path: '/projects', label: '我的项目', icon: <AppstoreOutlined /> },
  { path: '/projects/public', label: '公开项目', icon: <GlobalOutlined /> },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  const isActive = (path: string) => {
    if (path === '/projects') return location.pathname === '/projects';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 240,
        minWidth: 240,
        background: '#f6f5f4',
        borderRight: '1px solid rgba(0,0,0,.06)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{
          padding: '14px 14px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <div style={{
            width: 28,
            height: 28,
            background: '#0075de',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: '#fff', stroke: 'none' }}>
              <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
            </svg>
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.2, color: 'rgba(0,0,0,.95)' }}>
            Agentic Workspace
          </span>
        </div>

        {/* Navigation */}
        <div style={{ padding: '6px 8px' }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#a39e98',
            padding: '8px 8px 4px',
            textTransform: 'uppercase',
            letterSpacing: 0.3,
          }}>
            导航
          </div>
          {navItems.map((item) => (
            <div
              key={item.path}
              onClick={() => navigate(item.path)}
              onMouseEnter={() => setHoveredNav(item.path)}
              onMouseLeave={() => setHoveredNav(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 14,
                color: isActive(item.path) ? '#0075de' : (hoveredNav === item.path ? 'rgba(0,0,0,.95)' : '#615d59'),
                background: isActive(item.path) ? 'rgba(0,117,222,.08)' : 'transparent',
                transition: 'all .1s',
              }}
            >
              <span style={{ fontSize: 16, opacity: isActive(item.path) ? 1 : 0.7 }}>
                {item.icon}
              </span>
              {item.label}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 'auto',
          padding: 8,
          borderTop: '1px solid rgba(0,0,0,.06)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 8px',
            borderRadius: 4,
          }}>
            <Avatar
              size={24}
              style={{
                backgroundColor: '#31302e',
                fontSize: 11,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {user?.name?.[0] || '?'}
            </Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(0,0,0,.95)' }}>
                {user?.name || '用户'}
              </div>
            </div>
            <Tooltip title="设置">
              <Button
                type="text"
                size="small"
                icon={<SettingOutlined />}
                style={{ color: '#615d59', border: 'none', background: 'transparent' }}
              />
            </Tooltip>
            <Tooltip title="退出登录">
              <Button
                type="text"
                size="small"
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                style={{ color: '#615d59', border: 'none', background: 'transparent' }}
              />
            </Tooltip>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        overflow: 'hidden',
      }}>
        <Outlet />
      </div>
    </div>
  );
}
