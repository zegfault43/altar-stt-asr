const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const FileUtils = require('./utils');
const ModelRegistry = require('./models');
const CommandRunner = require('./runtime');

const installedCache = new Set();

/**
 * Manages model dependency installation and download
 */
class Installer {
  /**
   * Download a file from a URL to a local destination using fetch
   * @param {string} url - Source URL
   * @param {string} destination - Destination file path
   * @returns {Promise<void>}
   */
  static async downloadFile(url, destination) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download failed (${response.status}) for ${url}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    await fs.writeFile(destination, Buffer.from(arrayBuffer));
  }

  /**
   * Ensure a Python package is installed via pip
   * @param {object} pyExec - Python executable configuration
   * @param {string} packageName - Package name for import check
   * @param {string[]} installArgs - Pip install arguments
   * @returns {Promise<void>}
   */
  static async ensurePythonPackage(pyExec, packageName, installArgs) {
    const checkCmd = [...pyExec.prefixArgs, '-c', `import ${packageName}`];
    const check = await CommandRunner.runCommand(
      pyExec.command, checkCmd, 30000
    );
    if (check.code === 0) { return; }
    const installCmd = [
      ...pyExec.prefixArgs, '-m', 'pip', 'install', '--upgrade',
      ...installArgs
    ];
    const install = await CommandRunner.runCommand(
      pyExec.command, installCmd, 600000
    );
    if (install.code !== 0) {
      const errorMsg = install.stderr ||
        `Failed to install: ${installArgs.join(', ')}`;
      throw new Error(errorMsg);
    }
  }

  /**
   * Download a HuggingFace model via snapshot_download
   * @param {object} pyExec - Python executable configuration
   * @param {string} repoId - HuggingFace repository ID
   * @param {string} localDir - Local directory to download model to
   * @returns {Promise<void>}
   */
  static async downloadHuggingFaceModel(pyExec, repoId, localDir) {
    const markerPath = path.join(localDir, '.download-ok');
    if (await FileUtils.fileExists(markerPath)) { return; }
    await fs.ensureDir(localDir);
    const escapedPath = localDir.replace(/\\/g, '\\\\');
    const pythonScript = [
      'from huggingface_hub import snapshot_download',
      `snapshot_download(repo_id='${repoId}', ` +
      `local_dir=r'${escapedPath}', local_dir_use_symlinks=False)`
    ].join('; ');
    const downloadResult = await CommandRunner.runCommand(
      pyExec.command, [...pyExec.prefixArgs, '-c', pythonScript], 1200000
    );
    if (downloadResult.code !== 0) {
      const errorMsg = downloadResult.stderr ||
        `Failed to download ${repoId}`;
      throw new Error(errorMsg);
    }
    await fs.writeFile(markerPath, new Date().toISOString(), 'utf8');
  }

  /**
   * Ensure whisper.cpp binary and model files are available
   * @returns {Promise<void>}
   */
  static async ensureWhisperCppAssets() {
    try {
      const cmdOptions = ModelRegistry.getWhisperCppCommandOptions();
      await CommandRunner.selectCommandOption(
        cmdOptions, 'whisper-cpp-runtime'
      );
    } catch (error) {
      console.error(error);
      throw new Error([
        'whisper.cpp binary not found. Please install whisper.cpp:',
        '  Windows: Download from ' +
        'https://github.com/ggerganov/whisper.cpp/releases',
        '  macOS: brew install whisper-cpp',
        '  Linux: Build from https://github.com/ggerganov/whisper.cpp',
        'Or set WHISPER_CPP_BIN environment variable to binary path.'
      ].join('\n'));
    }
    const modelPath = process.env.WHISPER_CPP_MODEL
      ? path.resolve(process.env.WHISPER_CPP_MODEL)
      : path.resolve(process.cwd(), 'models', 'ggml-base.en.bin');
    await fs.ensureDir(path.dirname(modelPath));
    if (!(await FileUtils.fileExists(modelPath))) {
      const modelUrl =
        'https://huggingface.co/ggerganov/whisper.cpp/' +
        'resolve/main/ggml-base.en.bin';
      await Installer.downloadFile(modelUrl, modelPath);
    }
  }

  /**
   * Ensure Qwen ASR model and dependencies are installed
   * @param {object} pyExec - Python executable configuration
   * @returns {Promise<void>}
   */
  static async ensureQwenModel(pyExec) {
    const packages = [
      'transformers', 'accelerate', 'huggingface_hub', 'torch', 'torchaudio'
    ];
    await Installer.ensurePythonPackage(pyExec, 'transformers', packages);
    const repoId = _.get(
      process.env, 'QWEN3_ASR_REPO', 'Qwen/Qwen3-ASR-0.6B'
    );
    const localDir = path.resolve(process.cwd(), 'models', 'qwen3-asr-0.6b');
    await Installer.downloadHuggingFaceModel(pyExec, repoId, localDir);
  }

  /**
   * Ensure Voxtral model and dependencies are installed
   * @param {object} pyExec - Python executable configuration
   * @param {string} [voxtralRepo] - HuggingFace repo id override
   * @returns {Promise<void>}
   */
  static async ensureVoxtralModel(pyExec, voxtralRepo) {
    const packages = [
      'transformers', 'accelerate', 'huggingface_hub', 'torch', 'torchaudio'
    ];
    await Installer.ensurePythonPackage(pyExec, 'transformers', packages);
    const repoId = voxtralRepo || _.get(process.env, 'VOXTRAL_REPO', '');
    if (!repoId) {
      throw new Error(
        'Voxtral repo not configured. ' +
        'Enter a HuggingFace repo ID in the app settings ' +
        '(e.g. mistralai/Voxtral-S-24B).'
      );
    }
    const localDir = path.resolve(
      process.cwd(), 'models', 'voxtral-transcribe-2'
    );
    await Installer.downloadHuggingFaceModel(pyExec, repoId, localDir);
  }

  /**
   * Ensure the specified model is installed and ready
   * @param {string} modelId - Model identifier
   * @param {object} [options={}] - Options
   * @param {string} [options.voxtralRepo] - HuggingFace repo id for Voxtral
   * @returns {Promise<void>}
   */
  static async ensureModelInstalled(modelId, options = {}) {
    if (installedCache.has(modelId)) { return; }
    const model = _.get(ModelRegistry.getModelCatalog(), modelId, null);
    if (!model) {
      throw new Error(`Unknown model id: ${modelId}`);
    }
    if (model.family === 'mock') {
      installedCache.add(modelId);
      return;
    }
    if (model.family === 'whisper.cpp') {
      await Installer.ensureWhisperCppAssets();
      installedCache.add(modelId);
      return;
    }
    const pyOptions = ModelRegistry.getPythonCommandOptions();
    const pyExec = await CommandRunner.selectCommandOption(
      pyOptions, 'python-runtime'
    );
    if (model.family === 'openai-whisper') {
      await Installer.ensurePythonPackage(pyExec, 'whisper', ['openai-whisper']);
      installedCache.add(modelId);
      return;
    }
    if (model.family === 'qwen3-asr') {
      await Installer.ensureQwenModel(pyExec);
      installedCache.add(modelId);
      return;
    }
    if (model.family === 'voxtral') {
      await Installer.ensureVoxtralModel(
        pyExec, _.get(options, 'voxtralRepo', '')
      );
      installedCache.add(modelId);
    }
  }
}

module.exports = Installer;
