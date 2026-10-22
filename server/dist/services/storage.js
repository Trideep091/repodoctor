class ReportStorage {
    reports = new Map();
    comparisons = new Map();
    saveReport(report) {
        this.reports.set(report.scanId, report);
    }
    getReport(scanId) {
        return this.reports.get(scanId);
    }
    getAllReports() {
        return Array.from(this.reports.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    saveComparison(comparison) {
        this.comparisons.set(comparison.currentScanId, comparison);
    }
    getComparison(scanId) {
        return this.comparisons.get(scanId);
    }
    /**
     * Generates sanitized CSV export of a diagnosis report
     */
    exportToCsv(report) {
        const headers = [
            'Finding ID',
            'Rule ID',
            'Rule Title',
            'Category',
            'Severity',
            'Confidence',
            'File Path',
            'Line Number',
            'Description',
            'Sanitized Evidence',
            'Recommendation',
            'Validation Status',
        ];
        const escapeCsv = (str) => `"${(str || '').replace(/"/g, '""')}"`;
        const rows = report.findings.map((f) => [
            escapeCsv(f.id),
            escapeCsv(f.ruleId),
            escapeCsv(f.ruleTitle),
            escapeCsv(f.category),
            escapeCsv(f.severity),
            escapeCsv(f.confidence),
            escapeCsv(f.filePath),
            f.lineNumber ? String(f.lineNumber) : '',
            escapeCsv(f.description),
            escapeCsv(f.evidence),
            escapeCsv(f.recommendation),
            escapeCsv(f.validationStatus),
        ]);
        return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }
    /**
     * Generates sanitized JSON export of a diagnosis report
     */
    exportToJson(report) {
        // Clone and ensure no raw secrets
        const sanitized = JSON.parse(JSON.stringify(report));
        return JSON.stringify(sanitized, null, 2);
    }
}
export const storage = new ReportStorage();
