# backend/core/services/chunk_fusion.py
from core.models import DocumentChunk


def get_neighbor_chunks(chunk, window=1):
    """
    Return neighboring chunks around a given chunk.

    The original chunk is included.

    Example with window=1:

        chunk 10
            ↓
        [chunk 9, chunk 10, chunk 11]
    """

    if not isinstance(chunk, DocumentChunk):
        raise TypeError("chunk must be a DocumentChunk instance")

    if window < 0:
        raise ValueError("window must be >= 0")

    return list(
        DocumentChunk.objects
        .filter(
            document=chunk.document,
            chunk_index__gte=chunk.chunk_index - window,
            chunk_index__lte=chunk.chunk_index + window,
        )
        .select_related("document")
        .order_by("chunk_index")
    )


def group_retrieved_chunks(chunks):
    """
    Group retrieved chunks that are adjacent within the same document.

    Example:

        1307, 1308, 1315, 1316

    becomes:

        [1307, 1308]
        [1315, 1316]

    Retained for compatibility.

    The main fusion path does not use this function because
    document-position ordering must not determine fusion priority.
    """

    if not chunks:
        return []

    ordered = sorted(
        chunks,
        key=lambda chunk: (
            chunk.document_id,
            chunk.chunk_index,
        ),
    )

    groups = []
    current_group = [ordered[0]]

    for chunk in ordered[1:]:
        previous = current_group[-1]

        same_document = (
            chunk.document_id == previous.document_id
        )

        adjacent = (
            chunk.chunk_index - previous.chunk_index <= 1
        )

        if same_document and adjacent:
            current_group.append(chunk)
        else:
            groups.append(current_group)
            current_group = [chunk]

    groups.append(current_group)

    return groups


def fuse_chunk_group(group, window=1):
    """
    Expand one fusion group by `window` on both sides.

    The returned chunks are ordered by document position.

    Example:

        retrieved group:
            1307, 1308

        window=1:

            1306, 1307, 1308, 1309
    """

    if not group:
        return []

    fused = {}

    for chunk in group:
        neighbors = get_neighbor_chunks(
            chunk,
            window=window,
        )

        for neighbor in neighbors:
            fused[neighbor.id] = neighbor

    return sorted(
        fused.values(),
        key=lambda chunk: (
            chunk.document_id,
            chunk.chunk_index,
        ),
    )


def fuse_chunks(chunks, window=1, max_chunks=None):
    """
    Perform relevance-prioritized, group-preserving chunk fusion.

    `chunks` must arrive in relevance order.

    Each anchor creates one intact fusion group containing
    the anchor and its neighboring chunks.

    Fusion groups are processed in anchor-relevance order.

    Example:

        relevance-ranked anchors:

            922, 925, 904, 907, ..., 1677

        anchor 1677 with window=1:

            [1676, 1677, 1678]

    The 1677 group keeps its relevance priority even though
    its chunk_index is much larger than earlier anchors.

    If `max_chunks` is supplied, only complete fusion groups
    are returned. A fusion group is never split at the
    max_chunks boundary.
    """

    if not chunks:
        return []

    if window < 0:
        raise ValueError("window must be >= 0")

    if max_chunks is not None and max_chunks <= 0:
        return []

    for chunk in chunks:
        if not isinstance(chunk, DocumentChunk):
            raise TypeError(
                "chunks must contain DocumentChunk instances"
            )

    seen_ids = set()
    result = []
    used_count = 0

    # IMPORTANT:
    #
    # `chunks` arrives from select_fusion_candidates()
    # already sorted by relevance.
    #
    # Do NOT sort these anchors by document_id or chunk_index.
    #
    # Relevance determines which fusion group gets priority.

    for anchor in chunks:
        if anchor.id in seen_ids:
            continue

        neighbors = get_neighbor_chunks(
            anchor,
            window=window,
        )

        # Remove chunks that were already consumed by a
        # higher-priority fusion group.
        group = [
            chunk
            for chunk in neighbors
            if chunk.id not in seen_ids
        ]

        if not group:
            continue

        # Keep document/chunk order INSIDE the fusion group.
        group.sort(
            key=lambda chunk: (
                chunk.document_id,
                chunk.chunk_index,
            )
        )

        group_size = len(group)

        # Never split a fusion group.
        if (
            max_chunks is not None
            and used_count + group_size > max_chunks
        ):
            # This group does not fit.
            #
            # Skip it rather than stopping completely, because
            # a later fusion group may be smaller and still fit
            # within the remaining budget.
            continue

        for chunk in group:
            seen_ids.add(chunk.id)

        result.extend(group)
        used_count += group_size

        if (
            max_chunks is not None
            and used_count >= max_chunks
        ):
            break

    return result