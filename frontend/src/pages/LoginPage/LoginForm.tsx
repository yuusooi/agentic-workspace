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
const LOCK_DURATION_MS = 15 * 60 * 1000;

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
      const data = res.data;
      const userInfo = data.userInfo;
      setAuth(
        {
          id: String(userInfo.id),
          username: userInfo.username,
          nickname: userInfo.nickname,
          email: userInfo.email,
          role: userInfo.role,
          canCreateProject: userInfo.canCreateProject === 1,
          avatar: userInfo.avatar,
        },
        data.accessToken,
        data.refreshToken,
      );
      navigate('/projects', { replace: true });
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { code?: number; message?: string; data?: any } } })?.response?.data;
      const errCode = errData?.code;
      const errMessage = errData?.message;

      if (errCode === 4001) {
        const lockData = errData?.data;
        if (lockData?.remaining_seconds) {
          onLock(lockData.remaining_seconds * 1000);
          return;
        }
      }

      if (errCode === 4031) {
        setError('账户已被禁用，请联系管理员');
        setErrorType('error');
        return;
      }

      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        onLock(LOCK_DURATION_MS);
        return;
      }

      if (errCode === 4010 && errData?.data?.remaining_attempts !== undefined) {
        const remaining = errData.data.remaining_attempts;
        if (remaining <= 1) {
          setError('还有 1 次尝试机会，失败后账户将被锁定 15 分钟');
          setErrorType('warning');
        } else {
          setError(errMessage || '邮箱或密码错误');
          setErrorType('error');
        }
      } else {
        setError(errMessage || '邮箱或密码错误');
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
          title={error}
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
