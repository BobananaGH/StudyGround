# backend/core/tests/test_answer_verification.py
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from core.models import Course, Document, DocumentChunk
from core.services.answer_verification import verify_answer


class AnswerVerificationTests(TestCase):

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
            content="Machine learning learns patterns from data.",
            page_number=1,
            chunk_index=0,
        )

    def test_accepts_valid_chunk_id(self):
        result = {
            "found": True,
            "answer": "Machine learning learns patterns from data.",
            "evidence": [
                {
                    "chunk_id": str(self.chunk.id),
                    "document": "AI Lecture",
                    "page": 1,
                }
            ],
        }

        verified = verify_answer(result, [self.chunk])

        self.assertTrue(verified["found"])
        self.assertEqual(len(verified["evidence"]), 1)

    def test_rejects_uncited_chunk(self):
        result = {
            "found": True,
            "answer": "Some answer.",
            "evidence": [
                {
                    "chunk_id": "999999",
                    "document": "Fake.pdf",
                    "page": 99,
                }
            ],
        }

        verified = verify_answer(result, [self.chunk])

        self.assertFalse(verified["found"])
        self.assertIsNone(verified["answer"])
        self.assertEqual(verified["evidence"], [])

    def test_found_false_passes_through(self):
        result = {
            "found": False,
            "answer": None,
            "evidence": [],
        }

        verified = verify_answer(result, [self.chunk])

        self.assertFalse(verified["found"])
        self.assertIsNone(verified["answer"])
        self.assertEqual(verified["evidence"], [])

    def test_non_dict_result_returns_not_found(self):
        verified = verify_answer(
            "not a dictionary",
            [self.chunk],
        )

        self.assertFalse(verified["found"])
        self.assertIsNone(verified["answer"])
        self.assertEqual(verified["evidence"], [])

    def test_rewrites_document_and_page_from_real_chunk(self):
        result = {
            "found": True,
            "answer": "Machine learning learns patterns from data.",
            "evidence": [
                {
                    "chunk_id": str(self.chunk.id),
                    "document": "WRONG_DOCUMENT.pdf",
                    "page": 999,
                }
            ],
        }

        verified = verify_answer(result, [self.chunk])

        self.assertTrue(verified["found"])

        self.assertEqual(
            verified["evidence"][0]["chunk_id"],
            str(self.chunk.id),
        )

        self.assertEqual(
            verified["evidence"][0]["document"],
            self.document.title,
        )

        self.assertEqual(
            verified["evidence"][0]["page"],
            self.chunk.page_number,
        )

    def test_all_evidence_rejected_returns_not_found(self):
        result = {
            "found": True,
            "answer": "Hallucinated answer.",
            "evidence": [
                {
                    "chunk_id": "999999",
                    "document": "Fake.pdf",
                    "page": 99,
                },
                {
                    "chunk_id": "888888",
                    "document": "AnotherFake.pdf",
                    "page": 50,
                },
            ],
        }

        verified = verify_answer(result, [self.chunk])

        self.assertFalse(verified["found"])
        self.assertIsNone(verified["answer"])
        self.assertEqual(verified["evidence"], [])