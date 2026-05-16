import { useState } from 'react';
import { Tabs } from 'antd';
import LoginLogo from './LoginLogo';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import ForgotPasswordForm from './ForgotPasswordForm';
import LockOverlay from './LockOverlay';
import './LoginPage.css';

type AuthView = 'login' | 'register' | 'forgot';

export default function LoginPage() {
  const [view, setView] = useState<AuthView>('login');
  const [activeTab, setActiveTab] = useState<string>('login');
  const [isLocked, setIsLocked] = useState(false);
  const [lockUntil, setLockUntil] = useState<number | null>(null);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setView(key as AuthView);
  };

  const handleSwitchToForgot = () => {
    setView('forgot');
  };

  const handleBackToLogin = () => {
    setView('login');
    setActiveTab('login');
  };

  const handleLock = (durationMs: number) => {
    setLockUntil(Date.now() + durationMs);
    setIsLocked(true);
  };

  const handleUnlock = () => {
    setIsLocked(false);
    setLockUntil(null);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <LoginLogo />

        <h1 className="login-title">Agentic Workspace</h1>
        <p className="login-subtitle">AI 驱动的智能任务协同平台</p>

        {view !== 'forgot' && (
          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            centered
            items={[
              { key: 'login', label: '登录' },
              { key: 'register', label: '注册' },
            ]}
            className="login-tabs"
          />
        )}

        {isLocked && lockUntil ? (
          <LockOverlay
            lockUntil={lockUntil}
            onUnlock={handleUnlock}
          />
        ) : (
          <>
            {view === 'login' && (
              <LoginForm
                onForgotPassword={handleSwitchToForgot}
                onLock={handleLock}
              />
            )}
            {view === 'register' && <RegisterForm />}
            {view === 'forgot' && (
              <ForgotPasswordForm onBack={handleBackToLogin} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
