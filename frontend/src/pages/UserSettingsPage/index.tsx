import { useState, useEffect } from 'react';
import {
  Card, Input, Button, Avatar, Upload, Switch, Divider, message, Spin,
} from 'antd';
import { CameraOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/auth-store';
import * as userApi from '@/lib/user-api';

const AVATAR_COLORS = ['#31302e', '#0075de', '#615d59', '#1aae39', '#dd5b00', '#9c5ddf'];

export default function UserSettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  const [loading, setLoading] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [preferences, setPreferences] = useState<userApi.UserPreferences>({
    emailNotification: true as unknown as number,
    deadlineReminder: true as unknown as number,
    mentionNotify: true as unknown as number,
    statusChangeNotify: true as unknown as number,
    overdueWarning: true as unknown as number,
    memberChangeNotify: true as unknown as number,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const profile = await userApi.getUserProfile();
      setNickname(profile.nickname);
      const prefs = await userApi.getPreferences();
      setPreferences(prefs);
    } catch {
      // use defaults
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!nickname.trim()) {
      message.error('名称不能为空');
      return;
    }
    setSavingName(true);
    try {
      await userApi.updateUserProfile({ nickname: nickname.trim() });
      if (user && accessToken && refreshToken) {
        setAuth({ ...user, nickname: nickname.trim() }, accessToken, refreshToken);
      }
      message.success('名称已更新');
    } catch {
      message.error('更新失败');
    } finally {
      setSavingName(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      message.error('头像大小不能超过 2MB');
      return false;
    }
    if (!file.type.startsWith('image/')) {
      message.error('请上传图片文件');
      return false;
    }
    setUploading(true);
    try {
      const { avatar } = await userApi.uploadAvatar(file);
      if (user && accessToken && refreshToken) {
        setAuth({ ...user, avatar }, accessToken, refreshToken);
      }
      message.success('头像已更新');
    } catch {
      message.error('上传失败');
    } finally {
      setUploading(false);
    }
    return false;
  };

  const handlePreferenceChange = async (key: keyof userApi.UserPreferences, value: number) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    try {
      await userApi.updatePreferences({ [key]: value });
      message.success('偏好已更新');
    } catch {
      setPreferences(preferences);
      message.error('更新失败');
    }
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 32px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: -0.3,
          margin: 0,
          marginBottom: 24,
          color: 'rgba(0,0,0,.95)',
        }}>
          个人设置
        </h1>

        <Card
          style={{ marginBottom: 20, borderRadius: 8 }}
          styles={{ body: { padding: 24 } }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
            <Upload
              beforeUpload={handleAvatarUpload}
              showUploadList={false}
              accept="image/*"
              disabled={uploading}
            >
              <div style={{ position: 'relative', cursor: 'pointer' }}>
                <Avatar
                  size={72}
                  src={user?.avatar}
                  style={{
                    backgroundColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
                    fontSize: 28,
                    fontWeight: 600,
                  }}
                >
                  {user?.nickname?.[0] || '?'}
                </Avatar>
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: '#0075de',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #fff',
                  }}
                >
                  <CameraOutlined style={{ color: '#fff', fontSize: 10 }} />
                </div>
              </div>
            </Upload>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: 'rgba(0,0,0,.95)' }}>
                {user?.nickname || '用户'}
              </div>
              <div style={{ fontSize: 13, color: '#a39e98' }}>
                @{user?.username || 'username'}
              </div>
              <div style={{ fontSize: 12, color: '#a39e98' }}>
                {user?.email || ''}
              </div>
            </div>
          </div>

          <Divider style={{ margin: '0 0 20px' }} />

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: '#a39e98', marginBottom: 4, display: 'block' }}>
                显示名称
              </label>
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={30}
                placeholder="输入名称"
              />
            </div>
            <Button
              type="primary"
              onClick={handleSaveName}
              loading={savingName}
              disabled={nickname === user?.nickname}
            >
              保存
            </Button>
          </div>
        </Card>

        <Card
          style={{ marginBottom: 20, borderRadius: 8 }}
          styles={{ body: { padding: 24 } }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px', color: 'rgba(0,0,0,.95)' }}>
            通知偏好
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(0,0,0,.95)' }}>
                  邮件通知
                </div>
                <div style={{ fontSize: 12, color: '#a39e98' }}>
                  接收项目相关邮件通知
                </div>
              </div>
              <Switch
                checked={!!preferences.emailNotification}
                onChange={(v) => handlePreferenceChange('emailNotification', v as unknown as number)}
              />
            </div>

            <Divider style={{ margin: 0 }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(0,0,0,.95)' }}>
                  截止提醒
                </div>
                <div style={{ fontSize: 12, color: '#a39e98' }}>
                  任务截止前收到提醒通知
                </div>
              </div>
              <Switch
                checked={!!preferences.deadlineReminder}
                onChange={(v) => handlePreferenceChange('deadlineReminder', v as unknown as number)}
              />
            </div>

            <Divider style={{ margin: 0 }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(0,0,0,.95)' }}>
                  @提及通知
                </div>
                <div style={{ fontSize: 12, color: '#a39e98' }}>
                  有人 @你时收到通知
                </div>
              </div>
              <Switch
                checked={!!preferences.mentionNotify}
                onChange={(v) => handlePreferenceChange('mentionNotify', v as unknown as number)}
              />
            </div>
          </div>
        </Card>

        <Card
          style={{ borderRadius: 8 }}
          styles={{ body: { padding: 24 } }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px', color: 'rgba(0,0,0,.95)' }}>
            账号信息
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#615d59' }}>用户名</span>
              <span style={{ fontSize: 13, color: 'rgba(0,0,0,.95)' }}>{user?.username}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#615d59' }}>邮箱</span>
              <span style={{ fontSize: 13, color: 'rgba(0,0,0,.95)' }}>{user?.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#615d59' }}>角色</span>
              <span style={{ fontSize: 13, color: user?.role === 'ADMIN' ? '#0075de' : 'rgba(0,0,0,.95)' }}>
                {user?.role === 'ADMIN' ? '管理员' : '普通用户'}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
