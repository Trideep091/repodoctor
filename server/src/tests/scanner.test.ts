import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAndValidateGithubUrl } from '../services/urlParser.js';
import { GitHubService } from '../services/github.js';
import { detectProjectTechnologies } from '../services/projectDetector.js';
import { scanRepositoryHealth } from '../scanners/healthScanner.js';
import { scanSecrets, redactSecret } from '../scanners/secretScanner.js';
import { scanDependencies } from '../scanners/dependencyScanner.js';
import { scanAccessibility } from '../scanners/accessibilityScanner.js';
import { calculateTransparentScores } from '../scoring/scoreCalculator.js';
import { AIRepairEngine } from '../repair/aiEngine.js';

test('URL Parser validates GitHub URLs and protects against SSRF', () => {
  // Valid URLs with normalization
  const valid1 = parseAndValidateGithubUrl('https://github.com/facebook/react');
  assert.equal(valid1.isValid, true);
  assert.equal(valid1.owner, 'facebook');
  assert.equal(valid1.repo, 'react');

  // .git suffix removal
  const withGit = parseAndValidateGithubUrl('https://github.com/trideep026/stock-photo.git');
  assert.equal(withGit.isValid, true);
  assert.equal(withGit.owner, 'trideep026');
  assert.equal(withGit.repo, 'stock-photo');
  assert.equal(withGit.normalizedUrl, 'https://github.com/trideep026/stock-photo');

  // Trailing slash and query parameters
  const withTrailingSlash = parseAndValidateGithubUrl('https://github.com/trideep026/stock-photo/?tab=readme-ov-file#section');
  assert.equal(withTrailingSlash.isValid, true);
  assert.equal(withTrailingSlash.owner, 'trideep026');
  assert.equal(withTrailingSlash.repo, 'stock-photo');

  // SSH git clone format
  const sshUrl = parseAndValidateGithubUrl('git@github.com:trideep026/stock-photo.git');
  assert.equal(sshUrl.isValid, true);
  assert.equal(sshUrl.owner, 'trideep026');
  assert.equal(sshUrl.repo, 'stock-photo');

  // Shorthand owner/repo notation
  const shorthand = parseAndValidateGithubUrl('trideep026/stock-photo');
  assert.equal(shorthand.isValid, true);
  assert.equal(shorthand.owner, 'trideep026');
  assert.equal(shorthand.repo, 'stock-photo');

  // SSRF Protection: localhost & private IPs
  const ssrf1 = parseAndValidateGithubUrl('http://localhost:8080/admin');
  assert.equal(ssrf1.isValid, false);

  const ssrf2 = parseAndValidateGithubUrl('http://169.254.169.254/latest/meta-data');
  assert.equal(ssrf2.isValid, false);

  // Synthetic test URL
  const synth = parseAndValidateGithubUrl('synthetic://devf8rge/tk-s-repo');
  assert.equal(synth.isValid, true);
  assert.equal(synth.isSynthetic, true);
});

test('Secret Scanner redacts detected credentials safely', () => {
  const fakeToken = 'ghp_1234567890abcdef1234567890abcdef1234';
  const redacted = redactSecret(fakeToken);
  assert.equal(redacted.startsWith('ghp_'), true);
  assert.equal(redacted.endsWith('1234'), true);
  assert.equal(redacted.includes('***'), true);
  assert.equal(redacted.includes('abcdef'), false);
});

test('End-to-End Synthetic TK-S Hackathon Benchmark Diagnosis', async () => {
  const isSynthetic = true;
  const owner = 'devf8rge';
  const repo = 'tk-s-challenge';
  const branch = 'main';

  // 1. Fetch metadata and tree
  const metadata = await GitHubService.getRepository(owner, repo, isSynthetic);
  assert.equal(metadata.name, 'tk-s-challenge');

  const tree = await GitHubService.getTree(owner, repo, branch, isSynthetic);
  assert.ok(tree.length > 0, 'Tree should contain benchmark files');

  const getFileContent = async (path: string) => {
    return await GitHubService.getFileContent(owner, repo, path, branch, isSynthetic);
  };

  const projectAnalysis = detectProjectTechnologies(tree);
  assert.equal(projectAnalysis.ecosystem, 'node');

  // 2. Run Health Scanner
  const healthFindings = await scanRepositoryHealth(tree, projectAnalysis, owner, repo, branch, getFileContent);
  assert.ok(healthFindings.some((f) => f.ruleId === 'DOC-001'), 'Must flag missing README');
  assert.ok(healthFindings.some((f) => f.ruleId === 'COMM-001'), 'Must flag missing LICENSE');
  assert.ok(healthFindings.some((f) => f.ruleId === 'CI-001'), 'Must flag missing CI workflow');

  // 3. Run Secret Scanner
  const secretFindings = await scanSecrets(tree, owner, repo, branch, getFileContent);
  assert.ok(secretFindings.some((f) => f.ruleId === 'SEC-001'), 'Must detect seeded AWS key');
  assert.ok(secretFindings.some((f) => f.ruleId === 'SEC-003'), 'Must detect seeded GitHub PAT');
  assert.ok(secretFindings.some((f) => f.ruleId === 'SEC-004'), 'Must detect seeded OpenAI key');
  assert.ok(secretFindings.some((f) => f.ruleId === 'SEC-005'), 'Must detect seeded Stripe secret key');
  assert.ok(secretFindings.some((f) => f.ruleId === 'SEC-006'), 'Must detect seeded Slack webhook');

  // 4. Run Supply-Chain Scanner
  const depFindings = await scanDependencies(tree, owner, repo, branch, getFileContent);
  assert.ok(
    depFindings.some((f) => f.ruleId === 'DEP-003' && f.evidence.includes('cross-envv')),
    'Must flag typosquatting look-alike package cross-envv'
  );
  assert.ok(
    depFindings.some((f) => f.ruleId === 'DEP-001'),
    'Must flag suspicious postinstall lifecycle script'
  );

  // 5. Run Accessibility Scanner
  const a11yFindings = await scanAccessibility(tree, owner, repo, branch, getFileContent);
  assert.ok(
    a11yFindings.some((f) => f.ruleId === 'A11Y-001'),
    'Must detect seeded low color contrast'
  );
  assert.ok(
    a11yFindings.some((f) => f.ruleId === 'A11Y-002'),
    'Must detect missing form input labels'
  );
  assert.ok(
    a11yFindings.some((f) => f.ruleId === 'A11Y-003'),
    'Must detect icon buttons missing aria-label'
  );

  // 6. Test Scoring
  const allFindings = [...healthFindings, ...secretFindings, ...depFindings, ...a11yFindings];
  const { overallScore, categoryScores } = calculateTransparentScores(allFindings);

  assert.ok(overallScore < 70, 'Unrepaired seeded repository should score under 70');
  assert.ok(categoryScores.security_secrets.score < 50, 'Security score should be penalized for secrets');

  // 7. Test AI Repair Engine
  const readmeFinding = healthFindings.find((f) => f.ruleId === 'DOC-001');
  assert.ok(readmeFinding);
  const patch = await AIRepairEngine.generateRepair(readmeFinding, tree, projectAnalysis, owner, repo, getFileContent);
  assert.ok(patch, 'Patch should be generated');
  assert.equal(patch.filePath, 'README.md');
  assert.ok(patch.proposedContent.includes('Getting Started'));
  assert.ok(patch.diffUnified.includes('+'));
});
