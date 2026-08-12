"""
Stage 6: Balance answer positions (ABCD distribution), assign IDs, export JSON.

Ensures correct answers are distributed across A/B/C/D at roughly 25% each,
assigns sequential class-specific IDs (c5_001, etc.), and writes final JSON files.
"""
import json
import random
from typing import List, Dict, Tuple
from collections import Counter
from config import RANDOM_SEED, CLASS_TEXTBOOK_DIRS, PIPELINE_OUTPUT

def shuffle_options_with_tracking(options: List[str], answer: str, seed: int = RANDOM_SEED) -> Tuple[List[str], str]:
    """
    Shuffle options randomly (using fixed seed for reproducibility).
    Return (shuffled_options, correct_answer_text).
    """
    rng = random.Random(seed)
    paired = list(zip(options, [opt == answer for opt in options]))
    rng.shuffle(paired)
    shuffled_opts = [opt for opt, _ in paired]
    correct_opt = next(opt for opt, is_correct in paired if is_correct)
    return shuffled_opts, correct_opt

def balance_answer_positions(questions: List[Dict]) -> List[Dict]:
    """
    Shuffle each question's options to balance answer positions across A/B/C/D.
    """
    balanced = []
    for q in questions:
        shuffled_opts, correct_opt = shuffle_options_with_tracking(
            q.get('options', []),
            q.get('answer', ''),
            seed=RANDOM_SEED + hash(q.get('question', '')) % 1000  # Deterministic but varied
        )
        q_copy = q.copy()
        q_copy['options'] = shuffled_opts
        q_copy['answer'] = correct_opt
        balanced.append(q_copy)
    return balanced

def assign_ids(questions: List[Dict], class_num: int) -> List[Dict]:
    """Assign sequential class-specific IDs (c5_001, etc.)."""
    for i, q in enumerate(questions, 1):
        q['id'] = f"c{class_num}_{i:03d}"
    return questions

def build_final_question_object(q: Dict, class_num: int, source_prefix: str) -> Dict:
    """
    Build final question object matching the exact schema from the requirements.

    Schema:
    {
      "id": "c5_001",
      "class": 5,
      "subject": "Geography",
      "category": "India",
      "chapter": "Actual Chapter Name",
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "answer": "exact option text",
      "difficulty": "easy",
      "source": "NCERT Class 5 – Our Wondrous World (Reprint 2026–27)",
      "source_page": 12
    }
    """
    # Infer subject from chapter name (heuristic)
    chapter = q.get('chapter', '')
    if any(x in chapter.lower() for x in ['geography', 'region', 'river', 'mountain', 'location', 'climate']):
        subject = "Geography"
    elif any(x in chapter.lower() for x in ['history', 'kingdom', 'ruler', 'historical', 'ancient', 'period']):
        subject = "History"
    elif any(x in chapter.lower() for x in ['culture', 'heritage', 'tradition', 'festival', 'art', 'craft']):
        subject = "Culture & Heritage"
    elif any(x in chapter.lower() for x in ['nature', 'wildlife', 'species', 'ecosystem', 'park', 'conservation']):
        subject = "Wildlife & Nature"
    else:
        subject = "India"

    return {
        "id": q.get('id'),
        "class": class_num,
        "subject": subject,
        "category": "India",
        "chapter": chapter,
        "question": q.get('question', ''),
        "options": q.get('options', []),
        "answer": q.get('answer', ''),
        "difficulty": q.get('difficulty', 'medium'),
        "source": source_prefix,
        "source_page": q.get('page', 0),
    }

def export_questions_json(valid_by_class: Dict[int, List[Dict]]) -> Dict[str, str]:
    """
    Export balanced, ID'd questions to JSON files.

    Files:
    - output/class5.json, class6.json, class7.json, class8.json (class-filtered pool, no state)
    - output/state_linked/*.json (questions tagged with a state, if any)

    Returns dict mapping class_num -> output_path.
    """
    print("Stage 6: Balancing options, assigning IDs, and exporting...\n")

    PIPELINE_OUTPUT.mkdir(parents=True, exist_ok=True)
    state_linked_dir = PIPELINE_OUTPUT / "state_linked"
    state_linked_dir.mkdir(exist_ok=True)

    output_files = {}

    for class_num in [5, 6, 7, 8]:
        questions = valid_by_class.get(class_num, [])
        if not questions:
            print(f"Class {class_num}: No valid questions to export")
            continue

        # Get source prefix
        config = CLASS_TEXTBOOK_DIRS[class_num]
        source_prefix = config["source_prefix"]

        # Balance options
        balanced = balance_answer_positions(questions)

        # Assign IDs
        with_ids = assign_ids(balanced, class_num)

        # Build final objects
        final_questions = []
        state_linked = {}  # state -> list of questions
        for q in with_ids:
            final_obj = build_final_question_object(q, class_num, source_prefix)
            final_questions.append(final_obj)

            # Separate state-linked questions
            if 'state' in q and q['state']:
                state_name = q['state']
                if state_name not in state_linked:
                    state_linked[state_name] = []
                state_linked[state_name].append(final_obj)

        # Export class pool (non-state-linked)
        class_pool = [q for q in final_questions if 'state' not in q]
        output_file = PIPELINE_OUTPUT / f"class{class_num}.json"
        with open(output_file, 'w') as f:
            json.dump(class_pool, f, indent=2)
        output_files[class_num] = str(output_file)

        # Export state-linked (if any)
        for state_name, state_questions in state_linked.items():
            state_file = state_linked_dir / f"{state_name.lower().replace(' ', '_').replace('&', 'and')}.json"
            with open(state_file, 'w') as f:
                json.dump(state_questions, f, indent=2)

        # Stats
        answer_dist = Counter(q['answer'] for q in final_questions)
        print(f"Class {class_num}:")
        print(f"  Total questions: {len(final_questions)}")
        print(f"  Class pool (no state): {len(class_pool)}")
        print(f"  State-linked: {sum(len(qs) for qs in state_linked.values())}")
        print(f"  Answer distribution: A={answer_dist[final_questions[0]['options'][0]] if final_questions else 0}, B={answer_dist[final_questions[0]['options'][1]] if len(final_questions) > 1 else 0}, C={answer_dist[final_questions[0]['options'][2]] if len(final_questions) > 2 else 0}, D={answer_dist[final_questions[0]['options'][3]] if len(final_questions) > 3 else 0}")
        print(f"  File: {output_file}\n")

    return output_files

def main(valid_by_class: Dict[int, List[Dict]]) -> Dict[str, str]:
    """Export all questions."""
    return export_questions_json(valid_by_class)

if __name__ == "__main__":
    pass
