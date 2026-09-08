# backend/core/services/response_parser.py
import json


def empty_result():
    return {
        "found": False,
        "answer": None,
        "evidence": [],
        "needs_document_overview": False,
    }


def parse_json_result(response_text):
    """
    Parse a JSON response from Gemini and normalize it into
    the format expected by the rest of the backend.
    """
    if not response_text:
        return empty_result()

    try:
        data = json.loads(response_text)
    except (json.JSONDecodeError, TypeError):
        return empty_result()

    return normalize_result(data)


def parse_groq_result(response_text):
    """
    Parse Groq broad-answer output.

    Expected format:

    ANSWER:
    **Topic:** Topic 1
    Explanation...

    **Topic:** Topic 2
    Explanation...

    EVIDENCE:
    123 | exact excerpt
    456 | exact excerpt

    Markdown formatting around ANSWER, Topic, and EVIDENCE
    markers is tolerated.
    """
    if not response_text:
        return empty_result()

    text = response_text.strip()

    if not text:
        return empty_result()

    answer_lines = []
    evidence = []
    in_evidence = False

    for raw_line in text.splitlines():
        line = raw_line.strip()

        if not line:
            if not in_evidence and answer_lines:
                answer_lines.append("")
            continue

        # Ignore the optional ANSWER marker.
        if (
            line.upper() == "ANSWER:"
            or line.upper() == "**ANSWER:**"
        ):
            continue

        # Start of an evidence section.
        # Accept both:
        # EVIDENCE:
        # **EVIDENCE:**
        if (
            line.upper() == "EVIDENCE:"
            or line.upper() == "**EVIDENCE:**"
        ):
            in_evidence = True
            continue

        # A new topic means we are leaving the evidence section.
        if (
            line.startswith("**Topic:**")
            or line.startswith("- **Topic:**")
        ):
            in_evidence = False
            answer_lines.append(raw_line)
            continue

        if in_evidence:
            if "|" in line:
                chunk_id, supporting_excerpt = line.split(
                    "|",
                    1,
                )

                chunk_id = chunk_id.strip()
                supporting_excerpt = supporting_excerpt.strip()

                if (
                    chunk_id
                    and supporting_excerpt
                ):
                    evidence.append(
                        {
                            "chunk_id": chunk_id,
                            "supporting_excerpt": (
                                supporting_excerpt
                            ),
                        }
                    )

            continue

        # Ignore stray evidence-style lines.
        if "|" in line:
            left_side, _ = line.split("|", 1)

            if left_side.strip().isdigit():
                continue

        answer_lines.append(raw_line)

    answer_text = "\n".join(answer_lines).strip()

    if not answer_text:
        return empty_result()

    # Remove duplicate evidence entries.
    unique_evidence = []
    seen = set()

    for item in evidence:
        key = (
            item["chunk_id"],
            item["supporting_excerpt"],
        )

        if key in seen:
            continue

        seen.add(key)
        unique_evidence.append(item)

    result = empty_result()
    result["found"] = True
    result["answer"] = answer_text
    result["evidence"] = unique_evidence

    return result


def normalize_result(data):
    """
    Normalize an LLM-generated dictionary into the common
    StudyGround response format.
    """
    if not isinstance(data, dict):
        return empty_result()

    answer = data.get("answer")

    if isinstance(answer, str):
        answer = answer.strip()

    if not answer:
        answer = None

    evidence = []

    raw_evidence = data.get(
        "evidence",
        [],
    )

    if isinstance(raw_evidence, list):
        for item in raw_evidence:
            # Support simple chunk IDs.
            if isinstance(item, str):
                chunk_id = item.strip()

                if chunk_id:
                    evidence.append(
                        {
                            "chunk_id": chunk_id,
                            "supporting_excerpt": None,
                        }
                    )

            # Support structured evidence objects.
            elif isinstance(item, dict):
                chunk_id = item.get(
                    "chunk_id"
                )

                supporting_excerpt = item.get(
                    "supporting_excerpt"
                )

                if chunk_id is None:
                    continue

                chunk_id = str(
                    chunk_id
                ).strip()

                if not chunk_id:
                    continue

                if supporting_excerpt is not None:
                    supporting_excerpt = str(
                        supporting_excerpt
                    ).strip()

                evidence.append(
                    {
                        "chunk_id": chunk_id,
                        "supporting_excerpt": (
                            supporting_excerpt
                            if supporting_excerpt
                            else None
                        ),
                    }
                )

    return {
        "found": bool(
            data.get(
                "found",
                False,
            )
        ),
        "answer": answer,
        "evidence": evidence,
        "needs_document_overview": bool(
            data.get(
                "needs_document_overview",
                False,
            )
        ),
    }