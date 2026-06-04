const test = require('node:test');
const assert = require('node:assert/strict');
const { summarizeBenchmarks, benchmarkModel } = require('../src/core/benchmark');

test('summarizeBenchmarks computes expected metrics', () => {
  const summary = summarizeBenchmarks(
    [
      { elapsedMs: 200, peakRssMb: 300 },
      { elapsedMs: 300, peakRssMb: 320 },
      { elapsedMs: 250, peakRssMb: 310 }
    ],
    10
  );

  assert.equal(summary.avgLatencyMs, 250);
  assert.equal(summary.maxRssMb, 320);
  assert.equal(summary.minRssMb, 300);
  assert.equal(summary.realTimeFactor, 0.025);
});

test('benchmarkModel executes configured iterations and computes RTF from provided duration', async () => {
  let runs = 0;
  const runFn = async () => {
    runs += 1;
    return {
      elapsedMs: 150,
      peakRssMb: 128,
      transcript: 'hello world'
    };
  };

  const result = await benchmarkModel({
    modelId: 'mock/tiny',
    audioPath: '/tmp/fake.wav',
    iterations: 2,
    audioDurationSec: 5,
    runFn
  });

  assert.equal(runs, 2);
  assert.equal(result.runs.length, 2);
  assert.equal(result.summary.avgLatencyMs, 150);
  assert.equal(result.summary.realTimeFactor, 0.03);
});
