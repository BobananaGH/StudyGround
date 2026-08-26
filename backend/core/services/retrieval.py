# backend/core/services/retrieval.py
from pgvector.django import CosineDistance

from core.models import Course, DocumentChunk
from core.services.chunk_fusion import fuse_chunks
from core.services.retrieval_scoring import (
    score_chunks,
    select_fusion_candidates,
)
from core.utils.embedder import embed_query


DEFAULT_RETRIEVAL_LIMIT = 40
DEFAULT_FUSION_WINDOW = 1
DEFAULT_MAX_FUSED_CHUNKS = 15


def retrieve_chunks(
    course,
    query,
    limit=DEFAULT_RETRIEVAL_LIMIT,
    fusion_window=DEFAULT_FUSION_WINDOW,
    max_chunks=DEFAULT_MAX_FUSED_CHUNKS,
):
    """
    Retrieve relevant document chunks for a query within a course.

    Retrieval pipeline:

        vector retrieval
            -> similarity scoring
            -> fusion candidate selection
            -> neighboring chunk fusion
            -> final output cap

    Args:
        course: Course instance to search within.
        query: User's query.
        limit: Number of initial vector candidates to retrieve.
        fusion_window: Number of neighboring chunks to include
            on each side of selected fusion candidates.
        max_chunks: Maximum number of chunks returned after fusion.
    """

    if not isinstance(course, Course):
        raise TypeError("course must be a Course instance")

    if not query or not query.strip():
        return []

    if limit <= 0:
        return []

    if fusion_window < 0:
        raise ValueError("fusion_window must be >= 0")

    if max_chunks <= 0:
        return []

    query_embedding = embed_query(query)

    chunks = list(
        DocumentChunk.objects
        .filter(
            document__course=course,
            embedding__isnull=False,
        )
        .select_related("document")
        .annotate(
            distance=CosineDistance(
                "embedding",
                query_embedding,
            )
        )
        .order_by("distance")[:limit]
    )

    if not chunks:
        return []

    scored_chunks = score_chunks(chunks)

    fusion_candidates = select_fusion_candidates(
        scored_chunks,
        max_candidates=15,
        min_chunk_gap=3,
    )

    selected_chunks = [
        item["chunk"]
        for item in fusion_candidates
    ]

    if not selected_chunks:
        return []

    fused_chunks = fuse_chunks(
        selected_chunks,
        window=fusion_window,
        max_chunks=max_chunks,
    )

    # Restore distance metadata to originally retrieved chunks.
    distance_by_id = {
        item["chunk"].id: item["distance"]
        for item in scored_chunks
    }

    for chunk in fused_chunks:
        if chunk.id in distance_by_id:
            chunk.distance = distance_by_id[chunk.id]
        else:
            chunk.distance = None

    return fused_chunks