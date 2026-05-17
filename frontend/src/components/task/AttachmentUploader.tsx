import { useState } from 'react';
import { Upload, Button, message, Progress } from 'antd';
import { PaperClipOutlined } from '@ant-design/icons';
import * as taskApi from '@/lib/task-api';

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv',
  'application/zip', 'application/x-rar-compressed',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface AttachmentUploaderProps {
  taskId: string;
  onUploaded?: (attachment: taskApi.TaskAttachment) => void;
}

export default function AttachmentUploader({ taskId, onUploaded }: AttachmentUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|gif|webp|svg|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|zip|rar)$/i)) {
      message.error('不支持的文件类型');
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      message.error('文件大小不能超过 10MB');
      return false;
    }

    setUploading(true);
    setProgress(0);
    try {
      const attachment = await taskApi.uploadAttachment(taskId, file);
      setProgress(100);
      onUploaded?.(attachment);
      message.success('上传成功');
    } catch {
      message.error('上传失败');
    } finally {
      setUploading(false);
      setProgress(0);
    }
    return false;
  };

  return (
    <div>
      <Upload
        beforeUpload={handleUpload}
        showUploadList={false}
        multiple={false}
        accept={ALLOWED_TYPES.join(',')}
      >
        <Button
          type="text"
          icon={<PaperClipOutlined />}
          loading={uploading}
          style={{ color: '#615d59', fontSize: 13 }}
          size="small"
        >
          {uploading ? '上传中...' : '添加附件'}
        </Button>
      </Upload>
      {uploading && (
        <Progress percent={progress} size="small" style={{ margin: '4px 0 0' }} />
      )}
    </div>
  );
}
