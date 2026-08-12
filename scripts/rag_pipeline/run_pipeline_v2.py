#!/usr/bin/env python3
"""
Complete RAG pipeline for generating CORRECT textbook-grounded questions.

Stages:
1. Extract: PDF text with page tracking
2. Chunk: Page-aware chunking
3. Embed: Vector indexing
4. Generate: Natural question generation (no RAG language in questions)
5. Validate: Grounding, answer validation, state mapping
6. Export: Balanced JSON export
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import stage_extract
import stage_chunk
import stage_embed
import stage_generate_v2
import stage_validate
import stage_export

from config import PIPELINE_OUTPUT

def main():
    """Run complete pipeline."""
    print("\n" + "="*80)
    print("RAG PIPELINE: TEXTBOOK-GROUNDED QUESTION GENERATION (V2)")
    print("="*80 + "\n")

    try:
        # Stage 1: Extract
        print("STAGE 1: EXTRACTION")
        print("-"*80)
        extracts = stage_extract.main()

        # Stage 2: Chunk
        print("\nSTAGE 2: CHUNKING")
        print("-"*80)
        chunks = stage_chunk.main(extracts)

        # Stage 3: Embed
        print("\nSTAGE 3: EMBEDDING & INDEXING")
        print("-"*80)
        collections = stage_embed.main(chunks)

        # Stage 4: Generate
        print("\nSTAGE 4: GENERATION")
        print("-"*80)
        candidates = stage_generate_v2.main(collections)

        # Stage 5: Validate
        print("\nSTAGE 5: VALIDATION")
        print("-"*80)
        valid, stats = stage_validate.main(candidates, chunks)

        # Stage 6: Export
        print("\nSTAGE 6: EXPORT")
        print("-"*80)
        output_files = stage_export.main(valid)

        # Final report
        print("\n" + "="*80)
        print("PIPELINE COMPLETE")
        print("="*80)
        print(f"\nOutput directory: {PIPELINE_OUTPUT}")
        print("\nQuestions generated:")
        for class_num in [5, 6, 7, 8]:
            count = len(valid.get(class_num, []))
            print(f"  Class {class_num}: {count} valid questions")

        print("\nFiles created:")
        for class_num, filepath in output_files.items():
            print(f"  {filepath}")

        print("\n✓ Pipeline succeeded. Data ready for deployment.\n")

    except Exception as e:
        print(f"\n✗ Pipeline failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
