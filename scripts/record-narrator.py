"""Kokoro half of scripts/record-narrator.mjs: reads [{file, text}] as JSON on stdin and
writes each line as a small mono MP3. Needs kokoro-onnx, soundfile and ffmpeg."""
import json, os, subprocess, sys, tempfile

import soundfile as sf
from kokoro_onnx import Kokoro

models, voice, out = sys.argv[1:4]
kokoro = Kokoro(os.path.join(models, "kokoro-v1.0.onnx"), os.path.join(models, "voices-v1.0.bin"))
for line in json.load(sys.stdin):
    samples, rate = kokoro.create(line["text"], voice=voice, speed=0.95, lang="en-us")
    with tempfile.NamedTemporaryFile(suffix=".wav") as wav:
        sf.write(wav.name, samples, rate)
        subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-y", "-i", wav.name, "-ac", "1", "-codec:a", "libmp3lame",
             "-b:a", "48k", os.path.join(out, line["file"])],
            check=True,
        )
    print(f"{line['file']}  {len(samples) / rate:4.1f}s  {line['text']}")
