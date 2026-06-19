#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Voxtral transcription using VoxtralForConditionalGeneration + AutoProcessor.
Accepts a local model directory so no network access is needed at runtime.
Requires: transformers>=4.54, mistral-common[audio], librosa, soundfile

Non-WAV formats (webm, mp3, etc.) are pre-converted to 16kHz mono WAV via
librosa before being passed to the processor, since soundfile (used internally
by apply_transcription_request) does not support those formats.

Usage: python transcribe_voxtral.py <model_dir> <audio_path> [language]
"""
import os
import sys
import tempfile

import librosa
import soundfile as sf
import torch
from transformers import VoxtralForConditionalGeneration, VoxtralProcessor

# The original HuggingFace model ID is required by apply_transcription_request
# to select the correct chat template from mistral-common's registry.
VOXTRAL_MODEL_ID = 'mistralai/Voxtral-Mini-3B-2507'
SAMPLE_RATE = 16000


def convert_to_wav(input_path, output_path, sample_rate=SAMPLE_RATE):
    """
    Convert any audio file to 16kHz mono PCM WAV using librosa + soundfile.
    librosa handles formats like webm and mp3 via its ffmpeg fallback, producing
    an array that soundfile can then write as a standard WAV.
    @param {str} input_path - Source audio file path.
    @param {str} output_path - Destination WAV file path.
    @param {int} sample_rate - Target sample rate in Hz (default 16000).
    """
    audio, _ = librosa.load(input_path, sr=sample_rate, mono=True)
    sf.write(output_path, audio, sample_rate, subtype='PCM_16')


def main():
    if len(sys.argv) < 3:
        print(
            'Usage: transcribe_voxtral.py <model_dir> <audio_path> [language]',
            file=sys.stderr
        )
        sys.exit(1)

    model_dir = sys.argv[1]
    audio_path = sys.argv[2]
    language = sys.argv[3] if len(sys.argv) > 3 else 'en'
    print("Cuda version:", torch.version.cuda);
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    dtype = (
        torch.bfloat16 if torch.cuda.is_available() else torch.float32
    )

    processor = VoxtralProcessor.from_pretrained(model_dir)
    model = VoxtralForConditionalGeneration.from_pretrained(
        model_dir,
        dtype=dtype,
        device_map=device
    )

    ext = os.path.splitext(audio_path)[1].lower()
    temp_wav = None

    try:
        if ext != '.wav':
            tmp = tempfile.NamedTemporaryFile(
                suffix='.wav',
                delete=False
            )
            tmp.close()
            temp_wav = tmp.name
            convert_to_wav(audio_path, temp_wav)
            audio_input = temp_wav
        else:
            audio_input = audio_path

        inputs = processor.apply_transcription_request(
            language=language,
            audio=audio_input,
            model_id=VOXTRAL_MODEL_ID
        )

        input_len = inputs['input_ids'].shape[1]

        if torch.cuda.is_available():
            inputs = inputs.to(device, dtype=dtype)
        else:
            inputs = inputs.to(device)

        outputs = model.generate(**inputs, max_new_tokens=1024)
        decoded = processor.batch_decode(
            outputs[:, input_len:],
            skip_special_tokens=True
        )

        print(decoded[0].strip())
    finally:
        if temp_wav and os.path.exists(temp_wav):
            os.remove(temp_wav)


if __name__ == '__main__':
    main()
