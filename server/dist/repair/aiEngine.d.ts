import { Finding, RepositoryFile } from '../types/index.js';
import { DiffResult } from './diffGenerator.js';
import { ProjectAnalysis } from '../services/projectDetector.js';
export interface GeneratedPatch {
    findingId: string;
    filePath: string;
    action: 'create' | 'modify' | 'delete';
    originalContent: string;
    proposedContent: string;
    diffUnified: string;
    diffResult: DiffResult;
    explanation: string;
    validationStatus: 'passed' | 'failed' | 'not_run';
    warnings: string[];
}
export interface RepairOptions {
    licenseChoice?: string;
}
export declare class AIRepairEngine {
    /**
     * Generates a context-aware fix for a given finding based on actual repository contents
     */
    static generateRepair(finding: Finding, files: RepositoryFile[], project: ProjectAnalysis, owner: string, repo: string, getFileContent: (path: string) => Promise<string | null>, options?: RepairOptions): Promise<GeneratedPatch | null>;
    /**
     * Deterministic contextual repair generator verified against actual repository files
     */
    private static generateDeterministicRepair;
    /**
     * Generates fix via Google Gemini API
     */
    private static generateWithGemini;
    /**
     * Generates fix via OpenAI API
     */
    private static generateWithOpenAI;
}
