import levenshtein from 'fast-levenshtein';
// Top popular packages commonly targeted by typosquatting / look-alike campaigns
const POPULAR_PACKAGES = [
    'cross-env',
    'lodash',
    'lodash-es',
    'express',
    'react',
    'react-dom',
    'axios',
    'chalk',
    'moment',
    'request',
    'colors',
    'typescript',
    'webpack',
    'babel-core',
    'eslint',
    'dotenv',
    'uuid',
    'commander',
    'debug',
    'async',
];
const SUSPICIOUS_SCRIPT_PATTERNS = [
    {
        name: 'Remote Shell Download & Execution',
        regex: /\b(curl|wget)\s+.*\|.*(sh|bash|zsh)/i,
        severity: 'critical',
        description: 'Attempts to download a remote script and immediately pipe it into a shell execution environment.',
    },
    {
        name: 'Suspicious Network Call in Lifecycle Hook',
        regex: /\b(curl|wget|fetch|http:\/\/|https:\/\/)\b/i,
        severity: 'high',
        description: 'Lifecycle script triggers unverified network calls during npm install, risking data exfiltration.',
    },
    {
        name: 'Obfuscated Base64 or Eval Invocation',
        regex: /\b(eval\(|Buffer\.from\(.*base64|atob\(|child_process|exec\()/i,
        severity: 'critical',
        description: 'Suspicious dynamic command execution or obfuscated base64 payload detected in installation script.',
    },
];
export async function scanDependencies(files, owner, repo, branch, getFileContent) {
    const findings = [];
    const now = new Date().toISOString();
    const version = 'repo-doctor-supplychain-1.0';
    // Find all package.json files
    const packageJsonFiles = files.filter((f) => f.path.endsWith('package.json') && !f.path.includes('node_modules'));
    for (const pkgFile of packageJsonFiles) {
        const rawContent = await getFileContent(pkgFile.path);
        if (!rawContent)
            continue;
        let parsed;
        try {
            parsed = JSON.parse(rawContent);
        }
        catch {
            findings.push({
                id: `dep-parse-error-${pkgFile.path.replace(/[^a-zA-Z0-9]/g, '_')}`,
                repository: `${owner}/${repo}`,
                branch,
                category: 'supply_chain',
                ruleId: 'DEP-000',
                ruleTitle: 'Invalid Malformed package.json Manifest',
                severity: 'high',
                confidence: 'high',
                filePath: pkgFile.path,
                description: 'Failed to parse package.json as valid JSON syntax.',
                evidence: 'JSON parser threw syntax error while evaluating manifest file.',
                recommendation: 'Fix JSON syntax errors in package.json.',
                validationStatus: 'failed',
                resolutionStatus: 'open',
                timestamp: now,
                scannerVersion: version,
            });
            continue;
        }
        // ========================================================
        // 1. LIFECYCLE SCRIPTS (postinstall, preinstall, install)
        // ========================================================
        const scripts = parsed.scripts || {};
        const dangerousHooks = ['preinstall', 'install', 'postinstall'];
        for (const hook of dangerousHooks) {
            if (scripts[hook]) {
                const scriptCmd = String(scripts[hook]);
                // Evaluate against suspicious patterns
                let matchedPattern;
                for (const pattern of SUSPICIOUS_SCRIPT_PATTERNS) {
                    if (pattern.regex.test(scriptCmd)) {
                        matchedPattern = pattern;
                        break;
                    }
                }
                if (matchedPattern) {
                    findings.push({
                        id: `dep-script-${hook}-${pkgFile.path.replace(/[^a-zA-Z0-9]/g, '_')}`,
                        repository: `${owner}/${repo}`,
                        branch,
                        category: 'supply_chain',
                        ruleId: 'DEP-001',
                        ruleTitle: `Suspicious ${hook} Lifecycle Script`,
                        severity: matchedPattern.severity,
                        confidence: 'high',
                        filePath: pkgFile.path,
                        description: `Lifecycle hook "${hook}" executes suspicious command: ${matchedPattern.description}`,
                        evidence: `"${hook}": "${scriptCmd}"`,
                        recommendation: `Inspect this lifecycle script carefully. Consider running with --ignore-scripts or replacing remote payload with audited local logic.`,
                        proposedPatch: {
                            action: 'modify',
                            originalContent: `"${hook}": "${scriptCmd}"`,
                            proposedContent: `// Removed suspicious ${hook} command`,
                            diffUnified: `--- a/${pkgFile.path}\n+++ b/${pkgFile.path}\n-    "${hook}": "${scriptCmd}"\n`,
                            summary: `Remove risky ${hook} script from ${pkgFile.path}`,
                        },
                        validationStatus: 'passed',
                        resolutionStatus: 'fix_available',
                        timestamp: now,
                        scannerVersion: version,
                    });
                }
                else {
                    // General informational warning on lifecycle scripts
                    findings.push({
                        id: `dep-hook-notice-${hook}-${pkgFile.path.replace(/[^a-zA-Z0-9]/g, '_')}`,
                        repository: `${owner}/${repo}`,
                        branch,
                        category: 'supply_chain',
                        ruleId: 'DEP-002',
                        ruleTitle: `Presence of ${hook} Lifecycle Script`,
                        severity: 'low',
                        confidence: 'medium',
                        filePath: pkgFile.path,
                        description: `Package contains an active "${hook}" lifecycle hook. While common, lifecycle scripts run with full system privileges upon "npm install".`,
                        evidence: `"${hook}": "${scriptCmd}"`,
                        recommendation: 'Verify the integrity of this script and confirm that execution during installation is strictly required.',
                        validationStatus: 'passed',
                        resolutionStatus: 'open',
                        timestamp: now,
                        scannerVersion: version,
                    });
                }
            }
        }
        // ========================================================
        // 2. LOOK-ALIKE & TYPOSQUATTING DEPENDENCY DETECTION
        // ========================================================
        const allDeps = {
            ...(parsed.dependencies || {}),
            ...(parsed.devDependencies || {}),
        };
        for (const [depName, versionSpec] of Object.entries(allDeps)) {
            // Check distance against popular packages
            for (const popular of POPULAR_PACKAGES) {
                if (depName === popular)
                    continue; // Exact legitimate match
                const dist = levenshtein.get(depName, popular);
                // Flag if name is very close (e.g. cross-envv vs cross-env, dist=1)
                // or typosquatting pattern (e.g. lodas-es vs lodash-es, dist=1)
                if (dist === 1 || (dist === 2 && depName.length > 6)) {
                    findings.push({
                        id: `dep-typosquat-${depName}-${pkgFile.path.replace(/[^a-zA-Z0-9]/g, '_')}`,
                        repository: `${owner}/${repo}`,
                        branch,
                        category: 'supply_chain',
                        ruleId: 'DEP-003',
                        ruleTitle: `Potential Typosquatting / Look-alike Package: "${depName}"`,
                        severity: 'high',
                        confidence: 'high',
                        filePath: pkgFile.path,
                        description: `Dependency "${depName}" closely resembles canonical popular package "${popular}" (Levenshtein distance: ${dist}). This is a classic indicator of supply-chain impersonation.`,
                        evidence: `Declared dependency "${depName}": "${versionSpec}" resembles authentic package "${popular}".`,
                        recommendation: `Verify whether "${popular}" was intended instead of "${depName}". If this was a typo, replace it with the legitimate package "${popular}".`,
                        proposedPatch: {
                            action: 'modify',
                            originalContent: `"${depName}": "${versionSpec}"`,
                            proposedContent: `"${popular}": "${versionSpec}"`,
                            diffUnified: `--- a/${pkgFile.path}\n+++ b/${pkgFile.path}\n-    "${depName}": "${versionSpec}",\n+    "${popular}": "${versionSpec}",`,
                            summary: `Replace suspected typosquat "${depName}" with legitimate package "${popular}"`,
                        },
                        validationStatus: 'passed',
                        resolutionStatus: 'fix_available',
                        timestamp: now,
                        scannerVersion: version,
                    });
                }
            }
            // Check for unpinned wildcard versions like "*" or "latest"
            if (versionSpec === '*' || versionSpec === 'latest') {
                findings.push({
                    id: `dep-wildcard-${depName}-${pkgFile.path.replace(/[^a-zA-Z0-9]/g, '_')}`,
                    repository: `${owner}/${repo}`,
                    branch,
                    category: 'supply_chain',
                    ruleId: 'DEP-004',
                    ruleTitle: `Unpinned Wildcard Dependency Version: "${depName}"`,
                    severity: 'medium',
                    confidence: 'high',
                    filePath: pkgFile.path,
                    description: `Dependency "${depName}" uses wildcard version "${versionSpec}", exposing builds to breaking upstream changes or compromised future releases.`,
                    evidence: `"${depName}": "${versionSpec}"`,
                    recommendation: 'Pin dependency to a specific semantic version range (e.g., ^1.2.3).',
                    validationStatus: 'passed',
                    resolutionStatus: 'open',
                    timestamp: now,
                    scannerVersion: version,
                });
            }
        }
    }
    return findings;
}
