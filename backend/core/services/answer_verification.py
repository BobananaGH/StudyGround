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


def _normalize_text(text):
    """
    Normalize whitespace and casing for supporting-excerpt comparison.
    """

    return re.sub(
        r"\s+",
        " ",
        text or "",
    ).strip().casefold()


def _verify_supporting_excerpt(excerpt, chunk_content):
    """
    Verify that the supporting excerpt actually occurs
    in the cited chunk.

    Returns the original excerpt if valid.
    Returns None if the excerpt is missing or cannot be verified.
    """

    if not isinstance(excerpt, str):
        return None

    excerpt = excerpt.strip()

    if not excerpt:
        return None

    # Keep excerpts within the limit requested from the LLM.
    if len(excerpt.split()) > 25:
        print(
            "Supporting excerpt rejected because it exceeds 25 words: "
            f"{excerpt!r}"
        )
        return None

    normalized_excerpt = _normalize_text(excerpt)
    normalized_content = _normalize_text(chunk_content)

    if not normalized_excerpt:
        return None

    if normalized_excerpt in normalized_content:
        return excerpt

    print(
        "Unverified supporting excerpt: "
        f"{excerpt!r}"
    )

    return None


def verify_answer(result, chunks):
    """
    Verify that the evidence cited by the LLM belongs to
    the chunks that were actually retrieved.

    Evidence metadata is rebuilt from the real chunks rather
    than trusting metadata returned by the LLM.

    Supporting excerpts are independently verified against
    the actual chunk content.

    If an excerpt cannot be verified, the citation remains
    valid but supporting_excerpt is set to None.
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

        # Normalize the LLM-provided chunk ID.
        chunk_id = normalize_chunk_id(raw_chunk_id)

        if chunk_id is None:
            continue

        # Only accept evidence that refers to a chunk
        # actually present in the retrieved context.
        chunk = retrieved_chunks_by_id.get(chunk_id)

        if chunk is None:
            continue

        # Verify the LLM-provided supporting excerpt
        # against the actual database chunk content.
        supporting_excerpt = _verify_supporting_excerpt(
            item.get("supporting_excerpt"),
            chunk.content,
        )

        # Rebuild ALL metadata from the real database chunk.
        verified_evidence.append(
            {
                "chunk_id": chunk_id,
                "document": chunk.document.title,
                "page": chunk.page_number,
                "supporting_excerpt": supporting_excerpt,
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