import React, { useState } from 'react';
import { Finding } from '../types/index.js';
import { ChevronDown, ChevronRight, FileCode, Wrench, ShieldAlert, AlertTriangle, Info } from 'lucide-react';
import { DiffViewer } from './DiffViewer.js';

interface FindingCardProps {
  finding: Finding;
  onSelectFix?: (findingId: string) => void;
}

export const FindingCard: React.FC<FindingCardProps> = ({ finding, onSelectFix }) => {
  const [expanded, setExpanded] = useState(false);

  const getSeverityIcon = () => {
    switch (finding.severity) {
      case 'critical':
        return <ShieldAlert size={16} color="var(--status-critical)" />;
      case 'high':
        return <AlertTriangle size={16} color="var(--status-high)" />;
      case 'medium':
        return <AlertTriangle size={16} color="var(--status-medium)" />;
      default:
        return <Info size={16} color="var(--status-low)" />;
    }
  };

  return (
    <div className="finding-card">
      <div className="finding-header" onClick={() => setExpanded(!expanded)}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
          <div style={{ marginTop: 2 }}>{getSeverityIcon()}</div>
          <div style={{ flex: 1 }}>
            <div className="finding-title-group">
              <span className={`badge-severity ${finding.severity}`}>{finding.severity}</span>
              <span className="finding-rule-id">{finding.ruleId}</span>
              <span className="finding-title">{finding.ruleTitle}</span>
            </div>

            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className="finding-filepath">
                <FileCode size={13} />
                <span>
                  {finding.filePath}
                  {finding.lineNumber ? `:${finding.lineNumber}` : ''}
                </span>
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Confidence: <strong style={{ textTransform: 'capitalize' }}>{finding.confidence}</strong>
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {finding.resolutionStatus === 'fix_available' && onSelectFix && (
            <button
              className="btn btn-primary"
              style={{ padding: '6px 12px', fontSize: '0.75rem' }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectFix(finding.id);
              }}
            >
              <Wrench size={13} />
              <span>Review Fix</span>
            </button>
          )}

          <button
            className="btn btn-ghost"
            style={{ padding: 6 }}
            aria-label="Expand finding details"
          >
            {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="finding-body">
          <div>
            <h5 style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 4 }}>
              DESCRIPTION & IMPACT
            </h5>
            <p style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>{finding.description}</p>
          </div>

          <div>
            <h5 style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 4 }}>
              EVIDENCE FOUND IN REPOSITORY
            </h5>
            <div className="evidence-box">{finding.evidence}</div>
          </div>

          <div>
            <h5 style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 4 }}>
              RECOMMENDED REMEDIATION
            </h5>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{finding.recommendation}</p>
          </div>

          {finding.proposedPatch && (
            <div>
              <h5 style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                PROPOSED AUTOMATED PATCH DIFF
              </h5>
              <DiffViewer
                filePath={finding.filePath}
                diffUnified={finding.proposedPatch.diffUnified}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
