# backend/core/tests/test_answer_generation.py
from unittest.mock import MagicMock, patch

from users.models import User

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from core.models import Course, Document, DocumentChunk
from core.services.answer_generation import (
    generate_answer,
    generate_broad_answer,
)


class AnswerGenerationTests(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            password="testpassword",
        )

        self.course = Course.objects.create(
            name="Artificial Intelligence",
            code="AI",
            created_by=self.user,
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

        self.chunk_2 = DocumentChunk.objects.create(
            document=self.document,
            content=(
                "Deep learning uses neural networks with multiple layers "
                "to learn complex patterns from data."
            ),
            page_number=2,
            chunk_index=1,
        )

    @patch("core.services.answer_generation.genai.Client")
    def test_generates_grounded_answer(self, mock_client_class):
        mock_response = MagicMock()

        mock_response.text = (
            '{"found": true, '
            '"answer": "Machine learning allows systems to learn patterns '
            'from data.", '
            '"needs_document_overview": false, '
            f'"evidence": [{{"chunk_id": "{self.chunk.id}", '
            f'"document": "{self.document.title}", '
            '"page": 1}]}'
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
        self.assertFalse(result["needs_document_overview"])
        self.assertGreaterEqual(
            len(result["evidence"]),
            1,
        )

    @patch("core.services.answer_generation.genai.Client")
    def test_parses_document_overview_request(
        self,
        mock_client_class,
    ):
        mock_response = MagicMock()

        mock_response.text = (
            "{"
            '"found": true, '
            '"answer": "The document discusses machine learning and '
            'deep learning.", '
            '"needs_document_overview": true, '
            '"evidence": ['
            "{"
            f'"chunk_id": "{self.chunk.id}", '
            f'"document": "{self.document.title}", '
            '"page": 1'
            "}"
            "]"
            "}"
        )

        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = mock_response
        mock_client_class.return_value = mock_client

        result = generate_answer(
            "What are the main topics covered in this document?",
            [self.chunk],
        )

        self.assertTrue(result["found"])
        self.assertTrue(
            result["needs_document_overview"]
        )

    @patch("core.services.answer_generation.genai.Client")
    def test_generates_broad_answer(
        self,
        mock_client_class,
    ):
        mock_response = MagicMock()

        mock_response.text = (
            '{"found": true, '
            '"answer": "The document covers machine learning and '
            'deep learning.", '
            '"needs_document_overview": false, '
            f'"evidence": ['
            f'{{"chunk_id": "{self.chunk.id}", '
            f'"document": "{self.document.title}", '
            f'"page": 1}}, '
            f'{{"chunk_id": "{self.chunk_2.id}", '
            f'"document": "{self.document.title}", '
            f'"page": 2}}'
            ']}'
        )

        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = mock_response
        mock_client_class.return_value = mock_client

        result = generate_broad_answer(
            "What are the main topics covered in this document?",
            [
                self.chunk,
                self.chunk_2,
            ],
        )

        self.assertTrue(result["found"])
        self.assertIsInstance(
            result["answer"],
            str,
        )

        self.assertFalse(
            result["needs_document_overview"]
        )

        self.assertEqual(
            len(result["evidence"]),
            2,
        )

    def test_empty_query_returns_empty_result(self):
        result = generate_answer(
            "",
            [self.chunk],
        )

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

    def test_broad_answer_empty_query_returns_empty_result(self):
        result = generate_broad_answer(
            "",
            [self.chunk],
        )

        self.assertEqual(
            result,
            {
                "found": False,
                "answer": None,
                "evidence": [],
            },
        )

    def test_broad_answer_no_chunks_returns_empty_result(self):
        result = generate_broad_answer(
            "What are the main topics?",
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

    @patch("core.services.answer_generation.genai.Client")
    def test_model_unavailable_returns_error(
        self,
        mock_client_class,
    ):
        mock_client = MagicMock()

        mock_client.models.generate_content.side_effect = Exception(
            "Gemini generation failed"
        )

        mock_client_class.return_value = mock_client

        with patch(
            "core.services.answer_generation._call_openai_compatible",
            return_value=None,
        ):
            result = generate_answer(
                "What is machine learning?",
                [self.chunk],
            )

        self.assertFalse(result["found"])
        self.assertIsNone(result["answer"])
        self.assertEqual(result["evidence"], [])
        self.assertEqual(
            result["error"],
            "model_unavailable",
        )