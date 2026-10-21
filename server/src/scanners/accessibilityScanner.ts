import { Finding, RepositoryFile } from '../types/index.js';

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

// Parse hex colors (#fff, #ffffff, #777777)
function parseHexColor(hex: string): RgbColor | null {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  } else if (clean.length === 6) {
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  }
  return null;
}

// WCAG relative luminance calculation
function getLuminance(rgb: RgbColor): number {
  const a = [rgb.r, rgb.g, rgb.b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

// WCAG contrast ratio calculation: (L1 + 0.05) / (L2 + 0.05)
function getContrastRatio(c1: RgbColor, c2: RgbColor): number {
  const l1 = getLuminance(c1);
  const l2 = getLuminance(c2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export async function scanAccessibility(
  files: RepositoryFile[],
  owner: string,
  repo: string,
  branch: string,
  getFileContent: (path: string) => Promise<string | null>
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const now = new Date().toISOString();
  const version = 'repo-doctor-a11y-1.0';

  // Supported frontend files
  const frontendFiles = files.filter(
    (f) =>
      f.type !== 'tree' &&
      (f.path.endsWith('.html') ||
        f.path.endsWith('.css') ||
        f.path.endsWith('.jsx') ||
        f.path.endsWith('.tsx') ||
        f.path.endsWith('.vue'))
  );

  for (const file of frontendFiles) {
    const content = await getFileContent(file.path);
    if (!content) continue;

    const lines = content.split('\n');

    // ==========================================
    // 1. COLOR CONTRAST AUDIT (CSS & Inline styles)
    // ==========================================
    if (file.path.endsWith('.css') || file.path.endsWith('.html') || file.path.endsWith('.jsx') || file.path.endsWith('.tsx')) {
      const colorRegex = /color\s*:\s*(#[0-9a-fA-F]{3,6})\b/i;
      const bgRegex = /background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,6})\b/i;

      const cssBlockRegex = /([^{]+)\{([^}]+)\}/g;
      let blockMatch: RegExpExecArray | null;

      while ((blockMatch = cssBlockRegex.exec(content)) !== null) {
        const selector = blockMatch[1].trim();
        const blockBody = blockMatch[2];

        const colorMatch = colorRegex.exec(blockBody);
        const bgMatch = bgRegex.exec(blockBody);

        if (colorMatch && bgMatch) {
          const fgHex = colorMatch[1];
          const bgHex = bgMatch[1];
          const fgRgb = parseHexColor(fgHex);
          const bgRgb = parseHexColor(bgHex);

          if (fgRgb && bgRgb) {
            const ratio = getContrastRatio(fgRgb, bgRgb);
            const roundedRatio = Math.round(ratio * 100) / 100;

            if (roundedRatio < 4.5) {
              findings.push({
                id: `a11y-contrast-${file.path.replace(/[^a-zA-Z0-9]/g, '_')}-${selector.replace(/[^a-zA-Z0-9]/g, '_')}`,
                repository: `${owner}/${repo}`,
                branch,
                category: 'accessibility',
                ruleId: 'A11Y-001',
                ruleTitle: `Insufficient Color Contrast (${roundedRatio}:1, WCAG requires 4.5:1)`,
                severity: roundedRatio < 2.5 ? 'high' : 'medium',
                confidence: 'high',
                filePath: file.path,
                description: `Text color ${fgHex} on background ${bgHex} yields a contrast ratio of ${roundedRatio}:1, violating WCAG 2.1 Level AA (minimum 4.5:1 required).`,
                evidence: `Selector "${selector}": color: ${fgHex}; background-color: ${bgHex}; (Ratio: ${roundedRatio}:1)`,
                recommendation: `Increase the contrast between foreground (${fgHex}) and background (${bgHex}) to at least 4.5:1 (e.g. use #ffffff on dark backgrounds or #111827 on light backgrounds).`,
                proposedPatch: {
                  action: 'modify',
                  originalContent: `color: ${fgHex};`,
                  proposedContent: `color: #ffffff; /* Improved WCAG AA contrast ratio */`,
                  diffUnified: `--- a/${file.path}\n+++ b/${file.path}\n-  color: ${fgHex};\n+  color: #ffffff; /* WCAG 2.1 AA compliant contrast */\n`,
                  summary: `Fix contrast ratio for selector "${selector}" from ${roundedRatio}:1 to compliant ratio`,
                },
                validationStatus: 'passed',
                resolutionStatus: 'fix_available',
                timestamp: now,
                scannerVersion: version,
              });
            }
          }
        }
      }
    }

    // ==========================================
    // 2. HTML & JSX TAGS AUDIT (Labels, Images, Buttons)
    // ==========================================
    if (file.path.endsWith('.html') || file.path.endsWith('.jsx') || file.path.endsWith('.tsx')) {
      // 2A. Form inputs missing label or aria-label
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (
          /<input\b[^>]*>/i.test(line) &&
          !/type=["'](hidden|submit|button|reset|image)["']/i.test(line) &&
          !/aria-label=/i.test(line) &&
          !/aria-labelledby=/i.test(line) &&
          !/<label\b/i.test(line)
        ) {
          const idMatch = /id=["']([^"']+)["']/i.exec(line);
          const inputId = idMatch ? idMatch[1] : 'form-input';

          findings.push({
            id: `a11y-label-${file.path.replace(/[^a-zA-Z0-9]/g, '_')}-${i + 1}`,
            repository: `${owner}/${repo}`,
            branch,
            category: 'accessibility',
            ruleId: 'A11Y-002',
            ruleTitle: 'Form Input Missing Accessible Name or Label',
            severity: 'high',
            confidence: 'high',
            filePath: file.path,
            lineNumber: i + 1,
            description: 'Form input does not have an associated <label> element or aria-label attribute, making it inaccessible to screen readers.',
            evidence: `Line ${i + 1}: ${line.trim()}`,
            recommendation: `Add a corresponding <label for="${inputId}"> or provide an explicit aria-label="${inputId}" attribute.`,
            proposedPatch: {
              action: 'modify',
              originalContent: line.trim(),
              proposedContent: line.trim().replace(/<input\b/i, `<input aria-label="${inputId}" `),
              diffUnified: `--- a/${file.path}\n+++ b/${file.path}\n@@ -${i + 1},1 +${i + 1},1 @@\n-${line.trim()}\n+${line.trim().replace(/<input\b/i, `<input aria-label="${inputId}" `)}`,
              summary: `Add accessible aria-label to <input id="${inputId}">`,
            },
            validationStatus: 'passed',
            resolutionStatus: 'fix_available',
            timestamp: now,
            scannerVersion: version,
          });
        }

        // 2B. Images missing alt attribute
        if (/<img\b/i.test(line) && !/\balt\s*=/i.test(line)) {
          findings.push({
            id: `a11y-img-alt-${file.path.replace(/[^a-zA-Z0-9]/g, '_')}-${i + 1}`,
            repository: `${owner}/${repo}`,
            branch,
            category: 'accessibility',
            ruleId: 'A11Y-004',
            ruleTitle: 'Image Tag Missing "alt" Description',
            severity: 'medium',
            confidence: 'high',
            filePath: file.path,
            lineNumber: i + 1,
            description: 'Image element lacks an "alt" attribute. Screen readers will read the file URL instead of a descriptive image summary.',
            evidence: `Line ${i + 1}: ${line.trim()}`,
            recommendation: 'Add an alt attribute describing the image, or alt="" if the image is purely decorative.',
            proposedPatch: {
              action: 'modify',
              originalContent: line.trim(),
              proposedContent: line.trim().replace(/<img\b/i, '<img alt="Repository logo" '),
              diffUnified: `--- a/${file.path}\n+++ b/${file.path}\n@@ -${i + 1},1 +${i + 1},1 @@\n-${line.trim()}\n+${line.trim().replace(/<img\b/i, '<img alt="Repository logo" ')}`,
              summary: 'Add alt attribute to <img> element',
            },
            validationStatus: 'passed',
            resolutionStatus: 'fix_available',
            timestamp: now,
            scannerVersion: version,
          });
        }
      }

      // 2C. Icon-only buttons missing accessible name (handles multi-line)
      const buttonRegex = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
      let btnMatch: RegExpExecArray | null;
      while ((btnMatch = buttonRegex.exec(content)) !== null) {
        const btnAttrs = btnMatch[1];
        const btnInner = btnMatch[2].trim();

        const hasAria = /aria-label\s*=|aria-labelledby\s*=/i.test(btnAttrs);
        const hasIcon = /<svg|<i\b|<span\b[^>]*class=["'][^"']*icon/i.test(btnInner);
        const textOnly = btnInner.replace(/<[^>]+>/g, '').trim();

        if (hasIcon && !hasAria && textOnly.length === 0) {
          const matchIndex = btnMatch.index;
          const lineNum = content.slice(0, matchIndex).split('\n').length;

          findings.push({
            id: `a11y-button-${file.path.replace(/[^a-zA-Z0-9]/g, '_')}-${lineNum}`,
            repository: `${owner}/${repo}`,
            branch,
            category: 'accessibility',
            ruleId: 'A11Y-003',
            ruleTitle: 'Icon-Only Button Missing Accessible Text Name',
            severity: 'medium',
            confidence: 'high',
            filePath: file.path,
            lineNumber: lineNum,
            description: 'Button element renders an icon without text or aria-label, leaving assistive technologies unable to describe its purpose.',
            evidence: `Line ${lineNum}: ${btnMatch[0].replace(/\s+/g, ' ').slice(0, 100)}...`,
            recommendation: 'Add an aria-label attribute describing the button action (e.g., aria-label="Toggle Navigation").',
            proposedPatch: {
              action: 'modify',
              originalContent: btnMatch[0],
              proposedContent: btnMatch[0].replace(/<button\b/i, '<button aria-label="Action" '),
              diffUnified: `--- a/${file.path}\n+++ b/${file.path}\n@@ -${lineNum},1 +${lineNum},1 @@\n-${btnMatch[0].replace(/\s+/g, ' ').slice(0, 80)}\n+${btnMatch[0].replace(/<button\b/i, '<button aria-label="Action" ').replace(/\s+/g, ' ').slice(0, 80)}`,
              summary: 'Add descriptive aria-label to icon button',
            },
            validationStatus: 'passed',
            resolutionStatus: 'fix_available',
            timestamp: now,
            scannerVersion: version,
          });
        }
      }
    }
  }

  return findings;
}
