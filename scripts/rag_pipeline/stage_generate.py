"""
Stage 4: Generate question candidates using Claude, grounded in retrieved chunks.

Retrieves relevant chunks per class, prompts Claude for question generation,
enforces page/chapter grounding requirement, and captures geographic entities.
"""
import json
from typing import List, Dict, Optional
import anthropic
from config import RETRIEVAL_TOP_K, CANONICAL_QUEST_STATES

def retrieve_context(collection, num_chunks: int = 20) -> List[Dict]:
    """Retrieve a batch of chunks from the collection for scaling."""
    # Retrieve many chunks for generation scaling (20+ per class)
    results = collection.get(limit=num_chunks)
    chunks = []
    for i in range(len(results['ids'])):
        chunks.append({
            'id': results['ids'][i],
            'text': results['documents'][i],
            'chapter': results['metadatas'][i].get('chapter', 'Unknown'),
            'page': results['metadatas'][i].get('page', 0),
        })
    return chunks

def generate_questions_for_chunk(client: anthropic.Anthropic, chunk: Dict, class_num: int) -> List[Dict]:
    """
    Prompt Claude to generate questions from a single chunk.

    Returns list of candidate question dicts with keys:
      - question: str
      - options: list[str] (exactly 4)
      - answer: str (must be in options)
      - difficulty: "easy" | "medium" | "hard"
      - source_sentence: str (supporting text from chunk)
      - page: int
      - chapter: str
      - geographic_entity: Optional[str] (if passage mentions an identifiable place/entity)
    """
    prompt = f"""You are an educational question writer. Given a passage from an NCERT Grade {class_num} textbook, generate high-quality multiple-choice questions.

STRICT REQUIREMENTS:
1. Generate 0-2 questions maximum (only if the passage is substantial enough)
2. Each question must have EXACTLY 4 options, one correct answer
3. The correct answer MUST be explicitly supported by the passage
4. Include a "source_sentence" field: the exact sentence from the passage supporting the answer
5. If the passage mentions a specific geographic entity (city, monument, river, mountain, state, national park, etc.), name it in "geographic_entity" field
6. Difficulty: easy (basic fact), medium (relationship/detail), hard (specific detail)
7. Do NOT invent information outside the passage

PASSAGE:
---
{chunk['text']}
---

Return a JSON array of question objects. Each object must have:
{{
  "question": "...",
  "options": ["A", "B", "C", "D"],
  "answer": "A|B|C|D",
  "difficulty": "easy|medium|hard",
  "source_sentence": "...",
  "geographic_entity": null | "entity name"
}}

If the passage doesn't support any good questions, return an empty array [].
"""

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        result_text = response.content[0].text
        # Extract JSON from response
        start = result_text.find('[')
        end = result_text.rfind(']') + 1
        if start >= 0 and end > start:
            candidates = json.loads(result_text[start:end])
            # Enrich with chunk metadata
            for q in candidates:
                q['page'] = chunk['page']
                q['chapter'] = chunk['chapter']
            return candidates
    except Exception as e:
        return []

    return []

def main(collections: Dict[int, object]) -> Dict[int, List[Dict]]:
    """Generate question candidates for all classes."""
    print("Stage 4: Generating question candidates...\n")

    client = anthropic.Anthropic()  # Uses ANTHROPIC_API_KEY env var
    candidates_by_class = {}

    for class_num in [5, 6, 7, 8]:
        collection = collections.get(class_num)
        if not collection:
            print(f"Class {class_num}: No collection found")
            continue

        print(f"Class {class_num}: Retrieving chunks and generating...", flush=True)

        # Retrieve sample chunks for actual generation (25 per class for realistic API usage)
        chunks = retrieve_context(collection, num_chunks=25)
        print(f" ({len(chunks)} chunks to process)")

        all_candidates = []
        for i, chunk in enumerate(chunks, 1):
            if i % 5 == 1:
                print(f"  {i}/{len(chunks)}...", end=" ", flush=True)
            qs = generate_questions_for_chunk(client, chunk, class_num)
            all_candidates.extend(qs)
            if i % 5 == 0:
                print(f"✓ ({len(qs)} from batch {i//5})")

        candidates_by_class[class_num] = all_candidates
        print(f"  Total candidates from {len(chunks)} chunks: {len(all_candidates)}\n")

    total = sum(len(v) for v in candidates_by_class.values())
    print(f"Total candidates generated: {total}\n")

    return candidates_by_class

if __name__ == "__main__":
    # Standalone test
    from stage_embed import main as embed_main
    from stage_extract import main as extract_main
    from stage_chunk import main as chunk_main
    extracts = extract_main()
    chunks = chunk_main(extracts)
    collections = embed_main(chunks)
    main(collections)
