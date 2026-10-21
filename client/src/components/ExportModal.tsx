import React from 'react';
import { ApiService } from '../services/api.js';
import { X, Download, FileText, FileSpreadsheet, ShieldCheck } from 'lucide-react';

interface ExportModalProps {
  scanId: string;
  repoFullName: string;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ scanId, repoFullName, onClose }) => {
  const jsonUrl = ApiService.getExportUrl(scanId, 'json');
  const csvUrl = ApiService.getExportUrl(scanId, 'csv');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Download size={20} color="var(--accent-cyan)" />
            <h3 className="modal-title">Export Diagnosis Report</h3>
          </div>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close Modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Download the complete technical diagnosis report for <strong>{repoFullName}</strong>.
          </p>

          <div
            style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: '0.8125rem',
              color: 'var(--status-success)',
            }}
          >
            <ShieldCheck size={18} />
            <span>All detected secrets and tokens are strictly redacted from exported reports.</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <a
              href={jsonUrl}
              download
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: 14 }}
            >
              <FileText size={20} color="var(--accent-cyan)" />
              <div style={{ textAlign: 'left', marginLeft: 6 }}>
                <div style={{ fontWeight: 600 }}>Download JSON Report</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Complete structured findings, category scores, and proposed diffs
                </div>
              </div>
            </a>

            <a
              href={csvUrl}
              download
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: 14 }}
            >
              <FileSpreadsheet size={20} color="#10b981" />
              <div style={{ textAlign: 'left', marginLeft: 6 }}>
                <div style={{ fontWeight: 600 }}>Download CSV Report</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Tabular spreadsheet format for security compliance and tracking
                </div>
              </div>
            </a>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
