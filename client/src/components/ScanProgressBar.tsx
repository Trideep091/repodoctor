import React from 'react';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';

export interface ScanStage {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
}

interface ScanProgressBarProps {
  stages: ScanStage[];
  repoName: string;
}

export const ScanProgressBar: React.FC<ScanProgressBarProps> = ({ stages, repoName }) => {
  return (
    <div className="progress-container">
      <div className="progress-header">
        <div className="progress-title-group">
          <div className="pulse-spinner" />
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
              Diagnosing {repoName}
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Executing multi-scanner inspection pipelines across code tree, manifests, and security policies...
            </p>
          </div>
        </div>
      </div>

      <div className="stage-list">
        {stages.map((stage) => {
          let icon = <Circle size={16} color="var(--text-muted)" />;
          let className = 'stage-item';

          if (stage.status === 'completed') {
            icon = <CheckCircle2 size={16} color="var(--status-success)" />;
            className += ' completed';
          } else if (stage.status === 'active') {
            icon = <Loader2 size={16} color="var(--accent-cyan)" className="pulse-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />;
            className += ' active';
          }

          return (
            <div key={stage.id} className={className}>
              {icon}
              <span>{stage.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
