# backend/core/services/answer_verification.py
import re


def normalize_chunk_id(raw_chunk_id):
    """
    Normalize an LLM-provided chunk ID into the canonical
    integer database ID.

    Examples:
        "2881"              -> 2881
        "Chunk 2881"        -> 2881
        "CHUNK 2881"        -> 2881
        "chunk_2881"        -> 2881
        "chunk-2881"        -> 2881
        "[Chunk 2881]"      -> 2881
        "[CHUNK_2881]"      -> 2881
    """
    if raw_chunk_id is None:
        return None

    value = str(raw_chunk_id).strip()

    match = re.fullmatch(
        r"\[?\s*(?:chunk[\s_-]*)?(\d+)\s*\]?",
        value,
        re.IGNORECASE,
    )

    if not match:
        return None

    return int(match.group(1))


def verify_answer(result, chunks):
    """
    Verify that the evidence cited by the LLM belongs to
    the chunks that were actually retrieved.

    Evidence metadata is rebuilt from the real chunks rather
    than trusting metadata returned by the LLM.
    """

    if not isinstance(result, dict):
        return {
            "found": False,
            "answer": None,
            "evidence": [],
        }

    if not result.get("found"):
        return {
            "found": False,
            "answer": None,
            "evidence": [],
        }

    # Database chunk IDs are integers, so keep them as integers.
    retrieved_chunks_by_id = {
        chunk.id: chunk
        for chunk in chunks
    }

    evidence = result.get("evidence") or []
    verified_evidence = []

    for item in evidence:
        if not isinstance(item, dict):
            continue

        raw_chunk_id = item.get("chunk_id")

        if raw_chunk_id is None:
            continue

        # Normalize the LLM-provided representation.
        chunk_id = normalize_chunk_id(raw_chunk_id)

        if chunk_id is None:
            continue

        # Only accept evidence that refers to a chunk
        # actually present in the retrieved context.
        chunk = retrieved_chunks_by_id.get(chunk_id)

        if chunk is None:
            continue

        # Rebuild evidence metadata from the real database chunk.
        verified_evidence.append(
            {
                "chunk_id": chunk_id,
                "document": chunk.document.title,
                "page": chunk.page_number,
            }
        )

    if not verified_evidence:
        return {
            "found": False,
            "answer": None,
            "evidence": [],
        }

    return {
        "found": True,
        "answer": result.get("answer"),
        "evidence": verified_evidence,
    }