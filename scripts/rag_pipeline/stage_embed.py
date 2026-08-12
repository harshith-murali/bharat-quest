"""
Stage 3: Embed chunks and build per-class vector index with chromadb.

Creates local embedding vectors for all chunks using sentence-transformers,
and stores them in chromadb collections for retrieval.
"""
from typing import List, Dict
import chromadb
from sentence_transformers import SentenceTransformer
from config import EMBEDDING_MODEL, PIPELINE_OUTPUT

def create_chromadb_collections(class_nums: List[int] = [5, 6, 7, 8]) -> Dict[int, chromadb.Collection]:
    """
    Create chromadb collections for each class.
    Returns dict mapping class_num -> chromadb.Collection.
    """
    # Use persistent storage in PIPELINE_OUTPUT (modern chromadb API)
    db_path = str(PIPELINE_OUTPUT / "chromadb")
    (PIPELINE_OUTPUT / "chromadb").mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=db_path)

    collections = {}
    for class_num in class_nums:
        collection_name = f"class_{class_num}"
        # Delete if exists (fresh start)
        try:
            client.delete_collection(name=collection_name)
        except:
            pass
        # Create new
        collection = client.create_collection(
            name=collection_name,
            metadata={"class": class_num},
        )
        collections[class_num] = collection

    return collections, client

def embed_and_index(chunks_by_class: Dict[int, List[dict]]) -> Dict[int, chromadb.Collection]:
    """
    Embed all chunks and index them in chromadb.

    Input: dict mapping class_num -> list of chunk dicts
    Output: dict mapping class_num -> chromadb.Collection
    """
    print("Stage 3: Embedding and indexing...\n")

    # Load embedding model
    print(f"Loading embedding model: {EMBEDDING_MODEL}...", flush=True)
    model = SentenceTransformer(EMBEDDING_MODEL)
    print("✓\n")

    # Create collections
    collections, client = create_chromadb_collections()

    # Embed and index each class
    for class_num in [5, 6, 7, 8]:
        chunks = chunks_by_class.get(class_num, [])
        if not chunks:
            print(f"Class {class_num}: No chunks to index")
            continue

        print(f"Class {class_num}: Embedding {len(chunks)} chunks...", end=" ", flush=True)

        # Prepare batch data
        texts = [chunk["text"] for chunk in chunks]
        ids = [f"class{class_num}_chunk{i:04d}" for i in range(len(chunks))]
        metadatas = [
            {
                "chapter": chunk["chapter"],
                "page": chunk["page"],
            }
            for chunk in chunks
        ]

        # Embed
        embeddings = model.encode(texts, show_progress_bar=False)

        # Index in chromadb
        collection = collections[class_num]
        collection.add(
            ids=ids,
            embeddings=embeddings.tolist(),
            metadatas=metadatas,
            documents=texts,
        )

        print(f"✓")

    print(f"\nIndexing complete. Collections persisted to: {PIPELINE_OUTPUT / 'chromadb'}\n")

    return collections

def main(chunks_by_class: Dict[int, List[dict]]) -> Dict[int, chromadb.Collection]:
    """Index all chunks."""
    return embed_and_index(chunks_by_class)

if __name__ == "__main__":
    # Standalone test
    from stage_extract import main as extract_main
    from stage_chunk import main as chunk_main
    extracts = extract_main()
    chunks = chunk_main(extracts)
    main(chunks)
