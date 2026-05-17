import type { AxiosResponse, InternalAxiosRequestConfig, AxiosAdapter } from 'axios';
import type { AuthUser } from '@/stores/auth-store';

const MOCK_ACCOUNTS: Array<{ email: string; password: string; user: AuthUser }> = [
  {
    email: 'admin@test.com',
    password: 'Admin123',
    user: {
      id: 'mock-admin-001',
      username: 'admin',
      name: '管理员',
      email: 'admin@test.com',
      role: 'ADMIN',
      can_create_project: true,
      avatar: null,
    },
  },
  {
    email: 'user@test.com',
    password: 'User1234',
    user: {
      id: 'mock-user-001',
      username: 'testuser',
      name: '测试用户',
      email: 'user@test.com',
      role: 'USER',
      can_create_project: true,
      avatar: null,
    },
  },
];

function fakeJwt(payload: object): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 86400000 }));
  const sig = btoa('mock-signature');
  return `${header}.${body}.${sig}`;
}

function parseData(config: InternalAxiosRequestConfig): Record<string, string> {
  if (typeof config.data === 'string') {
    try {
      return JSON.parse(config.data);
    } catch {
      return {};
    }
  }
  return config.data || {};
}

function ok(config: InternalAxiosRequestConfig, data: unknown): AxiosResponse {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {} as Record<string, string>,
    config,
  };
}

const mockAdapter: AxiosAdapter = (config) => {
  const cfg = config as InternalAxiosRequestConfig;

  if (cfg.url === '/auth/login' && cfg.method === 'post') {
    const { email, password } = parseData(cfg);
    const account = MOCK_ACCOUNTS.find((a) => a.email === email && a.password === password);
    if (account) {
      return Promise.resolve(
        ok(cfg, {
          user: account.user,
          access_token: fakeJwt({ sub: account.user.id, role: account.user.role }),
          refresh_token: fakeJwt({ sub: account.user.id, type: 'refresh' }),
        })
      );
    }
    return Promise.reject({
      response: { status: 401, data: { message: '邮箱或密码错误' } },
    });
  }

  if (cfg.url === '/auth/refresh' && cfg.method === 'post') {
    return Promise.resolve(
      ok(cfg, {
        access_token: fakeJwt({ sub: 'mock', role: 'USER' }),
        refresh_token: fakeJwt({ sub: 'mock', type: 'refresh' }),
      })
    );
  }

  return Promise.reject(new Error(`[mock] unhandled: ${cfg.url}`));
};

export function setupAuthMock(axiosInstance: ReturnType<typeof import('axios').default.create>) {
  const originalAdapter = axiosInstance.defaults.adapter;

  axiosInstance.defaults.adapter = (config) => {
    if (config.url === '/auth/login' || config.url === '/auth/refresh') {
      return mockAdapter(config);
    }
    if (originalAdapter) {
      return (originalAdapter as AxiosAdapter)(config);
    }
    return Promise.reject(new Error('No adapter'));
  };
}

if (import.meta.env.DEV) {
  console.log('%c🔐 Mock 登录已启用', 'color: #52c41a; font-weight: bold');
  console.table(
    MOCK_ACCOUNTS.map((a) => ({ 邮箱: a.email, 密码: a.password, 角色: a.user.role }))
  );
}
