import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAndValidateGithubUrl } from '../services/urlParser.js';
import { app } from '../app.js';
import http from 'node:http';
test('URL Parser: Normalizes .git suffix, shorthand, and trailing slashes', () => {
    // Standard GitHub URL
    const p1 = parseAndValidateGithubUrl('https://github.com/octocat/Hello-World');
    assert.equal(p1.isValid, true);
    assert.equal(p1.owner, 'octocat');
    assert.equal(p1.repo, 'Hello-World');
    assert.equal(p1.normalizedUrl, 'https://github.com/octocat/Hello-World');
    // URL with .git suffix (lowercase)
    const p2 = parseAndValidateGithubUrl('https://github.com/octocat/Hello-World.git');
    assert.equal(p2.isValid, true);
    assert.equal(p2.owner, 'octocat');
    assert.equal(p2.repo, 'Hello-World');
    assert.equal(p2.normalizedUrl, 'https://github.com/octocat/Hello-World');
    // URL with .GIT suffix (uppercase)
    const p3 = parseAndValidateGithubUrl('https://github.com/octocat/Hello-World.GIT');
    assert.equal(p3.isValid, true);
    assert.equal(p3.owner, 'octocat');
    assert.equal(p3.repo, 'Hello-World');
    // Shorthand with trailing slash and .git
    const p4 = parseAndValidateGithubUrl('octocat/Hello-World.git/');
    assert.equal(p4.isValid, true);
    assert.equal(p4.owner, 'octocat');
    assert.equal(p4.repo, 'Hello-World');
    // Shorthand owner/repo/
    const p5 = parseAndValidateGithubUrl('octocat/Hello-World/');
    assert.equal(p5.isValid, true);
    assert.equal(p5.owner, 'octocat');
    assert.equal(p5.repo, 'Hello-World');
    // Branch path with .git prefix in repo
    const p6 = parseAndValidateGithubUrl('https://github.com/octocat/Hello-World.git/tree/master');
    assert.equal(p6.isValid, true);
    assert.equal(p6.owner, 'octocat');
    assert.equal(p6.repo, 'Hello-World');
    assert.equal(p6.branch, 'master');
    // Host without https protocol
    const p7 = parseAndValidateGithubUrl('github.com/octocat/Hello-World.git');
    assert.equal(p7.isValid, true);
    assert.equal(p7.owner, 'octocat');
    assert.equal(p7.repo, 'Hello-World');
    // Empty or invalid repo
    const p8 = parseAndValidateGithubUrl('https://github.com/octocat/.git');
    assert.equal(p8.isValid, false);
});
test('Express App: Responds with API_ROUTE_NOT_FOUND JSON for missing routes', async () => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = address.port;
    try {
        // 1. Missing route should return 404 JSON with code API_ROUTE_NOT_FOUND
        const res = await fetch(`http://localhost:${port}/api/nonexistent-route-xyz`);
        assert.equal(res.status, 404);
        const json = (await res.json());
        assert.equal(json.code, 'API_ROUTE_NOT_FOUND');
        // 2. Health route mounted at /api/health returns 200 OK
        const healthApiRes = await fetch(`http://localhost:${port}/api/health`);
        assert.equal(healthApiRes.status, 200);
        const healthJson = (await healthApiRes.json());
        assert.equal(healthJson.status, 'ok');
        // 3. Health route mounted at /health also returns 200 OK
        const healthRes = await fetch(`http://localhost:${port}/health`);
        assert.equal(healthRes.status, 200);
        // 4. Test real scan on public repository (octocat/Hello-World)
        const scanRes = await fetch(`http://localhost:${port}/api/diagnose`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: 'https://github.com/octocat/Hello-World.git' }),
        });
        assert.equal(scanRes.status, 200);
        const scanJson = (await scanRes.json());
        assert.equal(scanJson.repository.fullName, 'octocat/Hello-World');
        assert.equal(scanJson.repository.owner, 'octocat');
        assert.equal(scanJson.repository.name, 'Hello-World');
        assert.equal(typeof scanJson.overallScore, 'number');
        assert(scanJson.scannerCoverage.totalFilesCount >= 1);
    }
    finally {
        server.close();
    }
});
