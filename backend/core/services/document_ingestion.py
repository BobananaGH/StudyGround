# backend/core/services/document_ingestion.py
from django.db import transaction

from core.models import DocumentChunk
from core.utils.chunker import chunk_text
from core.utils.document_parser import extract_pages


@transaction.atomic
def ingest_document(document, chunk_size=1000, overlap=200):
    """
    Extract and chunk a Document, then save the chunks to the database.

    Args:
        document: A core.models.Document instance.
        chunk_size: Maximum characters per chunk.
        overlap: Number of overlapping characters between chunks.

    Returns:
        list[DocumentChunk]: The created document chunks.
    """

    # Re-ingesting a document should replace its existing chunks.
    document.chunks.all().delete()

    document.file.seek(0)

    pages = extract_pages(document.file)

    chunks = []
    chunk_index = 0

    for page in pages:
        page_number = page["page_number"]
        text = page["text"]

        text_chunks = chunk_text(
            text,
            chunk_size=chunk_size,
            overlap=overlap,
        )

        for content in text_chunks:
            chunks.append(
                DocumentChunk(
                    document=document,
                    content=content,
                    page_number=page_number,
                    chunk_index=chunk_index,
                )
            )

            chunk_index += 1

    DocumentChunk.objects.bulk_create(chunks)

    return chunks