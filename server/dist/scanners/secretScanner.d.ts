import { Finding, RepositoryFile } from '../types/index.js';
interface SecretRule {
    ruleId: string;
    ruleTitle: string;
    category: 'AWS' | 'GitHub' | 'OpenAI' | 'Slack' | 'Stripe' | 'PrivateKey' | 'Database' | 'GenericSecret';
    regex: RegExp;
    severity: 'critical' | 'high';
    confidence: 'high' | 'medium';
    description: string;
    recommendation: string;
}
export declare const SECRET_RULES: SecretRule[];
/**
 * Safely redacts detected sensitive strings (e.g. ghp_1234567890abcdef1234567890abcdef1234 -> ghp_************1234)
 */
export declare function redactSecret(secret: string): string;
export declare function scanSecrets(files: RepositoryFile[], owner: string, repo: string, branch: string, getFileContent: (path: string) => Promise<string | null>): Promise<Finding[]>;
export {};
