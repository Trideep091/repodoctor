import React from 'react';
import { Activity, History, Settings, Download, Plus, Moon, Sun, Sparkles, ExternalLink } from 'lucide-react';

interface NavbarProps {
  onNewScan: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onOpenExport?: () => void;
  hasActiveReport: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  githubAppInstallUrl?: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNewScan,
  onOpenHistory,
  onOpenSettings,
  onOpenExport,
  hasActiveReport,
  theme,
  onToggleTheme,
  githubAppInstallUrl,
}) => {
  return (
    <header className="navbar">
      <a href="#" onClick={(e) => { e.preventDefault(); onNewScan(); }} className="brand-logo">
        <div className="brand-icon">
          <Activity size={22} color="#ffffff" />
        </div>
        <div>
          <div className="brand-title">Repo Doctor</div>
        </div>
        <span className="brand-badge">Devf8rge PS-08</span>
      </a>

      <div className="nav-actions">
        {hasActiveReport && (
          <>
            <button className="btn btn-secondary" onClick={onNewScan} title="Diagnose another repository">
              <Plus size={16} />
              <span>New Scan</span>
            </button>
            {onOpenExport && (
              <button className="btn btn-secondary" onClick={onOpenExport} title="Export scan findings">
                <Download size={16} />
                <span>Export</span>
              </button>
            )}
          </>
        )}

        {githubAppInstallUrl && (
          <a
            href={githubAppInstallUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            title="Install GitHub App to enable automated PRs on your repositories"
            style={{
              borderColor: 'rgba(6, 182, 212, 0.4)',
              color: 'var(--accent-cyan)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <ExternalLink size={14} />
            <span>Install GitHub App</span>
          </a>
        )}

        <button className="btn btn-secondary" onClick={onOpenHistory} title="Scan History">
          <History size={16} />
          <span>History</span>
        </button>

        <button className="btn btn-secondary" onClick={onOpenSettings} title="Settings & Integration">
          <Settings size={16} />
          <span>Settings</span>
        </button>

        <button
          className="btn btn-ghost"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
};
