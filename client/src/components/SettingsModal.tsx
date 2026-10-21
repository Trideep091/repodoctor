import React, { useState, useEffect } from 'react';
import { AppSettings, FindingCategory } from '../types/index.js';
import { ApiService } from '../services/api.js';
import { X, Settings, Key, Sliders, Cpu, Check, Loader2, Info } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Form states
  const [githubToken, setGithubToken] = useState<string>('');
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai' | 'deterministic'>('deterministic');
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [openaiApiKey, setOpenaiApiKey] = useState<string>('');
  const [scoringWeights, setScoringWeights] = useState<Record<FindingCategory, number>>({
    documentation: 0.2,
    community: 0.2,
    build_ci: 0.25,
    testing_quality: 0.2,
    security_secrets: 0.15,
    supply_chain: 0.15,
    accessibility: 0.1,
  });

  useEffect(() => {
    async function load() {
      try {
        const s = await ApiService.getSettings();
        setSettings(s);
        setAiProvider(s.aiProvider as any);
        if (s.scoringWeights) setScoringWeights(s.scoringWeights);
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      const payload: any = {
        aiProvider,
        scoringWeights,
      };
      if (githubToken.trim()) payload.githubToken = githubToken.trim();
      if (geminiApiKey.trim()) payload.geminiApiKey = geminiApiKey.trim();
      if (openaiApiKey.trim()) payload.openaiApiKey = openaiApiKey.trim();

      const updated = await ApiService.updateSettings(payload);
      setSettings(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleWeightChange = (cat: FindingCategory, val: number) => {
    setScoringWeights((prev) => ({
      ...prev,
      [cat]: val,
    }));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Settings size={20} color="var(--accent-cyan)" />
            <h3 className="modal-title">Settings & Integrations</h3>
          </div>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close Modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <Loader2 size={32} color="var(--accent-cyan)" className="pulse-spinner" />
            </div>
          ) : (
            <>
              {/* GitHub Credentials */}
              <div>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9375rem', fontWeight: 700, marginBottom: 8 }}>
                  <Key size={16} color="var(--accent-cyan)" />
                  <span>GitHub Authentication (Option A PRs & Private Repos)</span>
                </h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                  Public repositories can be diagnosed without a token. Provide a Personal Access Token (PAT) with <code>repo</code> permissions to scan private repositories and submit actual repair Pull Requests to GitHub.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input
                    type="password"
                    placeholder={settings?.hasGithubToken ? `Configured (${settings.githubTokenPreview}) — Enter new token to overwrite` : 'ghp_... or github_pat_...'}
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 14px',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8125rem',
                      outline: 'none',
                    }}
                  />
                  {settings?.hasGithubToken && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--status-success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Check size={12} /> Active GitHub Token configured ({settings.githubTokenPreview})
                    </span>
                  )}
                </div>
              </div>

              {/* AI Provider Config */}
              <div>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9375rem', fontWeight: 700, marginBottom: 8 }}>
                  <Cpu size={16} color="var(--accent-violet)" />
                  <span>AI Repair Engine Provider</span>
                </h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                  Select the AI model used to synthesize contextual code repairs and documentation.
                </p>

                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  {(['deterministic', 'gemini', 'openai'] as const).map((prov) => (
                    <button
                      key={prov}
                      type="button"
                      className={`btn ${aiProvider === prov ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, textTransform: 'capitalize', fontSize: '0.8125rem' }}
                      onClick={() => setAiProvider(prov)}
                    >
                      {prov === 'deterministic' ? 'Deterministic (Offline)' : prov}
                    </button>
                  ))}
                </div>

                {aiProvider === 'gemini' && (
                  <input
                    type="password"
                    placeholder={settings?.hasGeminiKey ? 'Gemini API Key configured — Enter to update' : 'Enter Gemini API Key...'}
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 14px',
                      color: 'var(--text-primary)',
                      fontSize: '0.8125rem',
                      outline: 'none',
                    }}
                  />
                )}

                {aiProvider === 'openai' && (
                  <input
                    type="password"
                    placeholder={settings?.hasOpenaiKey ? 'OpenAI API Key configured — Enter to update' : 'sk-...'}
                    value={openaiApiKey}
                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 14px',
                      color: 'var(--text-primary)',
                      fontSize: '0.8125rem',
                      outline: 'none',
                    }}
                  />
                )}
              </div>

              {/* Scoring Weights */}
              <div>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9375rem', fontWeight: 700, marginBottom: 8 }}>
                  <Sliders size={16} color="var(--accent-cyan)" />
                  <span>Configurable Health Scoring Weights</span>
                </h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                  Adjust the contribution of each category towards the overall 0–100 health score.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                  {Object.entries(scoringWeights).map(([cat, weight]) => (
                    <div key={cat} style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
                        <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{cat.replace(/_/g, ' ')}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{Math.round(weight * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="0.40"
                        step="0.05"
                        value={weight}
                        onChange={(e) => handleWeightChange(cat as FindingCategory, parseFloat(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          {savedSuccess && (
            <span style={{ fontSize: '0.8125rem', color: 'var(--status-success)', marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Check size={14} /> Settings saved successfully!
            </span>
          )}
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={16} className="pulse-spinner" /> : <Check size={16} />}
            <span>Save Configuration</span>
          </button>
        </div>
      </div>
    </div>
  );
};
