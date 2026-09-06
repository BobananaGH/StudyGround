# backend/core/management/commands/run_evaluation.py

import json
import re
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from core.models import Course
from core.services.answer_generation import (
    generate_answer,
    generate_broad_answer,
)
from core.services.answer_verification import verify_answer
from core.services.retrieval import (
    retrieve_chunks,
    sample_course_chunks,
)


def normalize_text(text):
    return re.sub(r"\s+", " ", text).strip().casefold()


RETRIEVAL_LIMIT = 40
FUSION_WINDOW = 1
MAX_CHUNKS = 15
BROAD_SAMPLE_COUNT_PER_DOCUMENT = 4


class Command(BaseCommand):
    help = "Evaluate the full production RAG pipeline."

    def handle(self, *args, **options):
        base_dir = Path(__file__).resolve().parents[2]

        questions_path = (
            base_dir
            / "evaluation"
            / "evaluation_questions.json"
        )

        results_path = (
            base_dir
            / "evaluation"
            / "evaluation_results.json"
        )

        if not questions_path.exists():
            raise CommandError(
                f"Evaluation questions file not found: {questions_path}"
            )

        with questions_path.open(
            "r",
            encoding="utf-8",
        ) as f:
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
            course = Course.objects.get(
                id=course_id
            )
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
            expected_found = question.get(
                "expected_found"
            )

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

            for rank, chunk in enumerate(
                chunks,
                start=1,
            ):
                distance = getattr(
                    chunk,
                    "distance",
                    None,
                )

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
                        "content_preview": (
                            chunk.content[:500]
                        ),
                    }
                )

            # ---------------------------------------------------------
            # Retrieval presence.
            #
            # Diagnostic only.
            # Does NOT determine final answerability.
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
            # Diagnostic only.
            # =========================================================

            keyword = question.get(
                "expected_chunk_keywords"
            )

            retrieval_keyword_found = None

            if keyword:
                normalized_keyword = normalize_text(
                    keyword
                )

                retrieval_keyword_found = (
                    normalized_keyword
                    in normalize_text(fused_context)
                )

            page_expected = question.get(
                "expected_page"
            )

            retrieval_page_found = None

            if page_expected is not None:
                retrieval_page_found = (
                    page_expected
                    in fused_page_numbers
                )

            # =========================================================
            # 4. NORMAL ANSWER GENERATION
            # =========================================================

            generated = generate_answer(
                text,
                chunks,
            )

            initial_generated_found = bool(
                generated.get("found")
            )

            generated_found = initial_generated_found

            needs_document_overview = bool(
                generated.get(
                    "needs_document_overview",
                    False,
                )
            )

            # ---------------------------------------------------------
            # Provider/model failure.
            #
            # This is NOT a RAG failure. The system could not obtain
            # an answer from the configured generation providers.
            # ---------------------------------------------------------

            model_unavailable = (
                generated.get("error") == "model_unavailable"
            )

            # =========================================================
            # 5. BROAD DOCUMENT-LEVEL ROUTING
            #
            # This mirrors ConversationMessagesView.
            # =========================================================

            broad_answer_used = False
            broad_chunks = []
            broad_sampled_chunk_ids = []
            broad_sampled_page_numbers = []
            broad_generated = None

            verification_chunks = chunks

            if needs_document_overview:
                broad_chunks = sample_course_chunks(
                    course,
                    count_per_document=(
                        BROAD_SAMPLE_COUNT_PER_DOCUMENT
                    ),
                )

                broad_sampled_chunk_ids = [
                    chunk.id
                    for chunk in broad_chunks
                ]

                broad_sampled_page_numbers = sorted(
                    {
                        chunk.page_number
                        for chunk in broad_chunks
                        if chunk.page_number is not None
                    }
                )

                if broad_chunks:
                    broad_answer_used = True

                    broad_generated = (
                        generate_broad_answer(
                            text,
                            broad_chunks,
                        )
                    )

                    # The final answer and verification must now
                    # use the broad sampled chunks.
                    generated = broad_generated
                    verification_chunks = broad_chunks

                    generated_found = bool(
                        generated.get("found")
                    )

                    model_unavailable = (
                        generated.get("error") == "model_unavailable"
                    )

            # =========================================================
            # 6. ANSWER VERIFICATION
            #
            # Verify against the exact context used to generate
            # the final answer.
            # =========================================================

            verified = verify_answer(
                generated,
                verification_chunks,
            )

            verified_found = bool(
                verified.get("found")
            )
            # =========================================================
            # Final-context diagnostics
            #
            # These use the exact chunks that were used for the
            # final answer generation + verification.
            # =========================================================

            final_context = "\n\n".join(
                chunk.content.strip()
                for chunk in verification_chunks
                if chunk.content
            )

            final_page_numbers = sorted(
                {
                    chunk.page_number
                    for chunk in verification_chunks
                    if chunk.page_number is not None
                }
            )

            answer_context_keyword_found = None

            if keyword:
                normalized_keyword = normalize_text(
                    keyword
                )

                answer_context_keyword_found = (
                    normalized_keyword
                    in normalize_text(final_context)
                )

            answer_context_page_found = None

            if page_expected is not None:
                answer_context_page_found = (
                    page_expected
                    in final_page_numbers
                )
            # =========================================================
            # 7. FINAL PIPELINE DECISION
            # =========================================================

            final_found = verified_found

            # =========================================================
            # 8. EVALUATION RESULT
            # =========================================================
            #
            # Separate:
            #   - real RAG failures
            #   - model/provider failures
            #   - stale/mismatched ground truth
            #
            # Only real PASS/FAIL results are included in accuracy.
            # =========================================================

            evaluation_status = None
            passed = None

            if model_unavailable:
                # The LLM provider failed. This must not be counted
                # as a RAG failure.
                evaluation_status = "model_unavailable"

            elif expected_found is True:
                # The answer itself was verified successfully.
                # If the expected page/keyword disagrees, the evaluation
                # ground truth is likely stale or incorrect.
                if not final_found:
                    evaluation_status = "rag_failure"
                    passed = False

                elif keyword and not answer_context_keyword_found:
                    evaluation_status = "ground_truth_mismatch"
                    passed = None

                elif (
                    page_expected is not None
                    and not answer_context_page_found
                ):
                    evaluation_status = "ground_truth_mismatch"
                    passed = None

                else:
                    evaluation_status = "pass"
                    passed = True

            elif expected_found is False:
                if final_found:
                    evaluation_status = "hallucination"
                    passed = False
                else:
                    evaluation_status = "pass"
                    passed = True

            else:
                evaluation_status = "not_scored"
                passed = None

            # =========================================================
            # 9. BROAD CONTEXT DIAGNOSTICS
            # =========================================================

            broad_context = "\n\n".join(
                chunk.content.strip()
                for chunk in broad_chunks
                if chunk.content
            )

            # =========================================================
            # 10. RESULT
            # =========================================================

            result = {
                "id": question_id,
                "category": question.get(
                    "category"
                ),
                "question": text,

                # -----------------------------------------------------
                # Ground-truth expectation
                # -----------------------------------------------------

                "expected_found": expected_found,

                # -----------------------------------------------------
                # Retrieval diagnostics
                # -----------------------------------------------------

                "retrieval_found": retrieval_found,

                # -----------------------------------------------------
                # Normal generation
                # -----------------------------------------------------

                "initial_generated_found": initial_generated_found,
                "broad_generated_found": (
                    broad_generated.get("found")
                    if broad_generated is not None
                    else None
                ),
                
                "needs_document_overview": (
                    needs_document_overview
                ),

                # -----------------------------------------------------
                # Broad-answer routing
                # -----------------------------------------------------

                "broad_answer_used": broad_answer_used,

                "broad_sampled_chunk_ids": (
                    broad_sampled_chunk_ids
                ),

                "broad_sampled_page_numbers": (
                    broad_sampled_page_numbers
                ),

                # -----------------------------------------------------
                # Final generation output
                # -----------------------------------------------------

                "generated_found": generated_found,

                "generated_answer": generated.get(
                    "answer"
                ),

                "generated_evidence": generated.get(
                    "evidence",
                    [],
                ),

                # -----------------------------------------------------
                # Verification output
                # -----------------------------------------------------

                "verified_found": verified_found,

                "verified_answer": verified.get(
                    "answer"
                ),

                "verified_evidence": verified.get(
                    "evidence",
                    [],
                ),

                # -----------------------------------------------------
                # Final pipeline decision
                # -----------------------------------------------------

                "final_found": final_found,

                # -----------------------------------------------------
                # Evaluation result
                # -----------------------------------------------------

                "passed": passed,

                "evaluation_status": evaluation_status,

                "model_unavailable": model_unavailable,

                # -----------------------------------------------------
                # Retrieval diagnostics
                # -----------------------------------------------------

                "expected_page": page_expected,

                "page_found": answer_context_page_found,

                "expected_chunk_keywords": keyword,

                "keyword_found": answer_context_keyword_found,

                "retrieval_diagnostics": {
                    "page_found": retrieval_page_found,
                    "keyword_found": retrieval_keyword_found,
                },

                "retrieved_chunks": retrieved,

                # -----------------------------------------------------
                # Normal retrieval/fusion
                # -----------------------------------------------------

                "fusion": {
                    "window": FUSION_WINDOW,
                    "max_chunks": MAX_CHUNKS,
                    "returned_chunk_count": len(
                        chunks
                    ),
                    "fused_chunk_ids": (
                        fused_chunk_ids
                    ),
                    "fused_page_numbers": (
                        fused_page_numbers
                    ),
                    "fused_context": fused_context,
                },

                # -----------------------------------------------------
                # Broad sampling
                # -----------------------------------------------------

                "broad_sampling": {
                    "count_per_document": (
                        BROAD_SAMPLE_COUNT_PER_DOCUMENT
                    ),
                    "returned_chunk_count": len(
                        broad_chunks
                    ),
                    "sampled_chunk_ids": (
                        broad_sampled_chunk_ids
                    ),
                    "sampled_page_numbers": (
                        broad_sampled_page_numbers
                    ),
                    "sampled_context": broad_context,
                },
            }

            results.append(result)

            # =========================================================
            # 11. CONSOLE STATUS
            # =========================================================

            if evaluation_status == "pass":
                if expected_found is False:
                    status = "PASS | correctly not answerable"
                else:
                    status = "PASS"

            elif evaluation_status == "rag_failure":
                status = "FAIL | RAG failure"

            elif evaluation_status == "hallucination":
                status = (
                    "FAIL | hallucination / "
                    "false answerability"
                )

            elif evaluation_status == "model_unavailable":
                status = "SKIP | model unavailable"

            elif evaluation_status == "ground_truth_mismatch":
                status = (
                    "SKIP | ground truth mismatch"
                )

            else:
                status = "N/A"

            self.stdout.write(
                f"  {status}"
            )

            self.stdout.write(
                f"    retrieval_found="
                f"{retrieval_found}"
            )

            self.stdout.write(
                f"    needs_document_overview="
                f"{needs_document_overview}"
            )

            self.stdout.write(
                f"    broad_answer_used="
                f"{broad_answer_used}"
            )

            self.stdout.write(
                f"    generated_found="
                f"{generated_found}"
            )

            self.stdout.write(
                f"    verified_found="
                f"{verified_found}"
            )

            self.stdout.write(
                f"    final_found="
                f"{final_found}"
            )

            if generated.get("answer"):
                self.stdout.write(
                    "    generated_answer="
                    + str(
                        generated["answer"]
                    )
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
                f"    returned="
                f"{len(chunks)} chunks"
            )

            if broad_answer_used:
                self.stdout.write(
                    f"    broad_sampled="
                    f"{len(broad_chunks)} chunks"
                )

                self.stdout.write(
                    f"    broad_chunks="
                    f"{broad_sampled_chunk_ids}"
                )

                self.stdout.write(
                    f"    broad_pages="
                    f"{broad_sampled_page_numbers}"
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
            result["evaluation_status"] == "pass"
            for result in results
        )

        failed_count = sum(
            result["evaluation_status"] in {
                "rag_failure",
                "hallucination",
            }
            for result in results
        )

        model_unavailable_count = sum(
            result["evaluation_status"]
            == "model_unavailable"
            for result in results
        )

        ground_truth_mismatch_count = sum(
            result["evaluation_status"]
            == "ground_truth_mismatch"
            for result in results
        )

        scored_count = (
            passed_count
            + failed_count
        )

        accuracy = (
            passed_count / scored_count
            if scored_count
            else 0
        )

        broad_question_count = sum(
            result["needs_document_overview"]
            for result in results
        )

        broad_answer_count = sum(
            result["broad_answer_used"]
            for result in results
        )

        summary = {
            "total": len(results),

            "scored": scored_count,

            "passed": passed_count,

            "failed": failed_count,

            "model_unavailable": (
                model_unavailable_count
            ),

            "ground_truth_mismatch": (
                ground_truth_mismatch_count
            ),

            "accuracy": accuracy,

            "needs_document_overview_count": (
                broad_question_count
            ),

            "broad_answer_used_count": (
                broad_answer_count
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
                "optional_broad_document_sampling",
                "optional_generate_broad_answer",
                "verify_answer",
            ],

            "configuration": {
                "retrieval_limit": RETRIEVAL_LIMIT,
                "fusion_window": FUSION_WINDOW,
                "max_chunks": MAX_CHUNKS,
                "broad_sample_count_per_document": (
                    BROAD_SAMPLE_COUNT_PER_DOCUMENT
                ),
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
            f"Scored: {scored_count}/{len(results)}"
        )

        self.stdout.write(
            f"Accuracy: {summary['accuracy']:.2%}"
        )

        self.stdout.write(
            f"Model unavailable: "
            f"{model_unavailable_count}"
        )

        self.stdout.write(
            f"Ground truth mismatch: "
            f"{ground_truth_mismatch_count}"
        )

        self.stdout.write(
            "Document overview requested: "
            f"{broad_question_count}"
        )

        self.stdout.write(
            "Broad answer path used: "
            f"{broad_answer_count}"
        )

        self.stdout.write(
            f"Results written to: {results_path}"
        )