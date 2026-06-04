const { runAsrModel } = require('./asr');

const MS_PER_SECOND = 1000;

function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function summarizeBenchmarks(runs, audioDurationSec) {
  const latencies = runs.map((item) => item.elapsedMs);
  const memoryValues = runs.map((item) => item.peakRssMb);
  const avgLatencyMs = latencies.reduce((sum, value) => sum + value, 0) / latencies.length;
  const maxRssMb = Math.max(...memoryValues);
  const minRssMb = Math.min(...memoryValues);
  const realTimeFactor = audioDurationSec > 0 ? (avgLatencyMs / MS_PER_SECOND) / audioDurationSec : null;

  return {
    avgLatencyMs: roundTo(avgLatencyMs, 2),
    maxRssMb: roundTo(maxRssMb, 2),
    minRssMb: roundTo(minRssMb, 2),
    realTimeFactor: realTimeFactor === null ? null : roundTo(realTimeFactor, 3)
  };
}

async function benchmarkModel({
  modelId,
  audioPath,
  language = 'en',
  iterations = 3,
  audioDurationSec = 30,
  runFn = runAsrModel
}) {
  const runs = [];

  for (let i = 0; i < iterations; i += 1) {
    const result = await runFn({ modelId, audioPath, language });
    runs.push({
      run: i + 1,
      elapsedMs: result.elapsedMs,
      peakRssMb: result.peakRssMb,
      transcriptPreview: (result.transcript || '').slice(0, 80)
    });
  }

  return {
    modelId,
    iterations,
    audioDurationSec,
    summary: summarizeBenchmarks(runs, audioDurationSec),
    runs
  };
}

module.exports = {
  summarizeBenchmarks,
  benchmarkModel
};
