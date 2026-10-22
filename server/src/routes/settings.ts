import { Router, Request, Response } from 'express';
import { getSettings, updateSettings } from '../config.js';
import { GitHubAppService } from '../services/githubApp.js';

export const settingsRouter = Router();

// GET /api/settings - returns sanitized settings (never sends private keys)
settingsRouter.get('/settings', async (req: Request, res: Response) => {
  const current = getSettings();
  const appInfo = await GitHubAppService.getAppInfo();

  res.json({
    aiProvider: current.aiProvider,
    hasGithubToken: !!current.githubToken,
    hasGithubApp: GitHubAppService.isConfigured(),
    githubAppId: current.githubAppId ? `${current.githubAppId}` : null,
    githubAppName: appInfo?.name || null,
    githubAppSlug: appInfo?.slug || null,
    githubAppInstallUrl: appInfo?.installUrl || null,
    hasGeminiKey: !!current.geminiApiKey,
    hasOpenaiKey: !!current.openaiApiKey,
    githubTokenPreview: current.githubToken
      ? `${current.githubToken.slice(0, 4)}...${current.githubToken.slice(-4)}`
      : null,
    scoringWeights: current.scoringWeights,
  });
});

// POST /api/settings - update settings safely
settingsRouter.post('/settings', (req: Request, res: Response) => {
  const { githubToken, aiProvider, geminiApiKey, openaiApiKey, scoringWeights } = req.body;

  const updates: any = {};
  if (typeof githubToken === 'string') updates.githubToken = githubToken.trim();
  if (typeof aiProvider === 'string') updates.aiProvider = aiProvider;
  if (typeof geminiApiKey === 'string') updates.geminiApiKey = geminiApiKey.trim();
  if (typeof openaiApiKey === 'string') updates.openaiApiKey = openaiApiKey.trim();
  if (scoringWeights && typeof scoringWeights === 'object') updates.scoringWeights = scoringWeights;

  const updated = updateSettings(updates);

  res.json({
    success: true,
    aiProvider: updated.aiProvider,
    hasGithubToken: !!updated.githubToken,
    hasGeminiKey: !!updated.geminiApiKey,
    hasOpenaiKey: !!updated.openaiApiKey,
    scoringWeights: updated.scoringWeights,
  });
});
