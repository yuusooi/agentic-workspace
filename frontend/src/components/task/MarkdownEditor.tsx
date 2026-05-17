import { useState, useRef, useCallback } from 'react';

/**
 * Lightweight Markdown editor with preview.
 * Notion-inspired: minimal chrome, focus on content.
 * Max 10000 characters as per PRD.
 */
interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  readOnly?: boolean;
  minRows?: number;
}

const MAX_LENGTH = 10000;

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = '输入 Markdown 内容...',
  maxLength = MAX_LENGTH,
  readOnly = false,
  minRows = 4,
}: MarkdownEditorProps) {
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charCount = value.length;
  const isOverLimit = charCount > maxLength;

  const insertMarkdown = useCallback(
    (prefix: string, suffix: string = '') => {
      const textarea = textareaRef.current;
      if (!textarea || readOnly) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end);
      const newText =
        value.substring(0, start) +
        prefix +
        (selectedText || '文本') +
        suffix +
        value.substring(end);

      onChange(newText);

      // Restore cursor
      requestAnimationFrame(() => {
        textarea.focus();
        const cursorPos = start + prefix.length + (selectedText ? selectedText.length : 2);
        textarea.setSelectionRange(cursorPos, cursorPos);
      });
    },
    [value, onChange, readOnly],
  );

  const toolbarItems = [
    { label: 'B', title: '粗体', action: () => insertMarkdown('**', '**') },
    { label: 'I', title: '斜体', action: () => insertMarkdown('*', '*') },
    { label: '~', title: '删除线', action: () => insertMarkdown('~~', '~~') },
    { label: 'H1', title: '标题1', action: () => insertMarkdown('# ') },
    { label: 'H2', title: '标题2', action: () => insertMarkdown('## ') },
    { label: '•', title: '无序列表', action: () => insertMarkdown('- ') },
    { label: '1.', title: '有序列表', action: () => insertMarkdown('1. ') },
    { label: '<>', title: '代码', action: () => insertMarkdown('`', '`') },
    { label: '```', title: '代码块', action: () => insertMarkdown('\n```\n', '\n```\n') },
    { label: '—', title: '分割线', action: () => insertMarkdown('\n---\n') },
    { label: '[]', title: '任务列表', action: () => insertMarkdown('- [ ] ') },
    { label: '🔗', title: '链接', action: () => insertMarkdown('[', '](url)') },
  ];

  if (readOnly) {
    return (
      <div style={styles.previewContainer}>
        <MarkdownPreview content={value} />
      </div>
    );
  }

  return (
    <div
      style={{
        border: `1px solid rgba(0,0,0,.1)`,
        borderRadius: 4,
        overflow: 'hidden',
        transition: 'border-color .15s',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          padding: '4px 8px',
          borderBottom: '1px solid rgba(0,0,0,.06)',
          background: '#f6f5f4',
        }}
      >
        {toolbarItems.map((item, idx) => (
          <button
            key={idx}
            title={item.title}
            onClick={item.action}
            style={{
              width: 26,
              height: 26,
              border: 'none',
              background: 'transparent',
              borderRadius: 3,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              color: '#615d59',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,.06)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            {item.label}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* Preview toggle */}
        <button
          onClick={() => setPreview(!preview)}
          style={{
            padding: '2px 8px',
            border: 'none',
            background: preview ? 'rgba(0,117,222,.08)' : 'transparent',
            borderRadius: 3,
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 500,
            color: preview ? '#0075de' : '#615d59',
          }}
        >
          {preview ? '编辑' : '预览'}
        </button>
      </div>

      {/* Editor / Preview */}
      {preview ? (
        <div style={{ ...styles.previewContainer, minHeight: minRows * 22 }}>
          <MarkdownPreview content={value} />
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              if (e.target.value.length <= maxLength) {
                onChange(e.target.value);
              }
            }}
            placeholder={placeholder}
            style={{
              width: '100%',
              minHeight: minRows * 22,
              padding: '8px 12px',
              border: 'none',
              outline: 'none',
              resize: 'vertical',
              fontSize: 13,
              lineHeight: 1.6,
              fontFamily:
                "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
              color: 'rgba(0,0,0,.95)',
              background: '#fff',
              boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '2px 8px',
          borderTop: '1px solid rgba(0,0,0,.06)',
          background: '#f6f5f4',
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: isOverLimit ? '#dd5b00' : '#a39e98',
          }}
        >
          {charCount}/{maxLength}
        </span>
      </div>
    </div>
  );
}

// ── Simple Markdown preview renderer ──────────────────

function MarkdownPreview({ content }: { content: string }) {
  if (!content) {
    return (
      <div style={{ fontSize: 13, color: '#a39e98', padding: '8px 12px' }}>
        暂无描述
      </div>
    );
  }

  // Simple markdown → HTML (handles common cases only)
  const html = content
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="lang-$1">$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Strikethrough
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    // Task list
    .replace(/^- \[x\] (.+)$/gm, '<div style="display:flex;gap:6px;align-items:baseline">☑ $1</div>')
    .replace(/^- \[ \] (.+)$/gm, '<div style="display:flex;gap:6px;align-items:baseline">☐ $1</div>')
    // Unordered list
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr/>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#0075de">$1</a>')
    // Line breaks → paragraphs
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  return (
    <div
      style={{
        fontSize: 13,
        lineHeight: 1.7,
        color: 'rgba(0,0,0,.95)',
        padding: '8px 12px',
      }}
      dangerouslySetInnerHTML={{
        __html: `<p>${html}</p>`,
      }}
    />
  );
}

const styles: Record<string, React.CSSProperties> = {
  previewContainer: {
    background: '#fff',
    minHeight: 88,
    fontSize: 13,
    lineHeight: 1.7,
  },
};
