# backend/core/models.py
from django.conf import settings
from django.db import models
from pgvector.django import VectorField

class Course(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        if self.code:
            return f"{self.name} ({self.code})"
        return self.name


class CourseAlias(models.Model):
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="aliases",
    )
    alias = models.CharField(max_length=255)

    class Meta:
        unique_together = ("course", "alias")

    def __str__(self):
        return self.alias


class Document(models.Model):
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="documents",
    )
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to="documents/")
    file_type = models.CharField(max_length=50)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_documents",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class DocumentChunk(models.Model):
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="chunks",
    )

    embedding = VectorField(
        dimensions=384,
        null=True,
        blank=True,
    )

    content = models.TextField()
    page_number = models.PositiveIntegerField(null=True, blank=True)
    chunk_index = models.PositiveIntegerField()

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["document", "chunk_index"]
        constraints = [
            models.UniqueConstraint(
                fields=["document", "chunk_index"],
                name="unique_document_chunk",
            )
        ]

    def __str__(self):
        return f"{self.document.title} - Chunk {self.chunk_index}"


class Conversation(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="conversations",
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="conversations",
    )
    title = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title or f"Conversation {self.id}"


class Message(models.Model):
    ROLE_CHOICES = [
        ("user", "User"),
        ("assistant", "Assistant"),
    ]

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.role} - {self.id}"


class Evidence(models.Model):
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name="evidence",
    )
    chunk = models.ForeignKey(
        DocumentChunk,
        on_delete=models.CASCADE,
        related_name="evidence",
    )
    similarity_score = models.FloatField(null=True, blank=True)

    def __str__(self):
        return f"Evidence for Message {self.message.id}"