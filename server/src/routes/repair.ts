import { Router, Request, Response } from 'express';
import { storage } from '../services/storage.js';
import { AIRepairEngine, GeneratedPatch } from '../repair/aiEngine.js';
import { GitHubService } from '../services/github.js';
import { detectProjectTechnologies } from '../services/projectDetector.js';

export const repairRouter = Router();

repairRouter.post('/repair/generate', async (req: Request, res: Response): Promise<void> => {
  const { scanId, findingIds, licenseChoice } = req.body;

  if (!scanId || !Array.isArray(findingIds) || findingIds.length === 0) {
    res.status(400).json({ error: 'scanId and an array of findingIds are required.' });
    return;
  }

  const report = storage.getReport(scanId);
  if (!report) {
    res.status(404).json({ error: `Scan report with ID "${scanId}" not found.` });
    return;
  }

  try {
    const { owner, name: repo, selectedBranch } = report.repository;
    const isSynthetic = !!report.isSyntheticTest;

    const tree = await GitHubService.getTree(owner, repo, selectedBranch, isSynthetic);
    const projectAnalysis = detectProjectTechnologies(tree);

    const getFileContent = async (filePath: string): Promise<string | null> => {
      return await GitHubService.getFileContent(owner, repo, filePath, selectedBranch, isSynthetic);
    };

    const targetFindings = report.findings.filter((f) => findingIds.includes(f.id));
    const generatedPatches: GeneratedPatch[] = [];

    for (const finding of targetFindings) {
      const patch = await AIRepairEngine.generateRepair(
        finding,
        tree,
        projectAnalysis,
        owner,
        repo,
        getFileContent,
        { licenseChoice }
      );
      if (patch) {
        generatedPatches.push(patch);
      }
    }

    res.json({
      scanId,
      patchesCount: generatedPatches.length,
      patches: generatedPatches,
    });
  } catch (err: any) {
    console.error('Repair generation error:', err);
    res.status(500).json({
      error: err.message || 'Failed to generate repairs for selected findings.',
    });
  }
});
