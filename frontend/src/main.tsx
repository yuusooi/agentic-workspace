import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import App from './App';
import { notionTheme } from './theme/theme';

async function bootstrap() {
  if (import.meta.env.DEV) {
    const [{ setupAuthMock }, apiClient] = await Promise.all([
      import('./mock/auth-mock'),
      import('@/lib/api-client'),
    ]);
    setupAuthMock(apiClient.default);
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ConfigProvider theme={notionTheme}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConfigProvider>
    </React.StrictMode>
  );
}

bootstrap();
