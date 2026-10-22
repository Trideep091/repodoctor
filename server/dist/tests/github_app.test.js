import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { GitHubAppService } from '../services/githubApp.js';
import { updateSettings, getSettings } from '../config.js';
import { GitHubService } from '../services/github.js';
test('GitHub App Service: RS256 JWT Generation and Verification', () => {
    // Generate an ephemeral 2048-bit RSA keypair for testing
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const originalSettings = getSettings();
    try {
        // Configure ephemeral GitHub App credentials
        updateSettings({
            githubAppId: '1098765',
            githubAppPrivateKey: privateKey,
            githubAppPrivateKeyPath: '',
        });
        assert.equal(GitHubAppService.isConfigured(), true, 'GitHub App should be detected as configured');
        const jwt = GitHubAppService.generateAppJwt();
        assert.ok(jwt, 'JWT must be generated');
        const parts = jwt.split('.');
        assert.equal(parts.length, 3, 'JWT must contain header, payload, and signature');
        // Decode header and payload
        const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        assert.equal(header.alg, 'RS256');
        assert.equal(header.typ, 'JWT');
        assert.equal(payload.iss, '1098765');
        assert.ok(payload.exp > payload.iat, 'Expiration must be after issued-at');
        // Cryptographic signature verification using public key
        const verifier = crypto.createVerify('RSA-SHA256');
        verifier.update(`${parts[0]}.${parts[1]}`);
        verifier.end();
        const isValid = verifier.verify(publicKey, parts[2], 'base64url');
        assert.equal(isValid, true, 'RS256 JWT signature must be cryptographically valid');
    }
    finally {
        // Restore original settings
        updateSettings({
            githubAppId: originalSettings.githubAppId,
            githubAppPrivateKey: originalSettings.githubAppPrivateKey,
            githubAppPrivateKeyPath: originalSettings.githubAppPrivateKeyPath,
        });
    }
});
test('GitHub App Service: Reports unconfigured when credentials are empty', () => {
    const originalSettings = getSettings();
    try {
        updateSettings({
            githubAppId: '',
            githubAppPrivateKey: '',
            githubAppPrivateKeyPath: '',
        });
        delete process.env.GITHUB_APP_ID;
        delete process.env.GITHUB_APP_PRIVATE_KEY;
        delete process.env.GITHUB_APP_PRIVATE_KEY_PATH;
        assert.equal(GitHubAppService.isConfigured(), false);
        assert.throws(() => GitHubAppService.generateAppJwt(), /GitHub App authentication is not configured/);
    }
    finally {
        updateSettings({
            githubAppId: originalSettings.githubAppId,
            githubAppPrivateKey: originalSettings.githubAppPrivateKey,
            githubAppPrivateKeyPath: originalSettings.githubAppPrivateKeyPath,
        });
    }
});
test('GitHubService: Prioritizes GitHub App and falls back gracefully', async () => {
    const originalSettings = getSettings();
    try {
        // 1. Synthetic repo always bypasses real auth
        const synthToken = await GitHubService.resolveAuthToken('devf8rge', 'tk-s-challenge', undefined, true);
        assert.equal(synthToken, 'synthetic_token');
        // 2. Explicit token overrides everything
        const explicitToken = await GitHubService.resolveAuthToken('owner', 'repo', 'ghp_explicit_token_123');
        assert.equal(explicitToken, 'ghp_explicit_token_123');
        // 3. Fallback to PAT when App is not configured
        updateSettings({
            githubAppId: '',
            githubAppPrivateKey: '',
            githubToken: 'ghp_fallback_pat_998877',
        });
        const patToken = await GitHubService.resolveAuthToken('owner', 'repo');
        assert.equal(patToken, 'ghp_fallback_pat_998877');
        // 4. Clean error when neither App nor PAT is configured
        updateSettings({
            githubAppId: '',
            githubAppPrivateKey: '',
            githubToken: '',
        });
        delete process.env.GITHUB_TOKEN;
        delete process.env.GITHUB_APP_ID;
        delete process.env.GITHUB_APP_PRIVATE_KEY;
        await assert.rejects(async () => await GitHubService.resolveAuthToken('owner', 'repo'), /GitHub authorization required/);
    }
    finally {
        updateSettings(originalSettings);
    }
});
