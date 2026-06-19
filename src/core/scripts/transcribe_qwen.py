#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Qwen3-ASR transcription using the qwen-asr package.
Accepts a local model directory so no network access is needed at runtime.

Usage: python transcribe_qwen.py <model_dir> <audio_path> [language_code]
"""
import sys
import torch
from qwen_asr import Qwen3ASRModel

# Map ISO 639-1/locale codes to full language names used by qwen-asr.
LANGUAGE_CODE_MAP = {
    'en': 'English',
    'zh': 'Chinese',
    'yue': 'Cantonese',
    'ar': 'Arabic',
    'de': 'German',
    'fr': 'French',
    'es': 'Spanish',
    'pt': 'Portuguese',
    'id': 'Indonesian',
    'it': 'Italian',
    'ko': 'Korean',
    'ru': 'Russian',
    'th': 'Thai',
    'vi': 'Vietnamese',
    'ja': 'Japanese',
    'tr': 'Turkish',
    'hi': 'Hindi',
    'ms': 'Malay',
    'nl': 'Dutch',
    'sv': 'Swedish',
    'da': 'Danish',
    'fi': 'Finnish',
    'pl': 'Polish',
    'cs': 'Czech',
    'fil': 'Filipino',
    'fa': 'Persian',
    'el': 'Greek',
    'hu': 'Hungarian',
    'mk': 'Macedonian',
    'ro': 'Romanian'
}


def main():
    if len(sys.argv) < 3:
        print(
            'Usage: transcribe_qwen.py <model_dir> <audio_path> [language]',
            file=sys.stderr
        )
        sys.exit(1)

    model_dir = sys.argv[1]
    audio_path = sys.argv[2]
    language_code = sys.argv[3] if len(sys.argv) > 3 else 'en'

    language = LANGUAGE_CODE_MAP.get(language_code)
    print("Cuda version:", torch.version.cuda)
    device_map = 'cuda:0' if torch.cuda.is_available() else 'cpu'
    dtype = (
        torch.bfloat16 if torch.cuda.is_available() else torch.float32
    )

    model = Qwen3ASRModel.from_pretrained(
        model_dir,
        dtype=dtype,
        device_map=device_map
    )

    results = model.transcribe(
        audio=audio_path,
        language=language
    )

    print(results[0].text)


if __name__ == '__main__':
    main()
