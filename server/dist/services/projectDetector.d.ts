import { RepositoryFile } from '../types/index.js';
export interface ProjectAnalysis {
    ecosystem: 'node' | 'python' | 'java' | 'rust' | 'go' | 'web' | 'unknown';
    technologies: string[];
    packageManager?: string;
    hasFrontend: boolean;
    hasBackend: boolean;
    hasTests: boolean;
    hasCI: boolean;
    manifestPaths: string[];
}
export declare function detectProjectTechnologies(files: RepositoryFile[]): ProjectAnalysis;
