import { RepositoryFile } from '../types/index.js';
import { getSettings } from '../config.js';
import { TKS_SYNTHETIC_REPO } from '../fixtures/tksFixture.js';
import { GitHubAppService } from './githubApp.js';

function getAuthHeaders(explicitToken?: string): Record<string, string> {
  const settings = getSettings();
  const token = explicitToken || settings.githubToken || process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'RepoDoctor-AuditBot/1.0',
  };

  if (token && token.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }

  return headers;
}

export class GitHubApiError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 500, code = 'GITHUB_API_ERROR') {
    super(message);
    this.name = 'GitHubApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class GitHubService {
  /**
   * Resolves an effective authorization token for a repository.
   * Prioritizes GitHub App installation access token if configured.
   * Falls back to explicit token, then settings/env GITHUB_TOKEN.
   */
  static async resolveAuthToken(
    owner: string,
    repo: string,
    explicitToken?: string,
    isSynthetic = false
  ): Promise<string> {
    if (isSynthetic) return 'synthetic_token';

    if (explicitToken && explicitToken.trim()) {
      return explicitToken.trim();
    }

    // 1. Prioritize GitHub App installation access token
    if (GitHubAppService.isConfigured()) {
      try {
        const appAuth = await GitHubAppService.getInstallationAccessToken(owner, repo);
        return appAuth.token;
      } catch (err: any) {
        console.warn(`[GitHubService] GitHub App token resolution error for "${owner}/${repo}":`, err.message);
        // If a PAT is available as fallback, use it; otherwise rethrow
        const settings = getSettings();
        const fallback = settings.githubToken || process.env.GITHUB_TOKEN;
        if (!fallback || !fallback.trim()) {
          throw err;
        }
      }
    }

    // 2. Fallback to Personal Access Token (PAT)
    const settings = getSettings();
    const pat = settings.githubToken || process.env.GITHUB_TOKEN;
    if (pat && pat.trim()) {
      return pat.trim();
    }

    throw new GitHubApiError(
      'GitHub authorization required: No GitHub App credentials or Personal Access Token (PAT) configured. Please configure your GitHub App credentials (GITHUB_APP_ID & GITHUB_APP_PRIVATE_KEY) or set GITHUB_TOKEN in Settings.',
      401,
      'AUTH_REQUIRED'
    );
  }
  /**
   * Fetches repository metadata (stars, forks, open issues, default branch, etc.)
   */
  static async getRepository(
    owner: string,
    repo: string,
    isSynthetic = false,
    token?: string
  ): Promise<{
    name: string;
    fullName: string;
    owner: string;
    defaultBranch: string;
    isPrivate: boolean;
    description: string;
    stars: number;
    forks: number;
    openIssues: number;
    language: string;
  }> {
    if (isSynthetic) {
      return {
        name: TKS_SYNTHETIC_REPO.name,
        fullName: TKS_SYNTHETIC_REPO.fullName,
        owner: TKS_SYNTHETIC_REPO.owner,
        defaultBranch: TKS_SYNTHETIC_REPO.defaultBranch,
        isPrivate: false,
        description: TKS_SYNTHETIC_REPO.description,
        stars: 42,
        forks: 7,
        openIssues: 5,
        language: 'JavaScript',
      };
    }

    const url = `https://api.github.com/repos/${owner}/${repo}`;
    const response = await fetch(url, { headers: getAuthHeaders(token) });

    if (!response.ok) {
      if (response.status === 404) {
        // Distinguish whether the owner account exists or if this is a private repo without authorization
        let ownerExists = false;
        try {
          const ownerCheck = await fetch(`https://api.github.com/users/${owner}`, {
            headers: { 'User-Agent': 'RepoDoctor-AuditBot/1.0', Accept: 'application/vnd.github.v3+json' },
          });
          ownerExists = ownerCheck.status === 200;
        } catch {
          // ignore network error
        }

        if (!ownerExists) {
          throw new GitHubApiError(
            `GitHub user or organization "${owner}" does not exist. Please check the repository URL for typos.`,
            404,
            'OWNER_NOT_FOUND'
          );
        }

        if (token) {
          throw new GitHubApiError(
            `Repository "${owner}/${repo}" was not found or the provided credentials do not have permission to access it.`,
            404,
            'REPO_NOT_FOUND_OR_FORBIDDEN'
          );
        } else {
          throw new GitHubApiError(
            `Repository "${owner}/${repo}" was not found or is private. Accessible public repositories can be diagnosed directly; for private repositories, install the Repo Doctor GitHub App on the repository or configure a Personal Access Token in Settings.`,
            404,
            'REPO_NOT_FOUND_OR_PRIVATE'
          );
        }
      }

      if (response.status === 403) {
        const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
        if (rateLimitRemaining === '0') {
          throw new GitHubApiError(
            'GitHub API rate limit exceeded for unauthenticated requests. Configure a Personal Access Token in Settings or install the GitHub App to increase your limit to 5,000 requests/hour.',
            429,
            'RATE_LIMIT_EXCEEDED'
          );
        }
        throw new GitHubApiError(
          `GitHub API access denied (403) for repository "${owner}/${repo}". Check repository permissions.`,
          403,
          'ACCESS_DENIED'
        );
      }

      throw new GitHubApiError(
        `GitHub API returned status ${response.status} for repository "${owner}/${repo}".`,
        response.status >= 400 && response.status < 500 ? response.status : 500,
        'GITHUB_API_ERROR'
      );
    }

    const data = (await response.json()) as any;
    return {
      name: data.name,
      fullName: data.full_name,
      owner: data.owner?.login || owner,
      defaultBranch: data.default_branch || 'main',
      isPrivate: !!data.private,
      description: data.description || 'No description provided',
      stars: data.stargazers_count || 0,
      forks: data.forks_count || 0,
      openIssues: data.open_issues_count || 0,
      language: data.language || 'Unknown',
    };
  }

  /**
   * Fetches list of branches available in repository
   */
  static async getBranches(
    owner: string,
    repo: string,
    isSynthetic = false,
    token?: string
  ): Promise<string[]> {
    if (isSynthetic) {
      return TKS_SYNTHETIC_REPO.branches;
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`;
    const response = await fetch(url, { headers: getAuthHeaders(token) });

    if (!response.ok) {
      return ['main'];
    }

    const data = (await response.json()) as any[];
    return Array.isArray(data) ? data.map((b) => b.name) : ['main'];
  }

  /**
   * Fetches full Git recursive tree for the given branch
   */
  static async getTree(
    owner: string,
    repo: string,
    branch: string,
    isSynthetic = false,
    token?: string
  ): Promise<RepositoryFile[]> {
    if (isSynthetic) {
      const branchFiles: Record<string, string> =
        TKS_SYNTHETIC_REPO.files[branch] || TKS_SYNTHETIC_REPO.files[TKS_SYNTHETIC_REPO.defaultBranch] || {};
      return Object.keys(branchFiles).map((path) => ({
        path,
        type: 'blob',
        size: branchFiles[path].length,
      }));
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(
      branch
    )}?recursive=1`;
    const response = await fetch(url, { headers: getAuthHeaders(token) });

    if (!response.ok) {
      if (response.status === 404) {
        throw new GitHubApiError(
          `Branch "${branch}" was not found or repository "${owner}/${repo}" has no commits yet.`,
          404,
          'BRANCH_OR_TREE_NOT_FOUND'
        );
      }
      if (response.status === 403) {
        const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
        if (rateLimitRemaining === '0') {
          throw new GitHubApiError(
            'GitHub API rate limit exceeded for unauthenticated requests. Configure a Personal Access Token in Settings or install the GitHub App to increase your limit to 5,000 requests/hour.',
            429,
            'RATE_LIMIT_EXCEEDED'
          );
        }
      }
      throw new GitHubApiError(
        `Failed to fetch file tree for "${owner}/${repo}" on branch "${branch}".`,
        response.status,
        'TREE_FETCH_ERROR'
      );
    }

    const data = (await response.json()) as any;
    if (!data.tree || !Array.isArray(data.tree)) {
      return [];
    }

    return data.tree.map((item: any) => ({
      path: item.path,
      type: item.type === 'tree' ? 'tree' : 'blob',
      size: item.size || 0,
      sha: item.sha,
    }));
  }

  /**
   * Fetches specific file content from GitHub repository
   */
  static async getFileContent(
    owner: string,
    repo: string,
    filePath: string,
    branch: string,
    isSynthetic = false,
    token?: string
  ): Promise<string | null> {
    if (isSynthetic) {
      const branchFiles: Record<string, string> =
        TKS_SYNTHETIC_REPO.files[branch] || TKS_SYNTHETIC_REPO.files[TKS_SYNTHETIC_REPO.defaultBranch] || {};
      if (branchFiles[filePath] !== undefined) {
        return branchFiles[filePath];
      }
      return null;
    }

    try {
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(
        filePath
      ).replace(/%2F/g, '/')}?ref=${encodeURIComponent(branch)}`;
      const response = await fetch(url, { headers: getAuthHeaders(token) });

      if (!response.ok) {
        if (response.status === 404) return null;
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(
          branch
        )}/${filePath}`;
        const rawResp = await fetch(rawUrl);
        if (rawResp.ok) return await rawResp.text();
        return null;
      }

      const data = (await response.json()) as any;
      if (data.content && data.encoding === 'base64') {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      } else if (typeof data === 'string') {
        return data;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Creates a dedicated repair branch (e.g. repo-doctor/health-fixes-<unique-id>)
   * Never modifies or pushes directly to the base branch.
   */
  static async createRepairBranch(
    owner: string,
    repo: string,
    newBranchName: string,
    baseBranch: string,
    isSynthetic = false,
    token?: string
  ): Promise<string> {
    if (isSynthetic) {
      TKS_SYNTHETIC_REPO.branches.push(newBranchName);
      const baseFiles: Record<string, string> =
        TKS_SYNTHETIC_REPO.files[baseBranch] || TKS_SYNTHETIC_REPO.files[TKS_SYNTHETIC_REPO.defaultBranch] || {};
      TKS_SYNTHETIC_REPO.files[newBranchName] = { ...baseFiles };
      return `refs/heads/${newBranchName}`;
    }

    const effectiveToken = await this.resolveAuthToken(owner, repo, token, isSynthetic);

    // Step 1: Get base branch commit SHA
    const baseRefUrl = `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(
      baseBranch
    )}`;
    const baseResp = await fetch(baseRefUrl, { headers: getAuthHeaders(effectiveToken) });
    if (!baseResp.ok) {
      const errText = await baseResp.text();
      throw new Error(`Failed to locate base branch "${baseBranch}" on GitHub: ${errText}`);
    }
    const baseData = (await baseResp.json()) as any;
    const baseSha = baseData.object?.sha;
    if (!baseSha) {
      throw new Error(`Could not determine commit SHA for base branch "${baseBranch}"`);
    }

    // Step 2: Create new dedicated repair branch ref pointing to base SHA
    const createRefUrl = `https://api.github.com/repos/${owner}/${repo}/git/refs`;
    const createResp = await fetch(createRefUrl, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(effectiveToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: `refs/heads/${newBranchName}`,
        sha: baseSha,
      }),
    });

    if (!createResp.ok) {
      const errText = await createResp.text();
      let msg = errText;
      try {
        const parsed = JSON.parse(errText);
        msg = parsed.message || errText;
      } catch {}
      throw new Error(`GitHub API rejected repair branch creation (${createResp.status}): ${msg}`);
    }

    return `refs/heads/${newBranchName}`;
  }

  /**
   * Commits approved file patches to the dedicated repair branch
   * Commits only to the dedicated repair branch, never to main.
   */
  static async commitFiles(
    owner: string,
    repo: string,
    branch: string,
    files: Array<{ path: string; content: string; message?: string }>,
    commitMessage: string,
    isSynthetic = false,
    token?: string
  ): Promise<string> {
    if (isSynthetic) {
      if (!TKS_SYNTHETIC_REPO.files[branch]) {
        const defaultFiles: Record<string, string> =
          TKS_SYNTHETIC_REPO.files[TKS_SYNTHETIC_REPO.defaultBranch] || {};
        TKS_SYNTHETIC_REPO.files[branch] = { ...defaultFiles };
      }
      for (const f of files) {
        TKS_SYNTHETIC_REPO.files[branch][f.path] = f.content;
      }
      const fakeSha = `synth_commit_${Date.now().toString(16)}`;
      return fakeSha;
    }

    const effectiveToken = await this.resolveAuthToken(owner, repo, token, isSynthetic);

    let lastSha = '';
    for (const file of files) {
      // Check if file already exists on this branch to obtain its SHA (required by GitHub contents API)
      let fileSha: string | undefined;
      const getFileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(
        file.path
      ).replace(/%2F/g, '/')}?ref=${encodeURIComponent(branch)}`;
      const getFileResp = await fetch(getFileUrl, { headers: getAuthHeaders(effectiveToken) });
      if (getFileResp.ok) {
        const fileData = (await getFileResp.json()) as any;
        fileSha = fileData.sha;
      }

      const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(
        file.path
      ).replace(/%2F/g, '/')}`;
      const bodyPayload: any = {
        message: file.message || `${commitMessage} (${file.path})`,
        content: Buffer.from(file.content).toString('base64'),
        branch,
      };
      if (fileSha) {
        bodyPayload.sha = fileSha;
      }

      const putResp = await fetch(putUrl, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(effectiveToken),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
      });

      if (!putResp.ok) {
        const errText = await putResp.text();
        let msg = errText;
        try {
          const parsed = JSON.parse(errText);
          msg = parsed.message || errText;
        } catch {}
        throw new Error(`GitHub API commit failed for "${file.path}" on branch "${branch}": ${msg}`);
      }

      const putData = (await putResp.json()) as any;
      lastSha = putData.commit?.sha || lastSha;
    }

    return lastSha || 'commit_applied';
  }

  /**
   * Creates a real Pull Request on GitHub
   * Only returns success when confirmed by GitHub API.
   */
  static async createPullRequest(
    owner: string,
    repo: string,
    headBranch: string,
    baseBranch: string,
    title: string,
    body: string,
    isSynthetic = false,
    token?: string
  ): Promise<{ prUrl: string; prNumber: number; isSimulation?: boolean }> {
    if (isSynthetic) {
      const mockNumber = Math.floor(Math.random() * 800) + 100;
      return {
        prUrl: `https://github.com/devf8rge/tk-s-challenge/pull/${mockNumber}`,
        prNumber: mockNumber,
        isSimulation: true,
      };
    }

    const effectiveToken = await this.resolveAuthToken(owner, repo, token, isSynthetic);

    const url = `https://api.github.com/repos/${owner}/${repo}/pulls`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(effectiveToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body,
        head: headBranch,
        base: baseBranch,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      let message = errText;
      try {
        const parsed = JSON.parse(errText);
        message = parsed.message || (parsed.errors ? JSON.stringify(parsed.errors) : errText);
      } catch {}
      throw new Error(`GitHub API rejected Pull Request creation (${response.status}): ${message}`);
    }

    const data = (await response.json()) as any;
    if (!data.html_url || !data.number) {
      throw new Error(`GitHub API did not return confirmed PR details: ${JSON.stringify(data)}`);
    }

    return {
      prUrl: data.html_url,
      prNumber: data.number,
      isSimulation: false,
    };
  }

  /**
   * Checks if a Pull Request is merged or open
   */
  static async getPullRequestStatus(
    owner: string,
    repo: string,
    pullNumber: number,
    isSynthetic = false,
    token?: string
  ): Promise<{ state: string; isMerged: boolean; mergedAt: string | null }> {
    if (isSynthetic) {
      return {
        state: 'closed',
        isMerged: true,
        mergedAt: new Date().toISOString(),
      };
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`;
    const response = await fetch(url, { headers: getAuthHeaders(token) });
    if (!response.ok) {
      throw new Error(`Failed to fetch status for PR #${pullNumber}: ${await response.text()}`);
    }

    const data = (await response.json()) as any;
    return {
      state: data.state,
      isMerged: !!data.merged_at,
      mergedAt: data.merged_at || null,
    };
  }

  /**
   * Checks GitHub Actions workflow runs for the specified branch
   */
  static async getWorkflowRuns(
    owner: string,
    repo: string,
    branch: string,
    isSynthetic = false,
    token?: string
  ): Promise<{
    state: 'success' | 'failure' | 'pending' | 'none';
    runs: Array<{
      id: number;
      name: string;
      status: string;
      conclusion: string | null;
      htmlUrl: string;
    }>;
  }> {
    if (isSynthetic) {
      return {
        state: 'success',
        runs: [
          {
            id: 9812401,
            name: 'Repo Doctor CI Audit & Verification',
            status: 'completed',
            conclusion: 'success',
            htmlUrl: `https://github.com/devf8rge/tk-s-challenge/actions/runs/9812401`,
          },
        ],
      };
    }

    try {
      const url = `https://api.github.com/repos/${owner}/${repo}/actions/runs?branch=${encodeURIComponent(
        branch
      )}&per_page=5`;
      const response = await fetch(url, { headers: getAuthHeaders(token) });
      if (!response.ok) {
        return { state: 'none', runs: [] };
      }

      const data = (await response.json()) as any;
      if (!data.workflow_runs || data.workflow_runs.length === 0) {
        return { state: 'none', runs: [] };
      }

      const runs = data.workflow_runs.map((r: any) => ({
        id: r.id,
        name: r.name || 'Workflow Run',
        status: r.status,
        conclusion: r.conclusion,
        htmlUrl: r.html_url,
      }));

      const latest = runs[0];
      let state: 'success' | 'failure' | 'pending' | 'none' = 'none';
      if (latest.status === 'completed') {
        state = latest.conclusion === 'success' ? 'success' : 'failure';
      } else {
        state = 'pending';
      }

      return { state, runs };
    } catch {
      return { state: 'none', runs: [] };
    }
  }
}
