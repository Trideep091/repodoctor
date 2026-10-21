import React from 'react';

interface DiffViewerProps {
  filePath: string;
  diffUnified?: string;
  additions?: number;
  deletions?: number;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  filePath,
  diffUnified = '',
  additions,
  deletions,
}) => {
  const lines = diffUnified.split('\n');

  let addCount = additions || 0;
  let delCount = deletions || 0;

  if (additions === undefined || deletions === undefined) {
    addCount = lines.filter((l) => l.startsWith('+') && !l.startsWith('+++')).length;
    delCount = lines.filter((l) => l.startsWith('-') && !l.startsWith('---')).length;
  }

  return (
    <div className="diff-container">
      <div className="diff-header">
        <span style={{ fontWeight: 600 }}>{filePath}</span>
        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{ color: 'var(--status-success)', fontWeight: 600 }}>+{addCount}</span>
          <span style={{ color: 'var(--status-critical)', fontWeight: 600 }}>-{delCount}</span>
        </div>
      </div>

      <div style={{ padding: '6px 0' }}>
        {lines.map((line, idx) => {
          let lineType: 'add' | 'delete' | 'normal' | 'hunk' = 'normal';
          if (line.startsWith('@@')) {
            lineType = 'hunk';
          } else if (line.startsWith('+') && !line.startsWith('+++')) {
            lineType = 'add';
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            lineType = 'delete';
          }

          let style: React.CSSProperties = {
            display: 'flex',
            padding: '2px 12px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          };

          if (lineType === 'add') {
            style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
            style.color = '#34d399';
          } else if (lineType === 'delete') {
            style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
            style.color = '#f87171';
          } else if (lineType === 'hunk') {
            style.backgroundColor = 'rgba(56, 189, 248, 0.08)';
            style.color = 'var(--accent-cyan)';
            style.fontWeight = 600;
          } else {
            style.color = 'var(--text-secondary)';
          }

          return (
            <div key={idx} style={style}>
              <span style={{ width: 36, color: 'var(--text-muted)', userSelect: 'none', textAlign: 'right', paddingRight: 10 }}>
                {idx + 1}
              </span>
              <span>{line}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
