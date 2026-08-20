import json
import os

from google import genai
from google.genai import types


def generate_answer(query, chunks):
    """
    Generate a grounded, evidence-cited answer using Gemini.

    Returns:
        {
            "found": bool,
            "answer": str | None,
            "evidence": list[dict]
        }
    """

    if not query or not query.strip():
        return {
            "found": False,
            "answer": None,
            "evidence": [],
        }

    if not chunks:
        return {
            "found": False,
            "answer": None,
            "evidence": [],
        }

    context_parts = [
        f"[Chunk {chunk.id}]\n"
        f"Document: {chunk.document.title}\n"
        f"Page: {chunk.page_number}\n\n"
        f"{chunk.content}"
        for chunk in chunks
    ]

    context = "\n\n".join(context_parts)

    prompt = f"""You are an evidence-grounded study assistant.

Answer the student's question using ONLY the provided course-material context.

Do not use outside knowledge.
Do not invent information.
Every factual claim in the answer must be supported by the provided evidence.

If the evidence does not contain enough information to answer the question,
return found=false.

Return ONLY valid JSON matching this exact structure:

{{
  "found": true or false,
  "answer": "string or null",
  "evidence": [
    {{
      "chunk_id": "string",
      "document": "string",
      "page": integer or null
    }}
  ]
}}

QUESTION:
{query}

CONTEXT:
{context}
"""

    client = genai.Client(
        api_key=os.getenv("GEMINI_API_KEY")
    )

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
        ),
    )

    try:
        result = json.loads(response.text)
    except (json.JSONDecodeError, TypeError):
        return {
            "found": False,
            "answer": None,
            "evidence": [],
        }

    if not isinstance(result, dict) or "found" not in result:
        return {
            "found": False,
            "answer": None,
            "evidence": [],
        }

    return {
        "found": bool(result.get("found")),
        "answer": result.get("answer"),
        "evidence": result.get("evidence") or [],
    }