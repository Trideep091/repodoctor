import { Finding, RepositoryFile } from '../types/index.js';
import { ProjectAnalysis } from '../services/projectDetector.js';
export declare function scanRepositoryHealth(files: RepositoryFile[], project: ProjectAnalysis, owner: string, repo: string, branch: string, getFileContent: (path: string) => Promise<string | null>): Promise<Finding[]>;
