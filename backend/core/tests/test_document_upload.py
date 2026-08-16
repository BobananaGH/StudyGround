# backend/core/tests/test_document_upload.py

from io import BytesIO
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from core.models import Course, Document, DocumentChunk


class DocumentUploadTests(TestCase):

    def setUp(self):
        self.client = APIClient()

        self.course = Course.objects.create(
            name="Artificial Intelligence",
            code="AI",
        )

    @patch("core.views.ingest_document")
    def test_upload_pdf(self, mock_ingest):
        mock_ingest.return_value = [
            {"page_number": 1, "text": "Test content"}
        ]

        pdf = SimpleUploadedFile(
            "test.pdf",
            b"%PDF-1.4 fake pdf content",
            content_type="application/pdf",
        )

        response = self.client.post(
            "/api/documents/",
            {
                "file": pdf,
                "course_id": self.course.id,
                "title": "Test PDF",
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 201)

        document = Document.objects.get(title="Test PDF")

        self.assertEqual(document.course, self.course)
        self.assertEqual(document.file_type, "application/pdf")
        mock_ingest.assert_called_once_with(document)

    @patch("core.views.ingest_document")
    def test_upload_docx(self, mock_ingest):
        mock_ingest.return_value = [
            {"page_number": None, "text": "Test content"}
        ]

        docx = SimpleUploadedFile(
            "test.docx",
            b"fake docx content",
            content_type=(
                "application/vnd.openxmlformats-officedocument."
                "wordprocessingml.document"
            ),
        )

        response = self.client.post(
            "/api/documents/",
            {
                "file": docx,
                "course_id": self.course.id,
                "title": "Test DOCX",
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 201)

        document = Document.objects.get(title="Test DOCX")

        self.assertEqual(document.course, self.course)

    def test_reject_unsupported_file(self):
        txt = SimpleUploadedFile(
            "test.txt",
            b"not supported",
            content_type="text/plain",
        )

        response = self.client.post(
            "/api/documents/",
            {
                "file": txt,
                "course_id": self.course.id,
                "title": "Invalid File",
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 400)

        self.assertEqual(
            Document.objects.filter(title="Invalid File").count(),
            0,
        )

    def test_missing_course(self):
        pdf = SimpleUploadedFile(
            "test.pdf",
            b"%PDF-1.4 fake pdf content",
            content_type="application/pdf",
        )

        response = self.client.post(
            "/api/documents/",
            {
                "file": pdf,
                "course_id": 99999,
                "title": "Invalid Course",
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 400)

    def test_missing_file(self):
        response = self.client.post(
            "/api/documents/",
            {
                "course_id": self.course.id,
                "title": "No File",
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 400)