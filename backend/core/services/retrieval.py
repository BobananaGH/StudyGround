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

def sample_document_chunks(document, count=8):
    """
    Sample chunks spread across a document.

    Unlike semantic retrieval, this function does not use the
    user's query. It selects chunks from different positions
    in the document to provide broad document coverage.

    Args:
        document: Document instance to sample from.
        count: Maximum number of chunks to return.

    Returns:
        List of DocumentChunk objects ordered by chunk_index.
    """

    if document is None:
        return []

    if count <= 0:
        return []

    chunks = list(
        DocumentChunk.objects
        .filter(
            document=document,
            embedding__isnull=False,
        )
        .order_by("chunk_index")
    )

    if not chunks:
        return []

    if len(chunks) <= count:
        return chunks

    if count == 1:
        return [chunks[0]]

    last_index = len(chunks) - 1

    selected_indexes = [
        round(i * last_index / (count - 1))
        for i in range(count)
    ]

    return [
        chunks[index]
        for index in selected_indexes
    ]
    
def sample_course_chunks(course, count_per_document=4):
    """
    Sample chunks across all documents in a course.

    Each document contributes up to count_per_document chunks,
    providing broad coverage for document-level questions.
    """

    if course is None:
        return []

    if count_per_document <= 0:
        return []

    documents = (
        course.documents
        .all()
        .order_by("id")
    )

    sampled_chunks = []

    for document in documents:
        sampled_chunks.extend(
            sample_document_chunks(
                document,
                count=count_per_document,
            )
        )

    return sampled_chunks