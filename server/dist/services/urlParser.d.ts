export interface ParsedRepoUrl {
    isValid: boolean;
    isSynthetic: boolean;
    owner: string;
    repo: string;
    branch?: string;
    fullName: string;
    normalizedUrl: string;
    error?: string;
}
export declare function parseAndValidateGithubUrl(rawUrl: string): ParsedRepoUrl;
