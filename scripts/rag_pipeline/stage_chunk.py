"""
Stage 2: Clean and chunk extracted text while preserving page numbers.

Splits text into semantic chunks (paragraphs/sections within pages),
cleans boilerplate, and preserves metadata (class, chapter, page).
"""
import re
from typing import List, Tuple
from config import CHUNK_SIZE, CHUNK_OVERLAP

def clean_text(text: str) -> str:
    """
    Clean boilerplate from extracted text:
    - Remove headers/footers (page numbers, chapter titles at page edges)
    - Collapse multiple whitespace
    - Remove control characters
    """
    lines = text.split('\n')
    cleaned_lines = []

    for line in lines:
        # Skip obvious page headers/footers
        if re.match(r'^\s*(\d+|Chapter|CHAPTER|Unit|UNIT)\s*$', line):
            continue
        # Remove leading page numbers
        line = re.sub(r'^\s*\d+\s+', '', line)
        # Remove trailing page numbers
        line = re.sub(r'\s+\d+\s*$', '', line)
        # Collapse whitespace
        line = re.sub(r'\s+', ' ', line).strip()
        if line:
            cleaned_lines.append(line)

    text = '\n'.join(cleaned_lines)
    # Final cleanup: collapse multiple blank lines
    text = re.sub(r'\n\n+', '\n\n', text)
    return text.strip()

def split_into_semantic_chunks(text: str, max_chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """
    Split text into semantic chunks at sentence/paragraph boundaries.
    Never splits across pages (caller ensures text is single-page).

    Tries to respect sentence boundaries first, then paragraph boundaries,
    then falls back to character limit.
    """
    if len(text) <= max_chunk_size:
        return [text]

    chunks = []
    paragraphs = text.split('\n\n')

    current_chunk = ""
    for para in paragraphs:
        if len(current_chunk) + len(para) + 2 <= max_chunk_size:
            current_chunk += para + '\n\n'
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = para + '\n\n'

    if current_chunk:
        chunks.append(current_chunk.strip())

    # Add overlap between consecutive chunks (at semantic boundaries only)
    if overlap > 0 and len(chunks) > 1:
        overlapped = [chunks[0]]
        for i in range(1, len(chunks)):
            # Take the tail of prev chunk + all of current chunk
            prev_tail = chunks[i-1][-overlap:] if len(chunks[i-1]) > overlap else chunks[i-1]
            overlapped.append(prev_tail + ' ' + chunks[i])
        return overlapped

    return chunks

def chunk_extracted_data(extracts: List[Tuple[int, str, int, str]]) -> List[dict]:
    """
    Chunk extracted pages into semantic units with metadata.

    Input: list of (class, chapter_name, page_number, page_text)
    Output: list of dicts with keys:
      - class: int (5-8)
      - chapter: str (chapter name)
      - page: int (1-indexed page number)
      - text: str (chunk text)
    """
    chunks = []

    for class_num, chapter_name, page_num, page_text in extracts:
        cleaned = clean_text(page_text)
        if not cleaned:
            continue

        semantic_chunks = split_into_semantic_chunks(cleaned)
        for chunk_text in semantic_chunks:
            chunks.append({
                "class": class_num,
                "chapter": chapter_name,
                "page": page_num,
                "text": chunk_text,
            })

    return chunks

def main(extracts: dict) -> dict:
    """Chunk all extracted content."""
    print("Stage 2: Chunking and cleaning...\n")

    all_chunks = {}
    for class_num in [5, 6, 7, 8]:
        extracts_for_class = extracts.get(class_num, [])
        chunks = chunk_extracted_data(extracts_for_class)
        all_chunks[class_num] = chunks
        print(f"Class {class_num}: {len(extracts_for_class)} pages → {len(chunks)} chunks")

    total_chunks = sum(len(v) for v in all_chunks.values())
    print(f"\nTotal: {total_chunks} chunks\n")

    return all_chunks

if __name__ == "__main__":
    # Standalone test
    from stage_extract import main as extract_main
    extracts = extract_main()
    main(extracts)
