# backend/core/tests/test_retrieval.py
import unittest

from django.db import connection
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from core.models import Course, Document, DocumentChunk
from core.services.retrieval import retrieve_chunks
from core.utils.embedder import embed_text

@unittest.skipUnless(
    connection.vendor == "postgresql",
    "Vector search requires PostgreSQL + pgvector.",
)

class RetrievalTests(TestCase):

    def setUp(self):
        self.ai = Course.objects.create(
            name="Artificial Intelligence",
            code="AI",
        )

        self.database = Course.objects.create(
            name="Database",
            code="DB",
        )

        self.ai_document = Document.objects.create(
            course=self.ai,
            title="AI Lecture",
            file=SimpleUploadedFile(
                "ai.pdf",
                b"test",
                content_type="application/pdf",
            ),
            file_type="application/pdf",
        )

        self.database_document = Document.objects.create(
            course=self.database,
            title="Database Lecture",
            file=SimpleUploadedFile(
                "db.pdf",
                b"test",
                content_type="application/pdf",
            ),
            file_type="application/pdf",
        )

        content = (
            "Neural networks use backpropagation "
            "to train machine learning models."
        )

        DocumentChunk.objects.create(
            document=self.ai_document,
            content=content,
            embedding=embed_text(content),
            page_number=1,
            chunk_index=0,
        )

        content = (
            "Artificial intelligence includes "
            "machine learning and deep learning."
        )

        DocumentChunk.objects.create(
            document=self.ai_document,
            content=content,
            embedding=embed_text(content),
            page_number=2,
            chunk_index=1,
        )

        content = (
            "Database normalization reduces "
            "redundant data in relational databases."
        )

        DocumentChunk.objects.create(
            document=self.database_document,
            content=content,
            embedding=embed_text(content),
            page_number=1,
            chunk_index=0,
        )

    def test_retrieves_relevant_chunks(self):
        results = retrieve_chunks(
            self.ai,
            "neural networks backpropagation",
        )

        self.assertGreaterEqual(len(results), 1)
        self.assertEqual(
            results[0].document,
            self.ai_document,
        )
        self.assertEqual(
            results[0].chunk_index,
            0,
        )

    def test_only_searches_selected_course(self):
        results = retrieve_chunks(
            self.ai,
            "database normalization",
        )

        self.assertGreaterEqual(len(results), 1)

        for chunk in results:
            self.assertEqual(
                chunk.document.course,
                self.ai,
            )

    def test_results_are_ranked(self):
        results = retrieve_chunks(
            self.ai,
            "artificial intelligence machine learning",
        )

        self.assertGreaterEqual(len(results), 1)

        self.assertEqual(
            results[0].chunk_index,
            1,
        )

    def test_limit_is_respected(self):
        results = retrieve_chunks(
            self.ai,
            "machine learning artificial intelligence",
            limit=1,
        )

        self.assertEqual(len(results), 1)

    def test_empty_query_returns_empty(self):
        results = retrieve_chunks(
            self.ai,
            "",
        )

        self.assertEqual(results, [])