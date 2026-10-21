export type FindingCategory =
  | 'documentation'
  | 'community'
  | 'build_ci'
  | 'testing_quality'
  | 'security_secrets'
  | 'supply_chain'
  | 'accessibility';

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type FindingConfidence = 'high' | 'medium' | 'low';

export type ValidationStatus =
  | 'passed'
  | 'failed'
  | 'not_run'
  | 'awaiting_ci'
  | 'unsupported';

export type ResolutionStatus =
  | 'open'
  | 'fix_available'
  | 'patch_selected'
  | 'pr_submitted'
  | 'resolved';

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

export interface GeneratedPatch {
  findingId: string;
  filePath: string;
  action: 'create' | 'modify' | 'delete';
  originalContent: string;
  proposedContent: string;
  diffUnified: string;
  explanation: string;
  validationStatus: 'passed' | 'failed' | 'not_run';
  warnings: string[];
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
  categoryScoreDeltas: Record<FindingCategory, { before: number; after: number; delta: number }>;
  resolvedFindings: Finding[];
  persistentFindings: Finding[];
  newFindings: Finding[];
  ciStatus?: {
    state: 'success' | 'failure' | 'pending' | 'none';
    runs?: Array<{
      id: number;
      name: string;
      status: string;
      conclusion: string | null;
      htmlUrl: string;
    }>;
  };
}

export interface ScanHistoryItem {
  scanId: string;
  repository: string;
  url: string;
  branch: string;
  timestamp: string;
  overallScore: number;
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  fixesAvailableCount: number;
  isSyntheticTest?: boolean;
}

export interface AppSettings {
  aiProvider: 'gemini' | 'openai' | 'claude' | 'deterministic';
  hasGithubToken: boolean;
  hasGeminiKey: boolean;
  hasOpenaiKey: boolean;
  githubTokenPreview: string | null;
  scoringWeights: Record<FindingCategory, number>;
}
