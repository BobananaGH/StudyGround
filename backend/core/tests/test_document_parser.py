# backend/core/tests/test_document_parser.py
from unittest.mock import MagicMock, patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase

from core.utils.document_parser import extract_pages


class DocumentParserTests(SimpleTestCase):

    @patch("core.utils.document_parser.pdfplumber.open")
    def test_extract_pdf_pages(self, mock_pdf_open):
        page1 = MagicMock()
        page1.extract_text.return_value = "This is page 1."

        page2 = MagicMock()
        page2.extract_text.return_value = "This is page 2."

        mock_pdf = MagicMock()
        mock_pdf.pages = [page1, page2]
        mock_pdf_open.return_value.__enter__.return_value = mock_pdf

        uploaded_file = SimpleUploadedFile(
            "lecture.pdf",
            b"fake pdf content",
            content_type="application/pdf",
        )

        result = extract_pages(uploaded_file)

        self.assertEqual(len(result), 2)

        self.assertEqual(result[0]["page_number"], 1)
        self.assertEqual(result[0]["text"], "This is page 1.")

        self.assertEqual(result[1]["page_number"], 2)
        self.assertEqual(result[1]["text"], "This is page 2.")

    def test_extract_docx(self):
        document = MagicMock()

        paragraph1 = MagicMock()
        paragraph1.text = "Introduction to BFS"

        paragraph2 = MagicMock()
        paragraph2.text = "BFS uses a queue."

        document.paragraphs = [paragraph1, paragraph2]

        with patch(
            "core.utils.document_parser.docx.Document",
            return_value=document,
        ):
            uploaded_file = SimpleUploadedFile(
                "lecture.docx",
                b"fake docx content",
                content_type=(
                    "application/vnd.openxmlformats-officedocument"
                    ".wordprocessingml.document"
                ),
            )

            result = extract_pages(uploaded_file)

        self.assertEqual(len(result), 1)
        self.assertIsNone(result[0]["page_number"])
        self.assertEqual(
            result[0]["text"],
            "Introduction to BFS\nBFS uses a queue.",
        )

    def test_unsupported_file_type(self):
        uploaded_file = SimpleUploadedFile(
            "lecture.txt",
            b"hello",
            content_type="text/plain",
        )

        with self.assertRaises(ValueError):
            extract_pages(uploaded_file)