"""
pipeline/chunker.py — Custom recursive text splitter.
Written from scratch. Zero LangChain / LlamaIndex imports.
No FastAPI imports.
"""
from __future__ import annotations

TARGET_TOKENS = 500   # approximate word count per chunk
OVERLAP_TOKENS = 50   # words carried over from previous chunk

# Separator cascade: try splitting on these in order
_SEPARATORS = ["\n\n", "\n", " ", ""]


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _token_count(text: str) -> int:
    """Approximate token count by word count."""
    return len(text.split())


def _split_text(text: str, separators: list[str]) -> list[str]:
    """
    Recursively split text using the first separator that produces
    pieces small enough.  Falls back to the next separator if a piece
    is still too large.
    """
    if not separators:
        # Character-level fallback — split by target char count
        size = TARGET_TOKENS * 5  # ~5 chars per token
        return [text[i : i + size] for i in range(0, len(text), size)]

    sep = separators[0]
    rest = separators[1:]

    if sep == "":
        return _split_text(text, rest)

    pieces = text.split(sep)
    result: list[str] = []

    for piece in pieces:
        piece = piece.strip()
        if not piece:
            continue
        if _token_count(piece) <= TARGET_TOKENS:
            result.append(piece)
        else:
            # This piece is still too big — recurse with the next separator
            result.extend(_split_text(piece, rest))

    return result


def _merge_with_overlap(pieces: list[str]) -> list[str]:
    """
    Merge small pieces into TARGET_TOKENS-sized chunks,
    prepending the last OVERLAP_TOKENS words of the previous chunk.
    """
    chunks: list[str] = []
    current_words: list[str] = []
    overlap_words: list[str] = []

    for piece in pieces:
        piece_words = piece.split()

        # If adding this piece would overflow, flush the current chunk
        if current_words and _token_count(" ".join(current_words + piece_words)) > TARGET_TOKENS:
            chunks.append(" ".join(current_words))
            overlap_words = current_words[-OVERLAP_TOKENS:]
            current_words = overlap_words.copy()

        current_words.extend(piece_words)

    if current_words:
        chunks.append(" ".join(current_words))

    return chunks


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def chunk_pages(pages: list[dict]) -> list[dict]:
    """
    Chunk a list of page dicts into overlapping text chunks.

    Args:
        pages: [{ "text": str, "page_number": int }, ...]

    Returns:
        [{ "text": str, "chunk_index": int, "page_number": int }, ...]
    """
    all_chunks: list[dict] = []
    chunk_index = 0

    for page in pages:
        page_text: str = page.get("text", "").strip()
        page_num: int = page.get("page_number", 1)

        if not page_text:
            continue

        # Step 1 — split page text into small pieces
        pieces = _split_text(page_text, _SEPARATORS)

        # Step 2 — merge pieces into overlap-aware chunks
        merged = _merge_with_overlap(pieces)

        for text in merged:
            text = text.strip()
            if not text:
                continue
            all_chunks.append(
                {
                    "text": text,
                    "chunk_index": chunk_index,
                    "page_number": page_num,
                }
            )
            chunk_index += 1

    return all_chunks
