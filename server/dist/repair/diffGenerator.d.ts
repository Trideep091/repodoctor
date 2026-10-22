export interface DiffResult {
    filePath: string;
    diffUnified: string;
    additions: number;
    deletions: number;
    lines: Array<{
        type: 'add' | 'delete' | 'normal';
        content: string;
        oldLineNumber?: number;
        newLineNumber?: number;
    }>;
}
export declare function generateDiff(filePath: string, oldContent?: string, newContent?: string): DiffResult;
