import React, { useEffect, useState } from 'react';
import { ScanHistoryItem } from '../types/index.js';
import { ApiService } from '../services/api.js';
import { X, History, ExternalLink, Calendar, ArrowRight, Loader2 } from 'lucide-react';

interface HistoryModalProps {
  onClose: () => void;
  onSelectScan: (scanId: string) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ onClose, onSelectScan }) => {
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await ApiService.getHistory();
        setHistory(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 750 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <History size={20} color="var(--accent-cyan)" />
            <h3 className="modal-title">Scan History</h3>
          </div>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close Modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <Loader2 size={32} color="var(--accent-cyan)" className="pulse-spinner" />
            </div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <p>No repository scans recorded yet in this session.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {history.map((item) => (
                <div
                  key={item.scanId}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                  onClick={() => {
                    onSelectScan(item.scanId);
                    onClose();
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                        {item.repository}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.75rem',
                          background: 'rgba(56, 189, 248, 0.1)',
                          color: 'var(--accent-cyan)',
                          padding: '1px 6px',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        {item.branch}
                      </span>
                      {item.isSyntheticTest && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            background: 'rgba(129, 140, 248, 0.15)',
                            color: 'var(--accent-violet)',
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-full)',
                            fontWeight: 700,
                          }}
                        >
                          TK-S BENCHMARK
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={12} /> {new Date(item.timestamp).toLocaleString()}
                      </span>
                      <span>Total Findings: {item.totalFindings}</span>
                      <span>Fixes: {item.fixesAvailableCount}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '1.4rem',
                          fontWeight: 800,
                          color: item.overallScore >= 80 ? 'var(--status-success)' : item.overallScore >= 50 ? 'var(--status-medium)' : 'var(--status-critical)',
                        }}
                      >
                        {item.overallScore}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Score</div>
                    </div>

                    <ArrowRight size={18} color="var(--text-muted)" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
