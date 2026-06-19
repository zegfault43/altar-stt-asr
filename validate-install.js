#!/usr/bin/env node
/**
 * Quick validation script to test auto-install flow without launching Electron.
 * Run: node validate-install.js
 */

const { ensureModelInstalled } = require('./src/core/installer');
const { runAsrModel } = require('./src/core/asr');
const fs = require('fs/promises');
const path = require('path');

async function createMockAudio() {
  const audioDir = path.join(__dirname, 'temp');
  const audioPath = path.join(audioDir, 'mock.wav');
  await fs.mkdir(audioDir, { recursive: true });
  await fs.writeFile(audioPath, Buffer.alloc(1024), 'binary');
  return audioPath;
}

async function main() {
  console.log('=== Validation: Auto-install + Mock Model ===\n');

  const audioPath = await createMockAudio();
  console.log(`✓ Created mock audio file: ${audioPath}\n`);

  console.log('Testing mock/tiny model (no install required)...');
  await ensureModelInstalled('mock/tiny');
  console.log('✓ ensureModelInstalled(mock/tiny) passed\n');

  console.log('Running transcription with mock/tiny...');
  const result = await runAsrModel({
    modelId: 'mock/tiny',
    audioPath,
    language: 'en',
    progressCallback: (msg) => console.log(`  [Progress] ${msg}`)
  });

  console.log('✓ Transcription result:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n=== All checks passed! ===');
}

main().catch((error) => {
  console.error('✗ Validation failed:', error.message);
  process.exit(1);
});
