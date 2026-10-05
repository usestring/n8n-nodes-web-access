import { analyzePackage, SOURCE_FILE_PATTERNS } from '@n8n/scan-community-package/scanner/scanner.mjs';

// The scanner's CLI only accepts a version already on npm with provenance. Its
// two lint passes, over the sources and over the shipped build, run here
// against the working tree so a failure shows up before anything is published.
const passes = [
	['source', SOURCE_FILE_PATTERNS],
	['build output', ['dist/**/*.js', 'package.json']],
];

let failed = false;
for (const [label, patterns] of passes) {
	const result = await analyzePackage(process.cwd(), patterns);
	console.log(`${result.passed ? 'pass' : 'fail'}: ${label}`);
	if (!result.passed) {
		failed = true;
		console.log(result.details ?? result.message);
	}
}

process.exitCode = failed ? 1 : 0;
