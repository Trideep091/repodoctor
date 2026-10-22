import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getSettings } from '../config.js';
export class GitHubAppService {
    static tokenCache = new Map();
    static appInfoCache = null;
    /**
     * Resolves GitHub App ID and Private Key from configuration or environment
     */
    static getAppCredentials() {
        const settings = getSettings();
        const appId = (settings.githubAppId || process.env.GITHUB_APP_ID || '').trim();
        const keyPath = (settings.githubAppPrivateKeyPath || process.env.GITHUB_APP_PRIVATE_KEY_PATH || '').trim();
        const rawKey = (settings.githubAppPrivateKey || process.env.GITHUB_APP_PRIVATE_KEY || '').trim();
        const installationId = (settings.githubAppInstallationId || process.env.GITHUB_APP_INSTALLATION_ID || '').trim();
        if (!appId)
            return null;
        let privateKey = '';
        // 1. Resolve from raw string (settings or environment) if provided
        if (rawKey) {
            if (rawKey.includes('-----BEGIN')) {
                // Raw PEM with real or escaped newlines
                privateKey = rawKey.replace(/\\n/g, '\n').trim();
            }
            else {
                // Handle Base64-encoded PEM string
                try {
                    const decoded = Buffer.from(rawKey, 'base64').toString('utf8');
                    if (decoded.includes('-----BEGIN')) {
                        privateKey = decoded.trim();
                    }
                }
                catch {
                    // not base64
                }
            }
        }
        // 2. Resolve from file path if specified and key not already resolved
        if (!privateKey && keyPath) {
            const resolvedPath = path.isAbsolute(keyPath) ? keyPath : path.resolve(process.cwd(), keyPath);
            if (fs.existsSync(resolvedPath)) {
                try {
                    privateKey = fs.readFileSync(resolvedPath, 'utf8').trim();
                }
                catch (err) {
                    console.error(`[GitHubApp] Failed to read private key from "${resolvedPath}":`, err.message);
                }
            }
        }
        if (!appId || !privateKey)
            return null;
        return {
            appId,
            privateKey,
            installationId: installationId || undefined,
        };
    }
    /**
     * Returns true if GitHub App authentication credentials are fully configured
     */
    static isConfigured() {
        return this.getAppCredentials() !== null;
    }
    /**
     * Generates a signed RS256 JWT for GitHub App authentication (valid for 10 minutes)
     */
    static generateAppJwt() {
        const creds = this.getAppCredentials();
        if (!creds) {
            throw new Error('GitHub App authentication is not configured. Missing GITHUB_APP_ID or GITHUB_APP_PRIVATE_KEY.');
        }
        const now = Math.floor(Date.now() / 1000);
        const header = {
            alg: 'RS256',
            typ: 'JWT',
        };
        const payload = {
            iat: now - 60, // 60 seconds clock drift compensation
            exp: now + 600, // 10 minutes expiration (maximum permitted by GitHub)
            iss: creds.appId,
        };
        const encodeBase64Url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
        const unsignedToken = `${encodeBase64Url(header)}.${encodeBase64Url(payload)}`;
        try {
            const sign = crypto.createSign('RSA-SHA256');
            sign.update(unsignedToken);
            sign.end();
            const signature = sign.sign(creds.privateKey, 'base64url');
            return `${unsignedToken}.${signature}`;
        }
        catch (err) {
            throw new Error(`Failed to sign GitHub App JWT. Please verify that your private key is a valid RSA PEM key: ${err.message}`);
        }
    }
    /**
     * Fetches metadata for the configured GitHub App (slug, name, installation URL)
     */
    static async getAppInfo() {
        if (!this.isConfigured())
            return null;
        if (this.appInfoCache)
            return this.appInfoCache;
        const creds = this.getAppCredentials();
        const explicitSlug = process.env.GITHUB_APP_SLUG?.trim();
        if (explicitSlug) {
            this.appInfoCache = {
                id: creds?.appId || '',
                name: process.env.GITHUB_APP_NAME?.trim() || 'Repo Doctor',
                slug: explicitSlug,
                installUrl: `https://github.com/apps/${encodeURIComponent(explicitSlug)}/installations/new`,
            };
            return this.appInfoCache;
        }
        try {
            const appJwt = this.generateAppJwt();
            const res = await fetch('https://api.github.com/app', {
                headers: {
                    Authorization: `Bearer ${appJwt}`,
                    Accept: 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                    'User-Agent': 'RepoDoctor-AuditBot/1.0',
                },
            });
            if (res.ok) {
                const data = (await res.json());
                const slug = data.slug || '';
                const name = data.name || 'Repo Doctor';
                const installUrl = data.html_url
                    ? `${data.html_url}/installations/new`
                    : slug
                        ? `https://github.com/apps/${slug}/installations/new`
                        : '';
                this.appInfoCache = {
                    id: String(data.id || creds?.appId || ''),
                    name,
                    slug,
                    installUrl,
                };
                return this.appInfoCache;
            }
        }
        catch (err) {
            console.warn('[GitHubApp] Failed to query /app metadata:', err.message);
        }
        return null;
    }
    /**
     * Resolves the numeric installation ID for a specific repository
     */
    static async getInstallationIdForRepo(owner, repo, appJwt) {
        const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/installation`;
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${appJwt}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'RepoDoctor-AuditBot/1.0',
            },
        });
        if (response.status === 404) {
            const appInfo = await this.getAppInfo();
            const installHint = appInfo?.installUrl
                ? ` Please install the Repo Doctor GitHub App on "${owner}/${repo}" via ${appInfo.installUrl} to grant repository access.`
                : ` Please install the Repo Doctor GitHub App on "${owner}/${repo}" to grant repository access.`;
            throw new Error(`GitHub App is not installed on repository "${owner}/${repo}".${installHint}`);
        }
        if (!response.ok) {
            const errText = await response.text();
            let msg = errText;
            try {
                const parsed = JSON.parse(errText);
                msg = parsed.message || errText;
            }
            catch { }
            throw new Error(`Failed to query GitHub App installation for "${owner}/${repo}" (${response.status}): ${msg}`);
        }
        const data = (await response.json());
        if (!data.id) {
            throw new Error(`GitHub API returned unexpected installation payload for "${owner}/${repo}".`);
        }
        return data.id;
    }
    /**
     * Obtains a short-lived Installation Access Token for the target repository
     * Tokens are cached in-memory until 5 minutes before expiration.
     */
    static async getInstallationAccessToken(owner, repo) {
        const cacheKey = `${owner.toLowerCase()}/${repo.toLowerCase()}`;
        const cached = this.tokenCache.get(cacheKey);
        // Use cached token if valid for at least 5 more minutes
        if (cached && cached.expiresAtMs > Date.now() + 5 * 60 * 1000) {
            return {
                token: cached.token,
                installationId: cached.installationId,
                permissions: cached.permissions,
            };
        }
        // 1. Generate App JWT
        const appJwt = this.generateAppJwt();
        // 2. Resolve installation ID for repository
        const installationId = await this.getInstallationIdForRepo(owner, repo, appJwt);
        // 3. Request installation access token
        const tokenUrl = `https://api.github.com/app/installations/${installationId}/access_tokens`;
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${appJwt}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'RepoDoctor-AuditBot/1.0',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                repositories: [repo],
            }),
        });
        if (!response.ok) {
            const errText = await response.text();
            let msg = errText;
            try {
                const parsed = JSON.parse(errText);
                msg = parsed.message || errText;
            }
            catch { }
            if (response.status === 422 && msg.toLowerCase().includes('not accessible')) {
                throw new Error(`The Repo Doctor GitHub App does not have access to repository "${owner}/${repo}". Please open your GitHub account settings (GitHub Settings -> Applications -> Installed GitHub Apps -> Configure) and add "${owner}/${repo}" to the selected repositories.`);
            }
            throw new Error(`Failed to generate GitHub App installation token for "${owner}/${repo}" (${response.status}): ${msg}`);
        }
        const data = (await response.json());
        const token = data.token;
        const expiresAtMs = new Date(data.expires_at).getTime();
        const permissions = data.permissions || {};
        // 4. Verify required permissions for Repair Workspace PR operations
        const hasContentsWrite = permissions.contents === 'write';
        const hasPullRequestsWrite = permissions.pull_requests === 'write';
        if (!hasContentsWrite || !hasPullRequestsWrite) {
            console.warn(`[GitHubApp] Warning: GitHub App permissions on "${owner}/${repo}" may be insufficient. Contents: ${permissions.contents}, PullRequests: ${permissions.pull_requests}`);
        }
        // Cache the token
        this.tokenCache.set(cacheKey, {
            token,
            expiresAtMs,
            permissions,
            installationId,
        });
        return {
            token,
            installationId,
            permissions,
        };
    }
    /**
     * Clears in-memory token cache (useful for testing or after revocation)
     */
    static clearCache() {
        this.tokenCache.clear();
    }
}
