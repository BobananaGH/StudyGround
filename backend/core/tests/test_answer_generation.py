# backend/core/tests/test_answer_generation.py
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from core.models import Course, Document, DocumentChunk
from core.services.answer_generation import generate_answer


class AnswerGenerationTests(TestCase):

    def setUp(self):
        self.course = Course.objects.create(
            name="Artificial Intelligence",
            code="AI",
        )

        self.document = Document.objects.create(
            course=self.course,
            title="AI Lecture",
            file=SimpleUploadedFile(
                "ai.pdf",
                b"test",
                content_type="application/pdf",
            ),
            file_type="application/pdf",
        )

        self.chunk = DocumentChunk.objects.create(
            document=self.document,
            content=(
                "Machine learning is a branch of artificial intelligence "
                "that allows systems to learn patterns from data."
            ),
            page_number=1,
            chunk_index=0,
        )

    def test_generates_grounded_answer(self):
        result = generate_answer(
            "What is machine learning?",
            [self.chunk],
        )

        self.assertIsInstance(result, dict)

        self.assertIn("found", result)
        self.assertIn("answer", result)
        self.assertIn("evidence", result)

        self.assertTrue(result["found"])
        self.assertIsInstance(result["answer"], str)
        self.assertTrue(result["answer"].strip())

        self.assertIsInstance(result["evidence"], list)
        self.assertGreaterEqual(len(result["evidence"]), 1)

    def test_empty_query_returns_empty_result(self):
        result = generate_answer("", [self.chunk])

        self.assertEqual(
            result,
            {
                "found": False,
                "answer": None,
                "evidence": [],
            },
        )

    def test_no_chunks_returns_empty_result(self):
        result = generate_answer(
            "What is machine learning?",
            [],
        )

        self.assertEqual(
            result,
            {
                "found": False,
                "answer": None,
                "evidence": [],
            },
        )