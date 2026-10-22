export interface SyntheticRepoData {
    owner: string;
    name: string;
    fullName: string;
    defaultBranch: string;
    branches: string[];
    description: string;
    files: Record<string, Record<string, string>>;
}
export declare const TKS_SYNTHETIC_REPO: SyntheticRepoData;
