export type FindingCategory = 'documentation' | 'community' | 'build_ci' | 'testing_quality' | 'security_secrets' | 'supply_chain' | 'accessibility';
export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type FindingConfidence = 'high' | 'medium' | 'low';
export type ValidationStatus = 'passed' | 'failed' | 'not_run' | 'awaiting_ci' | 'unsupported';
export type ResolutionStatus = 'open' | 'fix_available' | 'patch_selected' | 'pr_submitted' | 'resolved';
export interface Finding {
    id: string;
    repository: string;
    branch: string;
    category: FindingCategory;
    ruleId: string;
    ruleTitle: string;
    severity: FindingSeverity;
    confidence: FindingConfidence;
    filePath: string;
    lineNumber?: number;
    description: string;
    evidence: string;
    recommendation: string;
    proposedPatch?: {
        action: 'create' | 'modify' | 'delete';
        originalContent?: string;
        proposedContent: string;
        diffUnified: string;
        summary: string;
    };
    validationStatus: ValidationStatus;
    resolutionStatus: ResolutionStatus;
    timestamp: string;
    scannerVersion: string;
}
export interface CategoryScore {
    category: FindingCategory;
    name: string;
    weight: number;
    score: number;
    deductions: number;
    findingsCount: {
        critical: number;
        high: number;
        medium: number;
        low: number;
        info: number;
    };
}
export interface DiagnosisReport {
    scanId: string;
    repository: {
        url: string;
        owner: string;
        name: string;
        fullName: string;
        defaultBranch: string;
        selectedBranch: string;
        isPrivate: boolean;
        description?: string;
        stars: number;
        forks: number;
        openIssues: number;
        language: string;
        detectedTech: string[];
        availableBranches: string[];
    };
    timestamp: string;
    durationMs: number;
    overallScore: number;
    categoryScores: Record<FindingCategory, CategoryScore>;
    summary: {
        totalFindings: number;
        criticalFindings: number;
        highFindings: number;
        mediumFindings: number;
        lowFindings: number;
        infoFindings: number;
        fixesAvailableCount: number;
    };
    findings: Finding[];
    scannerCoverage: {
        scannedFilesCount: number;
        totalFilesCount: number;
        scannersRun: string[];
        limitations: string[];
    };
    isSyntheticTest?: boolean;
}
export interface RepairPlan {
    planId: string;
    scanId: string;
    repository: string;
    baseBranch: string;
    suggestedBranchName: string;
    selectedFindingIds: string[];
    patches: {
        findingId: string;
        filePath: string;
        action: 'create' | 'modify' | 'delete';
        originalContent?: string;
        proposedContent: string;
        diffUnified: string;
        explanation: string;
        validationStatus: ValidationStatus;
        warnings?: string[];
    }[];
}
export interface PRSubmissionResult {
    success: boolean;
    prUrl?: string;
    prNumber?: number;
    branchName: string;
    baseBranch: string;
    title: string;
    body: string;
    commitSha?: string;
    changedFiles: string[];
    appliedFindingIds: string[];
    createdAt: string;
    error?: string;
    simulationNote?: string;
}
export interface RescanComparison {
    previousScanId: string;
    currentScanId: string;
    timestamp: string;
    repository: string;
    branch: string;
    prUrl?: string;
    isMerged: boolean;
    scoreBefore: number;
    scoreAfter: number;
    scoreDelta: number;
    categoryScoreDeltas: Record<FindingCategory, {
        before: number;
        after: number;
        delta: number;
    }>;
    resolvedFindings: Finding[];
    persistentFindings: Finding[];
    newFindings: Finding[];
    ciStatus?: {
        state: 'success' | 'failure' | 'pending' | 'none';
        description?: string;
        targetUrl?: string;
        runs?: {
            id: number;
            name: string;
            status: string;
            conclusion: string | null;
            htmlUrl: string;
        }[];
    };
}
export interface RepositoryFile {
    path: string;
    type: 'blob' | 'tree';
    size?: number;
    sha?: string;
    content?: string;
}
export interface AppSettings {
    githubToken?: string;
    githubAppId?: string;
    githubAppPrivateKey?: string;
    githubAppPrivateKeyPath?: string;
    githubAppInstallationId?: string;
    aiProvider: 'gemini' | 'openai' | 'claude' | 'deterministic';
    geminiApiKey?: string;
    openaiApiKey?: string;
    scoringWeights: {
        documentation: number;
        community: number;
        build_ci: number;
        testing_quality: number;
        security_secrets: number;
        supply_chain: number;
        accessibility: number;
    };
}
