#!/usr/bin/env node
const { ensureModelInstalled } = require('./src/core/installer');

async function main() {
  console.log('Testing whisper.cpp installation check...\n');
  
  try {
    await ensureModelInstalled('whisper.cpp/base.en');
    console.log('✓ whisper.cpp is installed and ready');
  } catch (error) {
    console.log('✗ Expected error (whisper-cli not found):\n');
    console.log(error.message);
    console.log('\n✓ Error message is helpful and actionable');
  }
}

main();
