import { Router, Request, Response } from 'express';
import { storage } from '../services/storage.js';

export const historyRouter = Router();

historyRouter.get('/history', (req: Request, res: Response) => {
  const reports = storage.getAllReports();
  const summaryList = reports.map((r) => ({
    scanId: r.scanId,
    repository: r.repository.fullName,
    url: r.repository.url,
    branch: r.repository.selectedBranch,
    timestamp: r.timestamp,
    overallScore: r.overallScore,
    totalFindings: r.summary.totalFindings,
    criticalFindings: r.summary.criticalFindings,
    highFindings: r.summary.highFindings,
    fixesAvailableCount: r.summary.fixesAvailableCount,
    isSyntheticTest: r.isSyntheticTest,
  }));
  res.json(summaryList);
});

historyRouter.get('/history/:scanId', (req: Request, res: Response): void => {
  const scanId = String(req.params.scanId);
  const report = storage.getReport(scanId);
  if (!report) {
    res.status(404).json({ error: `Scan report "${scanId}" not found.` });
    return;
  }
  res.json(report);
});

historyRouter.get('/export/:scanId', (req: Request, res: Response): void => {
  const scanId = String(req.params.scanId);
  const format = (req.query.format as string) || 'json';

  const report = storage.getReport(scanId);
  if (!report) {
    res.status(404).json({ error: `Scan report "${scanId}" not found.` });
    return;
  }

  const safeRepoName = report.repository.fullName.replace(/[^a-zA-Z0-9_-]/g, '_');

  if (format === 'csv') {
    const csvData = storage.exportToCsv(report);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="repo-doctor-${safeRepoName}-${scanId}.csv"`);
    res.send(csvData);
  } else {
    const jsonData = storage.exportToJson(report);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="repo-doctor-${safeRepoName}-${scanId}.json"`);
    res.send(jsonData);
  }
});
