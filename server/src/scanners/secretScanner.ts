import { Finding, RepositoryFile } from '../types/index.js';

interface SecretRule {
  ruleId: string;
  ruleTitle: string;
  category: 'AWS' | 'GitHub' | 'OpenAI' | 'Slack' | 'Stripe' | 'PrivateKey' | 'Database' | 'GenericSecret';
  regex: RegExp;
  severity: 'critical' | 'high';
  confidence: 'high' | 'medium';
  description: string;
  recommendation: string;
}

export const SECRET_RULES: SecretRule[] = [
  {
    ruleId: 'SEC-001',
    ruleTitle: 'Exposed AWS Access Key ID',
    category: 'AWS',
    regex: /\b(AKIA[0-9A-Z]{16})\b/g,
    severity: 'critical',
    confidence: 'high',
    description: 'Found an active-format AWS Access Key ID hardcoded in repository files.',
    recommendation: 'Immediately revoke this key in the AWS IAM Console, rotate credentials, and inject via environment variables.',
  },
  {
    ruleId: 'SEC-002',
    ruleTitle: 'Exposed AWS Secret Access Key Pattern',
    category: 'AWS',
    regex: /(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY)\s*[:=]\s*['"]?([A-Za-z0-9\/+=]{40})['"]?/g,
    severity: 'critical',
    confidence: 'high',
    description: 'Found an AWS Secret Access Key assigned directly in source code.',
    recommendation: 'Rotate the AWS IAM credential immediately and migrate secret storage to AWS Secrets Manager or environment variables.',
  },
  {
    ruleId: 'SEC-003',
    ruleTitle: 'Exposed GitHub Personal Access Token',
    category: 'GitHub',
    regex: /\b(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82})\b/g,
    severity: 'critical',
    confidence: 'high',
    description: 'Found a raw GitHub Personal Access Token (PAT). This can grant full account or repository write access.',
    recommendation: 'Revoke the token immediately at https://github.com/settings/tokens, inspect GitHub audit logs, and use GitHub Actions secrets instead.',
  },
  {
    ruleId: 'SEC-004',
    ruleTitle: 'Exposed OpenAI / LLM API Key',
    category: 'OpenAI',
    regex: /\b(sk-[a-zA-Z0-9_-]{32,64}|sk-proj-[a-zA-Z0-9_-]{40,90})\b/g,
    severity: 'critical',
    confidence: 'high',
    description: 'Found an OpenAI API Secret Key committed in the repository.',
    recommendation: 'Rotate the API key in OpenAI Platform console and store in a secure `.env` file that is ignored by Git.',
  },
  {
    ruleId: 'SEC-005',
    ruleTitle: 'Exposed Stripe API Secret Key',
    category: 'Stripe',
    regex: /\b(sk_(?:live|test)_[0-9a-zA-Z_-]{20,50})\b/g,
    severity: 'critical',
    confidence: 'high',
    description: 'Found an exposed Stripe API secret key (live or test key) committed in the repository.',
    recommendation: 'Rotate the API key in the Stripe Dashboard immediately and replace with environment variables.',
  },
  {
    ruleId: 'SEC-006',
    ruleTitle: 'Exposed Slack Incoming Webhook URL',
    category: 'Slack',
    regex: /(https:\/\/hooks\.slack\.com\/services\/T[0-9A-Z_]+\/B[0-9A-Z_]+\/[0-9A-Za-z_-]+)/g,
    severity: 'high',
    confidence: 'high',
    description: 'Found an unauthenticated Slack Incoming Webhook URL allowing anyone to post messages to your workspace.',
    recommendation: 'Deactivate the webhook URL in Slack App settings and re-issue through environment variables.',
  },
  {
    ruleId: 'SEC-007',
    ruleTitle: 'Exposed Private Cryptographic Key',
    category: 'PrivateKey',
    regex: /-----BEGIN\s+(RSA|OPENSSH|DSA|EC|PGP|PRIVATE)\s+KEY-----/g,
    severity: 'critical',
    confidence: 'high',
    description: 'Found an asymmetric private encryption key or SSH/TLS certificate key.',
    recommendation: 'Never commit private keys to source control. Invalidate the keypair and utilize a secure secret store.',
  },
  {
    ruleId: 'SEC-008',
    ruleTitle: 'Credential-Bearing Database Connection String',
    category: 'Database',
    regex: /\b(postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/([a-zA-Z0-9_]+):([^@\s]+)@([a-zA-Z0-9_\-\.]+)/g,
    severity: 'critical',
    confidence: 'high',
    description: 'Found a database connection string containing embedded plaintext credentials.',
    recommendation: 'Remove inline username and password from the URI and provide connection parameters via environment variables.',
  },
];

/**
 * Safely redacts detected sensitive strings (e.g. ghp_1234567890abcdef1234567890abcdef1234 -> ghp_************1234)
 */
export function redactSecret(secret: string): string {
  if (!secret || secret.length < 8) return '********';
  const prefix = secret.slice(0, 4);
  const suffix = secret.slice(-4);
  return `${prefix}${'*'.repeat(Math.max(6, secret.length - 8))}${suffix}`;
}

export async function scanSecrets(
  files: RepositoryFile[],
  owner: string,
  repo: string,
  branch: string,
  getFileContent: (path: string) => Promise<string | null>
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const now = new Date().toISOString();
  const version = 'repo-doctor-secrets-1.0';

  // Exclude image, font, media binary extensions
  const skipExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.pdf', '.zip'];

  for (const file of files) {
    if (file.type === 'tree') continue;
    const lower = file.path.toLowerCase();
    if (skipExtensions.some((ext) => lower.endsWith(ext))) continue;

    const content = await getFileContent(file.path);
    if (!content) continue;

    const lines = content.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      for (const rule of SECRET_RULES) {
        // Reset regex state
        rule.regex.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = rule.regex.exec(line)) !== null) {
          const matchedSecret = match[1] || match[0];
          const redacted = redactSecret(matchedSecret);

          // Build safe line snippet with redaction
          const safeLineSnippet = line.replace(matchedSecret, redacted).trim();

          findings.push({
            id: `sec-${rule.ruleId.toLowerCase()}-${file.path.replace(/[^a-zA-Z0-9]/g, '_')}-${lineIndex + 1}`,
            repository: `${owner}/${repo}`,
            branch,
            category: 'security_secrets',
            ruleId: rule.ruleId,
            ruleTitle: rule.ruleTitle,
            severity: rule.severity,
            confidence: rule.confidence,
            filePath: file.path,
            lineNumber: lineIndex + 1,
            description: rule.description,
            evidence: `Line ${lineIndex + 1}: ${safeLineSnippet}`,
            recommendation: rule.recommendation,
            proposedPatch: {
              action: 'modify',
              originalContent: line,
              proposedContent: `# Secret moved to environment variable:\n# KEY_NAME=YOUR_SECRET_HERE`,
              diffUnified: `--- a/${file.path}\n+++ b/${file.path}\n@@ -${lineIndex + 1},1 +${lineIndex + 1},1 @@\n-${safeLineSnippet}\n+# [REDACTED: Move secret to environment variable]`,
              summary: `Remove hardcoded secret from ${file.path}:${lineIndex + 1} and extract to .env file`,
            },
            validationStatus: 'passed',
            resolutionStatus: 'fix_available',
            timestamp: now,
            scannerVersion: version,
          });
        }
      }
    }
  }

  // Also check if .env is tracked in git (critical finding)
  const trackedEnv = files.find((f) => /(^|\/)\.env(\.(local|production|development))?$/i.test(f.path));
  if (trackedEnv) {
    findings.push({
      id: `sec-env-file-committed`,
      repository: `${owner}/${repo}`,
      branch,
      category: 'security_secrets',
      ruleId: 'SEC-010',
      ruleTitle: 'Committed .env File Found in Repository',
      severity: 'critical',
      confidence: 'high',
      filePath: trackedEnv.path,
      description: `The file "${trackedEnv.path}" is tracked in Git. Environment files often store production credentials and should NEVER be checked into source control.`,
      evidence: `File exists in repository tree: ${trackedEnv.path}`,
      recommendation:
        'Remove this file from Git tracking using "git rm --cached", add it to .gitignore, rotate any leaked credentials, and create a safe .env.example with empty values instead.',
      proposedPatch: {
        action: 'create',
        proposedContent: `# Example Environment Variables for ${owner}/${repo}\n# Copy this file to .env and configure your secrets locally\n\nPORT=5000\nAPI_KEY=your_api_key_here\nDATABASE_URL=postgres://user:password@localhost:5432/dbname\n`,
        diffUnified: `--- /dev/null\n+++ b/.env.example\n@@ -0,0 +1,5 @@\n+# Example Environment Variables\n+PORT=5000\n+API_KEY=your_api_key_here\n`,
        summary: 'Create safe .env.example template with dummy placeholders',
      },
      validationStatus: 'passed',
      resolutionStatus: 'fix_available',
      timestamp: now,
      scannerVersion: version,
    });
  }

  return findings;
}
