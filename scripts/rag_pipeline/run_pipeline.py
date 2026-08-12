#!/usr/bin/env python3
"""
Master orchestration script for the complete RAG pipeline.

Runs all 6 stages end-to-end:
1. Extract: PDF text extraction with page tracking
2. Chunk: Text cleaning and semantic chunking
3. Embed: Embedding and chromadb indexing
4. Generate: Claude-based question generation
5. Validate: Grounding, deduplication, state mapping validation
6. Export: Balancing, ID assignment, JSON export

Generates a validation_report.txt with summary statistics.
"""
import sys
import json
from pathlib import Path
from datetime import datetime

# Import all stages
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import stage_extract as stage_extract
import stage_chunk as stage_chunk
import stage_embed as stage_embed
import stage_generate as stage_generate
import stage_validate as stage_validate
import stage_export as stage_export

extract_main = stage_extract.main
chunk_main = stage_chunk.main
embed_main = stage_embed.main
generate_main = stage_generate.main
validate_main = stage_validate.main
export_main = stage_export.main
from config import PIPELINE_OUTPUT

def write_validation_report(stats: dict, output_files: dict) -> None:
    """Write validation_report.txt with detailed statistics."""
    report_path = PIPELINE_OUTPUT / "validation_report.txt"

    lines = [
        "=" * 60,
        "RAG PIPELINE VALIDATION REPORT",
        "=" * 60,
        f"Generated: {datetime.now().isoformat()}",
        "",
        "SUMMARY",
        "-" * 60,
    ]

    total_generated = 0
    total_grounded = 0
    total_valid_options = 0
    total_deduped = 0
    total_state_linked = 0
    total_final = 0

    for class_num in [5, 6, 7, 8]:
        class_stats = stats.get(class_num, {})
        if not class_stats:
            lines.append(f"Class {class_num}: No processing")
            continue

        generated = class_stats.get('generated', 0)
        grounded = class_stats.get('grounded', 0)
        valid_opt = class_stats.get('valid_options', 0)
        deduped = class_stats.get('after_dedup', 0)
        state_link = class_stats.get('state_linked', 0)
        final = class_stats.get('final', 0)

        lines.append(f"")
        lines.append(f"Class {class_num}:")
        lines.append(f"  Generated candidates: {generated}")
        lines.append(f"  Grounded: {grounded} ({100*grounded//max(generated,1)}%)")
        lines.append(f"  Valid options: {valid_opt} ({100*valid_opt//max(grounded,1)}%)")
        lines.append(f"  After dedup: {deduped} ({100*deduped//max(valid_opt,1)}%)")
        lines.append(f"  State-linked: {state_link}")
        lines.append(f"  Final questions: {final}")

        total_generated += generated
        total_grounded += grounded
        total_valid_options += valid_opt
        total_deduped += deduped
        total_state_linked += state_link
        total_final += final

    lines.append("")
    lines.append("=" * 60)
    lines.append("TOTALS")
    lines.append("-" * 60)
    lines.append(f"Total generated: {total_generated}")
    lines.append(f"Total grounded: {total_grounded}")
    lines.append(f"Total valid: {total_final}")
    lines.append(f"Total state-linked: {total_state_linked}")
    lines.append("")
    lines.append("OUTPUT FILES")
    lines.append("-" * 60)
    for class_num, filepath in output_files.items():
        lines.append(f"Class {class_num}: {filepath}")
    lines.append("")
    lines.append("=" * 60)

    with open(report_path, 'w') as f:
        f.write('\n'.join(lines))

    print(f"✓ Validation report: {report_path}\n")

def main():
    """Run the complete pipeline."""
    print("\n" + "=" * 60)
    print("RAG PIPELINE FOR BHARAT QUEST QUESTION GENERATION")
    print("=" * 60 + "\n")

    try:
        # Stage 1: Extract
        print("STAGE 1: EXTRACTION")
        print("-" * 60)
        extracts = extract_main()

        # Stage 2: Chunk
        print("\nSTAGE 2: CHUNKING")
        print("-" * 60)
        chunks = chunk_main(extracts)

        # Stage 3: Embed & Index
        print("\nSTAGE 3: EMBEDDING & INDEXING")
        print("-" * 60)
        collections = embed_main(chunks)

        # Stage 4: Generate
        print("\nSTAGE 4: GENERATION")
        print("-" * 60)
        candidates = generate_main(collections)

        # Stage 5: Validate
        print("\nSTAGE 5: VALIDATION")
        print("-" * 60)
        valid, stats = validate_main(candidates, chunks)

        # Stage 6: Export
        print("\nSTAGE 6: EXPORT")
        print("-" * 60)
        output_files = export_main(valid)

        # Generate report
        print("\nGENERATING REPORT")
        print("-" * 60)
        write_validation_report(stats, output_files)

        print("=" * 60)
        print("✓ PIPELINE COMPLETE")
        print("=" * 60)
        print(f"\nOutput directory: {PIPELINE_OUTPUT}")
        print("Next steps:")
        print("  1. Review validation_report.txt")
        print("  2. Inspect class5.json, class6.json, class7.json, class8.json")
        print("  3. Review state_linked/ files for state-specific questions")
        print("  4. Copy JSON files to frontend/public/questions/quest/")
        print("")

    except Exception as e:
        print(f"\n✗ PIPELINE FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
