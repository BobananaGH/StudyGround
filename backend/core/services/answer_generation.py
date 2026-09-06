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


def _parse_result(response_text):
    """Parse and normalize an LLM JSON response."""

    try:
        result = json.loads(response_text)
    except (json.JSONDecodeError, TypeError):
        print("LLM returned invalid JSON.")
        return _empty_result()

    if not isinstance(result, dict) or "found" not in result:
        print("LLM returned an unexpected response structure.")
        return _empty_result()

    return {
        "found": bool(result.get("found")),
        "answer": result.get("answer"),
        "evidence": result.get("evidence") or [],
        "needs_document_overview": bool(
            result.get("needs_document_overview", False)
        ),
    }


def _call_openai_compatible(
    base_url,
    api_key_env,
    model,
    prompt,
):
    """Generic caller for an OpenAI-compatible provider."""

    from openai import OpenAI

    api_key = os.getenv(api_key_env)

    if not api_key:
        return None

    try:
        client = OpenAI(
            api_key=api_key,
            base_url=base_url,
        )

        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            response_format={
                "type": "json_object",
            },
        )

        usage = getattr(response, "usage", None)

        if usage is not None:
            print(
                f"{base_url} tokens: "
                f"prompt={getattr(usage, 'prompt_tokens', None)}, "
                f"output={getattr(usage, 'completion_tokens', None)}"
            )

        return response.choices[0].message.content

    except Exception as error:
        print(
            f"Fallback provider ({base_url}) failed: {error}"
        )
        return None


def _call_gemini(prompt):
    """
    Call Gemini with retries.

    If Gemini remains temporarily unavailable after all
    retries, fall back to Groq.

    Returns:
        response text, or None if all providers failed.
    """

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        print("GEMINI_API_KEY is not configured.")
        return None

    client = genai.Client(api_key=api_key)

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

            usage = getattr(response, "usage_metadata", None)

            if usage is not None:
                print(
                    "Gemini tokens: "
                    f"prompt={getattr(usage, 'prompt_token_count', None)}, "
                    f"output={getattr(usage, 'candidates_token_count', None)}"
                )

            return response.text

        except Exception as error:
            error_text = str(error)

            is_transient_error = (
                "503" in error_text
                or "UNAVAILABLE" in error_text
                or "429" in error_text
                or "RESOURCE_EXHAUSTED" in error_text
            )

            if not is_transient_error:
                print(
                    f"Gemini generation failed: {error}"
                )
                return None

            if attempt == max_attempts - 1:
                print(
                    "Gemini service remained unavailable "
                    f"after {max_attempts} attempts: {error}"
                )

                # Fallback: Groq
                fallback_text = _call_openai_compatible(
                    "https://api.groq.com/openai/v1",
                    "GROQ_API_KEY",
                    "openai/gpt-oss-20b",
                    prompt,
                )

                return fallback_text

            delay = 2 ** attempt

            print(
                "Gemini temporarily unavailable. "
                f"Retrying in {delay} seconds..."
            )

            time.sleep(delay)

    return None


def _build_context(chunks):
    """Build the normal RAG context."""

    context_parts = [
        f"[Chunk {chunk.id}]\n"
        f"Document: {chunk.document.title}\n"
        f"Page: {chunk.page_number}\n\n"
        f"{chunk.content}"
        for chunk in chunks
    ]

    return "\n\n".join(context_parts)


def generate_answer(query, chunks):
    """
    Generate a grounded answer using retrieved chunks.

    Returns:
        {
            "found": bool,
            "answer": str | None,
            "evidence": list[dict],
            "needs_document_overview": bool
        }
    """

    if not query or not query.strip():
        return _empty_result()

    if not chunks:
        return _empty_result()

    context = _build_context(chunks)

    prompt = f"""You are an evidence-grounded study assistant.

Do not use outside knowledge or invent information.

Every factual claim in the answer must be supported by the provided evidence.

If the evidence does not contain enough information to answer the question,
return found=false.

Only set "needs_document_overview" to true when the question explicitly asks
for a summary, overview, or whole-document synthesis and the provided context
is insufficient. Do not use it simply because the retrieved excerpts do not
contain the answer.

Otherwise, set "needs_document_overview" to false.

Do not infer missing information from the question itself.

Keep the answer concise — 2-4 sentences unless the question genuinely
requires more detail.

Return ONLY valid JSON matching this exact structure:

{{
  "found": true or false,
  "answer": "string or null",
  "needs_document_overview": true or false,
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

    response_text = _call_gemini(prompt)

    if response_text is None:
        return _model_unavailable_result()

    return _parse_result(response_text)


def generate_broad_answer(query, chunks):
    """
    Generate an answer to a broad document-level question
    using sampled chunks from across the document.

    Returns the same result structure as generate_answer().
    """

    if not query or not query.strip():
        return _empty_result()

    if not chunks:
        return _empty_result()

    context = _build_context(chunks)

    prompt = f"""You are an evidence-grounded study assistant.

The student asked a broad question about a course document.

Answer using ONLY the provided sampled excerpts.

The provided excerpts are sampled from the document and may not
represent all of its contents.

Do not use outside knowledge or invent information.

Base every factual claim on the provided excerpts.

If the excerpts do not contain enough information to answer
the question reliably, return found=false.

Keep the answer concise — 2-4 sentences unless the question genuinely
requires more detail.

Return ONLY valid JSON matching this exact structure:

{{
  "found": true or false,
  "answer": "string or null",
  "needs_document_overview": false,
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

DOCUMENT EXCERPTS:

{context}

"""

    response_text = _call_gemini(prompt)

    if response_text is None:
        return _model_unavailable_result()

    return _parse_result(response_text)