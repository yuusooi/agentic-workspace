import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Alert } from 'antd';
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import apiClient from '@/lib/api-client';

interface RegisterFormValues {
  username: string;
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterForm() {
  const [form] = Form.useForm<RegisterFormValues>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      await apiClient.post('/auth/send-code', { email, purpose: 'REGISTER' });
      startCountdown();
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { message?: string } } })?.response?.data;
      const errMessage = (errData as any)?.message || '发送验证码失败';
      setError(errMessage);
    } finally {
      setCodeSending(false);
    }
  };

  const handleSubmit = async (values: RegisterFormValues) => {
    setError(null);

    if (values.password !== values.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/register', {
        username: values.username,
        email: values.email,
        code: values.code,
        password: values.password,
        confirmPassword: values.confirmPassword,
      });
      navigate('/login', { replace: true, state: { registered: true } });
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { message?: string } } })?.response?.data;
      const errMessage = (errData as any)?.message || '注册失败';
      setError(errMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-form-wrapper">
      {error && (
        <Alert
          title={error}
          type="error"
          showIcon
          className="login-alert"
        />
      )}
      <Form form={form} onFinish={handleSubmit} layout="vertical" requiredMark={false}>
        <Form.Item
          name="username"
          label="用户名"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 3, max: 20, message: '用户名长度为 3 ~ 20 个字符' },
            {
              pattern: /^[a-zA-Z][a-zA-Z0-9_-]*$/,
              message: '必须以字母开头，只能包含字母、数字、下划线、连字符',
            },
          ]}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder="输入用户名"
            size="large"
          />
        </Form.Item>
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
          label="密码"
          rules={[
            { required: true, message: '请输入密码' },
            { min: 8, max: 128, message: '密码长度为 8 ~ 128 个字符' },
            {
              pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
              message: '必须包含至少 1 个大写字母、1 个小写字母、1 个数字',
            },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="输入密码"
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
            placeholder="再次输入密码"
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
            注册
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
