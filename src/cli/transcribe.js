#!/usr/bin/env node
const { runAsrModel } = require('../core/asr');

async function main() {
  const [, , modelId = 'mock/tiny', audioPath = '', language = 'en'] = process.argv;
  if (!audioPath) {
    console.error('Usage: npm run transcribe -- <modelId> <audioPath> [language]');
    process.exit(1);
  }

  const result = await runAsrModel({ modelId, audioPath, language });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
