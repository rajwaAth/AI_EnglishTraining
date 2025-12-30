import re
from typing import Optional, Dict, Any


def _tokenize_words(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z']+", (text or "").lower())


def compute_fluency_score(transcript: str, duration_ms: Optional[int] = None) -> Dict[str, Any]:
    words = _tokenize_words(transcript)
    word_count = len(words)

    # WPM-only "pace" metric.
    wpm: Optional[float] = None
    if duration_ms and duration_ms > 0:
        minutes = duration_ms / 60000.0
        if minutes > 0:
            wpm = word_count / minutes

    if wpm is None:
        return {
            "fluency_score": None,
            "level": None,
            "word_count": word_count,
            "filler_count": None,
            "wpm": None,
            "duration_ms": duration_ms,
        }

    # Conversational comfort zone (approx.): 120–180 WPM
    if wpm < 120:
        level = "Slow"
    elif wpm <= 180:
        level = "Normal"
    else:
        level = "Fast"

    # Map WPM to a 0–100 score (higher is closer to the comfort zone)
    # Ideal center around 150 WPM.
    ideal = 150.0
    dist = abs(wpm - ideal)
    score = 100.0 - (dist * 0.6)

    # Stronger penalty when far outside the comfort zone
    if wpm < 90:
        score -= min(25.0, (90 - wpm) * 0.8)
    elif wpm > 210:
        score -= min(25.0, (wpm - 210) * 0.6)

    # Very short samples are inherently noisy
    if word_count < 5 or (duration_ms is not None and duration_ms < 2500):
        score = min(score, 60.0)

    score_int = int(max(0, min(100, round(score))))

    return {
        "fluency_score": score_int,
        "level": level,
        "word_count": word_count,
        "filler_count": None,
        "wpm": round(wpm, 1) if wpm is not None else None,
        "duration_ms": duration_ms,
    }
