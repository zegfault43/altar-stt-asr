#!/usr/bin/env node
/**
 * Final verification script
 * Runs all checks to verify the implementation
 */

const fs = require('fs-extra');
const path = require('path');

async function runChecks() {
  console.log('=== Final Verification Checklist ===\n');

  const checks = [];

  // Check 1: output/ directory exists
  const outputDir = path.join(process.cwd(), 'output');
  const outputExists = await fs.pathExists(outputDir);
  checks.push({
    name: 'Output directory exists',
    pass: outputExists,
    detail: outputDir
  });

  // Check 2: output/ in .gitignore
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  const gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
  const outputIgnored = gitignoreContent.includes('output/');
  checks.push({
    name: 'Output directory gitignored',
    pass: outputIgnored,
    detail: '.gitignore contains output/'
  });

  // Check 3: fs-extra installed
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = await fs.readJson(packageJsonPath);
  const fsExtraInstalled = packageJson.dependencies &&
                          packageJson.dependencies['fs-extra'];
  checks.push({
    name: 'fs-extra dependency installed',
    pass: Boolean(fsExtraInstalled),
    detail: fsExtraInstalled || 'Not found'
  });

  // Check 4: Recording test file exists
  const recordingTestPath = path.join(process.cwd(), 'test-recording.js');
  const recordingTestExists = await fs.pathExists(recordingTestPath);
  checks.push({
    name: 'Recording test file exists',
    pass: recordingTestExists,
    detail: 'test-recording.js'
  });

  // Check 5: HTML has recording controls
  const htmlPath = path.join(
    process.cwd(),
    'src',
    'renderer',
    'index.html'
  );
  const htmlContent = await fs.readFile(htmlPath, 'utf8');
  const hasRecordingUI = htmlContent.includes('startRecording') &&
                         htmlContent.includes('stopRecording');
  checks.push({
    name: 'UI has recording controls',
    pass: hasRecordingUI,
    detail: 'index.html contains recording buttons'
  });

  // Check 6: Main.js has save-recording handler
  const mainPath = path.join(process.cwd(), 'src', 'main.js');
  const mainContent = await fs.readFile(mainPath, 'utf8');
  const hasSaveHandler = mainContent.includes('save-recording');
  checks.push({
    name: 'IPC save-recording handler exists',
    pass: hasSaveHandler,
    detail: 'main.js has save-recording IPC'
  });

  // Check 7: Refactored files use fs-extra
  const installerPath = path.join(
    process.cwd(),
    'src',
    'core',
    'installer.js'
  );
  const installerContent = await fs.readFile(installerPath, 'utf8');
  const usesFsExtra = installerContent.includes("require('fs-extra')");
  checks.push({
    name: 'Core files use fs-extra',
    pass: usesFsExtra,
    detail: 'installer.js requires fs-extra'
  });

  // Print results
  let allPass = true;
  for (const check of checks) {
    const icon = check.pass ? '✓' : '✗';
    const status = check.pass ? 'PASS' : 'FAIL';
    console.log(`${icon} ${check.name}: ${status}`);
    console.log(`  ${check.detail}\n`);
    if (!check.pass) {
      allPass = false;
    }
  }

  // Summary
  const passCount = checks.filter((c) => c.pass).length;
  console.log('=================================');
  console.log(`Results: ${passCount}/${checks.length} checks passed`);
  console.log('=================================\n');

  if (allPass) {
    console.log('✓ All verification checks passed!');
    console.log('\nReady to launch:');
    console.log('  npm start');
  } else {
    console.log('✗ Some checks failed. Review above for details.');
    process.exit(1);
  }
}

runChecks().catch((error) => {
  console.error('Verification failed:', error.message);
  process.exit(1);
});
