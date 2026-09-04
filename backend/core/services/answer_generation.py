# backend/core/services/answer_generation.py

import json
import os
import time

from google import genai
from google.genai import types


def _empty_result():
    return {
        "found": False,
        "answer": None,
        "evidence": [],
    }


def _model_unavailable_result():
    return {
        "found": False,
        "answer": None,
        "evidence": [],
        "error": "model_unavailable",
    }


def generate_answer(query, chunks):
    """
    Generate a grounded, evidence-cited answer using Gemini.

    Returns:
        {
            "found": bool,
            "answer": str | None,
            "evidence": list[dict]
        }

    Gemini service failures return:
        {
            "found": False,
            "answer": None,
            "evidence": [],
            "error": "model_unavailable"
        }
    """

    if not query or not query.strip():
        return _empty_result()

    if not chunks:
        return _empty_result()

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

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        print("GEMINI_API_KEY is not configured.")
        return _empty_result()

    client = genai.Client(api_key=api_key)

    # Retry transient Gemini service failures.
    #
    # Attempt 1 -> immediately
    # Attempt 2 -> wait 2 seconds
    # Attempt 3 -> wait 4 seconds
    #
    # This prevents a temporary 503 from becoming a Django 500.
    max_attempts = 3

    for attempt in range(max_attempts):
        try:
            response = client.models.generate_content(
                model="gemini-3.7-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                ),
            )
            break

        except Exception as error:
            error_text = str(error)

            is_transient_error = (
                "503" in error_text
                or "UNAVAILABLE" in error_text
                or "429" in error_text
                or "RESOURCE_EXHAUSTED" in error_text
            )

            if not is_transient_error:
                print(f"Gemini generation failed: {error}")
                return _model_unavailable_result()

            if attempt == max_attempts - 1:
                print(
                    "Gemini service remained unavailable "
                    f"after {max_attempts} attempts: {error}"
                )
                return _model_unavailable_result()

            delay = 2 ** attempt

            print(
                "Gemini temporarily unavailable. "
                f"Retrying in {delay} seconds..."
            )

            time.sleep(delay)

    # Parse Gemini's JSON response.
    try:
        result = json.loads(response.text)

    except (json.JSONDecodeError, TypeError):
        print("Gemini returned invalid JSON.")
        return _empty_result()

    if not isinstance(result, dict) or "found" not in result:
        print("Gemini returned an unexpected response structure.")
        return _empty_result()

    return {
        "found": bool(result.get("found")),
        "answer": result.get("answer"),
        "evidence": result.get("evidence") or [],
    }