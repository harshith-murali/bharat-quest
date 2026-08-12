"""
Stage 5: Validate candidate questions against grounding, deduplication, and state mapping.

Checks:
- Grounding: supporting sentence actually appears in source
- Options: exactly 4 unique options, answer is one of them
- State mapping: geographic entities map unambiguously to exactly one state
- Deduplication: remove semantic duplicates
"""
import difflib
from typing import List, Dict, Tuple
from sentence_transformers import SentenceTransformer
import numpy as np
from config import ENTITY_TO_STATE_MAP, SEMANTIC_DEDUP_THRESHOLD, EMBEDDING_MODEL

def check_grounding(question: Dict, chunk_text: str) -> Tuple[bool, str]:
    """
    Verify that the supporting sentence appears (substring or fuzzy) in chunk text.
    Returns (is_valid, reason).
    """
    source_sentence = question.get('source_sentence', '').strip()
    if not source_sentence:
        return False, "No source_sentence provided"

    # Exact substring match
    if source_sentence.lower() in chunk_text.lower():
        return True, "Exact match"

    # Fuzzy match (>80% similarity)
    ratio = difflib.SequenceMatcher(None, source_sentence.lower(), chunk_text.lower()).ratio()
    if ratio > 0.80:
        return True, f"Fuzzy match ({ratio:.0%})"

    return False, f"Not grounded (similarity {ratio:.0%})"

def check_options(question: Dict) -> Tuple[bool, str]:
    """
    Verify options are well-formed:
    - Exactly 4 options
    - All unique
    - Answer is one of the options
    Returns (is_valid, reason).
    """
    options = question.get('options', [])
    answer = question.get('answer', '')

    if len(options) != 4:
        return False, f"Expected 4 options, got {len(options)}"

    if len(set(options)) != 4:
        return False, "Options are not unique"

    if answer not in options:
        return False, f"Answer '{answer}' not in options"

    return True, "Options valid"

def check_state_mapping(question: Dict) -> Tuple[bool, str, object]:
    """
    Map geographic entity (if present) to a state.
    Returns (is_valid, reason, state_or_none).
    """
    entity = question.get('geographic_entity')
    if not entity:
        return True, "No geographic entity", None

    entity_lower = entity.lower()
    state = ENTITY_TO_STATE_MAP.get(entity_lower)

    if state is None:
        # Not in map; could be ambiguous (None value) or unmapped
        if entity_lower in ENTITY_TO_STATE_MAP:
            return True, f"Entity '{entity}' is ambiguous/spans multiple states", None
        return True, f"Entity '{entity}' not in gazetteer, preserving for manual review", None

    if state is None:  # Explicitly mapped to None (ambiguous)
        return True, f"Entity '{entity}' spans multiple states, no unique mapping", None

    return True, f"Mapped to state: {state}", state

def detect_duplicates(questions: List[Dict], threshold: float = SEMANTIC_DEDUP_THRESHOLD) -> List[Tuple[int, int]]:
    """
    Detect semantic duplicate questions using cosine similarity.
    Returns list of (i, j) pairs where i < j and similarity > threshold.
    """
    if len(questions) < 2:
        return []

    model = SentenceTransformer(EMBEDDING_MODEL)
    question_texts = [q.get('question', '') for q in questions]
    embeddings = model.encode(question_texts)

    duplicates = []
    for i in range(len(questions)):
        for j in range(i+1, len(questions)):
            sim = np.dot(embeddings[i], embeddings[j]) / (np.linalg.norm(embeddings[i]) * np.linalg.norm(embeddings[j]) + 1e-10)
            if sim > threshold:
                duplicates.append((i, j))

    return duplicates

def validate_candidates(candidates_by_class: Dict[int, List[Dict]], chunks_by_class: Dict[int, List[Dict]]) -> Tuple[Dict[int, List[Dict]], Dict]:
    """
    Validate all candidates and return valid questions + stats.

    Returns (valid_questions_by_class, validation_stats).
    """
    print("Stage 5: Validating candidates...\n")

    valid_by_class = {}
    stats = {}

    for class_num in [5, 6, 7, 8]:
        candidates = candidates_by_class.get(class_num, [])
        chunks = chunks_by_class.get(class_num, [])

        if not candidates:
            valid_by_class[class_num] = []
            stats[class_num] = {
                'generated': 0,
                'grounded': 0,
                'valid_options': 0,
                'after_dedup': 0,
                'state_linked': 0,
                'rejected': 0,
            }
            continue

        # Build a map of chapter+page -> chunk text for grounding checks
        chunk_texts = {}
        for chunk in chunks:
            key = (chunk['chapter'], chunk['page'])
            chunk_texts[key] = chunk['text']

        grounded = []
        for q in candidates:
            chapter = q.get('chapter')
            page = q.get('page')
            key = (chapter, page)
            chunk_text = chunk_texts.get(key, '')

            # Check grounding
            grounded_ok, _ = check_grounding(q, chunk_text)
            if not grounded_ok:
                continue

            grounded.append(q)

        # Check options for grounded questions
        options_ok = []
        for q in grounded:
            ok, _ = check_options(q)
            if ok:
                options_ok.append(q)

        # Detect and remove duplicates
        dup_pairs = detect_duplicates(options_ok)
        dup_indices = set()
        for i, j in dup_pairs:
            dup_indices.add(j)  # Keep first, remove second
        deduped = [q for i, q in enumerate(options_ok) if i not in dup_indices]

        # Check state mapping
        final_valid = []
        state_linked_count = 0
        for q in deduped:
            mapping_ok, _, state = check_state_mapping(q)
            if mapping_ok:
                if state:
                    q['state'] = state
                    state_linked_count += 1
                final_valid.append(q)

        valid_by_class[class_num] = final_valid
        stats[class_num] = {
            'generated': len(candidates),
            'grounded': len(grounded),
            'valid_options': len(options_ok),
            'after_dedup': len(deduped),
            'state_linked': state_linked_count,
            'final': len(final_valid),
        }

        print(f"Class {class_num}:")
        print(f"  Generated: {len(candidates)}")
        print(f"  Grounded: {len(grounded)}")
        print(f"  Valid options: {len(options_ok)}")
        print(f"  After dedup: {len(deduped)}")
        print(f"  State-linked: {state_linked_count}")
        print(f"  Final valid: {len(final_valid)}\n")

    return valid_by_class, stats

def main(candidates_by_class: Dict[int, List[Dict]], chunks_by_class: Dict[int, List[Dict]]) -> Tuple[Dict[int, List[Dict]], Dict]:
    """Validate all candidates."""
    return validate_candidates(candidates_by_class, chunks_by_class)

if __name__ == "__main__":
    pass  # Requires prior stages
