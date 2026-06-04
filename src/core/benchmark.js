const { runAsrModel } = require('./asr');

function summarizeBenchmarks(runs, audioDurationSec) {
  const latencies = runs.map((item) => item.elapsedMs);
  const memoryValues = runs.map((item) => item.peakRssMb);
  const avgLatencyMs = latencies.reduce((sum, value) => sum + value, 0) / latencies.length;
  const maxRssMb = Math.max(...memoryValues);
  const minRssMb = Math.min(...memoryValues);
  const realTimeFactor = audioDurationSec > 0 ? (avgLatencyMs / 1000) / audioDurationSec : null;

  return {
    avgLatencyMs: Number(avgLatencyMs.toFixed(2)),
    maxRssMb: Number(maxRssMb.toFixed(2)),
    minRssMb: Number(minRssMb.toFixed(2)),
    realTimeFactor: realTimeFactor === null ? null : Number(realTimeFactor.toFixed(3))
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
      transcriptPreview: result.transcript.slice(0, 80)
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
