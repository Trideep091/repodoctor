import { DiagnosisReport, RescanComparison } from '../types/index.js';
declare class ReportStorage {
    private reports;
    private comparisons;
    saveReport(report: DiagnosisReport): void;
    getReport(scanId: string): DiagnosisReport | undefined;
    getAllReports(): DiagnosisReport[];
    saveComparison(comparison: RescanComparison): void;
    getComparison(scanId: string): RescanComparison | undefined;
    /**
     * Generates sanitized CSV export of a diagnosis report
     */
    exportToCsv(report: DiagnosisReport): string;
    /**
     * Generates sanitized JSON export of a diagnosis report
     */
    exportToJson(report: DiagnosisReport): string;
}
export declare const storage: ReportStorage;
export {};
