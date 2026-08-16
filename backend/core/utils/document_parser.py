import pdfplumber
import docx


def extract_pages(file):
    """
    Extract text from a PDF or DOCX Django UploadedFile.

    Returns:
        list[dict]:
        [
            {
                "page_number": 1,
                "text": "..."
            },
            ...
        ]
    """

    name = file.name.lower()

    if name.endswith(".pdf"):
        pages = []

        with pdfplumber.open(file) as pdf:
            for page_number, page in enumerate(pdf.pages, start=1):
                text = page.extract_text() or ""

                if text.strip():
                    pages.append({
                        "page_number": page_number,
                        "text": text.strip(),
                    })

        return pages

    if name.endswith(".docx"):
        document = docx.Document(file)

        paragraphs = [
            paragraph.text.strip()
            for paragraph in document.paragraphs
            if paragraph.text.strip()
        ]

        return [
            {
                "page_number": None,
                "text": "\n".join(paragraphs),
            }
        ]

    raise ValueError("Unsupported file type. Use PDF or DOCX.")