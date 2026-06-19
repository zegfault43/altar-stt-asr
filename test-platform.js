#!/usr/bin/env node
const { getPythonCommandOptions } = require('./src/core/models');
const { selectCommandOption } = require('./src/core/runtime');

async function main() {
  console.log('=== Testing Platform Detection ===\n');
  
  console.log(`Platform: ${process.platform}`);
  console.log(`Expected: ${process.platform === 'win32' ? 'Windows' : 'Unix-like'}\n`);
  
  console.log('Python command options:');
  const options = getPythonCommandOptions();
  console.log(JSON.stringify(options, null, 2));
  console.log();
  
  console.log('Attempting to select Python runtime...');
  try {
    const selected = await selectCommandOption(options, 'test-python');
    console.log(`✓ Selected: ${selected.command}`);
    console.log(`  Prefix args: ${selected.prefixArgs.join(' ') || '(none)'}`);
    console.log(`  Probe args: ${selected.probeArgs.join(' ')}`);
  } catch (error) {
    console.log(`✗ Failed: ${error.message}`);
  }
  
  console.log('\n=== All platform checks complete ===');
}

main();
