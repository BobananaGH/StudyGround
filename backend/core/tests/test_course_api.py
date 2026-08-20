# backend/core/tests/test_course_api.py

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from core.models import Course, Document
from users.models import User

class CourseAPITests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpassword123",
        )

        self.client.force_authenticate(user=self.user)    
        
        self.course = Course.objects.create(
            name="Artificial Intelligence",
            code="AI101",
            description="AI fundamentals",
        )

        self.other_course = Course.objects.create(
            name="Computer Networks",
            code="CN101",
        )

        self.document = Document.objects.create(
            course=self.course,
            title="AI Lecture 1",
            file=SimpleUploadedFile(
                "lecture1.pdf",
                b"%PDF-1.4 test content",
                content_type="application/pdf",
            ),
            file_type="application/pdf",
        )

    def test_list_courses(self):
        response = self.client.get("/api/courses/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]["name"], "Artificial Intelligence")

    def test_create_course(self):
        response = self.client.post(
            "/api/courses/",
            {
                "name": "Machine Learning",
                "code": "ML101",
                "description": "Machine Learning fundamentals",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["name"], "Machine Learning")
        self.assertEqual(response.data["code"], "ML101")

        self.assertTrue(
            Course.objects.filter(
                name="Machine Learning"
            ).exists()
        )

    def test_get_course_detail(self):
        response = self.client.get(
            f"/api/courses/{self.course.id}/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], self.course.id)
        self.assertEqual(
            response.data["name"],
            "Artificial Intelligence",
        )

    def test_get_course_documents(self):
        response = self.client.get(
            f"/api/courses/{self.course.id}/documents/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["title"],
            "AI Lecture 1",
        )
        self.assertEqual(
            response.data[0]["file_type"],
            "application/pdf",
        )

    def test_course_not_found(self):
        response = self.client.get("/api/courses/99999/")

        self.assertEqual(response.status_code, 404)

    def test_course_documents_not_found(self):
        response = self.client.get(
            "/api/courses/99999/documents/"
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.data["error"],
            "Course not found.",
        )
