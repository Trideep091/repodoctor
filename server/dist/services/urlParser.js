const FORBIDDEN_HOSTS = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '169.254.169.254', // AWS metadata
    'metadata.google.internal',
    '::1',
];
export function parseAndValidateGithubUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') {
        return {
            isValid: false,
            isSynthetic: false,
            owner: '',
            repo: '',
            fullName: '',
            normalizedUrl: '',
            error: 'URL is required',
        };
    }
    let trimmed = rawUrl.trim();
    // Support synthetic test repository shortcut for TK-S challenge
    if (trimmed === 'synthetic://devf8rge/tk-s-repo' ||
        trimmed === 'demo://tk-s' ||
        trimmed.startsWith('synthetic://') ||
        trimmed.startsWith('demo://')) {
        return {
            isValid: true,
            isSynthetic: true,
            owner: 'devf8rge',
            repo: 'tk-s-challenge',
            fullName: 'devf8rge/tk-s-challenge',
            normalizedUrl: 'https://github.com/devf8rge/tk-s-challenge',
            branch: 'main',
        };
    }
    // Support SSH git clone format: git@github.com:owner/repo(.git)
    if (trimmed.startsWith('git@github.com:')) {
        const pathPart = trimmed.slice('git@github.com:'.length);
        trimmed = `https://github.com/${pathPart}`;
    }
    // Strip trailing slashes for shorthand matching
    const cleanCandidate = trimmed.replace(/\/+$/, '');
    // Support shorthand "owner/repo" or "owner/repo.git" format (e.g., trideep026/stock-photo)
    const shorthandPattern = /^[a-zA-Z0-9_\-\.]+\/[a-zA-Z0-9_\-\.]+$/;
    if (!cleanCandidate.includes('://') && !cleanCandidate.toLowerCase().startsWith('github.com/') && shorthandPattern.test(cleanCandidate)) {
        trimmed = `https://github.com/${cleanCandidate}`;
    }
    let parsed;
    try {
        parsed = new URL(trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('git://') ? trimmed : `https://${trimmed}`);
    }
    catch (err) {
        return {
            isValid: false,
            isSynthetic: false,
            owner: '',
            repo: '',
            fullName: '',
            normalizedUrl: '',
            error: 'Invalid URL format',
        };
    }
    // SSRF Protection: Reject private IPs, metadata endpoints, and non-github hosts
    const hostname = parsed.hostname.toLowerCase();
    if (FORBIDDEN_HOSTS.includes(hostname) ||
        hostname.endsWith('.internal') ||
        hostname.endsWith('.local') ||
        /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
        return {
            isValid: false,
            isSynthetic: false,
            owner: '',
            repo: '',
            fullName: '',
            normalizedUrl: '',
            error: 'Security validation failed: Prohibited host or internal IP address',
        };
    }
    if (hostname !== 'github.com' && hostname !== 'www.github.com') {
        return {
            isValid: false,
            isSynthetic: false,
            owner: '',
            repo: '',
            fullName: '',
            normalizedUrl: '',
            error: 'Only public or authorized GitHub repositories (github.com) are supported',
        };
    }
    // Path segments: e.g. /owner/repo or /owner/repo/tree/branch-name
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length < 2) {
        return {
            isValid: false,
            isSynthetic: false,
            owner: '',
            repo: '',
            fullName: '',
            normalizedUrl: '',
            error: 'GitHub URL must specify both owner and repository name (e.g., https://github.com/owner/repo)',
        };
    }
    const owner = segments[0];
    let repo = segments[1];
    // Strip .git suffix case-insensitively (.git, .GIT, .Git)
    repo = repo.replace(/\.git$/i, '');
    if (!owner || !repo) {
        return {
            isValid: false,
            isSynthetic: false,
            owner: '',
            repo: '',
            fullName: '',
            normalizedUrl: '',
            error: 'Repository name or owner cannot be empty',
        };
    }
    // Basic validation of owner and repo naming constraints
    const githubNamePattern = /^[a-zA-Z0-9_\-\.]+$/;
    if (!githubNamePattern.test(owner) || !githubNamePattern.test(repo)) {
        return {
            isValid: false,
            isSynthetic: false,
            owner: '',
            repo: '',
            fullName: '',
            normalizedUrl: '',
            error: 'Repository name or owner contains invalid characters',
        };
    }
    let branch;
    if (segments.length >= 4 && segments[2] === 'tree') {
        branch = segments.slice(3).join('/');
    }
    const fullName = `${owner}/${repo}`;
    const normalizedUrl = `https://github.com/${fullName}`;
    return {
        isValid: true,
        isSynthetic: false,
        owner,
        repo,
        branch,
        fullName,
        normalizedUrl,
    };
}
