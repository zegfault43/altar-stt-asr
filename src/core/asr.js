const _ = require('lodash');
const FileUtils = require('./utils');
const ModelRegistry = require('./models');
const CommandRunner = require('./runtime');
const Installer = require('./installer');

const MOCK_MODEL_LATENCY_MS = 150;

/**
 * Runs ASR model transcription on audio files
 */
class AsrRunner {
  /**
   * Run ASR model transcription on an audio file
   * @param {object} options - Transcription options
   * @param {string} options.modelId - Model identifier
   * @param {string} options.audioPath - Path to audio file
   * @param {string} [options.language='en'] - Language code
   * @param {number} [options.timeoutMs=540000] - Timeout in milliseconds
   * @param {Function} [options.progressCallback] - Progress callback function
   * @param {string} [options.voxtralRepo] - HuggingFace repo id for Voxtral
   * @returns {Promise<object>} Transcription result
   */
  static async runAsrModel({
    modelId,
    audioPath,
    language = 'en',
    timeoutMs = 540000,
    progressCallback,
    voxtralRepo
  }) {
    const audioExists = await FileUtils.fileExists(audioPath);
    if (!audioExists) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }
    if (progressCallback) {
      progressCallback(`Ensuring ${modelId} is installed...`);
    }
    await Installer.ensureModelInstalled(modelId, { voxtralRepo });
    const plan = ModelRegistry.resolveRunPlan(modelId, audioPath, language);
    if (!plan.commandOptions) {
      const memoryUsage = process.memoryUsage();
      const peakRssMb = Number(
        (memoryUsage.rss / 1024 / 1024).toFixed(1)
      );
      return {
        modelId,
        transcript: plan.simulatedTranscript,
        elapsedMs: MOCK_MODEL_LATENCY_MS,
        peakRssMb,
        command: 'simulated'
      };
    }
    if (progressCallback) {
      progressCallback(`Selecting runtime for ${modelId}...`);
    }
    const cacheKey = `${modelId}-runtime`;
    const selectedCommand = await CommandRunner.selectCommandOption(
      plan.commandOptions, cacheKey
    );
    if (progressCallback) {
      progressCallback(`Running ${modelId} transcription...`);
    }
    const cmdArgs = [...selectedCommand.prefixArgs, ...plan.args];
    const result = await CommandRunner.runCommand(
      selectedCommand.command,
      cmdArgs,
      timeoutMs,
      _.get(plan, 'spawnEnv', null)
    );
    if (result.code !== 0) {
      const errorMsg = result.stderr || 'No stderr output.';
      throw new Error(
        `Transcription failed for ${modelId} (exit ${result.code}).\n` +
        errorMsg
      );
    }
    const memoryUsage = process.memoryUsage();
    const peakRssMb = Number((memoryUsage.rss / 1024 / 1024).toFixed(1));
    const transcript = result.stdout ||
      'No transcript emitted by command. See commandHint in docs.';
    const fullCommand = `${selectedCommand.command} ${cmdArgs.join(' ')}`;
    return {
      modelId,
      transcript,
      elapsedMs: result.elapsedMs,
      peakRssMb,
      command: fullCommand
    };
  }
}

module.exports = AsrRunner;
