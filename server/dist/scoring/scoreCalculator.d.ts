import { Finding, FindingCategory, CategoryScore } from '../types/index.js';
export interface CalculatedScores {
    overallScore: number;
    categoryScores: Record<FindingCategory, CategoryScore>;
}
export declare function calculateTransparentScores(findings: Finding[]): CalculatedScores;
