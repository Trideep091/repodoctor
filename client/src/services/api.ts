import {
  DiagnosisReport,
  GeneratedPatch,
  PRSubmissionResult,
  RescanComparison,
  ScanHistoryItem,
  AppSettings,
} from '../types/index.js';

const API_BASE = '/api';

export class ApiService {
  static async diagnoseRepository(url: string, branch?: string): Promise<DiagnosisReport> {
    const res = await fetch(`${API_BASE}/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, branch }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Server error ${res.status}` }));
      throw new Error(err.error || 'Failed to diagnose repository');
    }

    return await res.json();
  }

  static async generateRepairs(
    scanId: string,
    findingIds: string[],
    licenseChoice?: string
  ): Promise<{ scanId: string; patchesCount: number; patches: GeneratedPatch[] }> {
    const res = await fetch(`${API_BASE}/repair/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scanId, findingIds, licenseChoice }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Server error ${res.status}` }));
      throw new Error(err.error || 'Failed to generate repairs');
    }

    return await res.json();
  }

  static async createPullRequest(
    scanId: string,
    patches: GeneratedPatch[],
    baseBranch: string,
    title?: string
  ): Promise<PRSubmissionResult> {
    const res = await fetch(`${API_BASE}/pr/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scanId, patches, baseBranch, title }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Server error ${res.status}` }));
      throw new Error(err.error || 'Failed to create Pull Request');
    }

    return await res.json();
  }

  static async checkPrStatus(
    owner: string,
    repo: string,
    prNumber: number,
    branch?: string,
    isSynthetic?: boolean
  ): Promise<{
    prNumber: number;
    state: string;
    isMerged: boolean;
    mergedAt: string | null;
    ciStatus?: {
      state: 'success' | 'failure' | 'pending' | 'none';
      runs?: any[];
    };
  }> {
    const params = new URLSearchParams({
      owner,
      repo,
      prNumber: String(prNumber),
      branch: branch || 'main',
      isSynthetic: isSynthetic ? 'true' : 'false',
    });

    const res = await fetch(`${API_BASE}/pr/status?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Status error ${res.status}` }));
      throw new Error(err.error || 'Failed to check PR status');
    }

    return await res.json();
  }

  static async rescanPostMerge(previousScanId: string, branch?: string): Promise<RescanComparison> {
    const res = await fetch(`${API_BASE}/pr/rescan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ previousScanId, branch }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Rescan error ${res.status}` }));
      throw new Error(err.error || 'Failed to rescan repository');
    }

    return await res.json();
  }

  static async getHistory(): Promise<ScanHistoryItem[]> {
    const res = await fetch(`${API_BASE}/history`);
    if (!res.ok) return [];
    return await res.json();
  }

  static async getReport(scanId: string): Promise<DiagnosisReport> {
    const res = await fetch(`${API_BASE}/history/${scanId}`);
    if (!res.ok) throw new Error('Report not found');
    return await res.json();
  }

  static async getSettings(): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to load settings');
    return await res.json();
  }

  static async updateSettings(settings: Partial<AppSettings & { githubToken?: string; geminiApiKey?: string; openaiApiKey?: string }>): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return await res.json();
  }

  static getExportUrl(scanId: string, format: 'json' | 'csv'): string {
    return `${API_BASE}/export/${scanId}?format=${format}`;
  }
}
