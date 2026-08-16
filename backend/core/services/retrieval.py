# backend/core/services/retrieval.py

import re

from core.models import Course, DocumentChunk


def _tokenize(text):
    """
    Convert text into normalized words.
    """
    return set(
        re.findall(
            r"\b[a-zA-Z0-9À-ỹ]+\b",
            text.lower(),
        )
    )


def retrieve_chunks(course, query, limit=5):
    """
    Retrieve the most relevant document chunks for a query
    within a specific course.

    This is a temporary keyword-based retriever.
    It will later be replaced/augmented with vector search.
    """

    if not isinstance(course, Course):
        raise TypeError("course must be a Course instance")

    if not query or not query.strip():
        return []

    query_terms = _tokenize(query)

    if not query_terms:
        return []

    chunks = (
        DocumentChunk.objects
        .filter(document__course=course)
        .select_related("document")
    )

    results = []

    for chunk in chunks:
        chunk_terms = _tokenize(chunk.content)

        score = len(query_terms & chunk_terms)

        if score > 0:
            results.append((score, chunk))

    results.sort(
        key=lambda item: item[0],
        reverse=True,
    )

    return [
        chunk
        for score, chunk in results[:limit]
    ]