"""
Configuration for RAG pipeline: class mappings, state definitions, and entity-to-state gazetteer.
"""
import os
from pathlib import Path

# Root paths
REPO_ROOT = Path(__file__).parent.parent.parent
DOCS_TEXTBOOKS = REPO_ROOT / "docs" / "textbooks"
PIPELINE_OUTPUT = Path(__file__).parent / "output"

# Class-to-textbook directory mapping (Class 5-8 only; no fabrication for missing classes)
CLASS_TEXTBOOK_DIRS = {
    5: {
        "dir": DOCS_TEXTBOOKS / "class 5",
        "title": "Our Wondrous World",
        "source_prefix": "NCERT Class 5 – Our Wondrous World (Reprint 2026–27)",
        "parts": [1]  # single part
    },
    6: {
        "dir": DOCS_TEXTBOOKS / "class 6",
        "title": "Exploring Society: India and Beyond",
        "source_prefix": "NCERT Class 6 – Exploring Society: India and Beyond (Reprint 2026–27)",
        "parts": [1]  # single part
    },
    7: {
        "dir": DOCS_TEXTBOOKS / "class 7 part 1",
        "title": "Exploring Society: India and Beyond",
        "source_prefix": "NCERT Class 7 – Exploring Society: India and Beyond (Reprint 2026–27)",
        "parts": [1, 2],  # has part 1 and part 2
        "part2_dir": DOCS_TEXTBOOKS / "class 7 part 2"
    },
    8: {
        "dir": DOCS_TEXTBOOKS / "class 8 part 1",
        "title": "Exploring Society: India and Beyond",
        "source_prefix": "NCERT Class 8 – Exploring Society: India and Beyond (Reprint 2026–27)",
        "parts": [1, 2],  # has part 1 and part 2
        "part2_dir": DOCS_TEXTBOOKS / "class 8 part 2"
    }
}

# 30 canonical Quest states in journey order
CANONICAL_QUEST_STATES = [
    'Ladakh',
    'Jammu & Kashmir',
    'Himachal Pradesh',
    'Punjab',
    'Uttarakhand',
    'Haryana',
    'Rajasthan',
    'Uttar Pradesh',
    'Arunachal Pradesh',
    'Sikkim',
    'Assam',
    'Nagaland',
    'Manipur',
    'Meghalaya',
    'Tripura',
    'Mizoram',
    'Bihar',
    'West Bengal',
    'Jharkhand',
    'Gujarat',
    'Madhya Pradesh',
    'Chhattisgarh',
    'Maharashtra',
    'Odisha',
    'Telangana',
    'Goa',
    'Andhra Pradesh',
    'Karnataka',
    'Tamil Nadu',
    'Kerala',
]

# Authoritative entity-to-state mapping (verified against official geographic sources)
# Only exact matches are used; ambiguous entities are not mapped.
# Format: lowercase entity name → state name (from CANONICAL_QUEST_STATES)
ENTITY_TO_STATE_MAP = {
    # Rivers
    "indus": "Ladakh",
    "sutlej": "Himachal Pradesh",
    "ravi": "Punjab",
    "beas": "Punjab",
    "chenab": "Jammu & Kashmir",
    "yamuna": "Uttar Pradesh",
    "ganga": "Uttar Pradesh",
    "brahmaputra": "Assam",
    "ganges": "Uttar Pradesh",
    "narmada": "Madhya Pradesh",
    "godavari": "Maharashtra",
    "krishna": "Karnataka",
    "cauvery": "Karnataka",
    "mahanadi": "Odisha",
    "tapti": "Maharashtra",
    "chambal": "Madhya Pradesh",

    # Mountain ranges
    "himalayas": None,  # spans multiple states, ambiguous
    "western ghats": None,  # spans multiple states, ambiguous
    "eastern ghats": None,  # spans multiple states, ambiguous
    "aravalli": "Rajasthan",
    "vindhya": "Madhya Pradesh",

    # Major cities
    "leh": "Ladakh",
    "srinagar": "Jammu & Kashmir",
    "shimla": "Himachal Pradesh",
    "amritsar": "Punjab",
    "delhi": "Haryana",
    "jaipur": "Rajasthan",
    "lucknow": "Uttar Pradesh",
    "agra": "Uttar Pradesh",
    "guwahati": "Assam",
    "kolkata": "West Bengal",
    "mumbai": "Maharashtra",
    "bangalore": "Karnataka",
    "hyderabad": "Telangana",
    "chennai": "Tamil Nadu",
    "kochi": "Kerala",
    "goa": "Goa",
    "pune": "Maharashtra",
    "ahmedabad": "Gujarat",
    "bhopal": "Madhya Pradesh",
    "patna": "Bihar",

    # Monuments and heritage sites
    "taj mahal": "Uttar Pradesh",
    "red fort": "Uttar Pradesh",
    "qutub minar": "Haryana",
    "hawa mahal": "Rajasthan",
    "fatehpur sikri": "Uttar Pradesh",
    "khajuraho": "Madhya Pradesh",
    "ajanta": "Maharashtra",
    "ellora": "Maharashtra",
    "hampi": "Karnataka",
    "angkor": None,  # Cambodia, not India
    "borobudur": None,  # Indonesia, not India

    # National parks and wildlife
    "ranthambore": "Rajasthan",
    "kaziranga": "Assam",
    "periyar": "Kerala",
    "sundarbans": "West Bengal",
    "jim corbett": "Uttarakhand",

    # Other geographic features
    "thar desert": "Rajasthan",
    "deccan plateau": None,  # spans multiple states
    "coromandel coast": "Tamil Nadu",
    "malabar coast": "Kerala",
}

# RAG configuration
CHUNK_SIZE = 500  # characters per chunk (smaller = more chunks, more generation targets)
CHUNK_OVERLAP = 150  # character overlap between chunks
EMBEDDING_MODEL = "all-MiniLM-L6-v2"  # sentence-transformers model for local embeddings
RETRIEVAL_TOP_K = 3  # number of chunks to retrieve for generation

# Question generation parameters
QUESTIONS_PER_CHUNK_CLUSTER = 1  # target ~1 question per chunk (reduce per-chunk, scale via more chunks)
OPTION_COUNT = 4  # exactly 4 options per question (never change)
TARGET_QUESTIONS_PER_CLASS_STATE = 25  # aim for 20-30 per state per class (25 target)

# Validation parameters
SEMANTIC_DEDUP_THRESHOLD = 0.85  # cosine similarity threshold for deduplication
GROUNDING_CHECK_METHOD = "substring_fuzzy"  # substring or fuzzy matching for grounding validation

# Difficulty distribution (attempt to balance across easy/medium/hard)
DIFFICULTY_DISTRIBUTION = {
    "easy": 0.40,
    "medium": 0.40,
    "hard": 0.20,
}

# Answer position balancing target (A/B/C/D should be ~25% each)
ANSWER_POSITION_TARGET = 0.25

# Seed for reproducibility (fixed seed ensures same shuffle across runs)
RANDOM_SEED = 42
