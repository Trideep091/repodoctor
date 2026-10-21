export async function scanRepositoryHealth(files, project, owner, repo, branch, getFileContent) {
    const findings = [];
    const paths = new Set(files.map((f) => f.path.toLowerCase()));
    const actualPaths = new Map(files.map((f) => [f.path.toLowerCase(), f.path]));
    const now = new Date().toISOString();
    const version = 'repo-doctor-health-1.0';
    // ==========================================
    // 1. DOCUMENTATION & ONBOARDING (README, etc.)
    // ==========================================
    const readmePath = files.find((f) => /^readme(\.(md|markdown|txt))?$/i.test(f.path))?.path;
    if (!readmePath) {
        findings.push({
            id: `health-doc-readme-missing`,
            repository: `${owner}/${repo}`,
            branch,
            category: 'documentation',
            ruleId: 'DOC-001',
            ruleTitle: 'Missing README.md Documentation',
            severity: 'high',
            confidence: 'high',
            filePath: 'README.md',
            description: 'The repository lacks a README.md file to onboard users and developers.',
            evidence: 'No file matching README or README.md was discovered in the repository tree.',
            recommendation: 'Add a structured README.md providing project description, installation instructions, usage examples, and architecture overview.',
            validationStatus: 'passed',
            resolutionStatus: 'fix_available',
            timestamp: now,
            scannerVersion: version,
        });
    }
    else {
        // Inspect README content
        const content = await getFileContent(readmePath);
        if (content) {
            if (content.length < 80) {
                findings.push({
                    id: `health-doc-readme-sparse`,
                    repository: `${owner}/${repo}`,
                    branch,
                    category: 'documentation',
                    ruleId: 'DOC-002',
                    ruleTitle: 'README.md Content Is Incomplete Or Sparse',
                    severity: 'medium',
                    confidence: 'high',
                    filePath: readmePath,
                    description: 'The README.md file contains very little content (< 80 characters) and fails to adequately explain the project.',
                    evidence: `README character count: ${content.length} characters. Preview: "${content.trim()}"`,
                    recommendation: 'Expand README.md with setup instructions, prerequisites, architecture summary, and commands.',
                    validationStatus: 'passed',
                    resolutionStatus: 'fix_available',
                    timestamp: now,
                    scannerVersion: version,
                });
            }
            // Check for placeholder keywords
            const placeholderRegex = /\b(TODO|FIXME|Lorem Ipsum|Insert your project here|Your App Name)\b/i;
            const match = placeholderRegex.exec(content);
            if (match) {
                findings.push({
                    id: `health-doc-readme-placeholder`,
                    repository: `${owner}/${repo}`,
                    branch,
                    category: 'documentation',
                    ruleId: 'DOC-003',
                    ruleTitle: 'README.md Contains Unfilled Template Placeholders',
                    severity: 'low',
                    confidence: 'high',
                    filePath: readmePath,
                    description: `README.md contains unresolved placeholder text: "${match[0]}".`,
                    evidence: `Matched placeholder text "${match[0]}" in documentation content.`,
                    recommendation: 'Replace boilerplate placeholders with authentic project information.',
                    validationStatus: 'passed',
                    resolutionStatus: 'fix_available',
                    timestamp: now,
                    scannerVersion: version,
                });
            }
        }
    }
    // CONTRIBUTING.md
    const contributingPath = files.find((f) => /^contributing(\.(md|markdown|txt))?$/i.test(f.path))?.path;
    if (!contributingPath) {
        findings.push({
            id: `health-doc-contributing-missing`,
            repository: `${owner}/${repo}`,
            branch,
            category: 'documentation',
            ruleId: 'DOC-004',
            ruleTitle: 'Missing CONTRIBUTING.md Guidelines',
            severity: 'low',
            confidence: 'high',
            filePath: 'CONTRIBUTING.md',
            description: 'The repository lacks contributor guidelines explaining how external contributors can submit PRs, run tests, and report bugs.',
            evidence: 'No CONTRIBUTING.md found in repository root or .github directory.',
            recommendation: 'Add CONTRIBUTING.md with PR guidelines, coding conventions, and local development setup.',
            validationStatus: 'passed',
            resolutionStatus: 'fix_available',
            timestamp: now,
            scannerVersion: version,
        });
    }
    // ==========================================
    // 2. COMMUNITY HEALTH (LICENSE, CODE_OF_CONDUCT, SECURITY, TEMPLATES)
    // ==========================================
    const licensePath = files.find((f) => /^license(\.(md|txt))?$/i.test(f.path))?.path;
    if (!licensePath) {
        findings.push({
            id: `health-comm-license-missing`,
            repository: `${owner}/${repo}`,
            branch,
            category: 'community',
            ruleId: 'COMM-001',
            ruleTitle: 'Missing Open-Source LICENSE File (Maintainer Decision Required)',
            severity: 'high',
            confidence: 'high',
            filePath: 'LICENSE',
            description: 'Without a clear LICENSE file, users cannot legally reuse, fork, or contribute to this code. Do not automatically select a license without maintainer approval.',
            evidence: 'No LICENSE or LICENSE.md found in the root directory.',
            recommendation: 'Maintainer approval required: explicitly select an open-source license (e.g. MIT, Apache-2.0, BSD-3-Clause, ISC) in the Repair Workspace before generating a LICENSE patch.',
            validationStatus: 'passed',
            resolutionStatus: 'open',
            timestamp: now,
            scannerVersion: version,
        });
    }
    const securityPath = files.find((f) => /^security(\.(md|txt))?$/i.test(f.path) ||
        /^\.github\/security(\.(md|txt))?$/i.test(f.path))?.path;
    if (!securityPath) {
        findings.push({
            id: `health-comm-security-missing`,
            repository: `${owner}/${repo}`,
            branch,
            category: 'community',
            ruleId: 'COMM-002',
            ruleTitle: 'Missing SECURITY.md Policy',
            severity: 'medium',
            confidence: 'high',
            filePath: 'SECURITY.md',
            description: 'No security policy exists to guide researchers and users on reporting discovered vulnerabilities safely.',
            evidence: 'SECURITY.md is missing from root and .github directory.',
            recommendation: 'Add a SECURITY.md explaining responsible disclosure contacts and supported versions.',
            validationStatus: 'passed',
            resolutionStatus: 'fix_available',
            timestamp: now,
            scannerVersion: version,
        });
    }
    const cocPath = files.find((f) => /^code_of_conduct(\.(md|txt))?$/i.test(f.path) ||
        /^\.github\/code_of_conduct(\.(md|txt))?$/i.test(f.path))?.path;
    if (!cocPath) {
        findings.push({
            id: `health-comm-coc-missing`,
            repository: `${owner}/${repo}`,
            branch,
            category: 'community',
            ruleId: 'COMM-003',
            ruleTitle: 'Missing Code of Conduct',
            severity: 'low',
            confidence: 'high',
            filePath: 'CODE_OF_CONDUCT.md',
            description: 'The repository does not have a formal Code of Conduct defining standards of respectful interaction for contributors.',
            evidence: 'CODE_OF_CONDUCT.md is absent.',
            recommendation: 'Adopt the Contributor Covenant Code of Conduct (v2.1) to foster an inclusive community.',
            validationStatus: 'passed',
            resolutionStatus: 'fix_available',
            timestamp: now,
            scannerVersion: version,
        });
    }
    // Issue & PR Templates
    const hasIssueTemplates = files.some((f) => f.path.startsWith('.github/ISSUE_TEMPLATE/'));
    if (!hasIssueTemplates) {
        findings.push({
            id: `health-comm-issue-template-missing`,
            repository: `${owner}/${repo}`,
            branch,
            category: 'community',
            ruleId: 'COMM-004',
            ruleTitle: 'Missing GitHub Issue Templates',
            severity: 'low',
            confidence: 'high',
            filePath: '.github/ISSUE_TEMPLATE/bug_report.md',
            description: 'Standard issue templates help users provide reproducible bug reports and feature requests.',
            evidence: 'Directory .github/ISSUE_TEMPLATE/ does not exist.',
            recommendation: 'Add GitHub issue templates for bug reports and feature requests.',
            validationStatus: 'passed',
            resolutionStatus: 'fix_available',
            timestamp: now,
            scannerVersion: version,
        });
    }
    // ==========================================
    // 3. PROJECT CONFIGURATION (.gitignore, lockfile, linter)
    // ==========================================
    const gitignorePath = files.find((f) => f.path === '.gitignore')?.path;
    if (!gitignorePath) {
        findings.push({
            id: `health-config-gitignore-missing`,
            repository: `${owner}/${repo}`,
            branch,
            category: 'build_ci',
            ruleId: 'CFG-001',
            ruleTitle: 'Missing .gitignore Configuration',
            severity: 'high',
            confidence: 'high',
            filePath: '.gitignore',
            description: 'Missing .gitignore risks accidental commits of sensitive environment files (.env), large binaries, or build artifacts.',
            evidence: 'No .gitignore file exists in repository root.',
            recommendation: `Generate a tailored .gitignore file for ${project.technologies.join(', ') || 'detected ecosystem'}.`,
            validationStatus: 'passed',
            resolutionStatus: 'fix_available',
            timestamp: now,
            scannerVersion: version,
        });
    }
    else {
        const gitignoreContent = await getFileContent(gitignorePath);
        if (gitignoreContent) {
            if (!gitignoreContent.includes('.env')) {
                findings.push({
                    id: `health-config-gitignore-no-env`,
                    repository: `${owner}/${repo}`,
                    branch,
                    category: 'build_ci',
                    ruleId: 'CFG-002',
                    ruleTitle: '.gitignore Does Not Exclude .env Secrets',
                    severity: 'high',
                    confidence: 'high',
                    filePath: '.gitignore',
                    description: '.gitignore does not explicitly ignore .env or .env.local, risking accidental credential leakage.',
                    evidence: '.gitignore exists but has no rule matching ".env*".',
                    recommendation: 'Add ".env", ".env.*", and "*.env" to .gitignore.',
                    validationStatus: 'passed',
                    resolutionStatus: 'fix_available',
                    timestamp: now,
                    scannerVersion: version,
                });
            }
        }
    }
    // Lockfile check
    if (project.ecosystem === 'node' && !paths.has('package-lock.json') && !paths.has('yarn.lock') && !paths.has('pnpm-lock.yaml')) {
        findings.push({
            id: `health-config-lockfile-missing`,
            repository: `${owner}/${repo}`,
            branch,
            category: 'build_ci',
            ruleId: 'CFG-003',
            ruleTitle: 'Missing Dependency Lockfile',
            severity: 'medium',
            confidence: 'high',
            filePath: 'package-lock.json',
            description: 'Repository defines package.json dependencies but lacks a lockfile, leading to non-deterministic builds and security drifts.',
            evidence: 'Neither package-lock.json, yarn.lock, nor pnpm-lock.yaml were found.',
            recommendation: 'Run "npm install" or "yarn" locally to generate and commit an authoritative lockfile.',
            validationStatus: 'passed',
            resolutionStatus: 'open',
            timestamp: now,
            scannerVersion: version,
        });
    }
    // ==========================================
    // 4. CI & MAINTAINABILITY (.github/workflows)
    // ==========================================
    const workflowFiles = files.filter((f) => f.path.startsWith('.github/workflows/') && (f.path.endsWith('.yml') || f.path.endsWith('.yaml')));
    if (workflowFiles.length === 0) {
        findings.push({
            id: `health-ci-workflow-missing`,
            repository: `${owner}/${repo}`,
            branch,
            category: 'build_ci',
            ruleId: 'CI-001',
            ruleTitle: 'Missing Automated CI Workflow',
            severity: 'high',
            confidence: 'high',
            filePath: '.github/workflows/ci.yml',
            description: 'The repository does not have automated GitHub Actions Continuous Integration (CI) to build and test code on pull requests.',
            evidence: 'Directory .github/workflows contains no workflow definitions.',
            recommendation: `Add a GitHub Actions CI workflow customized for ${project.technologies.join(', ') || 'the project'}.`,
            validationStatus: 'passed',
            resolutionStatus: 'fix_available',
            timestamp: now,
            scannerVersion: version,
        });
    }
    return findings;
}
