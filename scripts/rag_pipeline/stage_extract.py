"""
Stage 1: Extract text from PDFs with page number tracking.

Processes each PDF chapter file, extracts text while preserving page numbers,
and produces a list of (class, chapter_name, page_number, page_text) tuples.
"""
import re
from pathlib import Path
from typing import List, Tuple
import pypdf
from config import CLASS_TEXTBOOK_DIRS

def extract_chapter_name_from_pdf(pdf_path: Path) -> str:
    """
    Extract chapter name from the first page of a PDF.
    Falls back to PDF filename if extraction fails.
    """
    try:
        reader = pypdf.PdfReader(pdf_path)
        if len(reader.pages) > 0:
            first_page_text = reader.pages[0].extract_text()
            # Look for "Chapter N – Title" or similar pattern
            match = re.search(r'(?:CHAPTER|Chapter|UNIT|Unit)\s+(\d+)\s*(?:–|—|-)\s*(.+?)(?:\n|$)', first_page_text, re.IGNORECASE)
            if match:
                chapter_num = match.group(1)
                chapter_title = match.group(2).strip()
                return f"Chapter {chapter_num}: {chapter_title}"
            # Fallback: try to find just a title line
            lines = first_page_text.split('\n')
            for line in lines[:10]:
                line = line.strip()
                if len(line) > 5 and len(line) < 150:
                    return line
    except Exception as e:
        print(f"Warning: Could not extract chapter name from {pdf_path.name}: {e}")

    # Fallback to filename-based name
    stem = pdf_path.stem
    return f"Chapter: {stem}"

def extract_pages_from_pdf(pdf_path: Path) -> List[Tuple[int, str]]:
    """
    Extract text from all pages of a PDF.
    Returns list of (page_number, page_text) tuples.
    page_number is 1-indexed (first page = 1).
    """
    pages = []
    try:
        reader = pypdf.PdfReader(pdf_path)
        for page_num, page in enumerate(reader.pages, start=1):
            text = page.extract_text()
            if text and text.strip():
                pages.append((page_num, text))
    except Exception as e:
        print(f"Error reading PDF {pdf_path}: {e}")
    return pages

def extract_all_chapters(class_num: int) -> List[Tuple[int, str, int, str]]:
    """
    Extract all chapters for a given class.
    Returns list of (class, chapter_name, page_number, page_text) tuples.
    """
    results = []
    config = CLASS_TEXTBOOK_DIRS.get(class_num)

    if not config:
        print(f"Class {class_num} not configured. Skipping.")
        return results

    # Collect all PDF directories to process
    pdf_dirs = [config["dir"]]
    if "part2_dir" in config:
        pdf_dirs.append(config["part2_dir"])

    # Process each directory
    for pdf_dir in pdf_dirs:
        if not pdf_dir.exists():
            print(f"Warning: Directory not found: {pdf_dir}")
            continue

        pdf_files = sorted(pdf_dir.glob("*.pdf"))
        if not pdf_files:
            print(f"Warning: No PDFs found in {pdf_dir}")
            continue

        for pdf_path in pdf_files:
            # Skip glossary/cover/prelims files (they're not chapter content)
            if any(x in pdf_path.stem.lower() for x in ['ps', 'gl', 'cc', 'prelim', 'glossary']):
                continue

            print(f"  Extracting {pdf_path.name}...", end=" ", flush=True)

            chapter_name = extract_chapter_name_from_pdf(pdf_path)
            pages = extract_pages_from_pdf(pdf_path)

            for page_num, page_text in pages:
                results.append((class_num, chapter_name, page_num, page_text))

            print(f"✓ ({len(pages)} pages)")

    return results

def main():
    """Extract all textbook content."""
    print("Stage 1: Extracting textbook PDFs...\n")

    all_extracts = {}
    for class_num in [5, 6, 7, 8]:
        print(f"Class {class_num}:")
        extracts = extract_all_chapters(class_num)
        all_extracts[class_num] = extracts
        print(f"  Total: {len(extracts)} pages extracted\n")

    # Summary
    total_pages = sum(len(v) for v in all_extracts.values())
    print(f"\nExtraction Summary:")
    for class_num, extracts in all_extracts.items():
        print(f"  Class {class_num}: {len(extracts)} pages")
    print(f"  Total: {total_pages} pages\n")

    return all_extracts

if __name__ == "__main__":
    main()
