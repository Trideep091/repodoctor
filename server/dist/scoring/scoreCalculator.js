import { getSettings } from '../config.js';
const SEVERITY_DEDUCTIONS = {
    critical: 25,
    high: 15,
    medium: 8,
    low: 3,
    info: 0,
};
const CATEGORY_NAMES = {
    documentation: 'Documentation & Onboarding',
    community: 'Open-Source Community Health',
    build_ci: 'Build, Config & CI/CD',
    testing_quality: 'Testing & Code Quality',
    security_secrets: 'Security & Secret Management',
    supply_chain: 'Dependency & Supply-Chain Risk',
    accessibility: 'Frontend Accessibility (WCAG 2.1)',
};
export function calculateTransparentScores(findings) {
    const settings = getSettings();
    const weights = settings.scoringWeights;
    const categories = [
        'documentation',
        'community',
        'build_ci',
        'testing_quality',
        'security_secrets',
        'supply_chain',
        'accessibility',
    ];
    const categoryScores = {};
    // Initialize each category
    for (const cat of categories) {
        categoryScores[cat] = {
            category: cat,
            name: CATEGORY_NAMES[cat] || cat,
            weight: weights[cat] || 0.15,
            score: 100,
            deductions: 0,
            findingsCount: {
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                info: 0,
            },
        };
    }
    // Count findings and compute deductions per category
    for (const f of findings) {
        const catScore = categoryScores[f.category];
        if (catScore) {
            catScore.findingsCount[f.severity] = (catScore.findingsCount[f.severity] || 0) + 1;
            const deduction = SEVERITY_DEDUCTIONS[f.severity] || 0;
            catScore.deductions += deduction;
        }
    }
    // Compute category scores (clamped 0 to 100)
    let totalWeightedScore = 0;
    let totalWeight = 0;
    for (const cat of categories) {
        const catObj = categoryScores[cat];
        const computed = Math.max(0, 100 - catObj.deductions);
        catObj.score = computed;
        const w = catObj.weight;
        totalWeightedScore += computed * w;
        totalWeight += w;
    }
    const overallScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 100;
    return {
        overallScore: Math.min(100, Math.max(0, overallScore)),
        categoryScores,
    };
}
