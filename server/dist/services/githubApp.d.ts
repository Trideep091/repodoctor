export declare class GitHubAppService {
    private static tokenCache;
    private static appInfoCache;
    /**
     * Resolves GitHub App ID and Private Key from configuration or environment
     */
    static getAppCredentials(): {
        appId: string;
        privateKey: string;
        installationId?: string;
    } | null;
    /**
     * Returns true if GitHub App authentication credentials are fully configured
     */
    static isConfigured(): boolean;
    /**
     * Generates a signed RS256 JWT for GitHub App authentication (valid for 10 minutes)
     */
    static generateAppJwt(): string;
    /**
     * Fetches metadata for the configured GitHub App (slug, name, installation URL)
     */
    static getAppInfo(): Promise<{
        id: string;
        name: string;
        slug: string;
        installUrl: string;
    } | null>;
    /**
     * Resolves the numeric installation ID for a specific repository
     */
    static getInstallationIdForRepo(owner: string, repo: string, appJwt: string): Promise<number>;
    /**
     * Obtains a short-lived Installation Access Token for the target repository
     * Tokens are cached in-memory until 5 minutes before expiration.
     */
    static getInstallationAccessToken(owner: string, repo: string): Promise<{
        token: string;
        installationId: number;
        permissions: Record<string, string>;
    }>;
    /**
     * Clears in-memory token cache (useful for testing or after revocation)
     */
    static clearCache(): void;
}
