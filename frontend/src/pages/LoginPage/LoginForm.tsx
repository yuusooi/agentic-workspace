import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Alert } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/auth-store';
import apiClient from '@/lib/api-client';

interface LoginFormValues {
  email: string;
  password: string;
}

interface LoginFormProps {
  onForgotPassword: () => void;
  onLock: (durationMs: number) => void;
}

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export default function LoginForm({ onForgotPassword, onLock }: LoginFormProps) {
  const [form] = Form.useForm<LoginFormValues>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'error' | 'warning'>('error');
  const [failedAttempts, setFailedAttempts] = useState(0);

  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.post('/auth/login', values);
      setAuth(res.data.user, res.data.access_token, res.data.refresh_token);
      navigate('/projects', { replace: true });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response?.status;
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;

      if (status === 423) {
        onLock(LOCK_DURATION_MS);
        return;
      }

      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        onLock(LOCK_DURATION_MS);
        return;
      }

      if (newAttempts === MAX_ATTEMPTS - 1) {
        setError('还有 1 次尝试机会，失败后账户将被锁定 15 分钟');
        setErrorType('warning');
      } else {
        setError(message || '邮箱或密码错误');
        setErrorType('error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-form-wrapper">
      {error && (
        <Alert
          message={error}
          type={errorType}
          showIcon
          className="login-alert"
        />
      )}
      <Form form={form} onFinish={handleSubmit} layout="vertical" requiredMark={false}>
        <Form.Item
          name="email"
          label="邮箱"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '请输入有效的邮箱地址' },
          ]}
        >
          <Input
            prefix={<MailOutlined />}
            placeholder="your@email.com"
            size="large"
          />
        </Form.Item>
        <Form.Item
          name="password"
          label="密码"
          rules={[{ required: true, message: '请输入密码' }]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="输入密码"
            size="large"
          />
        </Form.Item>
        <Form.Item style={{ marginBottom: 12 }}>
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={loading}
            className="login-submit-btn"
          >
            登录
          </Button>
        </Form.Item>
      </Form>
      <div className="login-forgot-link" onClick={onForgotPassword}>
        忘记密码？
      </div>
    </div>
  );
}
