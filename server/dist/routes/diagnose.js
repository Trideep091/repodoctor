import { Router } from 'express';
import { parseAndValidateGithubUrl } from '../services/urlParser.js';
import { GitHubService } from '../services/github.js';
import { GitHubAppService } from '../services/githubApp.js';
import { getSettings } from '../config.js';
import { detectProjectTechnologies } from '../services/projectDetector.js';
import { scanRepositoryHealth } from '../scanners/healthScanner.js';
import { scanSecrets } from '../scanners/secretScanner.js';
import { scanDependencies } from '../scanners/dependencyScanner.js';
import { scanAccessibility } from '../scanners/accessibilityScanner.js';
import { calculateTransparentScores } from '../scoring/scoreCalculator.js';
import { storage } from '../services/storage.js';
export const diagnoseRouter = Router();
diagnoseRouter.post('/diagnose', async (req, res) => {
    const startTime = Date.now();
    const { url: rawUrl, branch: requestedBranch } = req.body;
    if (!rawUrl) {
        res.status(400).json({ error: 'Repository URL is required.' });
        return;
    }
    // 1. URL validation & SSRF protection
    const parsed = parseAndValidateGithubUrl(rawUrl);
    if (!parsed.isValid) {
        res.status(400).json({ error: parsed.error || 'Invalid GitHub repository URL.' });
        return;
    }
    try {
        const { owner, repo, isSynthetic } = parsed;
        // Resolve authentication token if available:
        // 1. If GitHub App is configured and installed on this specific repo, use its installation access token.
        // 2. Otherwise fall back to user-configured PAT (if present).
        // 3. Otherwise remain undefined to perform unauthenticated read-only scanning on public repositories.
        let effectiveToken;
        if (!isSynthetic && GitHubAppService.isConfigured()) {
            try {
                const appAuth = await GitHubAppService.getInstallationAccessToken(owner, repo);
                effectiveToken = appAuth.token;
            }
            catch {
                // App is not installed for this repository; public repo read-only scan proceeds without app token
            }
        }
        if (!effectiveToken && !isSynthetic) {
            const settings = getSettings();
            const pat = settings.githubToken || process.env.GITHUB_TOKEN;
            if (pat && pat.trim()) {
                effectiveToken = pat.trim();
            }
        }
        // 2. Fetch repository metadata and available branches
        const repoMeta = await GitHubService.getRepository(owner, repo, isSynthetic, effectiveToken);
        const availableBranches = await GitHubService.getBranches(owner, repo, isSynthetic, effectiveToken);
        const selectedBranch = requestedBranch || parsed.branch || repoMeta.defaultBranch;
        // 3. Fetch file tree
        const tree = await GitHubService.getTree(owner, repo, selectedBranch, isSynthetic, effectiveToken);
        // File content fetcher helper with caching
        const contentCache = new Map();
        const getFileContent = async (filePath) => {
            if (contentCache.has(filePath)) {
                return contentCache.get(filePath);
            }
            const content = await GitHubService.getFileContent(owner, repo, filePath, selectedBranch, isSynthetic, effectiveToken);
            contentCache.set(filePath, content);
            return content;
        };
        // 4. Project ecosystem detection
        const projectAnalysis = detectProjectTechnologies(tree);
        // 5. Run scanners concurrently
        const [healthFindings, secretFindings, depFindings, a11yFindings] = await Promise.all([
            scanRepositoryHealth(tree, projectAnalysis, owner, repo, selectedBranch, getFileContent),
            scanSecrets(tree, owner, repo, selectedBranch, getFileContent),
            scanDependencies(tree, owner, repo, selectedBranch, getFileContent),
            scanAccessibility(tree, owner, repo, selectedBranch, getFileContent),
        ]);
        // Aggregate findings and deduplicate by unique rule, file, and line evidence
        const rawFindings = [
            ...healthFindings,
            ...secretFindings,
            ...depFindings,
            ...a11yFindings,
        ];
        const seenKeys = new Set();
        const allFindings = [];
        for (const f of rawFindings) {
            if (!f.ruleId || !f.filePath)
                continue;
            const key = `${f.ruleId}::${f.filePath}::${f.lineNumber || 0}::${(f.evidence || '').trim().slice(0, 60)}`;
            if (!seenKeys.has(key)) {
                seenKeys.add(key);
                allFindings.push(f);
            }
        }
        // 6. Transparent health scoring
        const { overallScore, categoryScores } = calculateTransparentScores(allFindings);
        // 7. Calculate summary counts
        const criticalFindings = allFindings.filter((f) => f.severity === 'critical').length;
        const highFindings = allFindings.filter((f) => f.severity === 'high').length;
        const mediumFindings = allFindings.filter((f) => f.severity === 'medium').length;
        const lowFindings = allFindings.filter((f) => f.severity === 'low').length;
        const infoFindings = allFindings.filter((f) => f.severity === 'info').length;
        const fixesAvailableCount = allFindings.filter((f) => f.resolutionStatus === 'fix_available').length;
        const scanId = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const durationMs = Date.now() - startTime;
        const report = {
            scanId,
            repository: {
                url: parsed.normalizedUrl,
                owner: repoMeta.owner,
                name: repoMeta.name,
                fullName: repoMeta.fullName,
                defaultBranch: repoMeta.defaultBranch,
                selectedBranch,
                isPrivate: repoMeta.isPrivate,
                description: repoMeta.description,
                stars: repoMeta.stars,
                forks: repoMeta.forks,
                openIssues: repoMeta.openIssues,
                language: repoMeta.language,
                detectedTech: projectAnalysis.technologies,
                availableBranches,
            },
            timestamp: new Date().toISOString(),
            durationMs,
            overallScore,
            categoryScores,
            summary: {
                totalFindings: allFindings.length,
                criticalFindings,
                highFindings,
                mediumFindings,
                lowFindings,
                infoFindings,
                fixesAvailableCount,
            },
            findings: allFindings,
            scannerCoverage: {
                scannedFilesCount: tree.filter((f) => f.type === 'blob').length,
                totalFilesCount: tree.length,
                scannersRun: [
                    'Documentation & Onboarding Scanner',
                    'Community Health & Licensing Scanner',
                    'CI/CD & Configuration Scanner',
                    'High-Entropy Secret Detection Engine',
                    'Supply-Chain & Typosquatting Analyzer',
                    'WCAG 2.1 Accessibility Auditor',
                ],
                limitations: isSynthetic
                    ? ['Scanned using synthetic TK-S benchmark environment with seeded challenge issues.']
                    : [],
            },
            isSyntheticTest: isSynthetic,
        };
        // Save report
        storage.saveReport(report);
        res.json(report);
    }
    catch (err) {
        console.error(`Diagnosis error for "${rawUrl}":`, err.message || err);
        const statusCode = err.statusCode && typeof err.statusCode === 'number' ? err.statusCode : 500;
        res.status(statusCode).json({
            error: err.message || 'An unexpected error occurred during repository diagnosis.',
            code: err.code || 'DIAGNOSIS_ERROR',
        });
    }
});
