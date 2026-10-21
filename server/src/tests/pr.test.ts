import test from 'node:test';
import assert from 'node:assert/strict';
import { GitHubService } from '../services/github.js';
import { storage } from '../services/storage.js';
import { DiagnosisReport, Finding } from '../types/index.js';
import { calculateTransparentScores } from '../scoring/scoreCalculator.js';

test('Option A: Dedicated repair branch and Pull Request creation flow', async () => {
  const isSynthetic = true;
  const owner = 'devf8rge';
  const repo = 'tk-s-challenge';
  const baseBranch = 'main';

  // 1. Create dedicated repair branch
  const repairBranchName = `repo-doctor/health-fixes-test1`;
  const branchRef = await GitHubService.createRepairBranch(owner, repo, repairBranchName, baseBranch, isSynthetic);
  assert.equal(branchRef, `refs/heads/${repairBranchName}`);

  // 2. Commit approved patches
  const filesToCommit = [
    {
      path: 'README.md',
      content: '# Repo Doctor Fixed README\nAll documentation updated.',
    },
    {
      path: 'LICENSE',
      content: 'MIT License\nCopyright 2026 devf8rge',
    },
  ];

  const commitSha = await GitHubService.commitFiles(
    owner,
    repo,
    repairBranchName,
    filesToCommit,
    'feat: add documentation and license',
    isSynthetic
  );
  assert.ok(commitSha.length > 0);

  // 3. Create Pull Request
  const prResult = await GitHubService.createPullRequest(
    owner,
    repo,
    repairBranchName,
    baseBranch,
    '[Repo Doctor] Health Fixes',
    'Automated repairs for Devf8rge Hackathon',
    isSynthetic
  );
  assert.ok(prResult.prUrl.includes('github.com/devf8rge/tk-s-challenge/pull/'));
  assert.ok(prResult.prNumber > 0);

  // 4. Verify PR status
  const prStatus = await GitHubService.getPullRequestStatus(owner, repo, prResult.prNumber, isSynthetic);
  assert.equal(prStatus.isMerged, true);

  // 5. Check CI Status
  const ciStatus = await GitHubService.getWorkflowRuns(owner, repo, repairBranchName, isSynthetic);
  assert.equal(ciStatus.state, 'success');
});
