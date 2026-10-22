import { Finding, RepositoryFile } from '../types/index.js';
export declare function scanAccessibility(files: RepositoryFile[], owner: string, repo: string, branch: string, getFileContent: (path: string) => Promise<string | null>): Promise<Finding[]>;
