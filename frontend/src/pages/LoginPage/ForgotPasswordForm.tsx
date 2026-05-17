import { useState } from 'react';
import { Form, Input, Button, Alert } from 'antd';
import { MailOutlined, LockOutlined, SafetyOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import apiClient from '@/lib/api-client';

interface ForgotPasswordFormValues {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
}

interface ForgotPasswordFormProps {
  onBack: () => void;
}

export default function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [form] = Form.useForm<ForgotPasswordFormValues>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [codeSending, setCodeSending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendCode = async () => {
    try {
      const email = form.getFieldValue('email');
      if (!email) {
        form.validateFields(['email']);
        return;
      }

      setCodeSending(true);
      await apiClient.post('/auth/send-code', { email, purpose: 'RESET_PASSWORD' });
      startCountdown();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || '发送验证码失败');
    } finally {
      setCodeSending(false);
    }
  };

  const handleSubmit = async (values: ForgotPasswordFormValues) => {
    setError(null);

    if (values.password !== values.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', {
        email: values.email,
        code: values.code,
        new_password: values.password,
      });
      setSuccess(true);
      setTimeout(() => {
        onBack();
      }, 2000);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || '重置密码失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-form-wrapper">
      <div className="login-back-link" onClick={onBack}>
        <ArrowLeftOutlined /> 返回登录
      </div>

      <h2 className="forgot-title">忘记密码</h2>
      <p className="forgot-desc">输入注册邮箱，我们将发送验证码到您的邮箱</p>

      {error && (
        <Alert
          title={error}
          type="error"
          showIcon
          className="login-alert"
        />
      )}
      {success && (
        <Alert
          title="密码重置成功，正在跳转到登录页..."
          type="success"
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
          name="code"
          label="验证码"
          rules={[{ required: true, message: '请输入验证码' }]}
        >
          <Input
            prefix={<SafetyOutlined />}
            placeholder="输入验证码"
            size="large"
            addonAfter={
              <span
                className={`code-btn ${countdown > 0 || codeSending ? 'code-btn-disabled' : ''}`}
                onClick={countdown > 0 || codeSending ? undefined : handleSendCode}
              >
                {codeSending ? '发送中...' : countdown > 0 ? `${countdown}s 后重发` : '发送验证码'}
              </span>
            }
          />
        </Form.Item>
        <Form.Item
          name="password"
          label="新密码"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 8, max: 128, message: '密码长度为 8 ~ 128 个字符' },
            {
              pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
              message: '必须包含至少 1 个大写字母、1 个小写字母、1 个数字',
            },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="输入新密码"
            size="large"
          />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label="确认密码"
          dependencies={['password']}
          rules={[
            { required: true, message: '请确认密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致'));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="再次输入新密码"
            size="large"
          />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={loading}
            className="login-submit-btn"
          >
            重置密码
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
