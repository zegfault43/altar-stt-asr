// MediaRecorder and timer are kept outside Vue reactivity to avoid
// Vue's reactive proxy wrapping browser-native APIs.
let mediaRecorderInstance = null;
let recordingTimerInterval = null;

const { createApp } = Vue; // eslint-disable-line no-undef

createApp({
  data() {
    return {
      stream: null,
      models: [],
      selectedModelId: '',
      audioPath: '',
      language: 'en',
      iterations: 3,
      audioDuration: 30,
      voxtralRepo: 'mistralai/Voxtral-Mini-3B-2507',
      outputText: '',
      status: '',
      isRecording: false,
      isBusy: false,
      recordingDuration: '0:00',
      recordedChunks: [],
      recordingStartTime: null,
      activeTab: 'transcription'
    };
  },
  watch: {
    language(newLang) {
      console.warn(`Language changed to: ${newLang}`);
    }
  },
  computed: {
    selectedModel() {
      return this.models.find((m) => m.id === this.selectedModelId) || null;
    }
  },
  methods: {
    setStatus(message) {
      this.status = message;
    },
    getPayload() {
      return {
        modelId: this.selectedModelId,
        audioPath: this.audioPath.trim(),
        language: this.language,
        voxtralRepo: this.voxtralRepo.trim() || undefined
      };
    },
    updateRecordingDuration() {
      if (!this.recordingStartTime) {
        return;
      }
      const elapsed = Math.floor(
        (Date.now() - this.recordingStartTime) / 1000
      );
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      const paddedSecs = seconds < 10 ? `0${seconds}` : String(seconds);
      this.recordingDuration = `${minutes}:${paddedSecs}`;
    },
    async onStopRecording() {
      try {
        const audioBlob = new Blob(this.recordedChunks, {
          type: 'audio/webm'
        });
        const arrayBuffer = await audioBlob.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        const savedPath = await window.asrApi.saveRecording(buffer);
        this.audioPath = savedPath;
        this.setStatus(`Recording saved to: ${savedPath}`);
        if (!this.stream) {
          return;
        }
        this.stream.getTracks().forEach((track) => track.stop());
        const autoTranscribe = confirm(
          'Recording complete. Run transcription now?'
        );
        if (autoTranscribe) {
          await this.runTranscription();
        }
      } catch (error) {
        console.error('Failed to save recording:', error);
        this.setStatus(`Failed to save recording: ${error.message}`);
      }
    },
    async startRecording() {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: true
        });
        this.recordedChunks = [];
        mediaRecorderInstance = new MediaRecorder(this.stream);
        mediaRecorderInstance.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.recordedChunks.push(event.data);
          }
        };
        mediaRecorderInstance.onstop = this.onStopRecording;
        mediaRecorderInstance.start();
        this.recordingStartTime = Date.now();
        recordingTimerInterval = setInterval(
          () => this.updateRecordingDuration(),
          1000
        );
        this.isRecording = true;
        this.setStatus('Recording...');
      } catch (error) {
        console.error('Recording error:', error);
        this.setStatus(`Recording error: ${error.message}`);
      }
    },
    stopRecording() {
      // Clear timer immediately so duration stops updating
      clearInterval(recordingTimerInterval);
      recordingTimerInterval = null;
      this.recordingStartTime = null;
      this.recordingDuration = '0:00';
      this.isRecording = false;
      if (
        mediaRecorderInstance &&
        mediaRecorderInstance.state === 'recording'
      ) {
        mediaRecorderInstance.stop();
      }
    },
    async pickAudioFile() {
      const picked = await window.asrApi.pickAudioFile();
      if (picked) {
        this.audioPath = picked;
      }
    },
    async runTranscription() {
      this.outputText = '';
      if (!this.audioPath.trim()) {
        this.setStatus('Select an audio file or record audio first.');
        return;
      }
      try {
        this.isBusy = true;
        this.setStatus('Running transcription...');
        const result = await window.asrApi.transcribe(this.getPayload());
        this.outputText = JSON.stringify(result, null, 2);
        this.setStatus('Transcription complete.');
      } catch (error) {
        console.error('Transcription error:', error);
        this.outputText = String(error.message || error);
        this.setStatus('Transcription failed.');
      } finally {
        this.isBusy = false;
      }
    },
    async runBenchmark() {
      if (!this.audioPath.trim()) {
        this.setStatus('Select an audio file or record audio first.');
        return;
      }
      try {
        this.isBusy = true;
        this.setStatus('Running benchmark...');
        const payload = this.getPayload();
        const result = await window.asrApi.benchmark({
          ...payload,
          iterations: this.iterations,
          audioDurationSec: this.audioDuration
        });
        this.outputText = JSON.stringify(result, null, 2);
        this.setStatus('Benchmark complete.');
      } catch (error) {
        console.error('Benchmark error:', error);
        this.outputText = String(error.message || error);
        this.setStatus('Benchmark failed.');
      } finally {
        this.isBusy = false;
      }
    },
    async loadModels() {
      try {
        const models = await window.asrApi.getModels();
        this.models = models;
        if (models.length > 0) {
          this.selectedModelId = models[0].id;
        }
      } catch (error) {
        console.error('Failed to load models:', error);
        this.setStatus(`Failed to load models: ${error.message}`);
      }
    }
  },
  mounted() {
    window.asrApi.onProgress((message) => {
      this.setStatus(message);
    });
    this.loadModels();
  }
}).mount('#app');

