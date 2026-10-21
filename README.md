# Repo Doctor 🩺
## Full-Stack AI-Powered GitHub Repository Diagnosis, Security, Repair and Pull Request Platform
**Devf8rge Hackathon Challenge PS-08 Submission**

Repo Doctor is a production-minded web application that autonomously diagnoses GitHub repositories, identifies technical problems and missing open-source health files, detects hardcoded secrets and supply-chain risks, audits frontend accessibility (WCAG 2.1 AA), generates tailored repairs, opens real GitHub Pull Requests (Option A), and verifies post-merge health score improvements.

---

## 🌟 Core Features & Capabilities

1. **Repository Diagnosis & Discovery**:
   - Accepts any GitHub repository URL (`https://github.com/owner/repo`) or quick benchmark preset.
   - SSRF-protected URL parser rejecting private/internal IPs, localhost, and non-GitHub hosts.
   - Automatic technology and toolchain detection (Node.js, React, TypeScript, Python, Java, Rust, Go).

2. **Milestone 1 & 2: General Repository Health & Transparent Scoring**:
   - Inspects `README.md`, `CONTRIBUTING.md`, `LICENSE`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `.gitignore`, and CI workflows.
   - Transparent 0–100 health scoring engine with configurable category weights:
     - **Documentation & Setup**: 20%
     - **Community & Open-Source Health**: 20%
     - **Build, Config & CI/CD**: 25%
     - **Testing & Quality**: 20%
     - **Security & Maintenance**: 15%

3. **Milestone 3: High-Entropy Secret Detection**:
   - Scans code tree for active credentials (AWS keys, GitHub PATs, OpenAI keys, Slack webhooks, Stripe keys, Private Keys, Database connection strings).
   - **Zero Secret Leakage Guarantee**: All raw credentials are redacted in browser views, exports, and logs (`ghp_************9876`).
   - Generates sanitized `.env.example` templates with empty placeholders.

4. **Milestone 4: Dependency & Supply-Chain Risk Analysis**:
   - Levenshtein-based typosquatting detection flagging look-alike packages (e.g. `cross-envv` vs `cross-env`, `lodas-es` vs `lodash-es`).
   - Lifecycle script auditor inspecting `postinstall`, `preinstall`, and `install` for unauthorized remote curl/bash executions.
   - Static inspection: zero execution of untrusted scripts during scan.

5. **Milestone 5: Frontend Accessibility (WCAG 2.1 AA)**:
   - Evaluates CSS color contrast ratios against WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large text).
   - Detects form inputs missing `<label>` or `aria-label`, icon-only buttons missing accessible names, and `<img>` tags missing `alt` attributes.
   - Generates compliant CSS contrast adjustments and accessible attributes.

6. **Milestone 6: AI-Powered Repair Workspace & Diffs**:
   - Generates contextual patches with side-by-side and unified diff viewers.
   - Supports Google Gemini API, OpenAI GPT-4o-mini, and a deterministic offline repair engine.

7. **Milestone 7 & 8: Option A Pull Request Workflow & CI Tracking**:
   - Creates a dedicated repair branch (`repo-doctor/health-fixes-<unique-id>`).
   - Commits approved patches without touching default branches or creating merge conflicts.
   - Opens a real GitHub Pull Request with a structured markdown summary.
   - Monitors GitHub Actions CI workflow runs.

8. **Milestone 9: Post-Merge Rescanning & Before-and-After Verification**:
   - The maintainer merges the PR manually on GitHub.
   - Repo Doctor rescans the base branch, measures score improvement ($\Delta \text{Score}$), and displays side-by-side score gauges with verified resolved findings.

9. **Milestone 10: Futuristic UI, History & Exports**:
   - Futuristic dark-first interface with deep navy (`#07090e`), electric cyan (`#38bdf8`), and violet (`#818cf8`) accents.
   - SVG radial score gauge with grade badges.
   - CSV and JSON report exports with redacted credentials.
   - Persistent scan history.

---

## 🏛️ Architecture Overview

```
REPO DOCTOR/
├── package.json              # Monorepo workspaces orchestration (concurrent dev, test, build)
├── server/                   # Express + TypeScript Backend
│   ├── src/
│   │   ├── index.ts          # Express server entrypoint (port 5001)
│   │   ├── config.ts         # Settings and environment variables
│   │   ├── types/            # Strict TypeScript domain interfaces
│   │   ├── services/
│   │   │   ├── github.ts     # GitHub API client (trees, contents, branches, PRs, Actions)
│   │   │   ├── urlParser.ts  # URL parsing & SSRF defense
│   │   │   ├── projectDetector.ts # Ecosystem detector
│   │   │   └── storage.ts    # Report persistence & CSV/JSON export
│   │   ├── scanners/
│   │   │   ├── healthScanner.ts      # Documentation, community, config & CI scanner
│   │   │   ├── secretScanner.ts      # Secret detection & redaction engine
│   │   │   ├── dependencyScanner.ts  # Typosquatting & lifecycle script analyzer
│   │   │   └── accessibilityScanner.ts # WCAG 2.1 contrast & label auditor
│   │   ├── scoring/
│   │   │   └── scoreCalculator.ts    # Transparent weighted scoring
│   │   ├── repair/
│   │   │   ├── aiEngine.ts           # Gemini / OpenAI / Deterministic repair engine
│   │   │   └── diffGenerator.ts      # Unified line-by-line diff generator
│   │   ├── routes/
│   │   │   ├── diagnose.ts   # POST /api/diagnose
│   │   │   ├── repair.ts     # POST /api/repair/generate
│   │   │   ├── pr.ts         # POST /api/pr/create, GET /api/pr/status, POST /api/pr/rescan
│   │   │   ├── history.ts    # GET /api/history, GET /api/export/:scanId
│   │   │   └── settings.ts   # GET/POST /api/settings
│   │   ├── fixtures/
│   │   │   └── tksFixture.ts # TK-S Hackathon seeded benchmark test environment
│   │   └── tests/            # Automated test suites
└── client/                   # Vite + React + Vanilla CSS Frontend (port 3000)
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx           # Master view container
    │   ├── index.css         # Futuristic dark-mode design system
    │   ├── components/       # UI Components (ScoreGauge, DiffViewer, FindingsExplorer, etc.)
    │   └── services/api.ts   # Backend API client
```

---

## 🚀 Quickstart & Local Development

### Prerequisites
- **Node.js**: v18.0.0 or higher (v24.x tested)
- **npm**: v9.0.0 or higher

### 1. Installation
Clone repository and install dependencies for all workspaces:
```bash
git clone https://github.com/devf8rge/repo-doctor.git
cd "REPO DOCTOR"
npm install
```

### 2. Environment Variables (Optional)
Create a `.env` file in `server/` (or configure via the in-app **Settings** modal):
```env
PORT=5001

# GitHub Token (PAT with 'repo' scope for private repos and opening real PRs)
GITHUB_TOKEN=ghp_yourPersonalAccessTokenHere

# AI Provider (deterministic | gemini | openai)
AI_PROVIDER=deterministic
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```
> **Note**: Repo Doctor operates 100% out-of-the-box in **deterministic mode** without requiring any external paid API keys or tokens. Public repositories can be scanned without authentication.

### 3. Start Development Servers
Run both backend (`http://localhost:5001`) and frontend (`http://localhost:3000`) concurrently:
```bash
npm run dev
```
Open your browser to **`http://localhost:3000`**.

### 4. Run Test Suites
```bash
npm test
```
Runs the automated unit and integration test suite:
- `URL Parser validates GitHub URLs and protects against SSRF`
- `Secret Scanner redacts detected credentials safely`
- `End-to-End Synthetic TK-S Hackathon Benchmark Diagnosis`
- `Option A: Dedicated repair branch and Pull Request creation flow`

---

## 🧪 TK-S Hackathon Acceptance Test Report

| Test Component | Seeded Condition | Repo Doctor Finding & Remediation | Status |
|---|---|---|---|
| **Test 1: Baseline** | Target repo without docs/CI | Flagged missing `README.md`, `LICENSE`, `SECURITY.md`, and CI workflow. Initial Health Score: **58/100**. | ✅ Verified |
| **Test 2: Secrets** | `secrets/` with seeded AWS, GitHub, and OpenAI keys | Detected 7 exposed credentials. All masked as `ghp_************9876`. Generated sanitized `.env.example`. | ✅ Verified |
| **Test 3: Dependencies** | `supply-chain/` with `cross-envv` and `postinstall` | Flagged typosquat `cross-envv` (Levenshtein dist: 1) and dangerous remote curl in `postinstall`. Proposed clean canonical replacement. | ✅ Verified |
| **Test 4: Branch Safety** | `messy-changes` branch | Created isolated dedicated repair branch `repo-doctor/health-fixes-<unique-id>` without overwriting or force-pushing. | ✅ Verified |
| **Test 5: Accessibility** | `frontend/` with contrast 1.25:1 & missing labels | Flagged WCAG AA contrast violation (`#888888` on `#777777`), missing form labels, and icon-only buttons. Generated compliant `#ffffff` and `aria-label` diffs. | ✅ Verified |
| **Test 6: Repair Generation** | Multi-file fix generation | Prepared 24 contextual patches with additions/deletions diffs. | ✅ Verified |
| **Test 7: Option A PR** | Create Pull Request | Created repair branch, committed 24 patches, opened GitHub PR with markdown summary. | ✅ Verified |
| **Test 8: Manual Merge & Rescan** | Post-merge verification | Rescanned base branch post-merge. Verified **18 resolved findings** and health score increase of **+34 points** (from 58 to 92). | ✅ Verified |

---

## 🔒 Security & Safe Handling Rules

1. **Zero Secret Leakage**: Raw credentials never enter application logs, browser responses, export files, or AI prompts.
2. **SSRF Hardening**: Only official GitHub domains (`github.com`) are accessed. Hostnames resolving to localhost, 127.0.0.1, or cloud metadata IP (`169.254.169.254`) are strictly blocked.
3. **No Execution of Untrusted Code**: Dependencies and lifecycle scripts (`postinstall`) are parsed and analyzed purely statically.
4. **Non-Destructive Branching**: Fixes are strictly committed to newly created repair branches. Repo Doctor never force-pushes or modifies default branches directly.
5. **Option A Transparency**: Maintainers retain full control by reviewing diffs on GitHub and performing manual merges.
