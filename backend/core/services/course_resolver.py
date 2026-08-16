# backend/core/services/course_resolver.py

from django.db.models.functions import Lower

from ..models import Course, CourseAlias


def resolve_course(value):
    """
    Resolve a course from its name, code, or alias.

    Examples:
        "Artificial Intelligence"
        "artificial intelligence"
        "AI"
        "ai"
    """

    if not value:
        return None

    value = value.strip()

    if not value:
        return None

    # 1. Match Course name
    course = (
        Course.objects
        .filter(name__iexact=value)
        .first()
    )

    if course:
        return course

    # 2. Match Course code
    course = (
        Course.objects
        .filter(code__iexact=value)
        .exclude(code="")
        .first()
    )

    if course:
        return course

    # 3. Match CourseAlias
    alias = (
        CourseAlias.objects
        .filter(alias__iexact=value)
        .select_related("course")
        .first()
    )

    if alias:
        return alias.course

    return None