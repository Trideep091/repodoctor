import { RepositoryFile } from '../types/index.js';
export declare class GitHubApiError extends Error {
    statusCode: number;
    code: string;
    constructor(message: string, statusCode?: number, code?: string);
}
export declare class GitHubService {
    /**
     * Resolves an effective authorization token for a repository.
     * Prioritizes GitHub App installation access token if configured.
     * Falls back to explicit token, then settings/env GITHUB_TOKEN.
     */
    static resolveAuthToken(owner: string, repo: string, explicitToken?: string, isSynthetic?: boolean): Promise<string>;
    /**
     * Fetches repository metadata (stars, forks, open issues, default branch, etc.)
     */
    static getRepository(owner: string, repo: string, isSynthetic?: boolean, token?: string): Promise<{
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
    }>;
    /**
     * Fetches list of branches available in repository
     */
    static getBranches(owner: string, repo: string, isSynthetic?: boolean, token?: string): Promise<string[]>;
    /**
     * Fetches full Git recursive tree for the given branch
     */
    static getTree(owner: string, repo: string, branch: string, isSynthetic?: boolean, token?: string): Promise<RepositoryFile[]>;
    /**
     * Fetches specific file content from GitHub repository
     */
    static getFileContent(owner: string, repo: string, filePath: string, branch: string, isSynthetic?: boolean, token?: string): Promise<string | null>;
    /**
     * Creates a dedicated repair branch (e.g. repo-doctor/health-fixes-<unique-id>)
     * Never modifies or pushes directly to the base branch.
     */
    static createRepairBranch(owner: string, repo: string, newBranchName: string, baseBranch: string, isSynthetic?: boolean, token?: string): Promise<string>;
    /**
     * Commits approved file patches to the dedicated repair branch
     * Commits only to the dedicated repair branch, never to main.
     */
    static commitFiles(owner: string, repo: string, branch: string, files: Array<{
        path: string;
        content: string;
        message?: string;
    }>, commitMessage: string, isSynthetic?: boolean, token?: string): Promise<string>;
    /**
     * Creates a real Pull Request on GitHub
     * Only returns success when confirmed by GitHub API.
     */
    static createPullRequest(owner: string, repo: string, headBranch: string, baseBranch: string, title: string, body: string, isSynthetic?: boolean, token?: string): Promise<{
        prUrl: string;
        prNumber: number;
        isSimulation?: boolean;
    }>;
    /**
     * Checks if a Pull Request is merged or open
     */
    static getPullRequestStatus(owner: string, repo: string, pullNumber: number, isSynthetic?: boolean, token?: string): Promise<{
        state: string;
        isMerged: boolean;
        mergedAt: string | null;
    }>;
    /**
     * Checks GitHub Actions workflow runs for the specified branch
     */
    static getWorkflowRuns(owner: string, repo: string, branch: string, isSynthetic?: boolean, token?: string): Promise<{
        state: 'success' | 'failure' | 'pending' | 'none';
        runs: Array<{
            id: number;
            name: string;
            status: string;
            conclusion: string | null;
            htmlUrl: string;
        }>;
    }>;
}
