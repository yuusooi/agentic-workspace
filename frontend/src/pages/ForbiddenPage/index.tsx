import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

export default function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Result
        status="403"
        title="403"
        subTitle="抱歉，您没有权限访问此页面"
        extra={
          <Button type="primary" onClick={() => navigate('/projects')}>
            返回项目列表
          </Button>
        }
      />
    </div>
  );
}
