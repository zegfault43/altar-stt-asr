#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generic ASR transcription using a HuggingFace Transformers pipeline.
Accepts a local model directory so no network access is needed at runtime.

Usage: python transcribe.py <model_dir> <audio_path> [language]
"""
import sys
import torch
from transformers import pipeline


def main():
    if len(sys.argv) < 3:
        print(
            "Usage: transcribe.py <model_dir> <audio_path> [language]",
            file=sys.stderr
        )
        sys.exit(1)

    model_dir = sys.argv[1]
    audio_path = sys.argv[2]
    language = sys.argv[3] if len(sys.argv) > 3 else "en"

    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = (
        torch.float16 if torch.cuda.is_available() else torch.float32
    )

    pipe = pipeline(
        "automatic-speech-recognition",
        model=model_dir,
        torch_dtype=dtype,
        device=device
    )

    result = pipe(
        audio_path,
        generate_kwargs={"language": language, "task": "transcribe"}
    )
    print(result["text"])


if __name__ == "__main__":
    main()
