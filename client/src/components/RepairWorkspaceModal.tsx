import React, { useState, useEffect } from 'react';
import { GeneratedPatch, Finding } from '../types/index.js';
import { ApiService } from '../services/api.js';
import { DiffViewer } from './DiffViewer.js';
import { X, GitPullRequest, AlertCircle, Wrench, Loader2, ShieldCheck, Scale, ExternalLink } from 'lucide-react';

interface RepairWorkspaceModalProps {
  scanId: string;
  initialFindingId?: string;
  findings: Finding[];
  baseBranch: string;
  availableBranches: string[];
  isSyntheticTest?: boolean;
  onClose: () => void;
  onSubmitPR: (patches: GeneratedPatch[], selectedBaseBranch: string) => Promise<void>;
  isSubmittingPR: boolean;
}

export const RepairWorkspaceModal: React.FC<RepairWorkspaceModalProps> = ({
  scanId,
  initialFindingId,
  findings,
  baseBranch,
  availableBranches,
  isSyntheticTest,
  onClose,
  onSubmitPR,
  isSubmittingPR,
}) => {
  const [selectedBaseBranch, setSelectedBaseBranch] = useState<string>(baseBranch);
  const [loading, setLoading] = useState<boolean>(true);
  const [patches, setPatches] = useState<GeneratedPatch[]>([]);
  const [selectedFindingIds, setSelectedFindingIds] = useState<Set<string>>(new Set());
  const [activePatchIndex, setActivePatchIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Requirement: Do not automatically choose a license. Require an explicit user decision.
  const [selectedLicense, setSelectedLicense] = useState<string>('none');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const hasMissingLicenseFinding = findings.some((f) => f.ruleId === 'COMM-001');

  // Load patches for fixable findings
  useEffect(() => {
    async function loadPatches() {
      setLoading(true);
      setError(null);
      try {
        const fixableFindings = findings.filter(
          (f) =>
            f.resolutionStatus === 'fix_available' ||
            (f.ruleId === 'COMM-001' && selectedLicense !== 'none')
        );
        const ids = fixableFindings.map((f) => f.id);

        if (ids.length === 0) {
          setPatches([]);
          setLoading(false);
          return;
        }

        const res = await ApiService.generateRepairs(scanId, ids, selectedLicense);
        setPatches(res.patches);

        // Preselect either initialFindingId or all patches
        if (initialFindingId) {
          setSelectedFindingIds(new Set([initialFindingId]));
          const idx = res.patches.findIndex((p) => p.findingId === initialFindingId);
          if (idx !== -1) setActivePatchIndex(idx);
        } else {
          setSelectedFindingIds(new Set(res.patches.map((p) => p.findingId)));
        }
      } catch (err: any) {
        setError(err.message || 'Failed to generate repair patches');
      } finally {
        setLoading(false);
      }
    }

    loadPatches();
  }, [scanId, findings, initialFindingId, selectedLicense]);

  const toggleSelect = (findingId: string) => {
    setSelectedFindingIds((prev) => {
      const next = new Set(prev);
      if (next.has(findingId)) {
        next.delete(findingId);
      } else {
        next.add(findingId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedFindingIds(new Set(patches.map((p) => p.findingId)));
  };

  const deselectAll = () => {
    setSelectedFindingIds(new Set());
  };

  const activePatch = patches[activePatchIndex];
  const approvedPatches = patches.filter((p) => selectedFindingIds.has(p.findingId));

  const handleCreatePR = async () => {
    if (approvedPatches.length === 0) return;
    setSubmitError(null);
    try {
      await onSubmitPR(approvedPatches, selectedBaseBranch);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to create repair branch and open Pull Request.');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 1100, height: '88vh' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'rgba(56, 189, 248, 0.12)', padding: 8, borderRadius: 'var(--radius-md)', color: 'var(--accent-cyan)' }}>
              <Wrench size={20} />
            </div>
            <div>
              <h3 className="modal-title">AI Repair & Pull Request Workspace</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Inspect proposed code diffs, approve fixes, and submit a dedicated repair branch to GitHub (Option A)
              </p>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close Modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Explicit License Decision Banner */}
          {hasMissingLicenseFinding && (
            <div
              style={{
                background: 'rgba(56, 189, 248, 0.05)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Scale size={18} color="var(--accent-cyan)" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                    Maintainer Decision: Open-Source License
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Repo Doctor will not automatically choose a license. Select your preferred license to generate a LICENSE file.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  value={selectedLicense}
                  onChange={(e) => setSelectedLicense(e.target.value)}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '6px 12px',
                    color: 'var(--text-primary)',
                    fontSize: '0.8125rem',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="none">Do Not Add LICENSE (Unlicensed)</option>
                  <option value="MIT">MIT License</option>
                  <option value="Apache-2.0">Apache 2.0 License</option>
                  <option value="BSD-3-Clause">BSD 3-Clause License</option>
                  <option value="ISC">ISC License</option>
                  <option value="GPL-3.0">GNU GPL v3.0</option>
                </select>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 16 }}>
              <Loader2 size={36} color="var(--accent-cyan)" className="pulse-spinner" />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                Generating context-aware repair diffs across affected files...
              </p>
            </div>
          ) : error ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--status-critical)' }}>
              <AlertCircle size={32} style={{ margin: '0 auto 12px auto' }} />
              <p>{error}</p>
            </div>
          ) : patches.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <ShieldCheck size={40} color="var(--status-success)" style={{ margin: '0 auto 12px auto' }} />
              <p>No automated repairs available for this repository state.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, flex: 1, minHeight: 0 }}>
              {/* Left Column: List of patches to select */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderRight: '1px solid var(--border-subtle)', paddingRight: 16, overflowY: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                    Proposed Patches ({approvedPatches.length}/{patches.length})
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" style={{ padding: '2px 6px', fontSize: '0.75rem' }} onClick={selectAll}>
                      All
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '2px 6px', fontSize: '0.75rem' }} onClick={deselectAll}>
                      None
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
                  {patches.map((patch, idx) => {
                    const isSelected = selectedFindingIds.has(patch.findingId);
                    const isActive = idx === activePatchIndex;

                    return (
                      <div
                        key={patch.findingId}
                        onClick={() => setActivePatchIndex(idx)}
                        style={{
                          padding: 12,
                          borderRadius: 'var(--radius-md)',
                          background: isActive ? 'var(--bg-card-hover)' : 'var(--bg-secondary)',
                          border: isActive ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSelect(patch.findingId);
                          }}
                          style={{ marginTop: 3, cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                            {patch.filePath}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {patch.explanation}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Active Patch Diff & Details */}
              {activePatch && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9375rem', color: 'var(--accent-cyan)' }}>
                        {activePatch.filePath}
                      </h4>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        {activePatch.explanation}
                      </p>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem' }}>
                      <input
                        type="checkbox"
                        checked={selectedFindingIds.has(activePatch.findingId)}
                        onChange={() => toggleSelect(activePatch.findingId)}
                        style={{ accentColor: 'var(--accent-cyan)', width: 16, height: 16 }}
                      />
                      <span>Include in Pull Request</span>
                    </label>
                  </div>

                  {activePatch.warnings && activePatch.warnings.length > 0 && (
                    <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: 'var(--radius-md)', padding: 10, fontSize: '0.8125rem', color: '#fef08a' }}>
                      ⚠️ {activePatch.warnings.join(' ')}
                    </div>
                  )}

                  <div style={{ flex: 1, minHeight: 0 }}>
                    <DiffViewer
                      filePath={activePatch.filePath}
                      diffUnified={activePatch.diffUnified}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {submitError && (() => {
          const urlMatch = submitError.match(/https:\/\/github\.com\/apps\/[^\s]+/);
          const installUrl = urlMatch ? urlMatch[0] : null;

          return (
            <div
              style={{
                margin: '0 24px 16px 24px',
                padding: '14px 16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--status-critical)',
                borderRadius: 'var(--radius-md)',
                color: '#fca5a5',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                fontSize: '0.875rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <AlertCircle size={20} style={{ flexShrink: 0, color: 'var(--status-critical)', marginTop: 2 }} />
                <div style={{ flex: 1, wordBreak: 'break-word' }}>
                  <strong>GitHub Operation Error:</strong> {submitError}
                </div>
              </div>
              {installUrl && (
                <div style={{ paddingLeft: 32 }}>
                  <a
                    href={installUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <ExternalLink size={14} />
                    <span>Install GitHub App on your repository</span>
                  </a>
                </div>
              )}
            </div>
          );
        })()}

        {/* Modal Footer with Branch Selection & Submit PR */}
        <div className="modal-footer" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Target Base Branch:</span>
            <select
              value={selectedBaseBranch}
              onChange={(e) => setSelectedBaseBranch(e.target.value)}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 10px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
            >
              {availableBranches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn btn-secondary" onClick={onClose} disabled={isSubmittingPR}>
              Cancel
            </button>
            <button
              className="btn btn-success"
              onClick={handleCreatePR}
              disabled={isSubmittingPR || approvedPatches.length === 0}
            >
              {isSubmittingPR ? (
                <>
                  <Loader2 size={16} className="pulse-spinner" />
                  <span>Creating Dedicated Branch & Opening PR...</span>
                </>
              ) : (
                <>
                  <GitPullRequest size={16} />
                  <span>Submit PR for {approvedPatches.length} Changes (Option A)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
