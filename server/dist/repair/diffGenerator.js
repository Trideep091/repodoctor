import * as Diff from 'diff';
export function generateDiff(filePath, oldContent = '', newContent = '') {
    const patch = Diff.createTwoFilesPatch(`a/${filePath}`, `b/${filePath}`, oldContent, newContent, '', '');
    const changes = Diff.diffLines(oldContent, newContent);
    let additions = 0;
    let deletions = 0;
    const lines = [];
    let oldLine = 1;
    let newLine = 1;
    for (const part of changes) {
        const partLines = part.value.split('\n');
        // If ends with trailing newline, pop empty line
        if (partLines.length > 1 && partLines[partLines.length - 1] === '') {
            partLines.pop();
        }
        if (part.added) {
            additions += partLines.length;
            for (const line of partLines) {
                lines.push({
                    type: 'add',
                    content: line,
                    newLineNumber: newLine++,
                });
            }
        }
        else if (part.removed) {
            deletions += partLines.length;
            for (const line of partLines) {
                lines.push({
                    type: 'delete',
                    content: line,
                    oldLineNumber: oldLine++,
                });
            }
        }
        else {
            for (const line of partLines) {
                lines.push({
                    type: 'normal',
                    content: line,
                    oldLineNumber: oldLine++,
                    newLineNumber: newLine++,
                });
            }
        }
    }
    return {
        filePath,
        diffUnified: patch,
        additions,
        deletions,
        lines,
    };
}
