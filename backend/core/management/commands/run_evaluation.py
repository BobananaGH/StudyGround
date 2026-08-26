# backend/core/management/commands/run_evaluation.py

import json
import re
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from core.models import Course
from core.services.answer_generation import generate_answer
from core.services.answer_verification import verify_answer
from core.services.retrieval import retrieve_chunks


def normalize_text(text):
    return re.sub(r"\s+", " ", text).strip().casefold()


RETRIEVAL_LIMIT = 40
FUSION_WINDOW = 1
MAX_CHUNKS = 15


class Command(BaseCommand):
    help = "Evaluate the full production RAG pipeline."

    def handle(self, *args, **options):
        base_dir = Path(__file__).resolve().parents[2]

        questions_path = (
            base_dir / "evaluation" / "evaluation_questions.json"
        )

        results_path = (
            base_dir / "evaluation" / "evaluation_results.json"
        )

        if not questions_path.exists():
            raise CommandError(
                f"Evaluation questions file not found: {questions_path}"
            )

        with questions_path.open("r", encoding="utf-8") as f:
            evaluation = json.load(f)

        course_id = evaluation.get("course_id")
        questions = evaluation.get("questions", [])

        if not course_id:
            raise CommandError(
                "Missing course_id in evaluation_questions.json"
            )

        if not questions:
            raise CommandError(
                "No questions found in evaluation_questions.json"
            )

        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            raise CommandError(
                f"Course with id={course_id} does not exist."
            )

        results = []

        self.stdout.write(
            f"Evaluating {len(questions)} question(s) "
            f"against course: {course.name}"
        )

        for question in questions:
            question_id = question["id"]
            text = question["question"]
            expected_found = question.get("expected_found")

            self.stdout.write(
                f"\n[{question_id}] {text}"
            )

            # =========================================================
            # 1. RETRIEVAL
            # =========================================================

            chunks = retrieve_chunks(
                course,
                text,
                limit=RETRIEVAL_LIMIT,
                fusion_window=FUSION_WINDOW,
                max_chunks=MAX_CHUNKS,
            )

            # ---------------------------------------------------------
            # Retrieved chunk information
            # ---------------------------------------------------------

            retrieved = []

            for rank, chunk in enumerate(chunks, start=1):
                distance = getattr(chunk, "distance", None)

                if distance is not None:
                    distance = float(distance)

                similarity = (
                    1.0 - distance
                    if distance is not None
                    else None
                )

                retrieved.append(
                    {
                        "rank": rank,
                        "chunk_id": chunk.id,
                        "document_id": chunk.document_id,
                        "document_title": chunk.document.title,
                        "page_number": chunk.page_number,
                        "distance": distance,
                        "similarity": similarity,
                        "content": chunk.content,
                        "content_preview": chunk.content[:500],
                    }
                )

            # ---------------------------------------------------------
            # Retrieval presence.
            #
            # IMPORTANT:
            # This is NOT the final answerability decision.
            #
            # It only records whether retrieval found at least one
            # independently scored candidate within the existing
            # retrieval diagnostic threshold.
            # ---------------------------------------------------------

            retrieval_found = any(
                item["distance"] is not None
                and item["distance"] <= 0.20
                for item in retrieved
            )

            # =========================================================
            # 2. FUSED CONTEXT
            # =========================================================

            fused_context = "\n\n".join(
                chunk.content.strip()
                for chunk in chunks
                if chunk.content
            )

            fused_chunk_ids = [
                chunk.id
                for chunk in chunks
            ]

            fused_page_numbers = sorted(
                {
                    chunk.page_number
                    for chunk in chunks
                    if chunk.page_number is not None
                }
            )

            # =========================================================
            # 3. RETRIEVAL-LEVEL EVALUATION METADATA
            #
            # These are diagnostic checks only.
            # They do NOT determine final answerability.
            # =========================================================

            keyword = question.get(
                "expected_chunk_keywords"
            )

            keyword_found = None

            if keyword:
                normalized_keyword = normalize_text(keyword)

                keyword_found = (
                    normalized_keyword
                    in normalize_text(fused_context)
                )

            page_expected = question.get(
                "expected_page"
            )

            page_found = None

            if page_expected is not None:
                page_found = (
                    page_expected in fused_page_numbers
                )

            # =========================================================
            # 4. ANSWER GENERATION
            # =========================================================

            generated = generate_answer(
                text,
                chunks,
            )

            generated_found = bool(
                generated.get("found")
            )

            # =========================================================
            # 5. ANSWER VERIFICATION
            #
            # This verifies that Gemini's cited evidence actually
            # belongs to the chunks retrieved from the database.
            # =========================================================

            verified = verify_answer(
                generated,
                chunks,
            )

            verified_found = bool(
                verified.get("found")
            )

            # =========================================================
            # 6. FINAL PIPELINE DECISION
            #
            # Final answerability is determined by the verified result,
            # NOT by retrieval similarity.
            # =========================================================

            final_found = verified_found

            # =========================================================
            # 7. EVALUATION PASS/FAIL
            #
            # For answerable questions:
            #   final_found must be True.
            #
            # For not-answerable questions:
            #   final_found must be False.
            #
            # Page/keyword checks remain useful diagnostics for
            # answerable questions, but they are not used to decide
            # whether an unsupported question is answerable.
            # =========================================================

            if expected_found is True:
                passed = final_found

                if keyword:
                    passed = passed and keyword_found

                if page_expected is not None:
                    passed = passed and page_found

            elif expected_found is False:
                passed = not final_found

            else:
                passed = None

            # =========================================================
            # 8. RESULT
            # =========================================================

            result = {
                "id": question_id,
                "category": question.get("category"),
                "question": text,

                # Ground-truth expectation
                "expected_found": expected_found,

                # Retrieval diagnostic
                "retrieval_found": retrieval_found,

                # Generation output
                "generated_found": generated_found,
                "generated_answer": generated.get("answer"),
                "generated_evidence": generated.get("evidence", []),

                # Verification output
                "verified_found": verified_found,
                "verified_answer": verified.get("answer"),
                "verified_evidence": verified.get("evidence", []),

                # Final pipeline decision
                "final_found": final_found,

                # Evaluation result
                "passed": passed,

                # Retrieval diagnostics
                "expected_page": page_expected,
                "page_found": page_found,

                "expected_chunk_keywords": keyword,
                "keyword_found": keyword_found,

                "retrieved_chunks": retrieved,

                "fusion": {
                    "window": FUSION_WINDOW,
                    "max_chunks": MAX_CHUNKS,
                    "returned_chunk_count": len(chunks),
                    "fused_chunk_ids": fused_chunk_ids,
                    "fused_page_numbers": fused_page_numbers,
                    "fused_context": fused_context,
                },
            }

            results.append(result)

            # =========================================================
            # 9. CONSOLE STATUS
            # =========================================================

            if expected_found is False:
                if passed is True:
                    status = "PASS | correctly not answerable"
                elif passed is False:
                    status = "FAIL | hallucination / false answerability"
                else:
                    status = "N/A"

            else:
                if passed is True:
                    status = "PASS"
                elif passed is False:
                    status = "FAIL"
                else:
                    status = "N/A"

            self.stdout.write(
                f"  {status}"
            )

            self.stdout.write(
                f"    retrieval_found={retrieval_found}"
            )

            self.stdout.write(
                f"    generated_found={generated_found}"
            )

            self.stdout.write(
                f"    verified_found={verified_found}"
            )

            self.stdout.write(
                f"    final_found={final_found}"
            )

            if generated.get("answer"):
                self.stdout.write(
                    "    generated_answer="
                    + str(generated["answer"])
                )

            self.stdout.write(
                f"    generated_evidence="
                f"{generated.get('evidence', [])}"
            )

            self.stdout.write(
                f"    verified_evidence="
                f"{verified.get('evidence', [])}"
            )

            self.stdout.write(
                f"    returned={len(chunks)} chunks"
            )

            for item in retrieved[:10]:
                distance_text = (
                    f"{item['distance']:.6f}"
                    if item["distance"] is not None
                    else "None"
                )

                similarity_text = (
                    f"{item['similarity']:.6f}"
                    if item["similarity"] is not None
                    else "None"
                )

                self.stdout.write(
                    f"      #{item['rank']} "
                    f"chunk={item['chunk_id']} "
                    f"page={item['page_number']} "
                    f"distance={distance_text} "
                    f"similarity={similarity_text}"
                )

            self.stdout.write(
                f"    fused={fused_chunk_ids}"
            )

        # =============================================================
        # SUMMARY
        # =============================================================

        passed_count = sum(
            result["passed"] is True
            for result in results
        )

        failed_count = sum(
            result["passed"] is False
            for result in results
        )

        summary = {
            "total": len(results),
            "passed": passed_count,
            "failed": failed_count,
            "accuracy": (
                passed_count / len(results)
                if results
                else 0
            ),
        }

        output = {
            "course_id": course.id,
            "course_code": course.code,
            "course_name": course.name,

            "summary": summary,

            "results": results,

            "evaluation_type": (
                "full_production_rag_pipeline"
            ),

            "pipeline": [
                "retrieve_chunks",
                "generate_answer",
                "verify_answer",
            ],

            "configuration": {
                "retrieval_limit": RETRIEVAL_LIMIT,
                "fusion_window": FUSION_WINDOW,
                "max_chunks": MAX_CHUNKS,
            },
        }

        with results_path.open(
            "w",
            encoding="utf-8",
        ) as f:
            json.dump(
                output,
                f,
                ensure_ascii=False,
                indent=2,
            )

        # =============================================================
        # FINAL SUMMARY
        # =============================================================

        self.stdout.write(
            "\n" + "=" * 60
        )

        self.stdout.write(
            "Full pipeline evaluation complete."
        )

        self.stdout.write(
            f"Passed: {passed_count}/{len(results)}"
        )

        self.stdout.write(
            f"Failed: {failed_count}/{len(results)}"
        )

        self.stdout.write(
            f"Accuracy: {summary['accuracy']:.2%}"
        )

        self.stdout.write(
            f"Results written to: {results_path}"
        )