import { Popconfirm, message } from 'antd';
import { DeleteOutlined, FileOutlined, FileImageOutlined, FilePdfOutlined, FileTextOutlined, FileZipOutlined } from '@ant-design/icons';
import type { TaskAttachment } from '@/lib/task-api';
import * as taskApi from '@/lib/task-api';

interface AttachmentListProps {
  attachments: TaskAttachment[];
  onDelete?: (attachmentId: string) => void;
  editable?: boolean;
  currentUserId?: string;
  isAdminOrOwner?: boolean;
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return <FileImageOutlined style={{ color: '#0075de' }} />;
  if (type === 'application/pdf') return <FilePdfOutlined style={{ color: '#dd5b00' }} />;
  if (type.startsWith('text/')) return <FileTextOutlined style={{ color: '#1aae39' }} />;
  if (type.includes('zip') || type.includes('rar') || type.includes('compressed'))
    return <FileZipOutlined style={{ color: '#615d59' }} />;
  return <FileOutlined style={{ color: '#a39e98' }} />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function AttachmentList({ attachments, onDelete, editable = true, currentUserId, isAdminOrOwner }: AttachmentListProps) {
  if (attachments.length === 0) return null;

  const handleDelete = async (id: string) => {
    try {
      await taskApi.deleteAttachment(id);
      onDelete?.(id);
      message.success('删除成功');
    } catch {
      message.error('删除失败');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {attachments.map((att) => (
        <div
          key={att.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 8px',
            borderRadius: 4,
            background: '#f6f5f4',
            fontSize: 13,
          }}
        >
          {getFileIcon(att.file_type)}
          <a
            href={att.file_url}
            target="_blank"
            rel="noopener noreferrer"
            download
            style={{
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: 'rgba(0,0,0,.95)',
              textDecoration: 'none',
            }}
          >
            {att.file_name}
          </a>
          <span style={{ fontSize: 11, color: '#a39e98', flexShrink: 0 }}>
            {formatFileSize(att.file_size)}
          </span>
          <span style={{ fontSize: 11, color: '#a39e98', flexShrink: 0 }}>
            {formatDate(att.created_at)}
          </span>
          {editable && (isAdminOrOwner || att.uploaded_by === currentUserId) && (
            <Popconfirm
              title="确认删除此附件？"
              onConfirm={() => handleDelete(att.id)}
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <DeleteOutlined
                style={{ color: '#a39e98', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}
              />
            </Popconfirm>
          )}
        </div>
      ))}
    </div>
  );
}
