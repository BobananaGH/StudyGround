# backend/core/tests/test_course_resolver.py

from django.test import TestCase

from core.models import Course, CourseAlias
from core.services.course_resolver import resolve_course


class CourseResolverTests(TestCase):

    def setUp(self):
        self.course = Course.objects.create(
            name="Artificial Intelligence",
            code="AI",
        )

        CourseAlias.objects.create(
            course=self.course,
            alias="ai",
        )

        CourseAlias.objects.create(
            course=self.course,
            alias="Artificial Intelligence",
        )

    def test_resolve_by_name(self):
        result = resolve_course("Artificial Intelligence")

        self.assertEqual(result, self.course)

    def test_resolve_name_case_insensitive(self):
        result = resolve_course("artificial intelligence")

        self.assertEqual(result, self.course)

    def test_resolve_by_code(self):
        result = resolve_course("AI")

        self.assertEqual(result, self.course)

    def test_resolve_code_case_insensitive(self):
        result = resolve_course("ai")

        self.assertEqual(result, self.course)

    def test_resolve_by_alias(self):
        result = resolve_course("ai")

        self.assertEqual(result, self.course)

    def test_unknown_course_returns_none(self):
        result = resolve_course("Computer Science")

        self.assertIsNone(result)

    def test_empty_value_returns_none(self):
        self.assertIsNone(resolve_course(""))

    def test_none_returns_none(self):
        self.assertIsNone(resolve_course(None))