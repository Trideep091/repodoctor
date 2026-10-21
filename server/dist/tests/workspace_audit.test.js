import test from 'node:test';
import assert from 'node:assert/strict';
import { GitHubService } from '../services/github.js';
import { AIRepairEngine } from '../repair/aiEngine.js';
import { detectProjectTechnologies } from '../services/projectDetector.js';
import { scanRepositoryHealth } from '../scanners/healthScanner.js';
test('Audit 1 & 2: License requires explicit maintainer decision; omitted by default', async () => {
    const isSynthetic = true;
    const owner = 'devf8rge';
    const repo = 'tk-s-challenge';
    const branch = 'main';
    const tree = await GitHubService.getTree(owner, repo, branch, isSynthetic);
    const project = detectProjectTechnologies(tree);
    const getFileContent = (p) => GitHubService.getFileContent(owner, repo, p, branch, isSynthetic);
    const findings = await scanRepositoryHealth(tree, project, owner, repo, branch, getFileContent);
    const licenseFinding = findings.find((f) => f.ruleId === 'COMM-001');
    assert.ok(licenseFinding, 'COMM-001 finding should exist');
    // By default without user license choice: must return null (NEVER automatically choose license)
    const patchNoChoice = await AIRepairEngine.generateRepair(licenseFinding, tree, project, owner, repo, getFileContent);
    assert.equal(patchNoChoice, null, 'Must NOT generate LICENSE without user approval');
    // When user explicitly selects MIT:
    const patchMit = await AIRepairEngine.generateRepair(licenseFinding, tree, project, owner, repo, getFileContent, { licenseChoice: 'MIT' });
    assert.ok(patchMit, 'Generates MIT license when explicitly approved');
    assert.ok(patchMit.proposedContent.includes('MIT License'));
    // When user explicitly selects Apache-2.0:
    const patchApache = await AIRepairEngine.generateRepair(licenseFinding, tree, project, owner, repo, getFileContent, { licenseChoice: 'Apache-2.0' });
    assert.ok(patchApache, 'Generates Apache license when explicitly approved');
    assert.ok(patchApache.proposedContent.includes('Apache License'));
});
test('Audit 3: README commands and tech details are verified against repository', async () => {
    const isSynthetic = true;
    const owner = 'devf8rge';
    const repo = 'tk-s-challenge';
    const branch = 'main';
    const tree = await GitHubService.getTree(owner, repo, branch, isSynthetic);
    const project = detectProjectTechnologies(tree);
    const getFileContent = (p) => GitHubService.getFileContent(owner, repo, p, branch, isSynthetic);
    const findings = await scanRepositoryHealth(tree, project, owner, repo, branch, getFileContent);
    const readmeFinding = findings.find((f) => f.ruleId === 'DOC-001');
    assert.ok(readmeFinding);
    const patch = await AIRepairEngine.generateRepair(readmeFinding, tree, project, owner, repo, getFileContent);
    assert.ok(patch);
    assert.ok(patch.proposedContent.includes('Node.js'), 'Must reflect detected Node.js ecosystem');
    assert.ok(patch.proposedContent.includes('npm install'), 'Must reflect detected package manager');
    assert.ok(patch.proposedContent.includes('git clone https://github.com/devf8rge/tk-s-challenge.git'));
});
test('Audit 5, 6, 7: Dedicated repair branch creation & token error when unauthenticated on real repo', async () => {
    // Real repo without token should throw clear authentication error
    await assert.rejects(async () => {
        await GitHubService.createRepairBranch('octocat', 'Hello-World', 'repo-doctor/health-fixes-test', 'master', false);
    }, (err) => {
        assert.ok(err.message.includes('GitHub authorization required') || err.message.includes('Personal Access Token'));
        return true;
    });
    // Real repo PR creation without token should throw clear authentication error
    await assert.rejects(async () => {
        await GitHubService.createPullRequest('octocat', 'Hello-World', 'repo-doctor/health-fixes-test', 'master', 'Test', 'Body', false);
    }, (err) => {
        assert.ok(err.message.includes('GitHub authorization required') || err.message.includes('Personal Access Token'));
        return true;
    });
});
