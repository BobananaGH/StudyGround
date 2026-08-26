# backend/core/services/retrieval_scoring.py
def cosine_distance_to_similarity(distance):
    """
    Convert cosine distance into similarity.

    pgvector CosineDistance:
        0.0 = identical
        larger = less similar

    Returns:
        1.0 = identical
        lower = less similar
    """
    if distance is None:
        return 0.0

    return max(0.0, 1.0 - float(distance))


def score_chunks(chunks):
    """
    Add normalized similarity scores to retrieved chunks.

    Returns a list of dictionaries containing:
        - chunk
        - distance
        - similarity
    """
    scored = []

    for chunk in chunks:
        distance = getattr(chunk, "distance", None)

        scored.append(
            {
                "chunk": chunk,
                "distance": (
                    float(distance)
                    if distance is not None
                    else None
                ),
                "similarity": cosine_distance_to_similarity(distance),
            }
        )

    return scored


def filter_relevant_chunks(scored_chunks, min_similarity=0.70):
    """
    Keep chunks whose similarity is above the configured threshold.
    """
    return [
        item
        for item in scored_chunks
        if item["similarity"] >= min_similarity
    ]


def select_fusion_candidates(
    scored_chunks,
    max_candidates=15,
    min_chunk_gap=3,
):
    """
    Select strong and spatially diverse chunks as fusion anchors.

    Candidates are considered in descending similarity order.

    A candidate is skipped when it is too close to an already-selected
    anchor in the same document. This prevents a dense cluster of
    neighboring chunks from consuming the entire fusion-anchor budget.

    The selected anchors therefore represent both:
        1. semantic relevance
        2. spatial coverage of the source documents

    Important:
        This function selects ANCHORS only.

        Neighbor expansion and the final max_chunks output limit are
        handled by chunk_fusion.py / retrieval.py.

    Args:
        scored_chunks:
            Scored retrieval candidates.

        max_candidates:
            Maximum number of fusion anchors.

        min_chunk_gap:
            Minimum chunk-index distance between anchors in the same
            document.

    Returns:
        Relevance-ranked fusion anchors.
    """

    if not scored_chunks:
        return []

    if max_candidates <= 0:
        return []

    if min_chunk_gap < 1:
        raise ValueError(
            "min_chunk_gap must be >= 1"
        )

    valid_chunks = [
        item
        for item in scored_chunks
        if item.get("similarity") is not None
    ]

    if not valid_chunks:
        return []

    # Strongest candidates first.
    valid_chunks.sort(
        key=lambda item: item["similarity"],
        reverse=True,
    )

    selected = []

    for candidate in valid_chunks:
        chunk = candidate["chunk"]

        too_close = False

        for selected_item in selected:
            selected_chunk = selected_item["chunk"]

            # Only compare spatial position inside the same document.
            if selected_chunk.document_id != chunk.document_id:
                continue

            if abs(
                selected_chunk.chunk_index
                - chunk.chunk_index
            ) < min_chunk_gap:
                too_close = True
                break

        if too_close:
            continue

        selected.append(candidate)

        if len(selected) >= max_candidates:
            break

    return selected