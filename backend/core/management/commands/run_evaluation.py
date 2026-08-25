# backend/core/management/commands/run_evaluation.py
import json
import re
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from core.models import Course
from core.services.retrieval import retrieve_chunks

def normalize_text(text):
    return re.sub(r"\s+", " ", text).strip().casefold()

class Command(BaseCommand):
    help = "Evaluate pgvector retrieval quality against the evaluation question set."

    def handle(self, *args, **options):
        base_dir = Path(__file__).resolve().parents[2]
        questions_path = base_dir / "evaluation" / "evaluation_questions.json"
        results_path = base_dir / "evaluation" / "evaluation_results.json"

        if not questions_path.exists():
            raise CommandError(
                f"Evaluation questions file not found: {questions_path}"
            )

        with questions_path.open("r", encoding="utf-8") as f:
            evaluation = json.load(f)

        course_id = evaluation.get("course_id")
        questions = evaluation.get("questions", [])

        if not course_id:
            raise CommandError("Missing course_id in evaluation_questions.json")

        if not questions:
            raise CommandError("No questions found in evaluation_questions.json")

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

            self.stdout.write(f"\n[{question_id}] {text}")

            chunks = retrieve_chunks(
                course,
                text,
                limit=5,
            )

            retrieved = []

            for rank, chunk in enumerate(chunks, start=1):
                retrieved.append(
                    {
                        "rank": rank,
                        "chunk_id": chunk.id,
                        "document_id": chunk.document_id,
                        "document_title": chunk.document.title,
                        "page_number": chunk.page_number,
                        "distance": float(chunk.distance),
                        "content": chunk.content,
                        "content_preview": chunk.content[:500],
                    }
                )

            found = len(retrieved) > 0

            keyword = question.get("expected_chunk_keywords")
            keyword_found = None

            if keyword:
                normalized_keyword = normalize_text(keyword)

                keyword_found = any(
                    normalized_keyword in normalize_text(item["content"])
                    for item in retrieved
                )

            page_expected = question.get("expected_page")
            page_found = None

            if page_expected is not None:
                page_found = any(
                    item["page_number"] == page_expected
                    for item in retrieved
                )

            if expected_found is True:
                passed = found

                if keyword:
                    passed = passed and keyword_found

                if page_expected is not None:
                    passed = passed and page_found

            elif expected_found is False:
                passed = not found

            else:
                passed = None

            result = {
                "id": question_id,
                "category": question.get("category"),
                "question": text,
                "expected_found": expected_found,
                "retrieved_found": found,
                "passed": passed,
                "expected_page": page_expected,
                "page_found": page_found,
                "expected_chunk_keywords": keyword,
                "keyword_found": keyword_found,
                "retrieved_chunks": retrieved,
            }

            results.append(result)

            status = (
                "PASS"
                if passed is True
                else "FAIL"
                if passed is False
                else "N/A"
            )

            self.stdout.write(
                f"  {status} | retrieved={len(retrieved)}"
            )

            for item in retrieved:
                self.stdout.write(
                    f"    #{item['rank']} "
                    f"chunk={item['chunk_id']} "
                    f"page={item['page_number']} "
                    f"distance={item['distance']:.6f}"
                )

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
            "evaluation_type": "retrieval_baseline",
        }

        with results_path.open("w", encoding="utf-8") as f:
            json.dump(
                output,
                f,
                ensure_ascii=False,
                indent=2,
            )

        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("Evaluation complete.")
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
