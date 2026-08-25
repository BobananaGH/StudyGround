# backend/core/management/commands/reembed_chunks.py
from django.core.management.base import BaseCommand
from django.db import transaction

from core.models import DocumentChunk
from core.utils.embedder import embed_passages


BATCH_SIZE = 50


class Command(BaseCommand):
    help = (
        "Re-generate embeddings for DocumentChunk rows using the "
        "current embedding model."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--document-id",
            type=int,
            default=None,
            help="Only re-embed chunks belonging to this document ID.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report how many chunks would be re-embedded.",
        )

    def handle(self, *args, **options):
        queryset = DocumentChunk.objects.all().order_by("id")

        document_id = options["document_id"]
        if document_id is not None:
            queryset = queryset.filter(document_id=document_id)

        total = queryset.count()

        if total == 0:
            self.stdout.write(
                self.style.WARNING("No chunks found. Nothing to do.")
            )
            return

        self.stdout.write(f"Found {total} chunk(s) to re-embed.")

        if options["dry_run"]:
            self.stdout.write(
                self.style.WARNING(
                    "Dry run — no embeddings were written."
                )
            )
            return

        updated = 0
        failed = []

        chunk_ids = list(
            queryset.values_list("id", flat=True)
        )

        for start in range(0, len(chunk_ids), BATCH_SIZE):
            batch_ids = chunk_ids[start:start + BATCH_SIZE]

            batch = list(
                DocumentChunk.objects
                .filter(id__in=batch_ids)
                .order_by("id")
            )

            valid_chunks = []
            valid_texts = []

            for chunk in batch:
                if not chunk.content or not chunk.content.strip():
                    failed.append(
                        (chunk.id, "text must not be empty")
                    )
                    continue

                valid_chunks.append(chunk)
                valid_texts.append(chunk.content)

            if valid_texts:
                try:
                    embeddings = embed_passages(valid_texts)

                    with transaction.atomic():
                        for chunk, embedding in zip(
                            valid_chunks,
                            embeddings,
                        ):
                            chunk.embedding = embedding
                            chunk.save(
                                update_fields=["embedding"]
                            )
                            updated += 1

                except Exception as exc:
                    for chunk in valid_chunks:
                        failed.append(
                            (chunk.id, str(exc))
                        )

            done = min(
                start + BATCH_SIZE,
                len(chunk_ids),
            )

            self.stdout.write(
                f"  {done}/{total} processed..."
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. {updated}/{total} chunk(s) re-embedded."
            )
        )

        if failed:
            self.stdout.write(
                self.style.ERROR(
                    f"{len(failed)} chunk(s) failed and were skipped:"
                )
            )

            for chunk_id, reason in failed:
                self.stdout.write(
                    f"  chunk {chunk_id}: {reason}"
                )

        final_count = DocumentChunk.objects.filter(
            embedding__isnull=False
        ).count()

        self.stdout.write(
            f"Chunks with a non-null embedding after this run: "
            f"{final_count}"
        )