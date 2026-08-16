# backend/core/serializers.py

from rest_framework import serializers

from .models import Course, CourseAlias, Document


class CourseAliasSerializer(serializers.ModelSerializer):

    class Meta:
        model = CourseAlias
        fields = [
            "id",
            "alias",
        ]
        read_only_fields = ["id"]


class CourseSerializer(serializers.ModelSerializer):
    aliases = CourseAliasSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Course
        fields = [
            "id",
            "name",
            "code",
            "description",
            "aliases",
        ]
        read_only_fields = ["id", "aliases"]


class DocumentUploadSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True)

    course_id = serializers.PrimaryKeyRelatedField(
        queryset=Course.objects.all(),
        source="course",
        write_only=True,
    )

    class Meta:
        model = Document
        fields = [
            "id",
            "title",
            "file",
            "course_id",
            "file_type",
        ]
        read_only_fields = ["id", "file_type"]

    def validate_file(self, value):
        filename = value.name.lower()

        if not filename.endswith((".pdf", ".docx")):
            raise serializers.ValidationError(
                "Unsupported file type. Use PDF or DOCX."
            )

        return value