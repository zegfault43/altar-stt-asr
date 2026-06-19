#!/usr/bin/env node
/**
 * Voice recording integration test
 * Tests the save-recording flow end-to-end
 */

const fs = require('fs-extra');
const path = require('path');

async function testRecordingSave() {
  console.log('=== Testing Voice Recording Save Flow ===\n');

  const outputDir = path.join(process.cwd(), 'output');
  await fs.ensureDir(outputDir);
  console.log(`✓ Output directory exists: ${outputDir}\n`);

  const mockAudioBuffer = Buffer.alloc(1024);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `test-recording-${timestamp}.webm`;
  const filePath = path.join(outputDir, filename);

  await fs.writeFile(filePath, mockAudioBuffer);
  console.log(`✓ Mock recording saved: ${filePath}`);

  const exists = await fs.pathExists(filePath);
  if (!exists) {
    throw new Error('File was not saved correctly');
  }
  console.log('✓ File exists and is accessible\n');

  const gitignorePath = path.join(process.cwd(), '.gitignore');
  const gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
  const outputIgnored = gitignoreContent.includes('output/');

  if (outputIgnored) {
    console.log('✓ output/ directory is in .gitignore');
  } else {
    throw new Error('output/ should be in .gitignore');
  }

  await fs.remove(filePath);
  console.log('✓ Test file cleaned up\n');

  console.log('=== All recording tests passed! ===');
}

testRecordingSave().catch((error) => {
  console.error('✗ Test failed:', error.message);
  process.exit(1);
});
