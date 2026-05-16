import { CloseOutlined, UserOutlined } from '@ant-design/icons';

interface MemberTaskFilterProps {
  filteredUserId: string | null;
  filteredUserName: string | null;
  onClear: () => void;
}

export default function MemberTaskFilter({
  filteredUserId,
  filteredUserName,
  onClear,
}: MemberTaskFilterProps) {
  if (!filteredUserId) return null;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        background: 'rgba(0,117,222,.06)',
        borderRadius: 9999,
        fontSize: 12,
        color: '#0075de',
        fontWeight: 500,
      }}
    >
      <UserOutlined style={{ fontSize: 11 }} />
      <span>筛选: {filteredUserName || '成员'}</span>
      <CloseOutlined
        style={{ fontSize: 10, cursor: 'pointer', marginLeft: 2 }}
        onClick={onClear}
      />
    </div>
  );
}
