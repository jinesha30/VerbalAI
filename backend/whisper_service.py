from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper
import tempfile
import os
import subprocess
import glob
import shutil
from difflib import SequenceMatcher
import logging
import re
import json

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load Whisper model
logger.info("Loading Whisper model...")
# Using 'small' model for good Hindi Devanagari script support
# Options: tiny, base, small, medium, large
# Small model (500MB) has excellent multilingual support for Hindi script
model = whisper.load_model("small")
logger.info("Whisper model loaded successfully")


def get_audio_extension(file_obj):
    """Pick a safe temp extension from uploaded filename/content type."""
    filename = (getattr(file_obj, 'filename', '') or '').lower()
    content_type = (getattr(file_obj, 'content_type', '') or '').lower()

    if filename.endswith('.wav'):
        return '.wav'
    if filename.endswith('.webm'):
        return '.webm'
    if filename.endswith('.ogg') or 'ogg' in content_type:
        return '.ogg'
    if filename.endswith('.mp3') or 'mpeg' in content_type:
        return '.mp3'
    if filename.endswith('.m4a'):
        return '.m4a'
    if filename.endswith('.mp4') or 'mp4' in content_type:
        return '.mp4'

    # Browser MediaRecorder commonly produces webm/opus.
    if 'webm' in content_type or 'opus' in content_type:
        return '.webm'

    return '.webm'


def save_uploaded_audio(file_obj):
    """Save uploaded audio to a temp file with a realistic extension."""
    suffix = get_audio_extension(file_obj)
    temp_fd, temp_path = tempfile.mkstemp(suffix=suffix)
    os.close(temp_fd)
    file_obj.save(temp_path)
    return temp_path


def preprocess_audio_for_whisper(input_path):
    """Normalize audio to mono 16k WAV for stable Whisper decoding."""
    out_fd, out_path = tempfile.mkstemp(suffix='.wav')
    os.close(out_fd)
    try:
        cmd = [
            'ffmpeg', '-y',
            '-i', input_path,
            '-ac', '1',
            '-ar', '16000',
            '-vn',
            '-af', 'highpass=f=80,lowpass=f=7600',
            out_path
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return out_path
    except Exception as e:
        logger.warning(f"Audio preprocessing failed ({e}); using original audio")
        try:
            if os.path.exists(out_path):
                os.unlink(out_path)
        except Exception:
            pass
        return input_path


def split_audio_into_chunks(input_path, segment_seconds=18):
    """Split audio into short WAV chunks for stable long-paragraph transcription."""
    chunk_dir = tempfile.mkdtemp(prefix='whisper_chunks_')
    pattern = os.path.join(chunk_dir, 'chunk_%03d.wav')
    try:
        cmd = [
            'ffmpeg', '-y',
            '-i', input_path,
            '-f', 'segment',
            '-segment_time', str(segment_seconds),
            '-reset_timestamps', '1',
            '-ac', '1',
            '-ar', '16000',
            pattern
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        chunk_paths = sorted(glob.glob(os.path.join(chunk_dir, 'chunk_*.wav')))
        if not chunk_paths:
            return [input_path], None
        return chunk_paths, chunk_dir
    except Exception as e:
        logger.warning(f"Chunk split failed ({e}); falling back to single-pass transcription")
        try:
            shutil.rmtree(chunk_dir, ignore_errors=True)
        except Exception:
            pass
        return [input_path], None


def transcribe_long_audio_chunked(input_path, whisper_language='hi', initial_prompt=''):
    """Transcribe long audio by chunking and stitching best chunk transcripts."""
    chunks, chunk_dir = split_audio_into_chunks(input_path, segment_seconds=18)
    parts = []
    try:
        for idx, chunk_path in enumerate(chunks):
            prompt = str(initial_prompt or '')[:240] if idx == 0 else ''
            result = model.transcribe(
                chunk_path,
                fp16=False,
                language=whisper_language,
                task='transcribe',
                condition_on_previous_text=False,
                temperature=0.0,
                beam_size=5,
                best_of=5,
                compression_ratio_threshold=2.6,
                logprob_threshold=-1.0,
                no_speech_threshold=0.55,
                initial_prompt=prompt or None,
            )
            text = sanitize_transcription_result(result, aggressive=True).strip()
            if not text:
                continue
            if is_repetitive_transcription(text):
                continue
            parts.append(text)

        stitched = ' '.join(parts).strip()
        return stitched
    finally:
        if chunk_dir:
            try:
                shutil.rmtree(chunk_dir, ignore_errors=True)
            except Exception:
                pass


def calculate_similarity(expected, recognized):
    """
    Calculate similarity between expected and recognized words using SequenceMatcher.
    
    Args:
        expected (str): The expected word or text
        recognized (str): The recognized word or text from speech
    
    Returns:
        float: Similarity ratio between 0.0 and 1.0, where 1.0 is a perfect match
    """
    expected = expected.lower().strip()
    recognized = recognized.lower().strip()
    return SequenceMatcher(None, expected, recognized).ratio()


def normalize_hindi_text(text):
    """Normalize Hindi text for robust speech-to-text comparison."""
    if not isinstance(text, str):
        text = str(text) if text else ''

    # Remove punctuation and normalize whitespace.
    text = re.sub(r'[।,!?;:\-]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()

    # Remove nukta to reduce OCR/STT spelling variance (e.g., ज़ vs ज).
    text = text.replace('़', '')

    # Canonical replacements for common transliteration variants.
    text = text.replace('ड़', 'ड').replace('ढ़', 'ढ')

    return text


def normalize_marathi_text(text):
    """Normalize Marathi text by folding common compound and suffix variants."""
    if not isinstance(text, str):
        text = str(text) if text else ''

    text = normalize_hindi_text(text)
    text = convert_devanagari_digits(text)

    token_map = {
        'गुढीपाडवा': 'पाडवा',
        'गुढीपाडव्या': 'पाडवा',
        'गुढीपाडव्याचा': 'पाडवा',
        'गुढीपाडव्याची': 'पाडवा',
        'गुढीपाडव्याचे': 'पाडवा',
        'महाराष्ट्राचा': 'महाराष्ट्र',
        'महाराष्ट्राची': 'महाराष्ट्र',
        'महाराष्ट्राचे': 'महाराष्ट्र',
        'महाराष्ट्राच्या': 'महाराष्ट्र',
    }
    suffixes = ('चा', 'ची', 'चे', 'च्या', 'ला', 'ले', 'ली', 'ना', 'नी', 'ने', 'वर', 'मध्ये', 'पासून', 'साठी', 'कडे')

    normalized_tokens = []
    for raw_token in re.split(r'\s+', text):
        token = raw_token.strip()
        if not token:
            continue

        token = token_map.get(token, token)
        for suffix in suffixes:
            if len(token) > len(suffix) + 1 and token.endswith(suffix):
                token = token[:-len(suffix)]
                break

        if token:
            normalized_tokens.append(token)

    return ' '.join(normalized_tokens).strip()


def convert_devanagari_digits(text):
    if not isinstance(text, str):
        text = str(text) if text else ''
    devanagari_digits = str.maketrans('०१२३४५६७८९', '0123456789')
    return text.translate(devanagari_digits)


def normalize_hindi_year_phrases(text):
    """Convert common Hindi spoken year phrases (including STT variants) into digits."""
    if not isinstance(text, str):
        text = str(text) if text else ''

    t = convert_devanagari_digits(normalize_hindi_text(text))

    year_patterns = [
        (r'(उन्नीस|उनीस|उनिस|उनिस्टो|उन्निस)\s*(सौ|सो)?\s*(पचास)', '1950'),
        (r'(उन्नीस|उनीस|उनिस|उनिस्टो|उन्निस)\s*(सौ|सो)?\s*(सैंतालीस|सैंतालिस|सैतालीस)', '1947'),
        (r'(उन्नीस|उनीस|उनिस|उनिस्टो|उन्निस)\s*(सौ|सो)?\s*(बयालीस|बयालिस)', '1942'),
        (r'(उन्नीस|उनीस|उनिस|उनिस्टो|उन्निस)\s*(सौ|सो)?\s*(तीस)', '1930'),
        (r'(उन्नीस|उनीस|उनिस|उनिस्टो|उन्निस)\s*(सौ|सो)?\s*(बीस)', '1920'),
        (r'(अठारह|अठारा|अट्ठारह)\s*(सौ|सो)?\s*(इक्यानवे|इक्यानबे|इक्याणवे|इक्यानव्वे)', '1891')
    ]

    for pattern, replacement in year_patterns:
        t = re.sub(pattern, replacement, t)

    return t


def canonicalize_hindi_number_token(token):
    """Return canonical numeric token for common Hindi number forms, else original token."""
    t = convert_devanagari_digits(normalize_hindi_text(token)).replace(' ', '')
    if not t:
        return t
    if t.isdigit():
        return t

    word_map = {
        'शून्य': '0', 'एक': '1', 'दो': '2', 'तीन': '3', 'चार': '4', 'पांच': '5', 'पाँच': '5',
        'छह': '6', 'सात': '7', 'आठ': '8', 'नौ': '9', 'दस': '10', 'ग्यारह': '11',
        'बारह': '12', 'तेरह': '13', 'चौदह': '14', 'पंद्रह': '15', 'पन्द्रह': '15',
        'सोलह': '16', 'सत्रह': '17', 'अठारह': '18', 'उन्नीस': '19', 'बीस': '20',
        'बयालीस': '42', 'बयालिस': '42', 'सैंतालीस': '47', 'सैंतालिस': '47', 'सैतालीस': '47',
        'तालीस': '43', 'चालीस': '40', 'बयालिस': '42', 'बयालीस': '42'
    }
    return word_map.get(t, t)


def extract_english_numeric_phrase(text):
    """Extract digits from English number words, including common misspellings."""
    if not isinstance(text, str):
        text = str(text) if text else ''

    cleaned = re.sub(r'[^a-zA-Z\s-]', ' ', text).lower()
    cleaned = cleaned.replace('-', ' ')
    tokens = [t for t in cleaned.split() if t]
    if not tokens:
        return ''

    # Include common speech-to-text misspellings.
    ones = {
        'zero': 0, 'oh': 0,
        'one': 1, 'two': 2, 'three': 3, 'four': 4,
        'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
    }
    teens = {
        'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14,
        'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18,
        'nineteen': 19, 'ninteen': 19,
    }
    tens = {
        'twenty': 20, 'thirty': 30, 'forty': 40, 'fourty': 40,
        'fifty': 50, 'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
    }

    def parse_under_hundred(start_idx):
        if start_idx >= len(tokens):
            return None, start_idx

        tok = tokens[start_idx]
        if tok in teens:
            return teens[tok], start_idx + 1
        if tok in tens:
            value = tens[tok]
            if start_idx + 1 < len(tokens) and tokens[start_idx + 1] in ones:
                value += ones[tokens[start_idx + 1]]
                return value, start_idx + 2
            return value, start_idx + 1
        if tok in ones:
            return ones[tok], start_idx + 1
        return None, start_idx

    # Pattern 1: "nineteen seventy five" => 1975
    first, next_idx = parse_under_hundred(0)
    if first in (18, 19, 20):
        second, end_idx = parse_under_hundred(next_idx)
        if second is not None and end_idx == len(tokens):
            return str(first * 100 + second)

    # Pattern 2: "nineteen hundred seventy five" => 1975
    if len(tokens) >= 3:
        first, idx = parse_under_hundred(0)
        if first in (18, 19, 20) and idx < len(tokens) and tokens[idx] == 'hundred':
            second, end_idx = parse_under_hundred(idx + 1)
            if second is None and idx + 1 == len(tokens):
                second = 0
                end_idx = len(tokens)
            if second is not None and end_idx == len(tokens):
                return str(first * 100 + second)

    # Generic 0-99 fallback.
    value, idx = parse_under_hundred(0)
    if value is not None and idx == len(tokens):
        return str(value)

    return ''


def extract_numeric_value(text, language='english'):
    """Extract comparable numeric value from text (supports Hindi words and digits)."""
    if not isinstance(text, str):
        text = str(text) if text else ''

    if language in ('hindi', 'hi', 'marathi', 'mr'):
        t = normalize_hindi_year_phrases(text)
        digits = re.findall(r'\d+', t)
        if digits:
            return ''.join(digits)

        # Support years spoken in English words during Hindi assessments.
        english_num = extract_english_numeric_phrase(text)
        if english_num:
            return english_num

        normalized = t.replace('  ', ' ').strip()
        compact = normalized.replace(' ', '')

        # Handle "उन्नीस सौ बयालीस" style years.
        if 'उन्नीस' in compact and ('सौ' in compact or 'सो' in compact):
            if 'बयालीस' in compact or 'बयालिस' in compact:
                return '1942'
            if 'सैंतालीस' in compact or 'सैंतालिस' in compact or 'सैतालीस' in compact:
                return '1947'

        # Single-number word fallback.
        token = canonicalize_hindi_number_token(compact)
        if token.isdigit():
            return token

        return ''

    t = text.upper()
    digits = re.findall(r'\d+', t)
    if digits:
        return ''.join(digits)
    english_num = extract_english_numeric_phrase(text)
    if english_num:
        return english_num
    return ''


def transcription_repetition_ratio(text):
    """Return max token frequency ratio; higher values indicate hallucinated repetition."""
    if not isinstance(text, str):
        text = str(text) if text else ''
    words = [w for w in re.split(r'\s+', text.strip()) if w]
    if not words:
        return 0.0
    counts = {}
    for w in words:
        counts[w] = counts.get(w, 0) + 1
    max_count = max(counts.values()) if counts else 0
    return max_count / len(words)


def is_repetitive_transcription(text):
    """Detect obvious repetitive garbage like repeated same word."""
    if not isinstance(text, str):
        text = str(text) if text else ''
    words = [w for w in re.split(r'\s+', text.strip()) if w]
    if len(words) < 6:
        return False
    return transcription_repetition_ratio(text) >= 0.55


def sanitize_transcription_result(result, aggressive=False):
    """Build transcript from reliable segments and drop low-confidence/repetitive fragments."""
    if not isinstance(result, dict):
        return ''

    raw_text = result.get('text', '')
    if not isinstance(raw_text, str):
        raw_text = str(raw_text) if raw_text else ''

    segments = result.get('segments') or []
    if not segments:
        return raw_text.strip()

    kept_segments = []
    for seg in segments:
        seg_text = str(seg.get('text', '')).strip()
        if not seg_text:
            continue

        no_speech_prob = float(seg.get('no_speech_prob') or 0.0)
        avg_logprob = float(seg.get('avg_logprob') or 0.0)

        # Remove likely silence/noise segments and repetitive hallucinated tails.
        if aggressive:
            if no_speech_prob > 0.62 and avg_logprob < -0.70:
                continue
        else:
            if no_speech_prob > 0.80 and avg_logprob < -1.00:
                continue

        if is_repetitive_transcription(seg_text):
            continue

        kept_segments.append(seg_text)

    if kept_segments:
        return ' '.join(kept_segments).strip()

    return raw_text.strip()


def tokenize_for_accuracy(text, language='english'):
    """Tokenize text in the same normalization space used by calculate_word_accuracy."""
    is_hindi = should_force_hindi(language, text)
    if is_hindi:
        cleaned = normalize_hindi_text(text)
        return [canonicalize_hindi_number_token(w) for w in cleaned.split() if w]
    cleaned = re.sub(r'[^\w\s]', ' ', (text or '').lower())
    return [normalize_number_words(w) for w in cleaned.split() if w]


def collapse_repeated_runs(words, max_run=2):
    """Collapse long consecutive repeats that usually come from STT hallucination tails."""
    if not words:
        return []
    out = []
    prev = None
    run = 0
    for w in words:
        if w == prev:
            run += 1
        else:
            prev = w
            run = 1
        if run <= max_run:
            out.append(w)
    return out


def stabilize_paragraph_transcription(expected_text, recognized_text, language='english'):
    """Improve long-passage fairness by removing repetitive tails and choosing best prefix."""
    recognized_text = str(recognized_text or '').strip()
    if not recognized_text:
        return recognized_text

    expected_tokens = tokenize_for_accuracy(expected_text, language)
    recognized_tokens = tokenize_for_accuracy(recognized_text, language)
    if not expected_tokens or not recognized_tokens:
        return recognized_text

    expected_count = len(expected_tokens)
    recognized_count = len(recognized_tokens)
    rep_ratio = transcription_repetition_ratio(recognized_text)

    # Keep clean transcripts untouched.
    if rep_ratio < 0.32 and recognized_count <= int(expected_count * 1.35):
        return recognized_text

    # Start from de-duplicated token stream.
    collapsed_tokens = collapse_repeated_runs(recognized_tokens, max_run=2)
    if not collapsed_tokens:
        collapsed_tokens = recognized_tokens

    best_text = ' '.join(collapsed_tokens)
    best_score = calculate_word_accuracy(expected_text, best_text, language)['accuracy']

    min_len = max(6, int(expected_count * 0.60))
    max_len = min(len(collapsed_tokens), int(expected_count * 1.20) + 8)
    if max_len >= min_len:
        for length in range(min_len, max_len + 1):
            candidate = ' '.join(collapsed_tokens[:length])
            score = calculate_word_accuracy(expected_text, candidate, language)['accuracy']
            if score > best_score:
                best_score = score
                best_text = candidate

    return best_text.strip()


def hindi_word_similarity(expected_word, recognized_word):
    """Compute a forgiving Hindi word similarity for pronunciation/spelling variants."""
    expected_raw = normalize_hindi_text(expected_word)
    recognized_raw = normalize_hindi_text(recognized_word)

    # Strong numeric equivalence (e.g., 15 == पंद्रह).
    expected_num = canonicalize_hindi_number_token(expected_raw)
    recognized_num = canonicalize_hindi_number_token(recognized_raw)
    if expected_num.isdigit() and recognized_num.isdigit():
        return 1.0 if expected_num == recognized_num else 0.0

    raw_similarity = calculate_similarity(expected_raw, recognized_raw)

    # Build consonant skeleton by removing matras/diacritics.
    # This helps map close sounds like "खेलती" vs "खेल दी".
    matra_pattern = r'[ािीुूेैोौंँः्]'
    expected_skeleton = re.sub(matra_pattern, '', expected_raw)
    recognized_skeleton = re.sub(matra_pattern, '', recognized_raw)
    skeleton_similarity = calculate_similarity(expected_skeleton, recognized_skeleton)

    # Keep best of raw and skeleton similarity.
    return max(raw_similarity, skeleton_similarity)


def calculate_word_accuracy(expected_text, recognized_text, language='english'):
    """Calculate passage accuracy using aligned word-level matches."""
    is_hindi = should_force_hindi(language, expected_text)

    if is_hindi:
        expected_clean = normalize_hindi_year_phrases(expected_text)
        recognized_clean = normalize_hindi_year_phrases(recognized_text)
        expected_words = [canonicalize_hindi_number_token(w) for w in expected_clean.split() if w]
        recognized_words = [canonicalize_hindi_number_token(w) for w in recognized_clean.split() if w]
    else:
        expected_clean = re.sub(r'[^\w\s]', ' ', (expected_text or '').lower())
        recognized_clean = re.sub(r'[^\w\s]', ' ', (recognized_text or '').lower())

        # Canonicalize numeric words and digits so "ten" and "10" match.
        expected_words = [normalize_number_words(w) for w in expected_clean.split() if w]
        recognized_words = [normalize_number_words(w) for w in recognized_clean.split() if w]

    # Fuzzy sequence alignment to avoid over-penalizing minor Hindi spelling/phonetic variants.
    m = len(expected_words)
    n = len(recognized_words)
    correct_threshold = 0.50 if is_hindi else 0.72
    gap_penalty = -1.0

    dp = [[0.0 for _ in range(n + 1)] for _ in range(m + 1)]
    trace = [[None for _ in range(n + 1)] for _ in range(m + 1)]

    for i in range(1, m + 1):
        dp[i][0] = i * gap_penalty
        trace[i][0] = 'up'
    for j in range(1, n + 1):
        dp[0][j] = j * gap_penalty
        trace[0][j] = 'left'

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            ew = expected_words[i - 1]
            rw = recognized_words[j - 1]
            similarity = hindi_word_similarity(ew, rw) if is_hindi else calculate_similarity(ew, rw)

            diag_score = dp[i - 1][j - 1] + (2.0 * similarity - 0.5)
            up_score = dp[i - 1][j] + gap_penalty
            left_score = dp[i][j - 1] + gap_penalty

            best = max(diag_score, up_score, left_score)
            dp[i][j] = best
            if best == diag_score:
                trace[i][j] = 'diag'
            elif best == up_score:
                trace[i][j] = 'up'
            else:
                trace[i][j] = 'left'

    correct_words = 0
    similarity_credit = 0.0
    i, j = m, n
    while i > 0 or j > 0:
        step = trace[i][j] if i >= 0 and j >= 0 else None
        if step == 'diag' and i > 0 and j > 0:
            ew = expected_words[i - 1]
            rw = recognized_words[j - 1]
            similarity = hindi_word_similarity(ew, rw) if is_hindi else calculate_similarity(ew, rw)
            if similarity >= correct_threshold:
                correct_words += 1
            # Hindi STT often has small orthographic drift; give bounded partial credit.
            if is_hindi:
                similarity_credit += max(0.0, min(1.0, similarity))
            else:
                similarity_credit += 1.0 if similarity >= correct_threshold else 0.0
            i -= 1
            j -= 1
        elif step == 'up' and i > 0:
            i -= 1
        elif step == 'left' and j > 0:
            j -= 1
        else:
            break

    total_words = len(expected_words)
    incorrect_words = max(total_words - correct_words, 0)
    if total_words > 0:
        if is_hindi:
            accuracy = (similarity_credit / total_words) * 100
            # Keep the UI counters consistent with similarity-based scoring.
            correct_words = max(correct_words, round((accuracy / 100) * total_words))
        else:
            accuracy = (correct_words / total_words) * 100
    else:
        accuracy = 0

    return {
        'accuracy': round(accuracy, 2),
        'correct_words': correct_words,
        'total_words': total_words,
        'incorrect_words': incorrect_words
    }


def normalize_passage_text(text, language='english'):
    if not isinstance(text, str):
        text = str(text) if text else ''

    if language in ('marathi', 'mr'):
        normalized = normalize_marathi_text(text)
        normalized = re.sub(r'[।,!?;:\-]', ' ', normalized)
        normalized = re.sub(r'\s+', ' ', normalized).strip()
        return normalized

    if language in ('hindi', 'hi'):
        normalized = normalize_hindi_year_phrases(text)
        normalized = normalize_hindi_text(normalized)
        normalized = re.sub(r'[।,!?;:\-]', ' ', normalized)
        normalized = re.sub(r'\s+', ' ', normalized).strip()
        return normalized

    normalized = text.upper().strip()
    normalized = normalized.replace('+', ' PLUS ').replace('-', ' MINUS ')
    normalized = re.sub(r'[^A-Z0-9\s]', ' ', normalized)
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    return normalized


def calculate_passage_similarity(expected_text, recognized_text, language='english'):
    """Score long passages using a tolerant blend of word alignment and text similarity."""
    expected_norm = normalize_passage_text(expected_text, language)
    recognized_norm = normalize_passage_text(recognized_text, language)

    word_accuracy = calculate_word_accuracy(expected_text, recognized_text, language)['accuracy']
    string_similarity = calculate_similarity(expected_norm, recognized_norm) * 100

    expected_tokens = expected_norm.split()
    recognized_tokens = recognized_norm.split()
    if expected_tokens:
        overlap = len(set(expected_tokens) & set(recognized_tokens)) / len(set(expected_tokens)) * 100
    else:
        overlap = 0

    return round(max(word_accuracy, string_similarity, overlap), 2)


def normalize_answer_for_matching(text, language='english'):
    """Normalize answer text for robust comparison and alternative-answer matching."""
    if not isinstance(text, str):
        text = str(text) if text else ''

    if language in ('marathi', 'mr'):
        normalized = normalize_marathi_text(text)
        return re.sub(r'\s+', ' ', normalized).strip()

    if language in ('hindi', 'hi'):
        normalized = normalize_hindi_text(text)
        return re.sub(r'\s+', ' ', normalized).strip()

    normalized = text.upper().strip()
    normalized = normalized.replace('+', ' PLUS ').replace('-', ' MINUS ')
    normalized = re.sub(r'[^A-Z0-9\s]', ' ', normalized)
    normalized = re.sub(r'\s+', ' ', normalized).strip()

    # Common scientific shorthand normalization
    normalized = normalized.replace('P H', 'PH')
    normalized = normalized.replace('H PLUS', 'HPLUS')
    normalized = normalized.replace('OH MINUS', 'OHMINUS')

    return normalized


def score_answer_similarity(expected_answer, recognized_answer, language='english'):
    """Score answer similarity with support for equivalent alternatives."""
    expected_norm = normalize_answer_for_matching(expected_answer, language)
    recognized_norm = normalize_answer_for_matching(recognized_answer, language)

    # Numeric equivalence shortcut for year/date style answers.
    expected_num = extract_numeric_value(expected_answer, language)
    recognized_num = extract_numeric_value(recognized_answer, language)
    if expected_num and recognized_num:
        if expected_num == recognized_num:
            return 1.0, expected_norm, recognized_norm, 0.70
        return 0.0, expected_norm, recognized_norm, 0.70

    if language in ('hindi', 'hi', 'marathi', 'mr'):
        # In Devanagari mode, reject Latin-script word answers unless this was a numeric match.
        if contains_devanagari(expected_answer) and contains_latin_script(recognized_answer):
            return 0.0, expected_norm, recognized_norm, 0.70
        scoring_language = 'marathi' if language in ('marathi', 'mr') else 'hindi'
        weighted_similarity = calculate_weighted_similarity(expected_norm, recognized_norm, language=scoring_language)
        text_similarity = calculate_similarity(expected_norm, recognized_norm)
        normalized_expected = normalize_marathi_text(expected_norm) if scoring_language == 'marathi' else normalize_hindi_text(expected_norm)
        normalized_recognized = normalize_marathi_text(recognized_norm) if scoring_language == 'marathi' else normalize_hindi_text(recognized_norm)
        expected_tokens = [token for token in normalized_expected.split() if token]
        recognized_tokens = [token for token in normalized_recognized.split() if token]
        if expected_tokens:
            token_overlap = len(set(expected_tokens) & set(recognized_tokens)) / len(set(expected_tokens))
        else:
            token_overlap = 0.0

        similarity = max(weighted_similarity, text_similarity, token_overlap)
        threshold = 0.50 if language in ('marathi', 'mr') else 0.60
        return similarity, expected_norm, recognized_norm, threshold

    # English conceptual aliases
    aliases = {
        'HYDROGEN': {'HPLUS', 'H PLUS', 'H+', 'PROTON', 'HYDROGEN ION'},
        'HYDROXIDE': {'OHMINUS', 'OH MINUS', 'OH-', 'HYDROXIDE ION'},
        'PH': {'PH SCALE', 'PHSCALE', 'PH VALUE', 'PHVALUE'},
        'NEUTRALIZE': {'NEUTRALIZATION', 'NEUTRALISATION'}
    }

    expected_key = expected_norm.replace(' ', '')
    recognized_key = recognized_norm.replace(' ', '')

    # Exact or known-equivalent match
    if expected_key == recognized_key:
        return 1.0, expected_norm, recognized_norm, 0.70

    expected_aliases = aliases.get(expected_norm, set()) | aliases.get(expected_key, set())
    normalized_aliases = {normalize_answer_for_matching(a, 'english').replace(' ', '') for a in expected_aliases}
    if recognized_key in normalized_aliases:
        return 1.0, expected_norm, recognized_norm, 0.70

    # Prefix/lemma-like match (neutralize vs neutralization, PH vs PH SCALE)
    if expected_key and recognized_key and (recognized_key.startswith(expected_key) or expected_key.startswith(recognized_key)):
        return 0.90, expected_norm, recognized_norm, 0.70

    # Fallback to string similarity
    similarity = calculate_similarity(expected_norm, recognized_norm)
    return similarity, expected_norm, recognized_norm, 0.70


def contains_devanagari(text):
    """Return True if text contains Devanagari script characters."""
    if not isinstance(text, str):
        text = str(text) if text else ''
    return re.search(r'[\u0900-\u097F]', text) is not None


def contains_latin_script(text):
    """Return True if text contains Latin alphabet characters."""
    if not isinstance(text, str):
        text = str(text) if text else ''
    return re.search(r'[A-Za-z]', text) is not None


def should_force_hindi(language_hint, expected_text):
    """Decide Hindi mode from explicit hint OR expected content script."""
    lang = (language_hint or '').strip().lower()
    return lang in ('hindi', 'hi', 'marathi', 'mr') or contains_devanagari(expected_text)


def normalize_number_words(text):
    """
    Normalize numbers and their word equivalents.
    Converts both 90 to ninety and ninety stays ninety.
    Also handles common number patterns including years (1900-2099).
    
    Args:
        text (str): Input text containing numbers or number words
    
    Returns:
        str: Normalized text with numbers converted to words
    """
    text = text.lower().strip()
    
    # Number to word mapping
    number_word_map = {
        '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
        '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
        '10': 'ten', '11': 'eleven', '12': 'twelve', '13': 'thirteen',
        '14': 'fourteen', '15': 'fifteen', '16': 'sixteen', '17': 'seventeen',
        '18': 'eighteen', '19': 'nineteen', '20': 'twenty', '30': 'thirty',
        '40': 'forty', '50': 'fifty', '60': 'sixty', '70': 'seventy',
        '80': 'eighty', '90': 'ninety', '100': 'hundred', '1000': 'thousand'
    }
    
    # Special years handling (e.g., 1947 -> nineteen forty seven)
    year_pattern = r'\b(1\d{3}|20\d{2})\b'
    
    # If text is purely a number, try to convert it
    if text.isdigit():
        # Check if it's in our direct mapping
        if text in number_word_map:
            return number_word_map[text]
        
        # Handle two-digit numbers (21-99)
        num = int(text)
        if 21 <= num <= 99:
            tens = (num // 10) * 10
            ones = num % 10
            if ones == 0:
                return number_word_map[str(tens)]
            else:
                return f"{number_word_map[str(tens)]}{number_word_map[str(ones)]}"
        
        # Handle years (1900-2099)
        if 1900 <= num <= 2099:
            # Convert to "nineteen forty seven" style
            first_two = num // 100
            last_two = num % 100
            
            result = ""
            # First part
            if first_two in [int(k) for k in number_word_map.keys()]:
                result += number_word_map[str(first_two)]
            else:
                tens = (first_two // 10) * 10
                ones = first_two % 10
                if ones == 0:
                    result += number_word_map[str(tens)]
                else:
                    result += f"{number_word_map[str(tens)]}{number_word_map[str(ones)]}"
            
            # Second part
            if last_two == 0:
                result += "hundred"
            elif last_two < 20:
                result += number_word_map[str(last_two)]
            else:
                tens = (last_two // 10) * 10
                ones = last_two % 10
                if ones == 0:
                    result += number_word_map[str(tens)]
                else:
                    result += f"{number_word_map[str(tens)]}{number_word_map[str(ones)]}"
            
            return result
    
    # If text is already a word form, just return it normalized
    # Remove spaces from compound numbers (e.g., "ninety five" -> "ninetyfive")
    text_no_spaces = text.replace(' ', '').replace('-', '')
    
    return text_no_spaces


def calculate_weighted_similarity(expected_sentence, recognized_sentence, language='english'):
    """
    Calculate weighted similarity where nouns and verbs have higher weight
    than function words like articles, prepositions, etc.
    """
    english_function_words = {
        'a', 'an', 'the', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could',
        'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into',
        'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under',
        'he', 'she', 'it', 'they', 'we', 'i', 'you', 'him', 'her', 'them', 'us', 'me',
        'his', 'her', 'its', 'their', 'our', 'my', 'your'
    }

    hindi_function_words = {
        'है', 'हैं', 'था', 'थी', 'थे', 'को', 'में', 'से', 'पर', 'का', 'की', 'के', 'और', 'तो', 'ही', 'भी',
        'वह', 'वे', 'यह', 'ये', 'मैं', 'हम', 'तुम', 'आप'
    }

    is_hindi = language in ('hindi', 'hi', 'marathi', 'mr')
    function_words = hindi_function_words if is_hindi else english_function_words

    if language in ('marathi', 'mr'):
        expected_sentence = normalize_marathi_text(expected_sentence)
        recognized_sentence = normalize_marathi_text(recognized_sentence)
    elif is_hindi:
        expected_sentence = normalize_hindi_text(expected_sentence)
        recognized_sentence = normalize_hindi_text(recognized_sentence)

    if is_hindi:
        expected_words = [word.strip() for word in expected_sentence.split() if word.strip()]
        recognized_words = [word.strip() for word in recognized_sentence.split() if word.strip()]
    else:
        expected_words = [re.sub(r'[^\w]', '', word).lower() for word in expected_sentence.split() if word.strip()]
        recognized_words = [re.sub(r'[^\w]', '', word).lower() for word in recognized_sentence.split() if word.strip()]
    
    # Assign weights: content words = 3, function words = 1
    weighted_score = 0
    total_weight = 0
    
    for i, expected_word in enumerate(expected_words):
        # Determine weight
        weight = 1 if expected_word in function_words else 3
        total_weight += weight
        
        # Find best match in recognized words (positional matching)
        if i < len(recognized_words):
            recognized_word = recognized_words[i]
            # Direct comparison since words are already cleaned
            if expected_word == recognized_word:
                word_similarity = 1.0
            elif is_hindi:
                word_similarity = hindi_word_similarity(expected_word, recognized_word)
            else:
                word_similarity = calculate_similarity(expected_word, recognized_word)
            weighted_score += word_similarity * weight
        # If word is missing, give 0 for that word
    
    # Calculate weighted average
    if total_weight > 0:
        return weighted_score / total_weight
    return 0



@app.route('/transcribe', methods=['POST'])
def transcribe():
    """Transcribe audio and compare with expected words"""
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        expected_words = request.form.get('expected_words')
        raw_language = request.form.get('language', 'english')
        assessment_language = (raw_language or 'english').strip().lower()
        
        logger.info(f"=" * 60)
        logger.info(f"NEW ASSESSMENT REQUEST")
        logger.info(f"Language parameter received: '{assessment_language}'")
        logger.info(f"Language type: {type(assessment_language)}")
        logger.info(f"All form data keys: {list(request.form.keys())}")
        logger.info(f"=" * 60)
        
        if expected_words:
            import json
            expected_words = json.loads(expected_words)
        else:
            expected_words = []

        expected_text_blob = ' '.join([str(w) for w in expected_words]) if isinstance(expected_words, list) else str(expected_words)
        is_hindi_assessment = should_force_hindi(assessment_language, expected_text_blob)
        
        temp_path = None
        processed_path = None
        try:
            temp_path = save_uploaded_audio(audio_file)
            processed_path = preprocess_audio_for_whisper(temp_path)
            
            logger.info(f"Audio saved to: {temp_path}")
            logger.info(f"Assessment language: {assessment_language}")
            
            # Transcribe audio with optimized parameters for noise reduction
            logger.info(f"Transcribing audio file")
            
            # Detect if this is a paragraph assessment (longer content) by checking length
            is_paragraph = any(len(word) > 100 for word in expected_words)
            logger.info(f"Expected words count: {len(expected_words)}")
            if expected_words:
                logger.info(f"First expected item length: {len(expected_words[0])} chars")
                logger.info(f"Is paragraph assessment: {is_paragraph}")
            
            # Set Whisper language from explicit hint OR script detection.
            whisper_language = 'hi' if is_hindi_assessment else 'en'
            logger.info(f"Using Whisper language: {whisper_language}")
            
            try:
                # Adjust parameters based on assessment type.
                if is_paragraph:
                    logger.info("Using paragraph transcription settings with anti-hallucination guards")
                    result = model.transcribe(
                        processed_path,
                        fp16=False,
                        language=whisper_language,
                        task='transcribe',
                        condition_on_previous_text=False,
                        temperature=0.0,
                        beam_size=5,
                        best_of=5,
                        compression_ratio_threshold=2.4,
                        logprob_threshold=-1.0,
                        no_speech_threshold=0.45,
                        initial_prompt=str(expected_words[0])[:420] if expected_words else None,
                    )
                else:
                    logger.info("Using word/sentence transcription settings")
                    result = model.transcribe(
                        processed_path,
                        fp16=False,
                        language=whisper_language,
                        task='transcribe',
                        condition_on_previous_text=False,
                        temperature=0.0,
                        beam_size=5,
                        best_of=5,
                        compression_ratio_threshold=2.8,
                        logprob_threshold=-1.0,
                        no_speech_threshold=0.55,
                    )

                if not result or 'text' not in result:
                    raise Exception("Transcription failed: No text returned from Whisper")

                text_result = sanitize_transcription_result(result, aggressive=is_paragraph)
                if is_hindi_assessment:
                    transcribed_text = text_result.strip()
                else:
                    transcribed_text = text_result.upper().strip()

                # Retry once with auto-language only when output is empty or clearly hallucinated.
                if not transcribed_text or is_repetitive_transcription(transcribed_text):
                    logger.warning("Primary transcription low quality. Retrying with auto-language fallback...")
                    fallback_result = model.transcribe(
                        processed_path,
                        fp16=False,
                        task='transcribe',
                        condition_on_previous_text=False,
                        temperature=0.0,
                        beam_size=5,
                        best_of=5,
                        compression_ratio_threshold=2.8,
                        logprob_threshold=-1.0,
                        no_speech_threshold=0.60,
                    )
                    fallback_text = sanitize_transcription_result(fallback_result, aggressive=is_paragraph)
                    transcribed_text = fallback_text.strip() if is_hindi_assessment else fallback_text.upper().strip()
                    logger.info(f"Fallback transcription length: {len(transcribed_text)} chars")

                logger.info(f"✓ Transcription complete: {len(transcribed_text)} chars")
                logger.info(f"  Repetition ratio: {transcription_repetition_ratio(transcribed_text):.2f}")
                logger.info(f"  First 100 chars: {transcribed_text[:100]}")
                logger.info(f"  Last 100 chars: {transcribed_text[-100:]}")
            except Exception as e:
                logger.error(f"Whisper transcription error: {e}")
                # If FFmpeg is not available, return a helpful error
                if "ffmpeg" in str(e).lower() or "avconv" in str(e).lower():
                    return jsonify({
                        'error': 'FFmpeg not installed',
                        'message': 'Please install FFmpeg: Download from https://ffmpeg.org/download.html and add to PATH',
                        'score': 0,
                        'correct_count': 0,
                        'total_count': len(expected_words),
                        'transcribed_text': '',
                        'details': [{'expected': w, 'recognized': 'FFmpeg required', 'similarity': 0, 'correct': False} for w in expected_words]
                    }), 200
                raise
            
            # Split transcribed text into words and remove punctuation
            # For Hindi, keep original case; for English, convert to uppercase
            if is_hindi_assessment:
                recognized_words = [re.sub(r'[^\w\s]', '', word).strip() for word in transcribed_text.split() if word.strip()]
            else:
                recognized_words = [re.sub(r'[^\w\s]', '', word).strip().upper() for word in transcribed_text.split() if word.strip()]
            
            # Detect if we're assessing words or sentences
            # If expected_words contains spaces, it's a sentence assessment
            is_sentence_assessment = any(' ' in word for word in expected_words)
            
            details = []
            correct_count = 0
            
            if is_sentence_assessment:
                # Sentence-based assessment
                logger.info("Detected sentence-based assessment")
                
                # Check if this is a paragraph (long content in a single item)
                is_full_paragraph = len(expected_words) == 1 and len(expected_words[0]) > 100
                
                if is_full_paragraph:
                    # For paragraphs: compare word-by-word for fair scoring
                    logger.info("Processing as full paragraph comparison (word-level)")

                    chunked_text = transcribe_long_audio_chunked(
                        processed_path,
                        whisper_language=whisper_language,
                        initial_prompt=str(expected_words[0])[:420]
                    )
                    if chunked_text:
                        current_score = calculate_word_accuracy(expected_words[0], transcribed_text, assessment_language)['accuracy']
                        chunked_score = calculate_word_accuracy(expected_words[0], chunked_text, assessment_language)['accuracy']
                        if chunked_score >= current_score:
                            transcribed_text = chunked_text

                    transcribed_text = stabilize_paragraph_transcription(
                        expected_words[0],
                        transcribed_text,
                        assessment_language
                    )
                    
                    # For Hindi, keep original case; for English, convert to uppercase
                    if assessment_language == 'hindi':
                        expected_paragraph = expected_words[0].strip()
                    else:
                        expected_paragraph = expected_words[0].upper().strip()
                    
                    # Clean both and split into words for word-level comparison
                    expected_clean = re.sub(r'[^\w\s]', '', expected_paragraph).strip()
                    transcribed_clean = re.sub(r'[^\w\s]', '', transcribed_text).strip()
                    
                    expected_words_list = expected_clean.split()
                    transcribed_words_list = transcribed_clean.split()
                    
                    logger.info(f"Expected {len(expected_words_list)} words, transcribed {len(transcribed_words_list)} words")

                    # Score paragraphs with a tolerant passage matcher so near-perfect reads are not zeroed out.
                    paragraph_stats = calculate_word_accuracy(expected_paragraph, transcribed_text, assessment_language)
                    similarity = calculate_passage_similarity(expected_paragraph, transcribed_text, assessment_language) / 100.0
                    total_expected_words = len(expected_words_list) if expected_words_list else 1
                    word_matches = paragraph_stats.get('correct_words', 0)

                    is_correct = similarity >= 0.60

                    if is_correct:
                        correct_count += 1

                    details.append({
                        'expected': expected_paragraph[:100] + "...",
                        'recognized': transcribed_text[:100] + "..." if len(transcribed_text) > 100 else transcribed_text,
                        'full_expected': expected_paragraph,
                        'full_recognized': transcribed_text,
                        'similarity': round(similarity * 100, 2),
                        'correct': is_correct,
                        'words_correct': word_matches,
                        'words_total': total_expected_words
                    })

                    logger.info(f"Paragraph similarity: {word_matches}/{total_expected_words} ({similarity*100:.1f}%) - {'CORRECT' if is_correct else 'INCORRECT'}")
                else:
                    # For short sentences: split and compare by position
                    logger.info("Processing as sentence-by-sentence comparison")
                    
                    # Split the transcribed text into sentences
                    # For Hindi, split on danda and commas too, because Whisper often inserts commas
                    # instead of sentence punctuation for spoken short lines.
                    if is_hindi_assessment:
                        transcribed_sentences = re.split(r'[।.!?,]+', transcribed_text)
                        transcribed_sentences = [s.strip() for s in transcribed_sentences if s.strip()]
                    else:
                        transcribed_sentences = re.split(r'[.!?,]+', transcribed_text)
                        transcribed_sentences = [s.strip().upper() for s in transcribed_sentences if s.strip()]
                    
                    logger.info(f"Expected {len(expected_words)} sentences, transcribed {len(transcribed_sentences)} sentences")
                    
                    # If we got only 1 sentence but expected multiple, try to split by looking for expected patterns
                    if len(transcribed_sentences) == 1 and len(expected_words) > 1:
                        logger.info("Only 1 sentence detected but multiple expected. Attempting smart split...")
                        combined_text = transcribed_sentences[0]
                        transcribed_sentences = []
                        
                        # Try to find each expected sentence in the transcribed text
                        remaining_text = combined_text
                        for expected_sent in expected_words:
                            # Get key words from expected sentence (words longer than 3 chars)
                            expected_words_list = [w for w in re.sub(r'[^\w\s]', '', expected_sent).split() if len(w) > 3]
                            
                            if not expected_words_list:
                                continue
                            
                            # Look for these words in the remaining text
                            best_match = ""
                            best_match_pos = -1
                            
                            # Try to find a span that contains most of the key words
                            words_in_remaining = remaining_text.split()
                            for i in range(len(words_in_remaining)):
                                for j in range(i + 1, min(i + 20, len(words_in_remaining) + 1)):
                                    span = ' '.join(words_in_remaining[i:j])
                                    # Count how many expected words are in this span
                                    matches = sum(1 for ew in expected_words_list if ew.lower() in span.lower() or any(calculate_similarity(ew, sw) > 0.8 for sw in span.split()))
                                    if matches >= len(expected_words_list) * 0.5:  # At least 50% of words match
                                        if len(span) > len(best_match):
                                            best_match = span
                                            best_match_pos = i
                            
                            if best_match:
                                transcribed_sentences.append(best_match)
                                # Remove the matched part from remaining text
                                words_in_remaining = words_in_remaining[best_match_pos + len(best_match.split()):]
                                remaining_text = ' '.join(words_in_remaining)
                        
                        logger.info(f"Smart split resulted in {len(transcribed_sentences)} sentences")

                    # If we still couldn't split enough, do deterministic chunking by expected lengths.
                    if len(transcribed_sentences) < len(expected_words) and transcribed_text.strip():
                        logger.info("Applying deterministic fallback split by expected sentence lengths...")
                        words = transcribed_text.split()
                        if words:
                            expected_lengths = [max(1, len(re.sub(r'[^\\w\\s]', '', s).split())) for s in expected_words]
                            total_expected_len = sum(expected_lengths) if expected_lengths else 1

                            rebuilt = []
                            cursor = 0
                            total_words = len(words)
                            for i, exp_len in enumerate(expected_lengths):
                                if i == len(expected_lengths) - 1:
                                    segment = ' '.join(words[cursor:])
                                else:
                                    alloc = max(1, round((exp_len / total_expected_len) * total_words))
                                    segment = ' '.join(words[cursor:cursor + alloc])
                                    cursor += alloc
                                rebuilt.append(segment.strip())

                            transcribed_sentences = [s for s in rebuilt if s]
                            logger.info(f"Fallback split produced {len(transcribed_sentences)} sentences")
                    
                    logger.info(f"Final: Expected {len(expected_words)} sentences, transcribed {len(transcribed_sentences)} sentences")
                    
                    # Compare each expected sentence to the corresponding transcribed sentence by position
                    for idx, expected_sentence in enumerate(expected_words):
                        # For Hindi, keep original case; for English, convert to uppercase
                        if is_hindi_assessment:
                            expected_sentence = expected_sentence.strip()
                        else:
                            expected_sentence = expected_sentence.upper().strip()
                        
                        # Clean up for comparison (remove punctuation)
                        expected_clean = re.sub(r'[^\w\s]', '', expected_sentence).strip()
                        
                        # Match by position - the nth expected sentence should match the nth transcribed sentence
                        if idx < len(transcribed_sentences):
                            transcribed_sentence = transcribed_sentences[idx]

                            scoring_language = 'hindi' if is_hindi_assessment else 'english'
                            similarity = calculate_passage_similarity(
                                expected_sentence,
                                transcribed_sentence,
                                scoring_language
                            ) / 100.0

                            # Use a tolerant threshold so merged/clipped sentence reads still count when the meaning matches.
                            threshold = 0.50 if is_hindi_assessment else 0.55
                            is_correct = similarity >= threshold

                            if not is_correct and transcribed_text.strip():
                                whole_text_similarity = calculate_passage_similarity(
                                    expected_sentence,
                                    transcribed_text,
                                    scoring_language
                                ) / 100.0
                                if whole_text_similarity > similarity:
                                    similarity = whole_text_similarity
                                    is_correct = similarity >= threshold
                            
                            if is_correct:
                                correct_count += 1
                            
                            details.append({
                                'expected': expected_sentence,
                                'recognized': transcribed_sentence,
                                'similarity': round(similarity * 100, 2),
                                'correct': is_correct
                            })
                        else:
                            # Not enough sentences transcribed
                            details.append({
                                'expected': expected_sentence,
                                'recognized': 'Not detected',
                                'similarity': 0,
                                'correct': False
                            })
            else:
                # Word-based assessment (original logic)
                logger.info("Detected word-based assessment")
                
                for idx, expected_word in enumerate(expected_words):
                    # For Hindi, keep original case; for English, convert to uppercase
                    if is_hindi_assessment:
                        expected_word = expected_word.strip()
                    else:
                        expected_word = expected_word.upper().strip()
                    
                    # Match by position - the nth spoken word should match the nth card
                    if idx < len(recognized_words):
                        recognized_word = recognized_words[idx]
                        if is_hindi_assessment:
                            similarity = hindi_word_similarity(expected_word, recognized_word)
                            is_correct = similarity >= 0.75
                        else:
                            similarity = calculate_similarity(expected_word, recognized_word)
                            is_correct = similarity >= 0.95
                        
                        if is_correct:
                            correct_count += 1
                        
                        details.append({
                            'expected': expected_word,
                            'recognized': recognized_word,
                            'similarity': round(similarity * 100, 2),
                            'correct': is_correct
                        })
                    else:
                        # Not enough words spoken
                        details.append({
                            'expected': expected_word,
                            'recognized': 'Not detected',
                            'similarity': 0,
                            'correct': False
                        })
            
            # Calculate score from correctness ratio so UI score matches checkmarks.
            if expected_words:
                score = round((correct_count / len(expected_words)) * 100, 2)
            else:
                score = 0
            
            return jsonify({
                'score': score,
                'correct_count': correct_count,
                'total_count': len(expected_words),
                'transcribed_text': transcribed_text,
                'details': details
            }), 200
        
        finally:
            # Clean up temp file
            try:
                if processed_path and processed_path != temp_path and os.path.exists(processed_path):
                    os.unlink(processed_path)
                if temp_path and os.path.exists(temp_path):
                    os.unlink(temp_path)
            except Exception:
                pass
    
    except Exception as e:
        logger.error(f"Error in transcribe: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/assess-comprehension', methods=['POST'])
def assess_comprehension():
    """Assess reading comprehension with paragraph, questions, and answers"""
    try:
        # Get expected content
        expected_paragraph = request.form.get('expected_paragraph')
        
        # Safely parse JSON data with null checks
        expected_questions_str = request.form.get('expected_questions')
        expected_answers_str = request.form.get('expected_answers')
        
        if not expected_questions_str or not expected_answers_str:
            return jsonify({'error': 'Missing required fields: expected_questions or expected_answers'}), 400
        
        expected_questions = json.loads(expected_questions_str)
        expected_answers = json.loads(expected_answers_str)
        raw_language = request.form.get('language', 'english')
        assessment_language = (raw_language or 'english').strip().lower()

        expected_text_blob = ' '.join([
            str(expected_paragraph or ''),
            ' '.join([str(q) for q in expected_questions]),
            ' '.join([str(a) for a in expected_answers])
        ])
        
        # Set Whisper language from explicit hint OR script detection.
        is_hindi_assessment = should_force_hindi(assessment_language, expected_text_blob)
        whisper_language = 'hi' if is_hindi_assessment else 'en'
        logger.info(f"Comprehension assessment language: {assessment_language} (Whisper: {whisper_language})")
        
        # Process paragraph audio
        paragraph_audio = request.files.get('paragraph_audio')
        paragraph_result = None
        if paragraph_audio:
            temp_path = None
            processed_path = None
            try:
                temp_path = save_uploaded_audio(paragraph_audio)
                processed_path = preprocess_audio_for_whisper(temp_path)
                result = model.transcribe(
                    processed_path,
                    fp16=False,
                    language=whisper_language,
                    task='transcribe',
                    condition_on_previous_text=False,
                    temperature=0.0,
                    beam_size=5,
                    best_of=5,
                    compression_ratio_threshold=2.4,
                    logprob_threshold=-1.0,
                    no_speech_threshold=0.45,
                    initial_prompt=str(expected_paragraph or '')[:420],
                )
                
                if not result or 'text' not in result:
                    raise Exception("Paragraph transcription failed: No text returned")
                
                transcribed_paragraph = sanitize_transcription_result(result, aggressive=True).strip()

                # Start with base candidate and only run expensive extra decodes if needed.
                base_stats = calculate_word_accuracy(expected_paragraph, transcribed_paragraph, assessment_language)
                candidates = [('base', transcribed_paragraph)]

                # Chunked decode is much more stable for long Hindi passages.
                chunked_text = transcribe_long_audio_chunked(
                    processed_path,
                    whisper_language=whisper_language,
                    initial_prompt=str(expected_paragraph or '')[:420]
                )
                if chunked_text:
                    candidates.append(('chunked', chunked_text))

                if base_stats['accuracy'] < 85:
                    prompted_result = model.transcribe(
                        processed_path,
                        fp16=False,
                        language=whisper_language,
                        task='transcribe',
                        condition_on_previous_text=False,
                        temperature=0.0,
                        beam_size=5,
                        best_of=5,
                        initial_prompt=str(expected_paragraph or '')[:600],
                        compression_ratio_threshold=2.8,
                        logprob_threshold=-1.0,
                        no_speech_threshold=0.55,
                    )
                    prompted_text = sanitize_transcription_result(prompted_result, aggressive=True).strip()
                    if prompted_text:
                        candidates.append(('prompted', prompted_text))

                # Auto-language fallback only when still below threshold after prompted attempt.
                provisional_best = max(
                    (calculate_word_accuracy(expected_paragraph, cand, assessment_language)['accuracy'] for _, cand in candidates),
                    default=0
                )
                if provisional_best < 85:
                    auto_result = model.transcribe(
                        processed_path,
                        fp16=False,
                        task='transcribe',
                        condition_on_previous_text=False,
                        temperature=0.0,
                        beam_size=5,
                        best_of=5,
                        initial_prompt=str(expected_paragraph or '')[:600],
                        compression_ratio_threshold=2.8,
                        logprob_threshold=-1.0,
                        no_speech_threshold=0.55,
                    )
                    auto_text = sanitize_transcription_result(auto_result, aggressive=True).strip()
                    if auto_text:
                        candidates.append(('auto', auto_text))

                # Select best candidate by word-accuracy against expected paragraph.
                best_name = 'base'
                best_text = transcribed_paragraph
                best_score = calculate_word_accuracy(expected_paragraph, transcribed_paragraph, assessment_language)['accuracy']
                for name, cand in candidates[1:]:
                    if not cand:
                        continue
                    cand_score = calculate_word_accuracy(expected_paragraph, cand, assessment_language)['accuracy']
                    repeat_penalty = max(0.0, transcription_repetition_ratio(cand) - 0.30) * 100
                    script_penalty = 0.0
                    if is_hindi_assessment and not contains_devanagari(cand):
                        script_penalty = 25.0
                    effective_score = cand_score - repeat_penalty - script_penalty
                    current_effective = best_score - max(0.0, transcription_repetition_ratio(best_text) - 0.30) * 100
                    if is_hindi_assessment and not contains_devanagari(best_text):
                        current_effective -= 25.0
                    if effective_score > current_effective:
                        best_name = name
                        best_text = cand
                        best_score = cand_score

                if best_text != transcribed_paragraph:
                    logger.info(f"Using {best_name} paragraph transcript (best accuracy {best_score})")
                    transcribed_paragraph = best_text

                # If Hindi is expected but output has no Devanagari, retry with strict Hindi settings.
                if is_hindi_assessment and not contains_devanagari(transcribed_paragraph):
                    logger.warning("Paragraph came back non-Devanagari for Hindi expected text. Retrying with strict Hindi...")
                    retry_result = model.transcribe(
                        processed_path,
                        fp16=False,
                        language='hi',
                        task='transcribe',
                        condition_on_previous_text=False,
                        temperature=0.0,
                        beam_size=5,
                        best_of=5,
                        compression_ratio_threshold=2.8,
                        logprob_threshold=-1.0,
                        no_speech_threshold=0.60,
                    )
                    transcribed_paragraph = sanitize_transcription_result(retry_result, aggressive=True).strip()

                # Drop repetitive STT tails and score the fairest stable prefix for long passages.
                transcribed_paragraph = stabilize_paragraph_transcription(
                    expected_paragraph,
                    transcribed_paragraph,
                    assessment_language
                )

                logger.info(f"Paragraph transcribed: {transcribed_paragraph[:100]}...")

                # Calculate paragraph score using both word alignment and normalized passage similarity.
                paragraph_stats = calculate_word_accuracy(expected_paragraph, transcribed_paragraph, assessment_language)
                paragraph_score = calculate_passage_similarity(expected_paragraph, transcribed_paragraph, assessment_language)
                paragraph_stats['accuracy'] = paragraph_score
                paragraph_result = {
                    'transcribed': transcribed_paragraph,
                    'score': round(paragraph_score, 2),
                    'stats': paragraph_stats
                }
            finally:
                if processed_path and processed_path != temp_path and os.path.exists(processed_path):
                    os.unlink(processed_path)
                if temp_path and os.path.exists(temp_path):
                    os.unlink(temp_path)
        
        # Process questions audio (optional - for practice only, not scored)
        questions_audio = request.files.get('questions_audio')
        if questions_audio:
            temp_path = None
            processed_path = None
            try:
                temp_path = save_uploaded_audio(questions_audio)
                processed_path = preprocess_audio_for_whisper(temp_path)
                result = model.transcribe(processed_path, fp16=False, language=whisper_language, task='transcribe')
                logger.info(f"Questions read: {result['text']}")
            finally:
                if processed_path and processed_path != temp_path and os.path.exists(processed_path):
                    os.unlink(processed_path)
                if temp_path and os.path.exists(temp_path):
                    os.unlink(temp_path)
        
        # Process answer audios
        answer_details = []
        correct_answers = 0
        
        for i, expected_answer in enumerate(expected_answers):
            answer_audio = request.files.get(f'answer_audio_{i}')
            if answer_audio:
                temp_path = None
                processed_path = None
                try:
                    temp_path = save_uploaded_audio(answer_audio)
                    processed_path = preprocess_audio_for_whisper(temp_path)
                    result = model.transcribe(
                        processed_path,
                        fp16=False,
                        language=whisper_language,
                        task='transcribe',  # Force transcribe (not translate) for Hindi script output
                        condition_on_previous_text=False,
                        temperature=0.0,
                        beam_size=5,
                        best_of=5,
                        initial_prompt=str(expected_answer),
                        no_speech_threshold=0.6,
                    )
                    
                    # Check if transcription was successful
                    if not result or 'text' not in result:
                        raise Exception(f"Answer transcription failed for question {i+1}")
                    
                    answer_text = sanitize_transcription_result(result)

                    # For Hindi, keep original case; for English, normalize case for readability.
                    if is_hindi_assessment:
                        recognized_answer = answer_text.strip()
                    else:
                        recognized_answer = answer_text.strip().upper()

                    answer_candidates = [recognized_answer]

                    # If Hindi is expected but answer came back Latin-only, retry with forced Hindi.
                    if is_hindi_assessment and recognized_answer and not contains_devanagari(recognized_answer):
                        logger.warning(f"Q{i+1} came back non-Devanagari for Hindi expected text. Retrying with strict Hindi...")
                        retry_result = model.transcribe(
                            processed_path,
                            fp16=False,
                            language='hi',
                            task='transcribe',
                            condition_on_previous_text=False,
                            temperature=0.0,
                            beam_size=5,
                            best_of=5,
                            no_speech_threshold=0.60,
                            logprob_threshold=-1.0,
                        )
                        recognized_answer = sanitize_transcription_result(retry_result).strip()
                        if recognized_answer:
                            answer_candidates.append(recognized_answer)

                    # Retry if whisper hallucinated repetitive words (e.g., "अगर अगर अगर ...").
                    if is_repetitive_transcription(recognized_answer):
                        logger.warning(f"Q{i+1} repetitive transcription detected. Retrying with stricter no-speech settings...")
                        retry_result = model.transcribe(
                            processed_path,
                            fp16=False,
                            language=whisper_language,
                            task='transcribe',
                            condition_on_previous_text=False,
                            temperature=0.0,
                            beam_size=5,
                            best_of=5,
                            initial_prompt=str(expected_answer),
                            no_speech_threshold=0.60,
                            logprob_threshold=-1.0,
                        )
                        recognized_answer = sanitize_transcription_result(retry_result).strip()
                        if recognized_answer:
                            answer_candidates.append(recognized_answer)

                    # Pick best candidate by answer similarity.
                    best_answer = ''
                    best_similarity = -1
                    best_triplet = None
                    scoring_language = 'hindi' if is_hindi_assessment else assessment_language

                    for candidate in answer_candidates:
                        sim, exp_norm, rec_norm, thr = score_answer_similarity(
                            expected_answer,
                            candidate,
                            scoring_language
                        )
                        if sim > best_similarity:
                            best_similarity = sim
                            best_answer = candidate
                            best_triplet = (exp_norm, rec_norm, thr)

                    # Only run expensive auto-language decoding if current best is weak.
                    if best_similarity < 0.80:
                        auto_result = model.transcribe(
                            processed_path,
                            fp16=False,
                            task='transcribe',
                            condition_on_previous_text=False,
                            temperature=0.0,
                            beam_size=5,
                            best_of=5,
                            initial_prompt=str(expected_answer),
                            no_speech_threshold=0.60,
                            logprob_threshold=-1.0,
                        )
                        auto_text = sanitize_transcription_result(auto_result).strip()
                        if auto_text:
                            sim, exp_norm, rec_norm, thr = score_answer_similarity(
                                expected_answer,
                                auto_text,
                                scoring_language
                            )
                            if sim > best_similarity:
                                best_similarity = sim
                                best_answer = auto_text
                                best_triplet = (exp_norm, rec_norm, thr)

                    recognized_answer = best_answer if best_answer else recognized_answer

                    # Score with alternative-answer support and language-aware threshold
                    if best_triplet is not None:
                        expected_normalized, recognized_normalized, threshold = best_triplet
                        similarity = best_similarity
                    else:
                        similarity, expected_normalized, recognized_normalized, threshold = score_answer_similarity(
                            expected_answer,
                            recognized_answer,
                            scoring_language
                        )
                    is_correct = similarity >= threshold
                    
                    if is_correct:
                        correct_answers += 1
                    
                    answer_details.append({
                        'question_index': i,
                        'expected': expected_answer,
                        'recognized': recognized_answer,
                        'similarity': round(similarity * 100, 2),
                        'correct': is_correct
                    })
                    
                    logger.info(f"Q{i+1}: Expected '{expected_answer}' (normalized: '{expected_normalized}'), Got '{recognized_answer}' (normalized: '{recognized_normalized}'), Similarity: {similarity*100:.1f}%")
                    
                finally:
                    if processed_path and processed_path != temp_path and os.path.exists(processed_path):
                        os.unlink(processed_path)
                    if temp_path and os.path.exists(temp_path):
                        os.unlink(temp_path)
            else:
                answer_details.append({
                    'question_index': i,
                    'expected': expected_answer,
                    'recognized': 'Not provided',
                    'similarity': 0,
                    'correct': False
                })
        
        # Calculate scores
        answers_score = (correct_answers / len(expected_answers)) * 100 if expected_answers else 0
        
        # Combined score: 50% paragraph + 50% answers
        # Check if paragraph was assessed before accessing its results
        if paragraph_result:
            combined_score = (paragraph_result['score'] * 0.5) + (answers_score * 0.5)
            paragraph_score = paragraph_result['score']
            paragraph_transcribed = paragraph_result['transcribed']
        else:
            # If no paragraph audio provided, use only answers score
            combined_score = answers_score
            paragraph_score = 0
            paragraph_transcribed = ''
        
        return jsonify({
            'combined_score': round(combined_score, 2),
            'paragraph_score': round(paragraph_score, 2),
            'paragraph_transcribed': paragraph_transcribed,
            'paragraph_stats': paragraph_result['stats'] if paragraph_result and 'stats' in paragraph_result else None,
            'answers_score': round(answers_score, 2),
            'correct_answers': correct_answers,
            'total_questions': len(expected_answers),
            'answer_details': answer_details
        }), 200
        
    except Exception as e:
        logger.error(f"Error in assess_comprehension: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'message': 'Whisper service is running'}), 200


if __name__ == '__main__':
    logger.info("Starting Whisper service...")
    # Disable debug reloader to avoid connection resets during active requests.
    app.run(debug=False, use_reloader=False, host='0.0.0.0', port=5001, threaded=True)
