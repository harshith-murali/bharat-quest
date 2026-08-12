"""
Stage 4 (V2): Generate natural, textbook-grounded questions.

Rules:
1. Questions must be natural, standalone quiz questions
2. NO "According to NCERT...", "Based on passage...", etc.
3. Source info only in metadata
4. Exactly 4 options, exactly 1 correct answer
5. NO "Unknown", "Not mentioned", "All of the above" as garbage options
6. Options must be meaningful distractors
7. Randomized answer positions
8. Verified page numbers and chapters
9. Real textbook titles
"""
import json
import random
from typing import List, Dict, Optional, Tuple
import anthropic
from config import RANDOM_SEED

def generate_questions_from_chunk(
    client: anthropic.Anthropic,
    chunk: Dict,
    class_num: int
) -> List[Dict]:
    """
    Generate natural, well-formed questions from a textbook passage.

    Returns list of candidate question dicts with keys:
      - question: str (natural, no "According to NCERT...")
      - options: list[str] (exactly 4 meaningful options)
      - answer: str (must be in options)
      - difficulty: "easy" | "medium" | "hard"
      - source_sentence: str (supporting sentence from passage)
      - page: int (from chunk metadata)
      - chapter: str (from chunk metadata)
      - geographic_entity: Optional[str] (for state mapping)
    """
    passage_text = chunk.get('text', '')[:2000]  # Limit passage length

    if len(passage_text.strip()) < 100:
        return []  # Skip very short passages

    prompt = f"""You are an expert educational question writer for NCERT Class {class_num} textbooks.

Your task: Generate 0-2 high-quality multiple-choice questions from the following textbook passage.

CRITICAL REQUIREMENTS:
1. Questions MUST be natural, standalone quiz questions suitable for a student
2. DO NOT include "According to NCERT", "According to textbook", "Based on passage", etc.
3. DO NOT include "Unknown", "Not mentioned", "All of the above" as options
4. Generate EXACTLY 4 meaningful options per question
5. Only 1 option can be correct
6. All options must be unique and plausible
7. Questions must be complete sentences that make sense without context
8. Only generate questions that are DIRECTLY supported by the passage
9. If passage doesn't support good questions, return empty array

PASSAGE:
---
{passage_text}
---

Return a JSON array. Each object must have EXACTLY this structure:
{{
  "question": "Natural standalone question that makes sense to a student",
  "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
  "answer": "The exact correct option text (must be one of the 4 options)",
  "difficulty": "easy|medium|hard",
  "source_sentence": "The exact sentence from passage supporting the answer",
  "geographic_entity": null or "specific place name if mentioned"
}}

Examples of GOOD questions:
- "Which river is known as the lifeline of India?"
- "In which state is the Thar Desert located?"
- "Who was the founder of the Mauryan Empire?"
- "What is the primary language spoken in this region?"

Examples of BAD questions (DO NOT generate these):
- "According to NCERT Class 5 textbooks, The Ganges?"
- "According to the textbook, India has how many states?"
- "Based on the passage, which emperor ruled?"

If you cannot generate good questions from this passage, return an empty array [].
Otherwise return ONLY valid JSON, no other text."""

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1200,
            messages=[{"role": "user", "content": prompt}]
        )
        result_text = response.content[0].text.strip()

        # Extract JSON
        start = result_text.find('[')
        end = result_text.rfind(']') + 1

        if start < 0 or end <= start:
            return []

        candidates = json.loads(result_text[start:end])

        # Validate and enrich
        valid_candidates = []
        for q in candidates:
            if validate_question(q, chunk):
                q['page'] = chunk.get('page', 0)
                q['chapter'] = chunk.get('chapter', 'Unknown')
                valid_candidates.append(q)

        return valid_candidates

    except Exception as e:
        return []


def validate_question(q: Dict, chunk: Dict) -> bool:
    """Validate a candidate question before accepting it."""

    # Check structure
    if not isinstance(q, dict):
        return False

    required = ['question', 'options', 'answer', 'difficulty', 'source_sentence']
    if not all(field in q for field in required):
        return False

    # Check question
    question = q.get('question', '').strip()
    if len(question) < 10 or not question.endswith('?'):
        return False

    # Don't allow RAG/source language
    bad_phrases = [
        'according to',
        'based on',
        'ncert',
        'textbook',
        'passage',
        'retrieved',
        'provided text'
    ]
    if any(phrase in question.lower() for phrase in bad_phrases):
        return False

    # Check options
    options = q.get('options', [])
    if len(options) != 4:
        return False

    # No garbage options
    garbage = ['unknown', 'not mentioned', 'all of the above', 'none of the above']
    if any(opt.lower() in garbage for opt in options):
        return False

    # Check answer
    answer = q.get('answer', '').strip()
    if answer not in options:
        return False

    # Check unique options
    if len(set(options)) != 4:
        return False

    # Check difficulty
    if q.get('difficulty') not in ['easy', 'medium', 'hard']:
        return False

    # Check source sentence exists in passage
    source_sent = q.get('source_sentence', '').strip()
    passage_text = chunk.get('text', '').lower()
    if not source_sent or source_sent.lower() not in passage_text:
        return False

    return True


def randomize_options(q: Dict) -> Dict:
    """Randomize option order while tracking correct answer."""
    options = q.get('options', [])
    answer = q.get('answer', '')

    # Shuffle with fixed seed for reproducibility
    indexed = list(enumerate(options))
    rng = random.Random(RANDOM_SEED + hash(q.get('question', '')) % 10000)
    rng.shuffle(indexed)

    shuffled_options = [opt for _, opt in indexed]

    # Answer text stays the same (already in shuffled list)
    q['options'] = shuffled_options
    # q['answer'] already contains the text, not the index

    return q


def main(collections: Dict[int, object]) -> Dict[int, List[Dict]]:
    """Generate natural, textbook-grounded questions for all classes."""
    print("Stage 4: Generating natural questions from textbook passages...\n")

    client = anthropic.Anthropic()
    candidates_by_class = {}

    for class_num in [5, 6, 7, 8]:
        collection = collections.get(class_num)
        if not collection:
            print(f"Class {class_num}: No collection found")
            candidates_by_class[class_num] = []
            continue

        print(f"Class {class_num}: Retrieving passages and generating questions...")

        # Get all chunks (we'll process them one by one)
        try:
            results = collection.get(limit=1000)  # Get up to 1000 chunks
            total_chunks = len(results['ids'])
        except:
            total_chunks = 0

        print(f"  Found {total_chunks} chunks to process")

        all_candidates = []
        processed = 0

        for i in range(0, total_chunks, 1):
            if i % 50 == 0:
                print(f"    Processing chunk {i}/{total_chunks}...", end=" ", flush=True)

            try:
                result = collection.get(ids=[results['ids'][i]])
                if not result or not result.get('documents'):
                    continue

                chunk = {
                    'text': result['documents'][0],
                    'chapter': result['metadatas'][0].get('chapter', 'Unknown'),
                    'page': result['metadatas'][0].get('page', 0),
                }

                qs = generate_questions_from_chunk(client, chunk, class_num)

                # Randomize and deduplicate
                for q in qs:
                    q = randomize_options(q)
                    # Add dedup check here if needed
                    all_candidates.append(q)

                processed += 1

            except Exception as e:
                pass

            if (i + 1) % 50 == 0:
                print(f"✓ ({len(qs)} from batch)")

        candidates_by_class[class_num] = all_candidates
        print(f"  Total valid candidates: {len(all_candidates)}\n")

    total = sum(len(v) for v in candidates_by_class.values())
    print(f"Total valid questions generated: {total}\n")

    return candidates_by_class


if __name__ == "__main__":
    pass
