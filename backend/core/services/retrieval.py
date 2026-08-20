# backend/core/services/retrieval.py
from pgvector.django import CosineDistance

from core.models import Course, DocumentChunk
from core.utils.embedder import embed_text


def retrieve_chunks(course, query, limit=5):
    """
    Retrieve the most relevant document chunks for a query
    within a specific course using vector similarity search.
    """

    if not isinstance(course, Course):
        raise TypeError("course must be a Course instance")

    if not query or not query.strip():
        return []

    if limit <= 0:
        return []

    query_embedding = embed_text(query)

    chunks = (
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

    return list(chunks)