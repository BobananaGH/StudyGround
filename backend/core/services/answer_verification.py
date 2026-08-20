# backend/core/services/answer_verification.py
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

    retrieved_chunks_by_id = {
        str(chunk.id): chunk
        for chunk in chunks
    }

    evidence = result.get("evidence") or []
    verified_evidence = []

    for item in evidence:
        if not isinstance(item, dict):
            continue

        chunk_id = str(item.get("chunk_id", ""))

        chunk = retrieved_chunks_by_id.get(chunk_id)

        if chunk is None:
            continue

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