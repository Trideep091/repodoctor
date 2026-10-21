import { getSettings } from '../config.js';
import { TKS_SYNTHETIC_REPO } from '../fixtures/tksFixture.js';
function getAuthHeaders(explicitToken) {
    const settings = getSettings();
    const token = explicitToken || settings.githubToken || process.env.GITHUB_TOKEN;
    const headers = {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'RepoDoctor-AuditBot/1.0',
    };
    if (token && token.trim()) {
        headers.Authorization = `Bearer ${token.trim()}`;
    }
    return headers;
}
export class GitHubService {
    /**
     * Fetches repository metadata (stars, forks, open issues, default branch, etc.)
     */
    static async getRepository(owner, repo, isSynthetic = false, token) {
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
                throw new Error(`Repository "${owner}/${repo}" was not found on GitHub. If this repository is private, configure a GitHub Personal Access Token with 'repo' scope in Settings.`);
            }
            if (response.status === 403) {
                const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
                if (rateLimitRemaining === '0') {
                    throw new Error('GitHub API rate limit exceeded. Please configure a GitHub Personal Access Token in Settings for higher limits (5,000 requests/hr).');
                }
                throw new Error(`GitHub API access denied (403): ${await response.text()}`);
            }
            throw new Error(`GitHub API returned error ${response.status}: ${await response.text()}`);
        }
        const data = (await response.json());
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
    static async getBranches(owner, repo, isSynthetic = false, token) {
        if (isSynthetic) {
            return TKS_SYNTHETIC_REPO.branches;
        }
        const url = `https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`;
        const response = await fetch(url, { headers: getAuthHeaders(token) });
        if (!response.ok) {
            return ['main'];
        }
        const data = (await response.json());
        return Array.isArray(data) ? data.map((b) => b.name) : ['main'];
    }
    /**
     * Fetches full Git recursive tree for the given branch
     */
    static async getTree(owner, repo, branch, isSynthetic = false, token) {
        if (isSynthetic) {
            const branchFiles = TKS_SYNTHETIC_REPO.files[branch] || TKS_SYNTHETIC_REPO.files[TKS_SYNTHETIC_REPO.defaultBranch] || {};
            return Object.keys(branchFiles).map((path) => ({
                path,
                type: 'blob',
                size: branchFiles[path].length,
            }));
        }
        const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
        const response = await fetch(url, { headers: getAuthHeaders(token) });
        if (!response.ok) {
            throw new Error(`Failed to fetch file tree for branch "${branch}". Ensure the branch exists and is accessible.`);
        }
        const data = (await response.json());
        if (!data.tree || !Array.isArray(data.tree)) {
            return [];
        }
        return data.tree.map((item) => ({
            path: item.path,
            type: item.type === 'tree' ? 'tree' : 'blob',
            size: item.size || 0,
            sha: item.sha,
        }));
    }
    /**
     * Fetches specific file content from GitHub repository
     */
    static async getFileContent(owner, repo, filePath, branch, isSynthetic = false, token) {
        if (isSynthetic) {
            const branchFiles = TKS_SYNTHETIC_REPO.files[branch] || TKS_SYNTHETIC_REPO.files[TKS_SYNTHETIC_REPO.defaultBranch] || {};
            if (branchFiles[filePath] !== undefined) {
                return branchFiles[filePath];
            }
            return null;
        }
        try {
            const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath).replace(/%2F/g, '/')}?ref=${encodeURIComponent(branch)}`;
            const response = await fetch(url, { headers: getAuthHeaders(token) });
            if (!response.ok) {
                if (response.status === 404)
                    return null;
                const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${filePath}`;
                const rawResp = await fetch(rawUrl);
                if (rawResp.ok)
                    return await rawResp.text();
                return null;
            }
            const data = (await response.json());
            if (data.content && data.encoding === 'base64') {
                return Buffer.from(data.content, 'base64').toString('utf-8');
            }
            else if (typeof data === 'string') {
                return data;
            }
            return null;
        }
        catch {
            return null;
        }
    }
    /**
     * Creates a dedicated repair branch (e.g. repo-doctor/health-fixes-<unique-id>)
     * Never modifies or pushes directly to the base branch.
     */
    static async createRepairBranch(owner, repo, newBranchName, baseBranch, isSynthetic = false, token) {
        if (isSynthetic) {
            TKS_SYNTHETIC_REPO.branches.push(newBranchName);
            const baseFiles = TKS_SYNTHETIC_REPO.files[baseBranch] || TKS_SYNTHETIC_REPO.files[TKS_SYNTHETIC_REPO.defaultBranch] || {};
            TKS_SYNTHETIC_REPO.files[newBranchName] = { ...baseFiles };
            return `refs/heads/${newBranchName}`;
        }
        const settings = getSettings();
        const effectiveToken = token || settings.githubToken || process.env.GITHUB_TOKEN;
        if (!effectiveToken || !effectiveToken.trim()) {
            throw new Error('GitHub authorization required: A GitHub Personal Access Token (PAT) with "repo" write scope is required to create a branch. Please configure your token in Settings.');
        }
        // Step 1: Get base branch commit SHA
        const baseRefUrl = `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(baseBranch)}`;
        const baseResp = await fetch(baseRefUrl, { headers: getAuthHeaders(effectiveToken) });
        if (!baseResp.ok) {
            const errText = await baseResp.text();
            throw new Error(`Failed to locate base branch "${baseBranch}" on GitHub: ${errText}`);
        }
        const baseData = (await baseResp.json());
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
            }
            catch { }
            throw new Error(`GitHub API rejected repair branch creation (${createResp.status}): ${msg}`);
        }
        return `refs/heads/${newBranchName}`;
    }
    /**
     * Commits approved file patches to the dedicated repair branch
     * Commits only to the dedicated repair branch, never to main.
     */
    static async commitFiles(owner, repo, branch, files, commitMessage, isSynthetic = false, token) {
        if (isSynthetic) {
            if (!TKS_SYNTHETIC_REPO.files[branch]) {
                const defaultFiles = TKS_SYNTHETIC_REPO.files[TKS_SYNTHETIC_REPO.defaultBranch] || {};
                TKS_SYNTHETIC_REPO.files[branch] = { ...defaultFiles };
            }
            for (const f of files) {
                TKS_SYNTHETIC_REPO.files[branch][f.path] = f.content;
            }
            const fakeSha = `synth_commit_${Date.now().toString(16)}`;
            return fakeSha;
        }
        const settings = getSettings();
        const effectiveToken = token || settings.githubToken || process.env.GITHUB_TOKEN;
        if (!effectiveToken || !effectiveToken.trim()) {
            throw new Error('GitHub authorization required: A GitHub Personal Access Token (PAT) with "repo" write scope is required to commit files. Please configure your token in Settings.');
        }
        let lastSha = '';
        for (const file of files) {
            // Check if file already exists on this branch to obtain its SHA (required by GitHub contents API)
            let fileSha;
            const getFileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(file.path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(branch)}`;
            const getFileResp = await fetch(getFileUrl, { headers: getAuthHeaders(effectiveToken) });
            if (getFileResp.ok) {
                const fileData = (await getFileResp.json());
                fileSha = fileData.sha;
            }
            const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(file.path).replace(/%2F/g, '/')}`;
            const bodyPayload = {
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
                }
                catch { }
                throw new Error(`GitHub API commit failed for "${file.path}" on branch "${branch}": ${msg}`);
            }
            const putData = (await putResp.json());
            lastSha = putData.commit?.sha || lastSha;
        }
        return lastSha || 'commit_applied';
    }
    /**
     * Creates a real Pull Request on GitHub
     * Only returns success when confirmed by GitHub API.
     */
    static async createPullRequest(owner, repo, headBranch, baseBranch, title, body, isSynthetic = false, token) {
        if (isSynthetic) {
            const mockNumber = Math.floor(Math.random() * 800) + 100;
            return {
                prUrl: `https://github.com/devf8rge/tk-s-challenge/pull/${mockNumber}`,
                prNumber: mockNumber,
                isSimulation: true,
            };
        }
        const settings = getSettings();
        const effectiveToken = token || settings.githubToken || process.env.GITHUB_TOKEN;
        if (!effectiveToken || !effectiveToken.trim()) {
            throw new Error('GitHub authorization required: A GitHub Personal Access Token (PAT) with "repo" write scope is required to open a Pull Request. Please configure your token in Settings.');
        }
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
            }
            catch { }
            throw new Error(`GitHub API rejected Pull Request creation (${response.status}): ${message}`);
        }
        const data = (await response.json());
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
    static async getPullRequestStatus(owner, repo, pullNumber, isSynthetic = false, token) {
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
        const data = (await response.json());
        return {
            state: data.state,
            isMerged: !!data.merged_at,
            mergedAt: data.merged_at || null,
        };
    }
    /**
     * Checks GitHub Actions workflow runs for the specified branch
     */
    static async getWorkflowRuns(owner, repo, branch, isSynthetic = false, token) {
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
            const url = `https://api.github.com/repos/${owner}/${repo}/actions/runs?branch=${encodeURIComponent(branch)}&per_page=5`;
            const response = await fetch(url, { headers: getAuthHeaders(token) });
            if (!response.ok) {
                return { state: 'none', runs: [] };
            }
            const data = (await response.json());
            if (!data.workflow_runs || data.workflow_runs.length === 0) {
                return { state: 'none', runs: [] };
            }
            const runs = data.workflow_runs.map((r) => ({
                id: r.id,
                name: r.name || 'Workflow Run',
                status: r.status,
                conclusion: r.conclusion,
                htmlUrl: r.html_url,
            }));
            const latest = runs[0];
            let state = 'none';
            if (latest.status === 'completed') {
                state = latest.conclusion === 'success' ? 'success' : 'failure';
            }
            else {
                state = 'pending';
            }
            return { state, runs };
        }
        catch {
            return { state: 'none', runs: [] };
        }
    }
}
