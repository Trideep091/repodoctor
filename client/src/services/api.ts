import {
  DiagnosisReport,
  GeneratedPatch,
  PRSubmissionResult,
  RescanComparison,
  ScanHistoryItem,
  AppSettings,
} from '../types/index.js';

export function resolveApiBase(): string {
  const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  const isBrowser = typeof window !== 'undefined';
  const isLocalHost =
    isBrowser &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '::1');

  if (!envUrl) {
    return '/api';
  }

  // Guard: If deployed in production on Vercel or cloud domain, remove unintended localhost references
  if (isBrowser && !isLocalHost) {
    try {
      const parsed = new URL(envUrl);
      if (
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        parsed.hostname === '::1'
      ) {
        console.warn(
          '[RepoDoctor] VITE_API_URL references localhost in a production deployment. Falling back to relative "/api" route.'
        );
        return '/api';
      }
    } catch {
      // Invalid URL format in VITE_API_URL, fallback to /api
      return '/api';
    }
  }

  const clean = envUrl.replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
}

const API_BASE = resolveApiBase();

async function extractErrorMessage(res: Response, defaultMessage: string): Promise<string> {
  try {
    const err = await res.json();
    if (err && err.error) {
      if (err.code === 'API_ROUTE_NOT_FOUND') {
        return `Backend API route not found (404): ${err.error}. Ensure your backend server is deployed and matches the expected routes.`;
      }
      return err.error;
    }
  } catch {
    // Response was not JSON (e.g. HTML 404/502/503 from Vercel edge or cloud proxy)
    if (res.status === 404) {
      return 'Backend API route not found (HTTP 404). If hosting your backend separately, set VITE_API_URL in your Vercel project settings (e.g., https://your-backend.onrender.com). If deploying as a Vercel serverless function, ensure vercel.json rewrites are deployed.';
    }
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      return `Backend server is temporarily unavailable (${res.status}). If using a free-tier host like Render, it may be waking up from idle (takes ~30-50s). Please wait a moment and try again.`;
    }
  }
  return `${defaultMessage} (${res.status})`;
}

export class ApiService {
  static async diagnoseRepository(url: string, branch?: string): Promise<DiagnosisReport> {
    const res = await fetch(`${API_BASE}/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, branch }),
    });

    if (!res.ok) {
      const message = await extractErrorMessage(res, 'Failed to diagnose repository');
      throw new Error(message);
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
      const message = await extractErrorMessage(res, 'Failed to generate repairs');
      throw new Error(message);
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
      const message = await extractErrorMessage(res, 'Failed to create Pull Request');
      throw new Error(message);
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
      const message = await extractErrorMessage(res, 'Failed to check PR status');
      throw new Error(message);
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
      const message = await extractErrorMessage(res, 'Failed to rescan repository');
      throw new Error(message);
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
