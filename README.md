# altar-stt-asr

Repository for **local STT/ASR model deployment** and benchmarking on edge machines (macOS, Windows + optional GPU), with an Electron desktop prototype.

## What is included

- **Electron demo GUI** to run transcription and benchmark workflows locally.
- **Voice recording**: Built-in microphone recording with real-time duration display and automatic transcription.
- **Automatic model installation**: when you select a model and run transcription/benchmark, the app automatically downloads and installs required dependencies.
- **Cross-platform command resolution**: detects your OS (Windows/macOS/Linux) and uses appropriate Python/binary executables.
- **Output management**: All recordings and transcription outputs saved to `./output/` directory (gitignored).
- **Model adapter catalog** for:
  - `whisper.cpp` (`whisper.cpp/base.en`)
  - `openai-whisper` (`openai-whisper/base`)
  - `qwen3-asr` (`qwen3-asr/0.6b`)
  - `voxtral` (`voxtral/transcribe-2`)
  - `mock/tiny` (built-in simulator for validating flow without model install)
- **Benchmark runner** with latency, memory snapshot, and real-time factor output.
- **Node test coverage** for benchmark metric logic and iteration behavior.

---

## 1) Setup

### Prerequisites

- Node.js 22.12.0+
- npm 10+
- Python 3.10+ (for Python model adapters; app auto-detects `python3`, `python`, or `py -3` on Windows)
- **Microphone access** for voice recording feature
- Optional GPU stack (CUDA / ROCm / DirectML) based on selected local model
- For `whisper.cpp` models: ensure you have a C++ compiler if building from source, or use prebuilt binaries

**Windows users**: The app will try `py -3` first, then `python`. Ensure Python is in your PATH or use the standard Python installer with "Add to PATH" checked.

**macOS/Linux users**: The app will try `python3` first, then `python`.

### Install

```bash
npm install
```

### Quick validation (without real models)

```bash
# Test mock model (no dependencies)
node validate-install.js

# Test platform detection and Python availability
node test-platform.js

# Test all model installation checks
node test-all-models.js
```

This creates a mock audio file and tests the auto-install flow with different models.

### Run desktop app

```bash
npm start
```

### Run tests

```bash
npm test
```

---

## 2) Automatic model installation

When you select a model and click **Run Transcription** or **Run Benchmark**, the app automatically:

1. **Checks if the model is already installed** (cached locally in `./models/`).
2. **Downloads required dependencies** if missing:
   - For `mock/tiny`: No installation needed (built-in simulator).
   - For `whisper.cpp/base.en`: **Requires manual whisper.cpp binary installation first**, then auto-downloads GGML model file from Hugging Face.
   - For `openai-whisper/base`: Auto-installs `openai-whisper` Python package via pip.
   - For `qwen3-asr/0.6b`: Auto-installs `transformers`, `torch`, `torchaudio`, and downloads the model from Hugging Face.
   - For `voxtral/transcribe-2`: Requires `VOXTRAL_REPO` environment variable set to a valid Hugging Face model id, then auto-downloads and installs dependencies.
3. **Validates runtime executables** (e.g., `whisper-cli`, `python3`) and selects the correct one for your OS.

### Installing whisper.cpp (required for whisper.cpp models)

**Windows:**
```powershell
# Download latest release from GitHub
# Visit: https://github.com/ggerganov/whisper.cpp/releases
# Download whisper-cli.exe and add to PATH, or set WHISPER_CPP_BIN environment variable
```

**macOS:**
```bash
brew install whisper-cpp
```

**Linux:**
```bash
# Clone and build from source
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp
make
# Add to PATH or set WHISPER_CPP_BIN to ./main
```

### Environment variables for advanced configuration

- `WHISPER_CPP_BIN`: path to whisper.cpp executable (default: auto-detect `whisper-cli` or `whisper-cli.exe`).
- `WHISPER_CPP_MODEL`: path to GGML model file (default: `./models/ggml-base.en.bin`).
- `PYTHON_BIN`: force a specific Python interpreter (default: auto-detect).
- `QWEN3_ASR_REPO`: Hugging Face repo id for Qwen3-ASR (default: `Qwen/Qwen3-ASR-0.6B`).
- `VOXTRAL_REPO`: Hugging Face repo id for Voxtral (required if using Voxtral model).

### What happens when you click "Run Benchmark"?

1. **Status shows**: "Ensuring {model} is installed..."
2. **For each model type**:
   - `mock/tiny`: Instant (no installation)
   - `whisper.cpp/base.en`: Checks for whisper-cli binary → downloads GGML model if needed
   - `openai-whisper/base`: Detects Python → installs package via pip if needed
   - `qwen3-asr/0.6b`: Detects Python → installs transformers/torch → downloads model from HF
   - `voxtral/transcribe-2`: Same as Qwen but requires `VOXTRAL_REPO` env var
3. **Status shows**: "Selecting runtime for {model}..."
4. **Status shows**: "Running {model} transcription..."
5. **Results appear** in the output panel

**Error scenarios you might see**:
- "whisper.cpp binary not found" → Install whisper.cpp (see instructions above)
- "None of the required executables were found" → Python not installed or not in PATH
- "VOXTRAL_REPO is not configured" → Set environment variable before launching app
- "Recording error: NotAllowedError" → Grant microphone permissions in your browser/OS settings

---

## 4) Voice Recording Feature

The Electron app includes built-in voice recording for quick transcription testing:

### How to use

1. Launch `npm start`
2. Select your model from the dropdown
3. Click **Start Recording**
4. Grant microphone permission if prompted
5. Speak into your microphone (duration shown in real-time)
6. Click **Stop Recording** when finished
7. Confirm the prompt to run transcription automatically

### Technical details

- **Audio format**: WebM (Opus codec)
- **Storage location**: `./output/recording-{timestamp}.webm`
- **Browser requirement**: Modern Chromium (built into Electron)
- **Microphone access**: Required, will prompt on first use

### Troubleshooting recording

- **No microphone detected**: Check system audio input settings
- **Permission denied**: Grant microphone access in OS settings
- **Recording not working**: Ensure no other app is using the microphone

---

## 5) Open-source local STT/ASR options

### A. whisper.cpp (recommended baseline for CPU edge)

- Repo: https://github.com/ggerganov/whisper.cpp
- Strengths: lightweight deployment, excellent CPU performance, good quantized model support.
- Adapter ID in this repo: `whisper.cpp/base.en`

### B. OpenAI Whisper (PyTorch reference)

- Repo: https://github.com/openai/whisper
- Strengths: high quality baseline and ecosystem familiarity.
- Tradeoff: heavier runtime footprint than optimized local runtimes.
- Adapter ID in this repo: `openai-whisper/base`

### C. Qwen3-ASR family

- Collection: https://huggingface.co/collections/Qwen/qwen3-asr
- Strengths: modern multilingual ASR options with strong language support.
- Tradeoff: model size / VRAM requirements vary by variant.
- Adapter ID in this repo: `qwen3-asr/0.6b`

### D. Voxtral Transcribe 2 (Mistral AI)

- Reference: https://mistral.ai/news/voxtral-transcribe-2
- Strengths: state-of-the-art multilingual transcription with advanced language support.
- Tradeoff: requires valid Hugging Face credentials and `VOXTRAL_REPO` environment variable.
- Adapter ID in this repo: `voxtral/transcribe-2`

---

## 4) Benchmarking workflow

### GUI flow

1. Launch `npm start`.
2. **Option A: Use Voice Recording**
   - Click **Start Recording** to begin capturing audio
   - Speak into your microphone
   - Click **Stop Recording** when done
   - Confirm the prompt to run transcription automatically
3. **Option B: Use Audio File**
   - Pick a model from the dropdown
   - Select local audio sample file
   - Set benchmark iterations + audio duration seconds
   - Click **Run Benchmark** or **Run Transcription**
4. **The app automatically installs the model if needed** (watch the status bar for progress).

**Voice recording features:**
- Real-time recording duration display
- Visual recording indicator (pulsing red dot)
- Recordings saved to `./output/` directory with timestamps
- Auto-prompt for transcription after recording stops

### CLI flow

```bash
npm run benchmark -- mock/tiny /absolute/path/audio.wav 3 30
npm run transcribe -- mock/tiny /absolute/path/audio.wav en
```

> Use `mock/tiny` first to verify the full app flow before installing real model runtimes.

> **Note**: CLI scripts also trigger auto-installation if the selected model is not present.

### Metrics reported

- **avgLatencyMs**: average wall-clock transcription latency.
- **maxRssMb / minRssMb**: process memory snapshot range.
- **realTimeFactor**: `(avg latency seconds) / (audio duration seconds)`.
  - `< 1.0` means faster than real time.

---

## 7) Model runtime notes

The adapters call local commands and auto-install dependencies. You can still configure binaries with env vars where needed:

- `WHISPER_CPP_BIN` (default: auto-detect `whisper-cli` or `whisper-cli.exe`)
- `WHISPER_CPP_MODEL` (default `./models/ggml-base.en.bin`)
- `PYTHON_BIN` (default: auto-detect `python3`, `python`, or `py -3` on Windows)
- `QWEN3_ASR_REPO` (default `Qwen/Qwen3-ASR-0.6B`)
- `VOXTRAL_REPO` (required for Voxtral model)

If a command exits non-zero, the app surfaces stderr in the result/error output.

**Platform-specific notes:**

- **Windows**: The app uses `py -3` launcher by default, falling back to `python`. Ensure Python 3.10+ is installed.
- **macOS/Linux**: The app tries `python3` first, then `python`. Most systems have `python3` by default.
- **whisper.cpp**: If you don't have `whisper-cli` installed, the app will download the GGML model but you'll need to build or install whisper.cpp separately.

---

## 8) Realistic edge benchmark plan

Use the same audio set across hardware profiles:

- **Hardware profiles**
  - MacBook (Apple Silicon)
  - Windows laptop CPU-only
  - Windows + NVIDIA GPU
- **Audio buckets**
  - clean speech
  - noisy speech
  - accented/multilingual samples
- **Evaluation dimensions**
  - latency / RTF
  - memory footprint
  - perceived transcript quality

Record final benchmark results in a CSV or JSON artifact under `results/` (ignored by git).

---

## 9) AI-assisted development process (assignment log)

This was built with an AI coding workflow and includes:

- repository exploration and minimal-scope planning,
- scaffold-first setup (`npm init`, dependency install),
- incremental implementation (core modules, GUI, tests),
- targeted verification (`npm test` and packaging checks),
- iterative review and refinement with tool-assisted feedback.

Recommended process for continuation:

1. Add deterministic benchmark datasets and scripted runs per hardware profile.
2. Add WER/CER evaluation against reference transcripts.
3. Expand adapters to production-ready execution wrappers per selected model.
4. Add CI jobs for tests and packaging smoke checks on macOS + Windows.
