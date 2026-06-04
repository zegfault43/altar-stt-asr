const modelSelect = document.getElementById('model');
const audioPathInput = document.getElementById('audioPath');
const languageInput = document.getElementById('language');
const iterationsInput = document.getElementById('iterations');
const durationInput = document.getElementById('duration');
const output = document.getElementById('output');
const statusNode = document.getElementById('status');

function setStatus(message) {
  statusNode.textContent = message;
}

function getPayload() {
  return {
    modelId: modelSelect.value,
    audioPath: audioPathInput.value.trim(),
    language: languageInput.value.trim() || 'en'
  };
}

async function bootstrapModels() {
  const models = await window.asrApi.getModels();
  modelSelect.innerHTML = '';
  for (const model of models) {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = `${model.label}${model.recommended ? ' (recommended)' : ''}`;
    modelSelect.appendChild(option);
  }
}

document.getElementById('pickAudio').addEventListener('click', async () => {
  const picked = await window.asrApi.pickAudioFile();
  if (picked) {
    audioPathInput.value = picked;
  }
});

document.getElementById('runTranscribe').addEventListener('click', async () => {
  try {
    setStatus('Running transcription...');
    const result = await window.asrApi.transcribe(getPayload());
    output.value = JSON.stringify(result, null, 2);
    setStatus('Transcription complete.');
  } catch (error) {
    output.value = String(error.message || error);
    setStatus('Transcription failed.');
  }
});

document.getElementById('runBenchmark').addEventListener('click', async () => {
  try {
    setStatus('Running benchmark...');
    const result = await window.asrApi.benchmark({
      ...getPayload(),
      iterations: Number(iterationsInput.value || 3),
      audioDurationSec: Number(durationInput.value || 30)
    });
    output.value = JSON.stringify(result, null, 2);
    setStatus('Benchmark complete.');
  } catch (error) {
    output.value = String(error.message || error);
    setStatus('Benchmark failed.');
  }
});

bootstrapModels().catch((error) => {
  setStatus(`Failed to load models: ${error.message}`);
});
