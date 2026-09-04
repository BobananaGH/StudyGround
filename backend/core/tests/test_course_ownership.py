# backend/core/tests/test_course_ownership.py
from django.test import TestCase

from rest_framework.test import APIClient

from users.models import User

from core.models import Course, Conversation, Document


class CourseOwnershipTests(TestCase):

    def setUp(self):
        self.client = APIClient()

        self.user_a = User.objects.create_user(
            username="user_a",
            email="user_a@test.com",
            password="password123",
        )

        self.user_b = User.objects.create_user(
            username="user_b",
            email="user_b@test.com",
            password="password123",
        )

        self.course_a = Course.objects.create(
            name="AI",
            code="AI101",
            created_by=self.user_a,
        )

        self.course_b = Course.objects.create(
            name="Database",
            code="DB101",
            created_by=self.user_b,
        )

    def test_user_can_access_own_course(self):
        self.client.force_authenticate(user=self.user_a)

        response = self.client.get(
            f"/api/courses/{self.course_a.id}/"
        )

        self.assertEqual(response.status_code, 200)

    def test_user_cannot_access_other_users_course(self):
        self.client.force_authenticate(user=self.user_a)

        response = self.client.get(
            f"/api/courses/{self.course_b.id}/"
        )

        self.assertEqual(response.status_code, 404)

    def test_user_can_delete_own_course(self):
        self.client.force_authenticate(user=self.user_a)

        response = self.client.delete(
            f"/api/courses/{self.course_a.id}/"
        )

        self.assertEqual(response.status_code, 204)

        self.assertFalse(
            Course.objects.filter(
                id=self.course_a.id
            ).exists()
        )

    def test_user_cannot_delete_other_users_course(self):
        self.client.force_authenticate(user=self.user_a)

        response = self.client.delete(
            f"/api/courses/{self.course_b.id}/"
        )

        self.assertEqual(response.status_code, 404)

        self.assertTrue(
            Course.objects.filter(
                id=self.course_b.id
            ).exists()
        )

    def test_user_cannot_delete_other_users_document(self):
        document = Document.objects.create(
            course=self.course_b,
            uploaded_by=self.user_b,
            title="Secret document",
            file="documents/test.txt",
        )

        self.client.force_authenticate(user=self.user_a)

        response = self.client.delete(
            f"/api/documents/{document.id}/"
        )

        self.assertEqual(response.status_code, 404)

        self.assertTrue(
            Document.objects.filter(
                id=document.id
            ).exists()
        )

    def test_user_cannot_create_conversation_on_other_users_course(self):
        self.client.force_authenticate(user=self.user_a)

        response = self.client.post(
            "/api/conversations/",
            {
                "course_id": self.course_b.id,
                "title": "Unauthorized conversation",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 404)

        self.assertFalse(
            Conversation.objects.filter(
                user=self.user_a,
                course=self.course_b,
            ).exists()
        )