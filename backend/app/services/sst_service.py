from faster_whisper import WhisperModel

model = WhisperModel("base", device="cpu", compute_type="int8")

def transcribe_audio(file_path: str) -> str:
    segments, info = model.transcribe(
        file_path,
        language="en",
        beam_size=5,
        initial_prompt="This is a casual conversation from a non-native English speaker."
    )
    text = " ".join([seg.text.strip() for seg in segments])
    return text