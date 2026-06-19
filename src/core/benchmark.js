const _ = require('lodash');
const AsrRunner = require('./asr');

const MS_PER_SECOND = 1000;

/**
 * Runs model benchmarks and computes performance statistics
 */
class BenchmarkRunner {
  /**
   * Round a number to specified decimal places
   * @param {number} value - Value to round
   * @param {number} decimals - Number of decimal places
   * @returns {number} Rounded value
   */
  static roundTo(value, decimals) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  /**
   * Summarize benchmark run statistics
   * @param {object[]} runs - Array of benchmark run results
   * @param {number} audioDurationSec - Audio duration in seconds
   * @returns {object} Summary statistics
   */
  static summarizeBenchmarks(runs, audioDurationSec) {
    const latencies = _.map(runs, 'elapsedMs');
    const memoryValues = _.map(runs, 'peakRssMb');
    const avgLatencyMs = _.sum(latencies) / latencies.length;
    const maxRssMb = _.max(memoryValues);
    const minRssMb = _.min(memoryValues);
    let realTimeFactor = null;
    if (audioDurationSec > 0) {
      const avgLatencySec = avgLatencyMs / MS_PER_SECOND;
      realTimeFactor = avgLatencySec / audioDurationSec;
    }
    return {
      avgLatencyMs: BenchmarkRunner.roundTo(avgLatencyMs, 2),
      maxRssMb: BenchmarkRunner.roundTo(maxRssMb, 2),
      minRssMb: BenchmarkRunner.roundTo(minRssMb, 2),
      realTimeFactor: realTimeFactor === null
        ? null
        : BenchmarkRunner.roundTo(realTimeFactor, 3)
    };
  }

  /**
   * Run benchmark iterations on a model
   * @param {object} options - Benchmark options
   * @param {string} options.modelId - Model identifier
   * @param {string} options.audioPath - Path to audio file
   * @param {string} [options.language='en'] - Language code
   * @param {number} [options.iterations=3] - Number of iterations
   * @param {number} [options.audioDurationSec=30] - Audio duration in seconds
   * @param {Function} [options.runFn] - Run function override
   * @param {Function} [options.progressCallback] - Progress callback
   * @returns {Promise<object>} Benchmark results with summary
   */
  static async benchmarkModel({
    modelId,
    audioPath,
    language = 'en',
    iterations = 3,
    audioDurationSec = 30,
    runFn = AsrRunner.runAsrModel,
    progressCallback
  }) {
    const runs = [];
    for (let i = 0; i < iterations; i += 1) {
      if (progressCallback) {
        progressCallback(`Benchmark iteration ${i + 1}/${iterations}...`);
      }
      const result = await runFn({
        modelId, audioPath, language, progressCallback
      });
      runs.push({
        run: i + 1,
        elapsedMs: result.elapsedMs,
        peakRssMb: result.peakRssMb,
        transcriptPreview: _.get(result, 'transcript', '').slice(0, 80)
      });
    }
    return {
      modelId,
      iterations,
      audioDurationSec,
      summary: BenchmarkRunner.summarizeBenchmarks(runs, audioDurationSec),
      runs
    };
  }
}

module.exports = BenchmarkRunner;
