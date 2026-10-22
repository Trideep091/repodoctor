import { Finding, RepositoryFile } from '../types/index.js';
export declare function scanDependencies(files: RepositoryFile[], owner: string, repo: string, branch: string, getFileContent: (path: string) => Promise<string | null>): Promise<Finding[]>;
