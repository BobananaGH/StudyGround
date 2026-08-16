# backend/core/tests/test_document_ingestion.py
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from core.models import Course, Document
from core.services.document_ingestion import ingest_document


class DocumentIngestionTests(TestCase):

    def setUp(self):
        self.course = Course.objects.create(
            name="Data Structures"
        )

        self.document = Document.objects.create(
            course=self.course,
            title="Lecture 1",
            file=SimpleUploadedFile(
                "lecture.pdf",
                b"fake pdf content",
                content_type="application/pdf",
            ),
            file_type="pdf",
        )

    @patch("core.services.document_ingestion.extract_pages")
    def test_ingest_document_creates_chunks(self, mock_extract_pages):
        mock_extract_pages.return_value = [
            {
                "page_number": 1,
                "text": "A" * 250,
            },
            {
                "page_number": 2,
                "text": "B" * 150,
            },
        ]

        chunks = ingest_document(
            self.document,
            chunk_size=100,
            overlap=20,
        )

        self.assertEqual(len(chunks), 5)

        self.assertEqual(
            self.document.chunks.count(),
            5,
        )

        first_chunk = self.document.chunks.first()

        self.assertEqual(first_chunk.page_number, 1)
        self.assertEqual(first_chunk.chunk_index, 0)

        mock_extract_pages.assert_called_once()

    @patch("core.services.document_ingestion.extract_pages")
    def test_ingest_document_replaces_existing_chunks(
        self,
        mock_extract_pages,
    ):
        mock_extract_pages.return_value = [
            {
                "page_number": 1,
                "text": "Hello world",
            }
        ]

        first_run = ingest_document(
            self.document,
            chunk_size=100,
            overlap=20,
        )

        self.assertEqual(len(first_run), 1)
        self.assertEqual(self.document.chunks.count(), 1)

        mock_extract_pages.return_value = [
            {
                "page_number": 2,
                "text": "Updated content",
            }
        ]

        second_run = ingest_document(
            self.document,
            chunk_size=100,
            overlap=20,
        )

        self.assertEqual(len(second_run), 1)
        self.assertEqual(self.document.chunks.count(), 1)

        chunk = self.document.chunks.first()

        self.assertEqual(chunk.page_number, 2)
        self.assertEqual(chunk.content, "Updated content")