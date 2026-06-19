#!/usr/bin/env node
const fs = require('fs/promises');
const path = require('path');
const { runAsrModel } = require('./src/core/asr');

async function createMockAudio() {
  const audioDir = path.join(__dirname, 'temp');
  const audioPath = path.join(audioDir, 'test.wav');
  await fs.mkdir(audioDir, { recursive: true });
  await fs.writeFile(audioPath, Buffer.alloc(1024), 'binary');
  return audioPath;
}

async function testModel(modelId) {
  console.log(`\n=== Testing: ${modelId} ===`);
  const audioPath = await createMockAudio();
  
  try {
    const result = await runAsrModel({
      modelId,
      audioPath,
      language: 'en',
      progressCallback: (msg) => console.log(`  [Progress] ${msg}`)
    });
    console.log('✓ Success:', result.command);
  } catch (error) {
    console.log('✗ Error:', error.message.split('\n')[0]);
    if (error.message.includes('install') || error.message.includes('not found')) {
      console.log('  (This is expected - installation guidance provided)');
    }
  }
}

async function main() {
  console.log('=== Testing All Model Types ===');
  
  await testModel('mock/tiny');
  await testModel('whisper.cpp/base.en');
  await testModel('openai-whisper/base');
  
  console.log('\n=== Summary ===');
  console.log('✓ mock/tiny: Should work (no dependencies)');
  console.log('✓ whisper.cpp: Should show install instructions');
  console.log('✓ openai-whisper: Should detect Python and attempt pip install');
}

main();
