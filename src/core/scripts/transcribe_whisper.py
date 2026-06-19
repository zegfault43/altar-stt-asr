#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Whisper.cpp wrapper with automatic audio format conversion.
Converts any audio format (webm, mp3, ogg, etc.) to 16kHz mono WAV using
librosa + soundfile before invoking whisper-cli, then prints the transcript.

Usage: python transcribe_whisper.py <model_path> <audio_path> [language]
"""
import os
import shutil
import subprocess
import sys
import tempfile

import librosa
import soundfile as sf

WHISPER_CLI_CANDIDATES = ['whisper-cli', 'whisper-cli.exe']


def find_whisper_cli():
    """
    Locate the whisper-cli binary.
    Checks WHISPER_CPP_BIN env var first, then falls back to PATH.
    @returns {str|None} Absolute path to the binary, or None if not found.
    """
    env_bin = os.environ.get('WHISPER_CPP_BIN')
    if env_bin:
        if os.path.isfile(env_bin):
            return env_bin
        found = shutil.which(env_bin)
        if found:
            return found
    for name in WHISPER_CLI_CANDIDATES:
        found = shutil.which(name)
        if found:
            return found
    return None


def convert_to_wav(input_path, output_path, sample_rate=16000):
    """
    Convert any audio file to 16kHz mono PCM WAV using librosa + soundfile.
    @param {str} input_path - Source audio file path.
    @param {str} output_path - Destination WAV file path.
    @param {int} sample_rate - Target sample rate in Hz (default 16000).
    """
    audio, _ = librosa.load(input_path, sr=sample_rate, mono=True)
    sf.write(output_path, audio, sample_rate, subtype='PCM_16')


def main():
    if len(sys.argv) < 3:
        print(
            'Usage: transcribe_whisper.py <model_path> <audio_path> [language]',
            file=sys.stderr
        )
        sys.exit(1)

    model_path = sys.argv[1]
    audio_path = sys.argv[2]
    language = sys.argv[3] if len(sys.argv) > 3 else 'en'

    whisper_cli = find_whisper_cli()
    if not whisper_cli:
        print(
            'Error: whisper-cli binary not found. '
            'Set WHISPER_CPP_BIN env var or add it to PATH.',
            file=sys.stderr
        )
        sys.exit(1)

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
            input_path = temp_wav
        else:
            input_path = audio_path

        cmd = [
            whisper_cli,
            '-m', model_path,
            '-f', input_path,
            '-l', language,
            '--no-timestamps'
        ]
        print(f"Running command: {' '.join(cmd)}", file=sys.stderr)
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding='utf-8'
        )

        if result.returncode != 0:
            print(result.stderr, file=sys.stderr)
            sys.exit(result.returncode)

        print(result.stdout.strip())

    finally:
        if temp_wav and os.path.exists(temp_wav):
            os.unlink(temp_wav)


if __name__ == '__main__':
    main()
