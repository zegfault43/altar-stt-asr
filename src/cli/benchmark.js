#!/usr/bin/env node
const { benchmarkModel } = require('../core/benchmark');

async function main() {
  const [, , modelId = 'mock/tiny', audioPath = '', iterationsArg = '3', audioDurationArg = '30'] = process.argv;
  if (!audioPath) {
    console.error('Usage: npm run benchmark -- <modelId> <audioPath> [iterations] [audioDurationSec]');
    process.exit(1);
  }

  const result = await benchmarkModel({
    modelId,
    audioPath,
    iterations: Number(iterationsArg),
    audioDurationSec: Number(audioDurationArg)
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
