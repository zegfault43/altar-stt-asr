# altar-stt-asr

MVP repository for **local STT/ASR model deployment** and benchmarking on edge machines (macOS, Windows + optional GPU), with an Electron desktop prototype.

## What is included

- **Electron demo GUI** to run transcription and benchmark workflows locally.
- **Model adapter catalog** for:
  - `whisper.cpp` (`whisper.cpp/base.en`)
  - `openai-whisper` (`openai-whisper/base`)
  - `qwen3-asr` (`qwen3-asr/0.6b`)
  - `mock/tiny` (built-in simulator for validating flow without model install)
- **Benchmark runner** with latency, memory snapshot, and real-time factor output.
- **Node test coverage** for benchmark metric logic and iteration behavior.

---

## 1) Setup

### Prerequisites

- Node.js 22.12.0+
- npm 10+
- Python 3.10+ (for Python model adapters)
- Optional GPU stack (CUDA / ROCm / DirectML) based on selected local model

### Install

```bash
npm install
```

### Run desktop app

```bash
npm start
```

### Run tests

```bash
npm test
```

---

## 2) Open-source local STT/ASR options

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

### D. Voxtral Transcribe 2 (research reference)

- Reference: https://mistral.ai/news/voxtral-transcribe-2
- Use this as an additional benchmark/reference target where local deployment path is available.

---

## 3) Benchmarking workflow

### GUI flow

1. Launch `npm start`.
2. Pick a model from the dropdown.
3. Select local audio sample file.
4. Set benchmark iterations + audio duration seconds.
5. Click **Run Benchmark**.

### CLI flow

```bash
npm run benchmark -- mock/tiny /absolute/path/audio.wav 3 30
npm run transcribe -- mock/tiny /absolute/path/audio.wav en
```

> Use `mock/tiny` first to verify the full app flow before installing real model runtimes.

### Metrics reported

- **avgLatencyMs**: average wall-clock transcription latency.
- **maxRssMb / minRssMb**: process memory snapshot range.
- **realTimeFactor**: `(avg latency seconds) / (audio duration seconds)`.
  - `< 1.0` means faster than real time.

---

## 4) Model runtime notes

The adapters call local commands. Configure binaries with env vars where needed:

- `WHISPER_CPP_BIN` (default `whisper-cli`)
- `WHISPER_CPP_MODEL` (default `./models/ggml-base.en.bin`)
- `PYTHON_BIN` (default `python`)

If a command exits non-zero, the app surfaces stderr in the result/error output.

---

## 5) Realistic edge benchmark plan

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

## 6) AI-assisted development process (assignment log)

This MVP was built with an AI coding workflow and includes:

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
