import React, { useState, useEffect } from 'react';
import { PRSubmissionResult } from '../types/index.js';
import { ApiService } from '../services/api.js';
import { GitPullRequest, ExternalLink, GitBranch, CheckCircle2, Clock, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';

interface PullRequestViewProps {
  prResult: PRSubmissionResult;
  owner: string;
  repo: string;
  isSyntheticTest?: boolean;
  onTriggerRescan: () => void;
  isRescanning: boolean;
}

export const PullRequestView: React.FC<PullRequestViewProps> = ({
  prResult,
  owner,
  repo,
  isSyntheticTest,
  onTriggerRescan,
  isRescanning,
}) => {
  const [prStatus, setPrStatus] = useState<any>(null);
  const [checking, setChecking] = useState<boolean>(false);

  const checkStatus = async () => {
    if (!prResult.prNumber) return;
    setChecking(true);
    try {
      const res = await ApiService.checkPrStatus(
        owner,
        repo,
        prResult.prNumber,
        prResult.baseBranch,
        isSyntheticTest
      );
      setPrStatus(res);
    } catch (err) {
      console.error('Error polling PR status:', err);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [prResult]);

  const isMerged = prStatus?.isMerged;

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-lg)',
        padding: 32,
        marginBottom: 32,
        boxShadow: 'var(--shadow-subtle), var(--shadow-glow)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(56, 189, 248, 0.2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--status-success)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
            }}
          >
            <GitPullRequest size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700 }}>
                {prResult.title}
              </h3>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  background: isMerged ? 'var(--status-success-bg)' : 'rgba(56, 189, 248, 0.15)',
                  color: isMerged ? 'var(--status-success)' : 'var(--accent-cyan)',
                  border: `1px solid ${isMerged ? 'var(--status-success)' : 'var(--accent-cyan)'}`,
                }}
              >
                {isMerged ? 'Merged on GitHub' : 'Open for Review'}
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>
              Dedicated repair branch <code style={{ color: 'var(--accent-cyan)' }}>{prResult.branchName}</code> created successfully.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {prResult.prUrl && (
            <a
              href={prResult.prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              <span>Open PR on GitHub</span>
              <ExternalLink size={15} />
            </a>
          )}
          <button className="btn btn-secondary" onClick={checkStatus} disabled={checking}>
            <RefreshCw size={15} className={checking ? 'pulse-spinner' : ''} />
            <span>Check Status</span>
          </button>
        </div>
      </div>

      {/* Grid of PR Metadata */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: 20,
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SOURCE REPAIR BRANCH</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--text-primary)', marginTop: 4 }}>
            {prResult.branchName}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TARGET BASE BRANCH</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--text-primary)', marginTop: 4 }}>
            {prResult.baseBranch}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CHANGED FILES</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--text-primary)', marginTop: 4 }}>
            {prResult.changedFiles.length} file(s)
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ACTIONS CI WORKFLOW STATUS</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', marginTop: 4 }}>
            {prStatus?.ciStatus?.state === 'success' ? (
              <span style={{ color: 'var(--status-success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={16} /> Passing
              </span>
            ) : prStatus?.ciStatus?.state === 'pending' ? (
              <span style={{ color: 'var(--status-medium)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={16} /> Running
              </span>
            ) : (
              <span style={{ color: 'var(--text-secondary)' }}>Awaiting Trigger</span>
            )}
          </div>
        </div>
      </div>

      {/* Manual Merge Instructions & Rescan Call to Action */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08), rgba(129, 140, 248, 0.08))',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 20,
        }}
      >
        <div>
          <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Step 2: Manual Review & Post-Merge Verification (Option A)
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 4, maxWidth: 640 }}>
            Per Devf8rge Option A guidelines, review the diff on GitHub and merge the Pull Request manually. Then click the button below to rescan the repository and measure the live health score improvement.
          </p>
        </div>

        <button
          className="btn btn-success"
          style={{ padding: '12px 24px', fontSize: '0.9375rem' }}
          onClick={onTriggerRescan}
          disabled={isRescanning}
        >
          <RefreshCw size={17} className={isRescanning ? 'pulse-spinner' : ''} />
          <span>{isRescanning ? 'Rescanning Repository...' : 'Rescan Post-Merge & Verify Improvements'}</span>
        </button>
      </div>
    </div>
  );
};
