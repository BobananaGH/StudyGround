from django.test import SimpleTestCase

from core.utils.chunker import chunk_text


class ChunkerTests(SimpleTestCase):

    def test_empty_text(self):
        self.assertEqual(chunk_text(""), [])

    def test_short_text(self):
        text = "Hello world"

        result = chunk_text(text, chunk_size=100, overlap=20)

        self.assertEqual(result, ["Hello world"])

    def test_text_is_split(self):
        text = "A" * 250

        result = chunk_text(
            text,
            chunk_size=100,
            overlap=20,
        )

        self.assertEqual(len(result), 3)

    def test_overlap(self):
        text = "A" * 150

        result = chunk_text(
            text,
            chunk_size=100,
            overlap=20,
        )

        self.assertEqual(result[0][-20:], result[1][:20])

    def test_invalid_overlap(self):
        with self.assertRaises(ValueError):
            chunk_text(
                "Hello",
                chunk_size=100,
                overlap=100,
            )