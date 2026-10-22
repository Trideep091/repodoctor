import React, { useState, useEffect } from 'react';
import {
  DiagnosisReport,
  GeneratedPatch,
  PRSubmissionResult,
  RescanComparison,
  AppSettings,
} from './types/index.js';
import { ApiService } from './services/api.js';
import { Navbar } from './components/Navbar.js';
import { ScoreGauge } from './components/ScoreGauge.js';
import { ScanProgressBar, ScanStage } from './components/ScanProgressBar.js';
import { FindingsExplorer } from './components/FindingsExplorer.js';
import { RepairWorkspaceModal } from './components/RepairWorkspaceModal.js';
import { PullRequestView } from './components/PullRequestView.js';
import { BeforeAfterView } from './components/BeforeAfterView.js';
import { HistoryModal } from './components/HistoryModal.js';
import { SettingsModal } from './components/SettingsModal.js';
import { ExportModal } from './components/ExportModal.js';
import {
  Search,
  Wrench,
  GitPullRequest,
  ShieldCheck,
  ShieldAlert,
  Boxes,
  Eye,
  FileCode2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  GitBranch,
} from 'lucide-react';

export function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [repoUrl, setRepoUrl] = useState<string>('');
  const [urlError, setUrlError] = useState<string | null>(null);

  // Scan state
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStages, setScanStages] = useState<ScanStage[]>([]);
  const [report, setReport] = useState<DiagnosisReport | null>(null);

  // Modals state
  const [showRepairModal, setShowRepairModal] = useState<boolean>(false);
  const [initialRepairFindingId, setInitialRepairFindingId] = useState<string | undefined>();
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  // PR & Post-Merge Verification state
  const [isSubmittingPR, setIsSubmittingPR] = useState<boolean>(false);
  const [prResult, setPrResult] = useState<PRSubmissionResult | null>(null);
  const [isRescanning, setIsRescanning] = useState<boolean>(false);
  const [comparison, setComparison] = useState<RescanComparison | null>(null);

  // Settings & App state
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Load settings on mount
  useEffect(() => {
    ApiService.getSettings().then(setSettings).catch(() => {});
  }, []);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  };

  const handleDiagnose = async (targetUrl?: string) => {
    const urlToScan = targetUrl || repoUrl;
    if (!urlToScan || !urlToScan.trim()) {
      setUrlError('Please enter a valid GitHub repository URL.');
      return;
    }

    setUrlError(null);
    setIsScanning(true);
    setReport(null);
    setPrResult(null);
    setComparison(null);

    const stages: ScanStage[] = [
      { id: 'tree', label: 'Fetching Git tree & source files', status: 'active' },
      { id: 'tech', label: 'Detecting project technologies', status: 'pending' },
      { id: 'health', label: 'Auditing documentation & community files', status: 'pending' },
      { id: 'secrets', label: 'Scanning high-entropy secrets', status: 'pending' },
      { id: 'deps', label: 'Inspecting supply-chain & typosquats', status: 'pending' },
      { id: 'a11y', label: 'Auditing frontend accessibility (WCAG 2.1)', status: 'pending' },
      { id: 'score', label: 'Calculating transparent scores & deductions', status: 'pending' },
    ];
    setScanStages(stages);

    // Stage progression animation
    const updateStage = (index: number) => {
      setScanStages((prev) =>
        prev.map((s, idx) => ({
          ...s,
          status: idx < index ? 'completed' : idx === index ? 'active' : 'pending',
        }))
      );
    };

    const timer1 = setTimeout(() => updateStage(1), 300);
    const timer2 = setTimeout(() => updateStage(2), 600);
    const timer3 = setTimeout(() => updateStage(3), 900);
    const timer4 = setTimeout(() => updateStage(4), 1200);
    const timer5 = setTimeout(() => updateStage(5), 1500);
    const timer6 = setTimeout(() => updateStage(6), 1800);

    try {
      const result = await ApiService.diagnoseRepository(urlToScan);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
      clearTimeout(timer6);

      setScanStages((prev) => prev.map((s) => ({ ...s, status: 'completed' })));
      setTimeout(() => {
        setReport(result);
        setIsScanning(false);
      }, 400);
    } catch (err: any) {
      setIsScanning(false);
      setUrlError(err.message || 'Failed to diagnose repository');
    }
  };

  const handleBranchChange = async (newBranch: string) => {
    if (!report) return;
    setIsScanning(true);
    try {
      const result = await ApiService.diagnoseRepository(report.repository.url, newBranch);
      setReport(result);
      setPrResult(null);
      setComparison(null);
    } catch (err: any) {
      alert(`Failed to scan branch "${newBranch}": ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleOpenRepairModal = (findingId?: string) => {
    setInitialRepairFindingId(findingId);
    setShowRepairModal(true);
  };

  const handleSubmitPR = async (approvedPatches: GeneratedPatch[], selectedBaseBranch: string) => {
    if (!report) return;
    setIsSubmittingPR(true);
    try {
      const result = await ApiService.createPullRequest(
        report.scanId,
        approvedPatches,
        selectedBaseBranch
      );
      setPrResult(result);
      setShowRepairModal(false);
    } catch (err: any) {
      throw err;
    } finally {
      setIsSubmittingPR(false);
    }
  };

  const handleTriggerRescan = async () => {
    if (!report) return;
    setIsRescanning(true);
    try {
      const res = await ApiService.rescanPostMerge(
        report.scanId,
        prResult?.baseBranch || report.repository.selectedBranch
      );
      setComparison(res);
    } catch (err: any) {
      alert(`Rescan failed: ${err.message}`);
    } finally {
      setIsRescanning(false);
    }
  };

  const handleSelectHistoryScan = async (scanId: string) => {
    setIsScanning(true);
    try {
      const historicalReport = await ApiService.getReport(scanId);
      setReport(historicalReport);
      setPrResult(null);
      setComparison(null);
    } catch (err: any) {
      alert(`Failed to load historical scan: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div>
      <div className="bg-grid-pattern" />

      <div className="app-container">
        <Navbar
          onNewScan={() => {
            setReport(null);
            setPrResult(null);
            setComparison(null);
            setRepoUrl('');
          }}
          onOpenHistory={() => setShowHistoryModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenExport={report ? () => setShowExportModal(true) : undefined}
          hasActiveReport={!!report}
          theme={theme}
          onToggleTheme={toggleTheme}
          githubAppInstallUrl={settings?.githubAppInstallUrl}
        />

        {/* 1. Landing View when no report is active and not scanning */}
        {!report && !isScanning && (
          <section className="hero-section">
            <div className="hero-pill">
              <Sparkles size={14} />
              <span>Devf8rge Hackathon PS-08 Challenge</span>
            </div>

            <h1 className="hero-title">
              Autonomous AI Diagnosis, Security &{' '}
              <span className="gradient-text">GitHub Pull Requests</span>
            </h1>

            <p className="hero-subtitle">
              Paste any GitHub repository URL. Repo Doctor audits technical health, detects exposed credentials, flags look-alike supply-chain risks, audits accessibility (WCAG), and opens reviewable GitHub Pull Requests.
            </p>

            <div className="input-card">
              <form
                className="url-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleDiagnose();
                }}
              >
                <div className="url-input-wrapper">
                  <Search size={18} className="url-input-icon" />
                  <input
                    type="text"
                    className="url-input"
                    placeholder="https://github.com/owner/repository"
                    value={repoUrl}
                    onChange={(e) => {
                      setRepoUrl(e.target.value);
                      if (urlError) setUrlError(null);
                    }}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ padding: '14px 28px' }}>
                  <span>Diagnose Repository</span>
                  <ChevronRight size={18} />
                </button>
              </form>

              {urlError && <div className="url-input-error">⚠️ {urlError}</div>}

              {/* Quick Presets */}
              <div className="quick-demos">
                <span>Quick Benchmarks:</span>
                <button
                  type="button"
                  className="quick-chip highlight"
                  onClick={() => {
                    setRepoUrl('synthetic://devf8rge/tk-s-repo');
                    handleDiagnose('synthetic://devf8rge/tk-s-repo');
                  }}
                >
                  🩺 Devf8rge TK-S Benchmark (Seeded Secrets, Supply-Chain & A11y)
                </button>
                <button
                  type="button"
                  className="quick-chip"
                  onClick={() => {
                    setRepoUrl('https://github.com/expressjs/express');
                    handleDiagnose('https://github.com/expressjs/express');
                  }}
                >
                  📦 expressjs/express
                </button>
                <button
                  type="button"
                  className="quick-chip"
                  onClick={() => {
                    setRepoUrl('https://github.com/facebook/react');
                    handleDiagnose('https://github.com/facebook/react');
                  }}
                >
                  ⚛️ facebook/react
                </button>
              </div>

              {settings?.githubAppInstallUrl && (
                <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
                  <a
                    href={settings.githubAppInstallUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: '0.8125rem',
                      color: 'var(--accent-cyan)',
                      textDecoration: 'none',
                      background: 'rgba(6, 182, 212, 0.08)',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      border: '1px solid rgba(6, 182, 212, 0.25)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <ExternalLink size={13} />
                    <span>Want Repo Doctor to open PRs on your repos? <strong>Install our GitHub App &rarr;</strong></span>
                  </a>
                </div>
              )}
            </div>

            {/* Feature summary cards */}
            <div className="feature-grid">
              <div className="feature-card">
                <div className="feature-icon-wrapper cyan">
                  <ShieldAlert size={22} />
                </div>
                <h3 className="feature-title">High-Entropy Secret Detection</h3>
                <p className="feature-desc">
                  Finds committed AWS, GitHub, OpenAI, and DB credentials. Redacts tokens in reports and provides safe .env templates.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrapper violet">
                  <Boxes size={22} />
                </div>
                <h3 className="feature-title">Supply-Chain & Typosquatting</h3>
                <p className="feature-desc">
                  Analyzes manifest typosquatting (e.g. cross-envv) and flags postinstall scripts executing unverified network downloads.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrapper emerald">
                  <Eye size={22} />
                </div>
                <h3 className="feature-title">WCAG 2.1 Accessibility Audit</h3>
                <p className="feature-desc">
                  Calculates exact color contrast ratios (&lt;4.5:1), detects unlabeled inputs, and fixes icon buttons missing aria-labels.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrapper amber">
                  <GitPullRequest size={22} />
                </div>
                <h3 className="feature-title">Option A: Real Pull Requests</h3>
                <p className="feature-desc">
                  Creates dedicated repair branches, commits reviewed patches, opens GitHub PRs, and verifies health score improvements post-merge.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* 2. Active Scanning Progress Display */}
        {isScanning && (
          <ScanProgressBar
            stages={scanStages}
            repoName={repoUrl || 'Target Repository'}
          />
        )}

        {/* 3. Post-Merge Before-and-After Verification View */}
        {comparison && (
          <BeforeAfterView
            comparison={comparison}
            onNewScan={() => {
              setComparison(null);
              setPrResult(null);
              setReport(null);
            }}
          />
        )}

        {/* 4. Pull Request View (when PR has been submitted) */}
        {prResult && !comparison && report && (
          <PullRequestView
            prResult={prResult}
            owner={report.repository.owner}
            repo={report.repository.name}
            isSyntheticTest={report.isSyntheticTest}
            onTriggerRescan={handleTriggerRescan}
            isRescanning={isRescanning}
          />
        )}

        {/* 5. Health Dashboard View */}
        {report && (
          <div>
            {/* Dashboard Header */}
            <div className="dashboard-header">
              <div className="repo-meta-left">
                <div className="repo-avatar">
                  <FileCode2 size={24} />
                </div>
                <div>
                  <div className="repo-title-row">
                    <h2 className="repo-full-name">{report.repository.fullName}</h2>
                    {report.repository.url && (
                      <a
                        href={report.repository.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="repo-link"
                        title="View on GitHub"
                      >
                        <ExternalLink size={18} />
                      </a>
                    )}
                    {report.isSyntheticTest && (
                      <span className="brand-badge" style={{ borderColor: 'var(--accent-violet)', color: 'var(--accent-violet)' }}>
                        TK-S CHALLENGE BENCHMARK
                      </span>
                    )}
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: 4 }}>
                    {report.repository.description} • Scanned {report.scannerCoverage.scannedFilesCount} files in {report.durationMs}ms
                  </p>
                </div>
              </div>

              {/* Branch selector & Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div className="branch-selector">
                  <GitBranch size={14} color="var(--accent-cyan)" />
                  <select
                    className="branch-select"
                    value={report.repository.selectedBranch}
                    onChange={(e) => handleBranchChange(e.target.value)}
                  >
                    {report.repository.availableBranches.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                {report.summary.fixesAvailableCount > 0 && (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleOpenRepairModal()}
                  >
                    <Wrench size={16} />
                    <span>Open AI Repair Workspace ({report.summary.fixesAvailableCount} Fixes)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Score Overview Grid: Radial Gauge & Category Breakdown */}
            <div className="score-overview-grid">
              <ScoreGauge score={report.overallScore} size={180} />

              <div className="category-scores-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700 }}>
                    Transparent Health Category Scores
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Weighted Formula per PS-08 Specifications
                  </span>
                </div>

                <div className="category-list">
                  {Object.values(report.categoryScores).map((cat) => {
                    const pct = Math.max(0, Math.min(100, cat.score));
                    let color = 'var(--status-critical)';
                    if (pct >= 85) color = 'var(--status-success)';
                    else if (pct >= 70) color = 'var(--accent-cyan)';
                    else if (pct >= 50) color = 'var(--status-medium)';

                    return (
                      <div key={cat.category} className="category-row">
                        <div className="category-label-row">
                          <span className="category-name">
                            {cat.name}
                            <span className="category-weight">({Math.round(cat.weight * 100)}% weight)</span>
                          </span>
                          <span className="category-score-val" style={{ color }}>
                            {pct}/100 {cat.deductions > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--status-critical)' }}>(-{cat.deductions} pts)</span>}
                          </span>
                        </div>
                        <div className="progress-track">
                          <div
                            className="progress-bar-fill"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Severity summary counters */}
            <div className="severity-bar">
              <div className="severity-pill-card critical">
                <div>
                  <div className="severity-label">Critical Findings</div>
                  <div className="severity-count" style={{ color: 'var(--status-critical)' }}>
                    {report.summary.criticalFindings}
                  </div>
                </div>
                <ShieldAlert size={28} color="var(--status-critical)" />
              </div>

              <div className="severity-pill-card high">
                <div>
                  <div className="severity-label">High Severity</div>
                  <div className="severity-count" style={{ color: 'var(--status-high)' }}>
                    {report.summary.highFindings}
                  </div>
                </div>
                <ShieldAlert size={28} color="var(--status-high)" />
              </div>

              <div className="severity-pill-card medium">
                <div>
                  <div className="severity-label">Medium Severity</div>
                  <div className="severity-count" style={{ color: 'var(--status-medium)' }}>
                    {report.summary.mediumFindings}
                  </div>
                </div>
                <ShieldCheck size={28} color="var(--status-medium)" />
              </div>

              <div className="severity-pill-card low">
                <div>
                  <div className="severity-label">Low & Info</div>
                  <div className="severity-count" style={{ color: 'var(--status-low)' }}>
                    {report.summary.lowFindings + report.summary.infoFindings}
                  </div>
                </div>
                <ShieldCheck size={28} color="var(--status-low)" />
              </div>
            </div>

            {/* Comprehensive Findings Explorer */}
            <FindingsExplorer
              findings={report.findings}
              onSelectFix={(findingId) => handleOpenRepairModal(findingId)}
            />
          </div>
        )}

        {/* Modals */}
        {showRepairModal && report && (
          <RepairWorkspaceModal
            scanId={report.scanId}
            initialFindingId={initialRepairFindingId}
            findings={report.findings}
            baseBranch={report.repository.selectedBranch}
            availableBranches={report.repository.availableBranches}
            isSyntheticTest={report.isSyntheticTest}
            onClose={() => setShowRepairModal(false)}
            onSubmitPR={handleSubmitPR}
            isSubmittingPR={isSubmittingPR}
          />
        )}

        {showHistoryModal && (
          <HistoryModal
            onClose={() => setShowHistoryModal(false)}
            onSelectScan={handleSelectHistoryScan}
          />
        )}

        {showSettingsModal && (
          <SettingsModal onClose={() => setShowSettingsModal(false)} />
        )}

        {showExportModal && report && (
          <ExportModal
            scanId={report.scanId}
            repoFullName={report.repository.fullName}
            onClose={() => setShowExportModal(false)}
          />
        )}
      </div>
    </div>
  );
}
export default App;
