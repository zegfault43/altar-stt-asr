const _ = require('lodash');
const { spawn } = require('child_process');

const selectedCommandCache = new Map();

/**
 * Handles command execution, probing, and runtime selection
 */
class CommandRunner {
  /**
   * Get platform-friendly label for current OS
   * @param {string} [platform=process.platform] - Platform identifier
   * @returns {string} Human-readable platform name
   */
  static getPlatformLabel(platform = process.platform) {
    if (platform === 'win32') { return 'Windows'; }
    if (platform === 'darwin') { return 'macOS'; }
    return 'Linux';
  }

  /**
   * Execute a shell command and capture output
   * @param {string} command - Command to execute
   * @param {string[]} args - Command arguments
   * @param {number} [timeoutMs=540000] - Timeout in milliseconds
   * @param {object|null} [extraEnv=null] - Extra env vars merged with process.env
   * @returns {Promise<object>} Result with code, stdout, stderr, elapsedMs
   */
  static runCommand(command, args, timeoutMs = 540000, extraEnv = null) {
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const env = extraEnv
        ? { ...process.env, ...extraEnv }
        : process.env;
      console.warn(
        `Running command: ${command} ${args.join(' ')} ` +
        `with timeout ${timeoutMs}ms`
      );
      const spawnOptions = { stdio: ['ignore', 'pipe', 'pipe'], env };
      const child = spawn(command, args, spawnOptions);
      let stdout = '';
      let stderr = '';
      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      child.stdout.on('data', (chunk) => { stdout += String(chunk); });
      child.stderr.on('data', (chunk) => { stderr += String(chunk); });
      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.on('close', (code) => {
        clearTimeout(timeout);
        resolve({
          code,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          elapsedMs: Date.now() - startedAt
        });
      });
    });
  }

  /**
   * Probe a command option to check if it works
   * @param {object} option - Command option configuration
   * @returns {Promise<boolean>} True if command is available
   */
  static async probeOption(option) {
    try {
      const probeArgs = option.probeArgs ||
        [...(option.prefixArgs || []), '--version'];
      const result = await CommandRunner.runCommand(
        option.command, probeArgs, 20000
      );
      return result.code === 0;
    } catch {
      return false;
    }
  }

  /**
   * Probe if CUDA is available via a given command option
   * @param {object} option - Command option configuration
   * @returns {Promise<boolean>} True if torch.cuda.is_available() returns True
   */
  static async probeCuda(option) {
    try {
      const cudaScript =
        'import torch; exit(0 if torch.cuda.is_available() else 1)';
      const cudaArgs = [...(option.prefixArgs || []), '-c', cudaScript];
      const result = await CommandRunner.runCommand(
        option.command, cudaArgs, 20000
      );
      return result.code === 0;
    } catch {
      return false;
    }
  }

  /**
   * Pick the best option from working options, preferring CUDA
   * @param {object[]} workingOptions - Options that passed basic probe
   * @param {string} [cacheKey] - Cache key for memoization
   * @returns {Promise<object>} Selected command option
   */
  static async selectFromWorking(workingOptions, cacheKey) {
    for (const option of workingOptions) {
      if (option.preferCuda && await CommandRunner.probeCuda(option)) {
        if (cacheKey) { selectedCommandCache.set(cacheKey, option); }
        return option;
      }
    }
    const selected = workingOptions[0];
    if (cacheKey) { selectedCommandCache.set(cacheKey, selected); }
    return selected;
  }

  /**
   * Select first working command from options list, preferring CUDA-capable
   * ones when any option carries the preferCuda flag
   * @param {object[]} options - Array of command options to try
   * @param {string} [cacheKey] - Cache key for memoization
   * @returns {Promise<object>} Selected working command option
   */
  static async selectCommandOption(options, cacheKey) {
    if (!_.isArray(options) || _.isEmpty(options)) {
      throw new Error('No command options were provided.');
    }
    if (cacheKey && selectedCommandCache.has(cacheKey)) {
      return selectedCommandCache.get(cacheKey);
    }
    const hasCudaPref = _.some(options, 'preferCuda');
    if (!hasCudaPref) {
      for (const option of options) {
        if (await CommandRunner.probeOption(option)) {
          if (cacheKey) { selectedCommandCache.set(cacheKey, option); }
          return option;
        }
      }
    } else {
      const working = [];
      for (const option of options) {
        if (await CommandRunner.probeOption(option)) { working.push(option); }
      }
      if (!_.isEmpty(working)) {
        return CommandRunner.selectFromWorking(working, cacheKey);
      }
    }
    const tried = _.map(options, 'command').join(', ');
    const platform = CommandRunner.getPlatformLabel();
    throw new Error(
      `None of the required executables were found ` +
      `for ${platform}. Tried: ${tried}.`
    );
  }
}

module.exports = CommandRunner;
