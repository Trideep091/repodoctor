export function detectProjectTechnologies(files) {
    const paths = new Set(files.map((f) => f.path.toLowerCase()));
    const technologies = new Set();
    let ecosystem = 'unknown';
    let packageManager;
    const manifestPaths = [];
    // Check Node.js / JavaScript / TypeScript
    const hasPackageJson = files.some((f) => f.path.endsWith('package.json'));
    if (hasPackageJson) {
        ecosystem = 'node';
        technologies.add('Node.js');
        manifestPaths.push(...files.filter((f) => f.path.endsWith('package.json')).map((f) => f.path));
        if (paths.has('yarn.lock'))
            packageManager = 'yarn';
        else if (paths.has('pnpm-lock.yaml'))
            packageManager = 'pnpm';
        else if (paths.has('package-lock.json'))
            packageManager = 'npm';
        else
            packageManager = 'npm';
        if (packageManager)
            technologies.add(packageManager);
    }
    // TypeScript
    if (files.some((f) => f.path.endsWith('.ts') || f.path.endsWith('.tsx') || f.path.includes('tsconfig.json'))) {
        technologies.add('TypeScript');
    }
    // React
    if (files.some((f) => f.path.endsWith('.jsx') ||
        f.path.endsWith('.tsx') ||
        f.path.toLowerCase().includes('react'))) {
        technologies.add('React');
    }
    // Next.js / Vite
    if (files.some((f) => f.path.includes('next.config') || f.path.includes('/app/') || f.path.includes('/pages/'))) {
        technologies.add('Next.js');
    }
    if (files.some((f) => f.path.includes('vite.config'))) {
        technologies.add('Vite');
    }
    // Python
    const hasPython = files.some((f) => f.path.endsWith('.py') ||
        f.path.endsWith('requirements.txt') ||
        f.path.endsWith('pyproject.toml') ||
        f.path.endsWith('pipfile'));
    if (hasPython) {
        if (ecosystem === 'unknown')
            ecosystem = 'python';
        technologies.add('Python');
        files
            .filter((f) => f.path.endsWith('requirements.txt') || f.path.endsWith('pyproject.toml'))
            .forEach((f) => manifestPaths.push(f.path));
    }
    // Java
    const hasJava = files.some((f) => f.path.endsWith('.java') || f.path.endsWith('pom.xml') || f.path.endsWith('build.gradle'));
    if (hasJava) {
        if (ecosystem === 'unknown')
            ecosystem = 'java';
        technologies.add('Java');
    }
    // Rust
    const hasRust = files.some((f) => f.path.endsWith('.rs') || f.path.endsWith('cargo.toml'));
    if (hasRust) {
        if (ecosystem === 'unknown')
            ecosystem = 'rust';
        technologies.add('Rust');
    }
    // Go
    const hasGo = files.some((f) => f.path.endsWith('.go') || f.path.endsWith('go.mod'));
    if (hasGo) {
        if (ecosystem === 'unknown')
            ecosystem = 'go';
        technologies.add('Go');
    }
    // Web Frontend detection
    const hasFrontend = files.some((f) => f.path.endsWith('.html') ||
        f.path.endsWith('.css') ||
        f.path.endsWith('.jsx') ||
        f.path.endsWith('.tsx') ||
        f.path.startsWith('frontend/') ||
        f.path.startsWith('src/components/'));
    // Tests detection
    const hasTests = files.some((f) => f.path.includes('test') ||
        f.path.includes('spec') ||
        f.path.endsWith('.test.js') ||
        f.path.endsWith('.test.ts') ||
        f.path.endsWith('.spec.ts') ||
        f.path.startsWith('tests/'));
    // CI detection
    const hasCI = files.some((f) => f.path.startsWith('.github/workflows/') ||
        f.path === '.circleci/config.yml' ||
        f.path === '.travis.yml');
    return {
        ecosystem,
        technologies: Array.from(technologies),
        packageManager,
        hasFrontend,
        hasBackend: ecosystem !== 'unknown',
        hasTests,
        hasCI,
        manifestPaths,
    };
}
