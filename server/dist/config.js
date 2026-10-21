import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load .env from process.cwd() or project root
const envPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../.env'),
];
for (const p of envPaths) {
    if (fs.existsSync(p)) {
        dotenv.config({ path: p });
        break;
    }
}
export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5001;
// Default scoring weights according to PS-08 challenge specs
export const DEFAULT_SETTINGS = {
    githubToken: process.env.GITHUB_TOKEN || '',
    githubAppId: process.env.GITHUB_APP_ID || '',
    githubAppPrivateKey: process.env.GITHUB_APP_PRIVATE_KEY || '',
    githubAppPrivateKeyPath: process.env.GITHUB_APP_PRIVATE_KEY_PATH || '',
    githubAppInstallationId: process.env.GITHUB_APP_INSTALLATION_ID || '',
    aiProvider: process.env.AI_PROVIDER || 'deterministic',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    scoringWeights: {
        documentation: 0.20,
        community: 0.20,
        build_ci: 0.25,
        testing_quality: 0.20,
        security_secrets: 0.15,
        supply_chain: 0.15,
        accessibility: 0.10,
    },
};
// In-memory runtime settings cache (can be updated from UI)
let currentSettings = { ...DEFAULT_SETTINGS };
export function getSettings() {
    return { ...currentSettings };
}
export function updateSettings(newSettings) {
    currentSettings = {
        ...currentSettings,
        ...newSettings,
        scoringWeights: {
            ...currentSettings.scoringWeights,
            ...(newSettings.scoringWeights || {}),
        },
    };
    return { ...currentSettings };
}
