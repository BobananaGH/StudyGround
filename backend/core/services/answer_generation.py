# backend/core/services/answer_generation.py
import os
import time

from google import genai
from google.genai import types

from .response_parser import (
    empty_result,
    parse_groq_result,
    parse_json_result,
)


# Must cover the maximum number of sampled chunks used by
# generate_broad_answer().
# Current configuration: 15 chunks -> 8 + 7.
GROQ_BROAD_GROUP_SIZE = 8
GROQ_BROAD_MAX_GROUPS = 2
GROQ_BROAD_MAX_TOKENS = 1200


def _empty_result():
    return empty_result()


def _model_unavailable_result():
    return {
        "found": False,
        "answer": None,
        "evidence": [],
        "needs_document_overview": False,
        "error": "model_unavailable",
    }


def _call_openai_compatible(
    base_url,
    api_key_env,
    model,
    prompt,
    max_tokens=1200,
):
    """
    Call an OpenAI-compatible provider.

    Groq is intentionally requested as plain text rather than
    structured JSON because its JSON validation was unreliable
    with larger RAG prompts.
    """

    from openai import OpenAI

    api_key = os.getenv(api_key_env)

    if not api_key:
        print(
            f"{api_key_env} is not configured."
        )
        return None

    try:
        client = OpenAI(
            api_key=api_key,
            base_url=base_url,
            timeout=30.0,
        )

        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            max_completion_tokens=max_tokens,
            reasoning_effort="low",
        )

        usage = getattr(
            response,
            "usage",
            None,
        )

        if usage is not None:
            print(
                f"{base_url} tokens: "
                f"prompt={getattr(usage, 'prompt_tokens', None)}, "
                f"output={getattr(usage, 'completion_tokens', None)}"
            )

        finish_reason = response.choices[0].finish_reason

        print(
            f"{base_url} finish_reason: "
            f"{finish_reason}"
        )

        message = response.choices[0].message

        reasoning = getattr(
            message,
            "reasoning",
            None,
        )

        if reasoning:
            print(
                f"{base_url} reasoning tokens/content present."
            )

        content = message.content

        if not content:
            print(
                f"Fallback provider ({base_url}) "
                "returned empty content."
            )
            return None

        return content

    except Exception as error:
        print(
            f"Fallback provider ({base_url}) failed: "
            f"{error}"
        )
        return None


def _call_gemini(
    prompt,
    fallback_prompt=None,
):
    """
    Call Gemini with retries.

    If Gemini remains unavailable after all retries,
    fall back to Groq.

    Returns:
        {
            "provider": "gemini" | "groq",
            "text": str,
        }

        or None if all providers failed.
    """

    api_key = os.getenv(
        "GEMINI_API_KEY"
    )

    if not api_key:
        print(
            "GEMINI_API_KEY is not configured."
        )
    else:
        client = genai.Client(
            api_key=api_key
        )

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

                usage = getattr(
                    response,
                    "usage_metadata",
                    None,
                )

                if usage is not None:
                    print(
                        "Gemini tokens: "
                        f"prompt={getattr(usage, 'prompt_token_count', None)}, "
                        f"output={getattr(usage, 'candidates_token_count', None)}"
                    )

                response_text = response.text

                if not response_text:
                    print(
                        "Gemini returned empty content."
                    )
                    break

                return {
                    "provider": "gemini",
                    "text": response_text,
                }

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
                        f"Gemini generation failed: "
                        f"{error}"
                    )
                    break

                if attempt == max_attempts - 1:
                    print(
                        "Gemini service remained unavailable "
                        f"after {max_attempts} attempts: "
                        f"{error}"
                    )
                    break

                delay = 2 ** attempt

                print(
                    "Gemini temporarily unavailable. "
                    f"Retrying in {delay} seconds..."
                )

                time.sleep(delay)

    # Gemini was unavailable or not configured.
    # Try Groq.
    if fallback_prompt is None:
        print(
            "No fallback prompt was provided."
        )
        return None

    print(
        "Using Groq fallback provider."
    )

    fallback_text = _call_openai_compatible(
        "https://api.groq.com/openai/v1",
        "GROQ_API_KEY",
        "openai/gpt-oss-20b",
        fallback_prompt,
    )

    if fallback_text is None:
        return None

    return {
        "provider": "groq",
        "text": fallback_text,
    }


def _call_groq(
    prompt,
    max_tokens=1200,
):
    """
    Call Groq directly.

    This is used by the broad-question fallback so that
    multiple smaller Groq calls can be made independently.
    """

    return _call_openai_compatible(
        "https://api.groq.com/openai/v1",
        "GROQ_API_KEY",
        "openai/gpt-oss-20b",
        prompt,
        max_tokens=max_tokens,
    )


def _build_context(chunks):
    """Build the normal RAG context."""

    context_parts = [
        f"[Chunk {chunk.id}]\n"
        f"Document: {chunk.document.title}\n"
        f"Page: {chunk.page_number}\n\n"
        f"{chunk.content}"
        for chunk in chunks
    ]

    return "\n\n".join(
        context_parts
    )


def _build_groq_fallback_prompt(
    query,
    context,
    broad=False,
):
    """
    Build a simpler plain-text prompt for Groq.

    Groq does not need to produce JSON. A dedicated parser
    converts this response into the normalized backend format.
    """

    if broad:
        task = """The student wants to know what to focus on for an exam.

IMPORTANT SCOPE RULE:
The student is asking about the currently selected course/document.

Answer ONLY about the content of this course/document.

Do NOT mention, recommend, or list other university subjects, courses,
textbooks, or disciplines unless the provided excerpts explicitly show
that they belong to the currently selected course.

For exam-focus questions, identify important topics, concepts, theories,
principles, distinctions, historical developments, or relationships
WITHIN the current course material.

Do NOT answer with a list of subject names or textbook names.

Using ONLY the provided course excerpts, identify the most important
exam-relevant topics visible in the excerpts.

Do NOT use outside knowledge.
Do NOT invent facts.

If the provided excerpts contain meaningful course content relevant to
the question, provide a useful answer.

Do NOT return "not enough information" merely because the excerpts do
not cover the entire course.

The answer should be understood as a guide based on the provided
excerpts, not a guaranteed complete list of all exam topics.

Only say there is not enough information if the provided excerpts
contain essentially no useful course content relevant to the question.

Organize the answer as a short numbered study guide.

For each topic:
- give a short title
- briefly explain what the student should understand
- prioritize definitions, theories, principles, distinctions,
  historical facts, and important relationships

Do not claim that these are every topic in the entire course."""
    else:
        task = """Answer the student's question using ONLY the provided
course excerpts.

Do not use outside knowledge.
Do not invent facts.

First determine whether the question can be answered reliably from
the provided retrieved excerpts.

For a normal specific question:

- If the excerpts contain enough information to answer the question:
  set FOUND to true.
- If the excerpts do not contain enough information:
  set FOUND to false.

Some questions are broad document-level questions. These include
questions asking to:

- summarize the course, document, or material
- summarize the main topics
- identify major themes or main ideas across the material
- identify key concepts across the material
- give an overview of the material
- explain the overall content or structure
- identify what the student should focus on for an exam
- identify important exam topics
- identify what topics the student should study for an exam

For these broad document-level questions, if the retrieved excerpts
do not provide sufficient coverage:

- set FOUND to false
- set NEEDS_DOCUMENT_OVERVIEW to true

Do NOT attempt to answer a broad document-level question from a small
or narrow set of retrieved excerpts merely because those excerpts
contain some related information.

Do NOT set NEEDS_DOCUMENT_OVERVIEW to true merely because:
- the question is difficult
- you are uncertain
- the question contains words such as "main", "key", "important",
  or "central"
- a specific question cannot be answered from the excerpts

NEEDS_DOCUMENT_OVERVIEW should be true ONLY when the question is
genuinely broad/document-level AND broader course coverage is required."""

    return f"""You are an evidence-grounded study assistant.

{task}

Every factual claim must be supported by the provided chunks.

EVIDENCE RULES:

For every evidence item:

1. Use the exact chunk ID from the provided excerpts.
2. Copy the evidence directly from that exact chunk.
3. The evidence must be one contiguous span of text.
4. The evidence must contain NO MORE THAN 15 whitespace-separated words.
5. Copy the text character-for-character.
6. Do NOT paraphrase.
7. Do NOT summarize.
8. Do NOT translate.
9. Do NOT combine separate parts of a chunk.
10. Do NOT add words that are not in the chunk.
11. Do NOT remove words from the middle of the selected span.
12. Do NOT use "..." or "…".
13. Do NOT put quotation marks around the evidence.
14. Prefer a short phrase over a long sentence.

CRITICAL EVIDENCE RULE:

If you cannot find a short contiguous phrase that can be copied
EXACTLY from the cited chunk, DO NOT INVENT AN EVIDENCE EXCERPT.

Instead, omit that evidence item.

It is better to provide fewer verified evidence items than to provide
an inaccurate or paraphrased excerpt.

Example of valid evidence:

3327 | đấu tranh giai cấp là tất yếu

Example of invalid evidence:

3327 | đấu tranh giai cấp là tất yếu... trong thời kỳ quá độ

The second example is invalid because it contains an ellipsis and may
not be an exact contiguous excerpt.

Return ONLY the following plain-text format.

ANSWER:
<your answer here>

FOUND:
true

NEEDS_DOCUMENT_OVERVIEW:
false

EVIDENCE:
<chunk_id> | <exact short supporting excerpt>
<chunk_id> | <exact short supporting excerpt>

Rules for FOUND:

- Use true only when the answer is actually supported by the excerpts.
- Use false when the excerpts are insufficient.

Rules for NEEDS_DOCUMENT_OVERVIEW:

- Use true only for a genuinely broad document-level question where
  broader course coverage is required.
- Otherwise use false.

If FOUND is false:
- ANSWER should be empty.
- EVIDENCE should be empty.
- NEEDS_DOCUMENT_OVERVIEW should indicate whether broader course
  coverage is required.

QUESTION:

{query}

COURSE EXCERPTS:

{context}
"""


def _build_groq_broad_group_prompt(
    query,
    context,
    group_number,
    total_groups,
):
    """
    Build a compact prompt for one independent Groq broad-analysis call.

    Each call analyzes only a small group of sampled chunks so that
    Groq does not have to process the entire broad context at once.
    """

    return f"""You are an evidence-grounded study assistant.

The student asks:

{query}

IMPORTANT COURSE-SCOPE RULE:

The student is asking about the CURRENTLY SELECTED COURSE/DOCUMENT.

You must answer ONLY about the content of this course/document.

Do NOT:
- list other university subjects
- recommend other courses
- list unrelated textbooks
- switch to another discipline
- infer that the student is asking about the entire university curriculum

Only mention another subject, course, textbook, or discipline if the
provided excerpts explicitly establish that it is part of the current
course/document.

For exam-focus questions, interpret the request as:

"What important topics, concepts, theories, principles, distinctions,
or relationships WITHIN THIS COURSE should the student focus on for
the exam?"

Do NOT interpret the question as:

"Which university subjects should the student study?"

IMPORTANT:
You do NOT need complete coverage of the entire course to answer an
exam-focus question.

If this group contains meaningful course content that is relevant to
exam preparation, identify useful topics from that content.

Do NOT return "not enough information" merely because this group does
not contain the entire course.

Only return no topics if this group contains essentially no useful
course content relevant to the student's question.

This is group {group_number} of {total_groups} of the
sampled course excerpts.

Using ONLY the excerpts in this call, identify the most useful
exam-relevant topics that the student should study.

Return AT MOST 3 topics.

Prioritize:
- core definitions and concepts
- important theories and principles
- important distinctions
- historical developments
- important relationships between concepts
- information that appears central to understanding the material

For an exam-focus question, the answer must contain TOPICS FROM THE
CURRENT COURSE MATERIAL, not names of other subjects.

Do not use outside knowledge.
Do not invent facts.
Do not claim that these are all topics in the course.

Keep the answer very concise.

Do not write an introduction.
Do not write a conclusion.
Do not repeat the same topic.

Each topic must:
- have a short title
- briefly explain what the student should understand or remember
- be no more than 30 words

Every factual claim must be supported by the provided chunks.

EVIDENCE RULES — FOLLOW THESE EXACTLY:

For each topic, provide ONE evidence item.

The evidence item MUST:
- use the exact chunk ID from the provided excerpts
- copy text directly from that chunk
- use one contiguous piece of text
- contain NO MORE THAN 15 whitespace-separated words
- be short enough to fit within 15 words
- be copied exactly, character-for-character
- NOT be paraphrased
- NOT combine separate parts of the chunk
- NOT contain "..."
- NOT contain "…"
- NOT summarize the chunk
- NOT translate the chunk
- NOT modify the wording
- NOT add or remove words

IMPORTANT:
If a sentence is too long, choose a SHORTER contiguous phrase
from that sentence.

For example, this is valid:

3327 | đấu tranh giai cấp là tất yếu

This is NOT valid:

3327 | “Trong thời kỳ quá độ lên chủ nghĩa xã hội ở Việt Nam hiện nay đấu tranh giai cấp là tất yếu, tính tất yếu...”

Do NOT put quotation marks around the evidence excerpt.

IMPORTANT:
If you cannot identify an exact contiguous phrase from a chunk,
DO NOT invent one.

It is better to omit the evidence item than to generate a
paraphrased or modified quote.

Return ONLY this plain-text format.

ANSWER:
- **Topic:** short explanation
- **Topic:** short explanation
- **Topic:** short explanation

EVIDENCE:
<chunk_id> | <exact short supporting excerpt>
<chunk_id> | <exact short supporting excerpt>
<chunk_id> | <exact short supporting excerpt>

If fewer than 3 useful topics exist, return fewer topics.

If there is no usable evidence, leave the EVIDENCE section empty.

QUESTION:

{query}

COURSE EXCERPTS:

{context}
"""


def _parse_provider_response(response):
    """
    Parse a provider response using the parser appropriate
    for the provider.
    """

    if not response:
        return _model_unavailable_result()

    provider = response.get(
        "provider"
    )

    text = response.get(
        "text"
    )

    if not text:
        return _model_unavailable_result()

    if provider == "gemini":
        return parse_json_result(
            text
        )

    if provider == "groq":
        return parse_groq_result(
            text
        )

    print(
        f"Unknown response provider: "
        f"{provider}"
    )

    return _model_unavailable_result()


def _is_usable_groq_broad_result(result):
    """
    Check whether an independently generated Groq broad result
    is strong enough to include in the merged answer.

    This protects the final answer from accepting obviously
    incomplete or malformed model output.
    """

    if not result:
        return False

    if not result.get("found"):
        return False

    answer = result.get(
        "answer"
    )

    if not isinstance(answer, str):
        return False

    answer = answer.strip()

    if len(answer) < 40:
        return False

    if answer.endswith("-"):
        return False

    if answer.endswith(":"):
        return False

    if not result.get("evidence"):
        return False

    return True


def _merge_broad_groq_results(
    *results,
):
    """
    Merge multiple independently generated Groq broad-question results.

    The Groq calls do not share memory. Python performs the final
    aggregation by joining their grounded answers and deduplicating
    evidence by chunk ID.

    A merged result is considered usable only when it contains both
    answer content and at least one evidence item.
    """

    valid_results = [
        result
        for result in results
        if _is_usable_groq_broad_result(
            result
        )
    ]

    if not valid_results:
        return _model_unavailable_result()

    answers = []
    evidence = []
    seen_chunk_ids = set()

    for result in valid_results:
        answer = result.get(
            "answer"
        )

        if answer:
            answer = answer.strip()

            if answer:
                answers.append(
                    answer
                )

        for item in result.get(
            "evidence",
            [],
        ):
            chunk_id = item.get(
                "chunk_id"
            )

            if chunk_id is None:
                continue

            chunk_id = str(
                chunk_id
            ).strip()

            if not chunk_id:
                continue

            if chunk_id in seen_chunk_ids:
                continue

            seen_chunk_ids.add(
                chunk_id
            )

            evidence.append(
                item
            )

    # A broad result is not usable unless it contains both
    # substantive answer content and supporting evidence.
    if not answers or not evidence:
        return _model_unavailable_result()

    merged_answer = "\n\n".join(
        answers
    )

    return {
        "found": True,
        "answer": merged_answer,
        "evidence": evidence,
        "needs_document_overview": False,
    }


def _generate_groq_broad_answer(
    query,
    chunks,
):
    """
    Generate a broad exam-focused answer using multiple independent
    Groq calls over small groups of chunks.

    Each group contains at most GROQ_BROAD_GROUP_SIZE chunks.

    At most GROQ_BROAD_MAX_GROUPS groups are sent to Groq.

    With the current sampling configuration of 15 chunks,
    this produces:

        Group 1 -> 8 chunks
        Group 2 -> 7 chunks

    Each group is asked for at most 3 concise topics.

    Python then aggregates the successful results.
    """

    if not chunks:
        return _empty_result()

    groups = [
        chunks[
            i:i + GROQ_BROAD_GROUP_SIZE
        ]
        for i in range(
            0,
            len(chunks),
            GROQ_BROAD_GROUP_SIZE,
        )
    ]

    groups = groups[
        :GROQ_BROAD_MAX_GROUPS
    ]

    results = []

    total_groups = len(groups)

    for index, group in enumerate(
        groups,
        start=1,
    ):
        print(
            "Groq broad fallback: "
            f"processing group {index}/{total_groups} "
            f"({len(group)} chunks)."
        )

        context = _build_context(
            group
        )

        prompt = _build_groq_broad_group_prompt(
            query,
            context,
            group_number=index,
            total_groups=total_groups,
        )

        text = _call_groq(
            prompt,
            max_tokens=GROQ_BROAD_MAX_TOKENS,
        )

        if not text:
            print(
                f"Groq broad group {index} "
                "returned no usable content."
            )
            continue

        print("\n===== RAW GROQ GROUP OUTPUT =====")
        print(text)
        print("===== END RAW GROQ GROUP OUTPUT =====\n")

        result = parse_groq_result(
            text
        )

        print("===== PARSED GROQ RESULT =====")
        print(result)
        print("===== END PARSED GROQ RESULT =====\n")

        if _is_usable_groq_broad_result(
            result
        ):
            results.append(
                result
            )
        else:
            print(
                f"Groq broad group {index} "
                "did not produce a usable answer."
            )

    if not results:
        return _model_unavailable_result()

    return _merge_broad_groq_results(
        *results,
    )


def generate_answer(
    query,
    chunks,
):
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

    context = _build_context(
        chunks
    )

    prompt = f"""You are an evidence-grounded study assistant.

Your job is to answer the student's question using ONLY the provided
retrieved excerpts from the course materials.

Do not use outside knowledge.
Do not invent, assume, or fill in missing information.

Every factual claim in the answer must be supported by the provided
evidence.

First, determine whether the provided retrieved excerpts are sufficient
to answer the question reliably.

If the question can be answered from the provided excerpts:

- set "found" to true
- provide the answer
- cite the supporting chunks in "evidence"
- set "needs_document_overview" to false

For every evidence item, also provide a short supporting excerpt.

The "supporting_excerpt":
- must be copied VERBATIM from the exact cited chunk
- must not be paraphrased
- must be no more than 25 words
- must directly support the answer
- must not combine text from different chunks

If no short excerpt can be provided for an evidence item, omit that
evidence item.

If the question cannot be answered reliably from the provided excerpts,
do not guess or fill in missing information.

For a specific question, if the retrieved evidence is insufficient:

- set "found" to false
- set "answer" to null
- set "evidence" to []
- set "needs_document_overview" to false

Some questions are explicitly broad document-level questions and require
coverage across different parts of the course or document.

These include questions asking to:

- summarize the course, document, or material
- summarize the main topics
- list or explain the main topics covered
- identify major themes or main ideas across the material
- identify key concepts across the material
- give an overview of what the material covers
- explain the overall content or structure of the material
- identify the most important, central, or significant concept
- provide a conclusion or synthesis that depends on multiple parts of
  the material
- identify what the student should focus on for an exam
- identify important exam topics
- identify what topics the student should study for an exam

For these broad document-level questions, if the retrieved excerpts do
not provide sufficient coverage of the document to answer reliably:

- set "found" to false
- set "answer" to null
- set "evidence" to []
- set "needs_document_overview" to true

Do NOT attempt to answer a broad document-level question from a small
or narrow set of retrieved excerpts merely because those excerpts
contain information related to the question.

When "needs_document_overview" is true, do NOT provide an answer based
on incomplete retrieved excerpts.

Do not set "needs_document_overview" to true merely because:

- the question is difficult
- you are uncertain about the answer
- the question contains words such as "main", "key", "important", or
  "central"
- the retrieved excerpts fail to answer an otherwise specific question

Do not use outside knowledge to fill gaps in the evidence.

Keep the answer concise — 2-4 sentences unless the question genuinely
requires more detail.

Return ONLY valid JSON matching this exact structure:

{{
  "found": true,
  "answer": "string or null",
  "needs_document_overview": false,
  "evidence": [
    {{
      "chunk_id": "string",
      "supporting_excerpt": "short verbatim quote of no more than 25 words"
    }}
  ]
}}

The "found" and "needs_document_overview" fields must be JSON
booleans: true or false.

QUESTION:

{query}

CONTEXT:

{context}
"""

    groq_prompt = _build_groq_fallback_prompt(
        query,
        context,
        broad=False,
    )

    response = _call_gemini(
        prompt,
        fallback_prompt=groq_prompt,
    )

    return _parse_provider_response(
        response
    )


def generate_broad_answer(
    query,
    chunks,
):
    """
    Generate an exam-focused answer to a broad document-level question
    using sampled chunks from across the document.

    Gemini receives all sampled chunks.

    If Gemini fails, Groq analyzes the sampled chunks in multiple
    independent groups and Python aggregates the results.

    With the current sampling configuration, 15 chunks are divided into:

        Group 1 -> 8 chunks
        Group 2 -> 7 chunks
    """

    if not query or not query.strip():
        return _empty_result()

    if not chunks:
        return _empty_result()

    # Gemini gets the full sampled context.
    context = _build_context(
        chunks
    )

    prompt = f"""You are an evidence-grounded study assistant helping a
student prepare for an exam using a course document.

The student's question is:

"{query}"

IMPORTANT COURSE-SCOPE RULE:

The student is asking about the CURRENTLY SELECTED COURSE/DOCUMENT.

Answer ONLY about the content of this course/document.

Do NOT mention, recommend, or list other university subjects, courses,
textbooks, or disciplines unless the provided excerpts explicitly show
that they belong to the currently selected course/document.

For an exam-focus question, interpret the request as:

"What important topics, concepts, theories, principles, distinctions,
or relationships within THIS COURSE should the student focus on for
the exam?"

Do NOT interpret it as:

"Which university subjects should the student study?"

This is a broad document-level question. The provided excerpts are
sampled from different parts of the course to give you broad coverage.

IMPORTANT:
You do NOT need complete coverage of the entire course to answer an
exam-focus question.

If the sampled excerpts contain meaningful exam-relevant content from
the current course, provide a useful study guide based on that content.

Do NOT return "found": false merely because the sampled excerpts do not
cover every part of the course.

Only return "found": false if the provided excerpts contain essentially
no useful course content relevant to the student's question.

The answer must be understood as a guide based on the provided
excerpts, NOT a guaranteed complete list of every exam topic.

Your task is NOT simply to summarize the sampled excerpts.

Instead, identify the material from THIS COURSE that the student
should prioritize studying for an exam.

When deciding what to recommend, prioritize information such as:

- core definitions and concepts
- important theories and principles
- major philosophical viewpoints
- important distinctions and comparisons
- historical developments
- important people, works, dates, or events
- course objectives
- fundamental relationships between concepts
- concepts that appear especially central to understanding the course

Organize the answer as a practical exam study guide.

Use numbered sections for the main topics.

For each topic:
- give it a short, descriptive title
- briefly explain what the student should understand or remember
- focus on the most exam-relevant information

Keep each topic easy to scan.
Use short paragraphs or bullet points when appropriate.

Do not write the entire study guide as one long paragraph.

Do NOT claim that a topic is important merely because it appears once.
Base the recommendation on the information contained in the provided
course excerpts.

Do not use outside knowledge.
Do not invent information.
Do not add facts that are not supported by the provided excerpts.

Every factual statement in the answer must be supported by one or more
of the provided chunks.

For every evidence item, select ONLY a short contiguous phrase from
the cited chunk.

The supporting_excerpt MUST:

- be copied character-for-character from the chunk
- be a contiguous span of the chunk
- contain NO more than 25 whitespace-separated words
- NOT contain "..."
- NOT be paraphrased

Prefer the shortest phrase that directly proves the claim.

If no short excerpt can be provided for an evidence item, omit that
evidence item.

Because these are sampled excerpts rather than the complete document,
do not claim that your list is guaranteed to contain every exam topic.

Instead, answer based on the strongest exam-relevant material visible
in the provided excerpts.

Keep the answer useful, readable, and reasonably concise.
Prioritize clarity and scanability over dense prose.

A study-guide style answer may use several numbered points and does not
have to be limited to 2-4 sentences.

Return ONLY valid JSON matching this exact structure:

{{
  "found": true,
  "answer": "string or null",
  "needs_document_overview": false,
  "evidence": [
    {{
      "chunk_id": "string",
      "supporting_excerpt": "short verbatim quote of no more than 25 words"
    }}
  ]
}}

The "found" and "needs_document_overview" fields must be JSON
booleans: true or false.

If the provided excerpts contain meaningful course content relevant to
exam preparation:

- set "found" to true
- provide the study guide
- cite the relevant chunks

Do NOT set "found" to false simply because:
- the samples are incomplete
- the entire course is not visible
- you cannot guarantee that the list contains every exam topic

If the provided excerpts contain essentially no useful information
relevant to exam preparation:

- set "found" to false
- set "answer" to null
- set "evidence" to []
- set "needs_document_overview" to false

QUESTION:

{query}

DOCUMENT EXCERPTS:

{context}
"""

    # First try Gemini with the complete sampled context.
    #
    # We intentionally do not pass a Groq fallback prompt here.
    # Broad questions use the specialized multi-call Groq fallback below.
    response = _call_gemini(
        prompt,
        fallback_prompt=None,
    )

    if response is not None:
        return _parse_provider_response(
            response
        )

    # Gemini failed. Use multiple smaller Groq calls.
    print(
        "Gemini broad generation unavailable. "
        "Using multi-group Groq broad fallback."
    )

    return _generate_groq_broad_answer(
        query,
        chunks,
    )