import { Tag as AntTag } from 'antd';
import type { TaskTag } from '@/lib/task-api';

interface TagBadgeProps {
  tag: TaskTag;
  closable?: boolean;
  onClose?: () => void;
  onClick?: () => void;
}

export default function TagBadge({ tag, closable, onClose, onClick }: TagBadgeProps) {
  return (
    <AntTag
      closable={closable}
      onClose={onClose}
      onClick={onClick}
      style={{
        margin: 0,
        paddingInline: 8,
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 500,
        background: hexToRgba(tag.color, 0.08),
        borderColor: hexToRgba(tag.color, 0.2),
        color: tag.color,
        cursor: onClick ? 'pointer' : undefined,
        lineHeight: '20px',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: tag.color,
          marginRight: 4,
          verticalAlign: 'middle',
        }}
      />
      {tag.name}
    </AntTag>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
