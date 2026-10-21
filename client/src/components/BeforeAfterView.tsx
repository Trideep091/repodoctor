import React from 'react';
import { RescanComparison } from '../types/index.js';
import { ScoreGauge } from './ScoreGauge.js';
import { CheckCircle2, TrendingUp, ShieldCheck, AlertTriangle, ArrowRight, ExternalLink } from 'lucide-react';

interface BeforeAfterViewProps {
  comparison: RescanComparison;
  onNewScan: () => void;
}

export const BeforeAfterView: React.FC<BeforeAfterViewProps> = ({ comparison, onNewScan }) => {
  const isPositiveDelta = comparison.scoreDelta >= 0;

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
      <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 36px auto' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(16, 185, 129, 0.12)',
            color: 'var(--status-success)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            fontSize: '0.8125rem',
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          <ShieldCheck size={16} />
          <span>Post-Merge Rescan Verification Complete</span>
        </div>

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 800 }}>
          Repository Health Improved by{' '}
          <span style={{ color: isPositiveDelta ? 'var(--status-success)' : 'var(--status-critical)' }}>
            {isPositiveDelta ? `+${comparison.scoreDelta}` : comparison.scoreDelta} Points
          </span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: 8 }}>
          Pull Request merged into <code style={{ color: 'var(--accent-cyan)' }}>{comparison.branch}</code>. All approved health, security, and accessibility fixes have been verified in the live code tree.
        </p>
      </div>

      {/* Side-by-Side Score Comparison */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
          alignItems: 'center',
          marginBottom: 36,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h4 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em' }}>
            Baseline Score (Before Repairs)
          </h4>
          <ScoreGauge score={comparison.scoreBefore} size={160} />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--status-success)',
              marginBottom: 12,
            }}
          >
            <TrendingUp size={28} />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800, color: 'var(--status-success)' }}>
            +{comparison.scoreDelta}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Overall Health Score Delta
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
            {comparison.resolvedFindings.length} Finding(s) Successfully Resolved
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <h4 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em' }}>
            Verified Score (After Merge)
          </h4>
          <ScoreGauge score={comparison.scoreAfter} size={160} />
        </div>
      </div>

      {/* Category Improvements Breakdown */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: 24,
          marginBottom: 32,
        }}
      >
        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>
          Category Score Deltas
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {Object.entries(comparison.categoryScoreDeltas).map(([catKey, val]) => (
            <div
              key={catKey}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '0.8125rem', textTransform: 'capitalize', color: 'var(--text-primary)' }}>
                {catKey.replace(/_/g, ' ')}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {val.before} &rarr; {val.after}
                </span>
                <span
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: val.delta > 0 ? 'var(--status-success)' : val.delta === 0 ? 'var(--text-muted)' : 'var(--status-critical)',
                  }}
                >
                  {val.delta > 0 ? `+${val.delta}` : val.delta}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resolved Findings List */}
      <div style={{ marginBottom: 32 }}>
        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={20} color="var(--status-success)" />
          <span>Resolved Findings ({comparison.resolvedFindings.length})</span>
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {comparison.resolvedFindings.map((f) => (
            <div
              key={f.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <CheckCircle2 size={16} color="var(--status-success)" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {f.ruleId}
                </span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{f.ruleTitle}</span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                {f.filePath}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button className="btn btn-primary" onClick={onNewScan}>
          <span>Diagnose Another Repository</span>
        </button>
      </div>
    </div>
  );
};
