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
    commandHint: 'Requires whisper-cli and GGML model file.',
    recommended: true
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
    commandHint: 'Requires Python transformers demo script.',
    recommended: false
  }
};

function getModelCatalog() {
  return MODEL_CATALOG;
}

function resolveRunPlan(modelId, audioPath, language = 'en') {
  const model = MODEL_CATALOG[modelId];
  if (!model) {
    throw new Error(`Unknown model id: ${modelId}`);
  }

  if (model.family === 'mock') {
    return {
      model,
      command: null,
      args: [],
      outputFile: null,
      simulatedTranscript: `Simulated transcript for ${path.basename(audioPath || 'audio')}`
    };
  }

  if (model.family === 'whisper.cpp') {
    return {
      model,
      command: process.env.WHISPER_CPP_BIN || 'whisper-cli',
      args: [
        '-m',
        process.env.WHISPER_CPP_MODEL || './models/ggml-base.en.bin',
        '-f',
        audioPath,
        '-l',
        language,
        '--no-timestamps'
      ],
      outputFile: null
    };
  }

  if (model.family === 'openai-whisper') {
    return {
      model,
      command: process.env.PYTHON_BIN || 'python',
      args: [
        '-m',
        'whisper',
        audioPath,
        '--model',
        'base',
        '--language',
        language,
        '--fp16',
        'False'
      ],
      outputFile: null
    };
  }

  return {
    model,
    command: process.env.PYTHON_BIN || 'python',
    args: [
      '-m',
      'transformers.models.qwen2_audio',
      '--audio',
      audioPath,
      '--language',
      language
    ],
    outputFile: null
  };
}

module.exports = {
  getModelCatalog,
  resolveRunPlan
};
