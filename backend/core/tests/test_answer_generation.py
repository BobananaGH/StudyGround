# backend/core/tests/test_answer_generation.py
from unittest.mock import MagicMock, patch

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

        
    @patch("core.services.answer_generation.genai.Client")
    def test_generates_grounded_answer(self, mock_client_class):
        mock_response = MagicMock()
        mock_response.text = (
            '{"found": true, "answer": "Machine learning allows systems '
            'to learn patterns from data.", '
            f'"evidence": [{{"chunk_id": "{self.chunk.id}", '
            f'"document": "{self.document.title}", "page": 1}}]}}'
        )

        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = mock_response
        mock_client_class.return_value = mock_client

        result = generate_answer(
            "What is machine learning?",
            [self.chunk],
        )

        self.assertTrue(result["found"])
        self.assertIsInstance(result["answer"], str)
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