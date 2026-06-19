const _ = require('lodash');
const path = require('path');

const MODEL_CATALOG = {
  'mock/tiny': {
    id: 'mock/tiny',
    label: 'Mock Tiny (no model install)',
    family: 'mock',
    commandHint: 'Built-in simulator for validating flow and UI.',
    recommended: true
  },
  'whisper.cpp/base.en': {
    id: 'whisper.cpp/base.en',
    label: 'whisper.cpp base.en',
    family: 'whisper.cpp',
    commandHint: 'Requires whisper-cli binary and GGML model file.',
    recommended: true,
    setupNote: 'Requires manual binary install — admin cannot auto-install ' +
      'compiled binaries. Windows: download from ' +
      'https://github.com/ggerganov/whisper.cpp/releases and add to PATH. ' +
      'macOS: brew install whisper-cpp.'
  },
  'voxtral/transcribe-2': {
    id: 'voxtral/transcribe-2',
    label: 'Voxtral Transcribe 2 (HF local runtime)',
    family: 'voxtral',
    commandHint: 'Requires Python transformers and a Voxtral HF repo id.',
    recommended: false,
    requiresConfig: 'voxtralRepo'
  },
  'openai-whisper/base': {
    id: 'openai-whisper/base',
    label: 'OpenAI Whisper base (Python)',
    family: 'openai-whisper',
    commandHint: 'Requires python + openai-whisper package.',
    recommended: false
  },
  'qwen3-asr/0.6b': {
    id: 'qwen3-asr/0.6b',
    label: 'Qwen3-ASR 0.6B (Transformers)',
    family: 'qwen3-asr',
    commandHint: 'Requires Python + transformers + downloaded model.',
    recommended: false
  }
};

// Env vars required on Windows to prevent Python from encoding stdout
// with the system codepage, which cannot represent CJK characters.
const PYTHON_SPAWN_ENV = {
  PYTHONUTF8: '1',
  PYTHONIOENCODING: 'utf-8'
};

/**
 * Registry for model metadata and execution plan resolution
 */
class ModelRegistry {
  /**
   * Get the full model catalog
   * @returns {object} Model catalog object
   */
  static getModelCatalog() {
    return MODEL_CATALOG;
  }

  /**
   * Get Python command options for current platform
   * @param {string} [platform=process.platform] - Platform identifier
   * @param {object} [env=process.env] - Environment variables
   * @returns {object[]} Array of command options to try
   */
  static getPythonCommandOptions(
    platform = process.platform,
    env = process.env
  ) {
    if (_.get(env, 'PYTHON_BIN', '')) {
      return [{
        command: env.PYTHON_BIN,
        prefixArgs: [],
        probeArgs: ['--version']
      }];
    }
    if (platform === 'win32') {
      return [
        {
          command: 'python',
          prefixArgs: [],
          probeArgs: ['--version'],
          preferCuda: true
        },
        {
          command: 'py',
          prefixArgs: ['-3.12'],
          probeArgs: ['-3.12', '--version'],
          preferCuda: true
        }
      ];
    }
    return [
      {
        command: 'python3',
        prefixArgs: [],
        probeArgs: ['--version'],
        preferCuda: true
      },
      {
        command: 'python',
        prefixArgs: [],
        probeArgs: ['--version'],
        preferCuda: true
      }
    ];
  }

  /**
   * Get whisper.cpp command options for current platform
   * @param {string} [platform=process.platform] - Platform identifier
   * @param {object} [env=process.env] - Environment variables
   * @returns {object[]} Array of command options to try
   */
  static getWhisperCppCommandOptions(
    platform = process.platform,
    env = process.env
  ) {
    if (_.get(env, 'WHISPER_CPP_BIN', '')) {
      return [{
        command: env.WHISPER_CPP_BIN,
        prefixArgs: [],
        probeArgs: ['--help']
      }];
    }
    if (platform === 'win32') {
      return [
        {
          command: 'whisper-cli.exe',
          prefixArgs: [],
          probeArgs: ['--help']
        },
        {
          command: 'whisper-cli',
          prefixArgs: [],
          probeArgs: ['--help']
        }
      ];
    }
    return [{
      command: 'whisper-cli',
      prefixArgs: [],
      probeArgs: ['--help']
    }];
  }

  /**
   * Resolve execution plan for a specific model
   * @param {string} modelId - Model identifier
   * @param {string} audioPath - Path to audio file
   * @param {string} [language='en'] - Language code
   * @returns {object} Execution plan with command options and args
   */
  static resolveRunPlan(modelId, audioPath, language = 'en') {
    const model = _.get(MODEL_CATALOG, modelId, null);
    if (!model) {
      throw new Error(`Unknown model id: ${modelId}`);
    }
    if (model.family === 'mock') {
      const filename = path.basename(audioPath || 'audio');
      return {
        model,
        commandOptions: null,
        args: [],
        outputFile: null,
        simulatedTranscript: `Simulated transcript for ${filename}`
      };
    }
    if (model.family === 'whisper.cpp') {
      const scriptPath = path.join(
        __dirname, 'scripts', 'transcribe_whisper.py'
      );
      const modelPath = _.get(
        process.env, 'WHISPER_CPP_MODEL', './models/ggml-base.en.bin'
      );
      return {
        model,
        commandOptions: ModelRegistry.getPythonCommandOptions(),
        args: [scriptPath, modelPath, audioPath, language],
        outputFile: null,
        spawnEnv: PYTHON_SPAWN_ENV
      };
    }
    if (model.family === 'openai-whisper') {
      return {
        model,
        commandOptions: ModelRegistry.getPythonCommandOptions(),
        args: [
          '-m', 'whisper', audioPath,
          '--model', 'base',
          '--device', 'cuda',
          '--language', language,
          '--fp16', 'False'
        ],
        outputFile: null,
        spawnEnv: PYTHON_SPAWN_ENV
      };
    }
    if (model.family === 'voxtral') {
      const scriptPath = path.join(
        __dirname, 'scripts', 'transcribe_voxtral.py'
      );
      const localDir = path.resolve(
        process.cwd(), 'models', 'voxtral-transcribe-2'
      );
      return {
        model,
        commandOptions: ModelRegistry.getPythonCommandOptions(),
        args: [scriptPath, localDir, audioPath, language],
        outputFile: null,
        spawnEnv: PYTHON_SPAWN_ENV
      };
    }
    const qwenScript = path.join(
      __dirname, 'scripts', 'transcribe_qwen.py'
    );
    const qwenModelDir = path.resolve(
      process.cwd(), 'models', 'qwen3-asr-0.6b'
    );
    return {
      model,
      commandOptions: ModelRegistry.getPythonCommandOptions(),
      args: [qwenScript, qwenModelDir, audioPath, language],
      outputFile: null,
      spawnEnv: PYTHON_SPAWN_ENV
    };
  }
}

module.exports = ModelRegistry;
