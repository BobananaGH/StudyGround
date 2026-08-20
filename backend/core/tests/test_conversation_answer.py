# backend/core/tests/test_conversation_answer.py
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from core.models import Course, Conversation, Document, DocumentChunk, Evidence
from users.models import User


class ConversationAnswerTests(TestCase):

    def setUp(self):
        self.client = APIClient()

        self.user = User.objects.create_user(
            username="testuser",
            password="testpassword",
        )

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
            uploaded_by=self.user,
        )

        self.chunk = DocumentChunk.objects.create(
            document=self.document,
            content=(
                "Machine learning is a branch of artificial intelligence "
                "that allows systems to learn from data."
            ),
            page_number=1,
            chunk_index=0,
        )

        self.conversation = Conversation.objects.create(
            user=self.user,
            course=self.course,
            title="AI Study",
        )

        self.client.force_authenticate(user=self.user)

    @patch("core.views.retrieve_chunks")
    @patch("core.views.generate_answer")
    @patch("core.views.verify_answer")
    def test_question_generates_assistant_message(
        self,
        mock_verify,
        mock_generate,
        mock_retrieve,
    ):
        mock_retrieve.return_value = [self.chunk]

        mock_generate.return_value = {
            "found": True,
            "answer": "Machine learning allows systems to learn from data.",
            "evidence": [
                {
                    "chunk_id": str(self.chunk.id),
                    "document": self.document.title,
                    "page": self.chunk.page_number,
                }
            ],
        }

        mock_verify.return_value = {
            "found": True,
            "answer": "Machine learning allows systems to learn from data.",
            "evidence": [
                {
                    "chunk_id": str(self.chunk.id),
                    "document": self.document.title,
                    "page": self.chunk.page_number,
                }
            ],
        }

        response = self.client.post(
            f"/api/conversations/{self.conversation.id}/messages/",
            {
                "role": "user",
                "content": "What is machine learning?",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        self.assertEqual(
            response.data["role"],
            "assistant",
        )

        self.assertEqual(
            response.data["content"],
            "Machine learning allows systems to learn from data.",
        )

        mock_retrieve.assert_called_once()
        mock_generate.assert_called_once()
        mock_verify.assert_called_once()

    @patch("core.views.retrieve_chunks")
    @patch("core.views.generate_answer")
    @patch("core.views.verify_answer")
    def test_evidence_is_created(
        self,
        mock_verify,
        mock_generate,
        mock_retrieve,
    ):
        mock_retrieve.return_value = [self.chunk]

        result = {
            "found": True,
            "answer": "Machine learning allows systems to learn from data.",
            "evidence": [
                {
                    "chunk_id": str(self.chunk.id),
                    "document": self.document.title,
                    "page": self.chunk.page_number,
                }
            ],
        }

        mock_generate.return_value = result
        mock_verify.return_value = result

        response = self.client.post(
            f"/api/conversations/{self.conversation.id}/messages/",
            {
                "role": "user",
                "content": "What is machine learning?",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        evidence = Evidence.objects.filter(
            message__conversation=self.conversation,
        )

        self.assertEqual(evidence.count(), 1)

        self.assertEqual(
            evidence.first().chunk,
            self.chunk,
        )

    @patch("core.views.retrieve_chunks")
    @patch("core.views.generate_answer")
    @patch("core.views.verify_answer")
    def test_no_answer_when_evidence_is_not_found(
        self,
        mock_verify,
        mock_generate,
        mock_retrieve,
    ):
        mock_retrieve.return_value = [self.chunk]

        mock_generate.return_value = {
            "found": True,
            "answer": "Something unsupported.",
            "evidence": [],
        }

        mock_verify.return_value = {
            "found": False,
            "answer": None,
            "evidence": [],
        }

        response = self.client.post(
            f"/api/conversations/{self.conversation.id}/messages/",
            {
                "role": "user",
                "content": "Something not covered by the lecture.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        self.assertEqual(
            response.data["role"],
            "assistant",
        )

        self.assertEqual(
            response.data["content"],
            "I couldn't find enough information in the course materials.",
        )

        self.assertEqual(
            Evidence.objects.filter(
                message__conversation=self.conversation,
            ).count(),
            0,
        )

    @patch("core.views.retrieve_chunks")
    def test_question_with_no_retrieved_chunks(
        self,
        mock_retrieve,
    ):
        mock_retrieve.return_value = []

        response = self.client.post(
            f"/api/conversations/{self.conversation.id}/messages/",
            {
                "role": "user",
                "content": "What is quantum computing?",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        self.assertEqual(
            response.data["role"],
            "assistant",
        )

        self.assertEqual(
            response.data["content"],
            "I couldn't find enough information in the course materials.",
        )

        self.assertEqual(
            Evidence.objects.filter(
                message__conversation=self.conversation,
            ).count(),
            0,
        )