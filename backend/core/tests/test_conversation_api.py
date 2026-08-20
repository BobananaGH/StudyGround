# backend/core/tests/test_conversation_api.py

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from core.models import Conversation, Course, Message


User = get_user_model()


class ConversationAPITests(APITestCase):

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
        )

        self.client.force_authenticate(user=self.user)

    def test_create_conversation(self):
        response = self.client.post(
            "/api/conversations/",
            {
                "title": "AI Study Session",
                "course_id": self.course.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["title"], "AI Study Session")
        self.assertEqual(
            response.data["course_id"],
            self.course.id,
        )

        self.assertTrue(
            Conversation.objects.filter(
                user=self.user,
                title="AI Study Session",
            ).exists()
        )

    def test_create_conversation_without_course(self):
        response = self.client.post(
            "/api/conversations/",
            {
                "title": "General Study Session",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            response.data["title"],
            "General Study Session",
        )
        self.assertIsNone(response.data["course_id"])

    def test_list_user_conversations(self):
        Conversation.objects.create(
            user=self.user,
            course=self.course,
            title="AI Session",
        )

        response = self.client.get("/api/conversations/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["title"],
            "AI Session",
        )

    def test_get_conversation_detail(self):
        conversation = Conversation.objects.create(
            user=self.user,
            course=self.course,
            title="AI Session",
        )

        response = self.client.get(
            f"/api/conversations/{conversation.id}/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["id"],
            conversation.id,
        )
        self.assertEqual(
            response.data["title"],
            "AI Session",
        )

    def test_send_message(self):
        conversation = Conversation.objects.create(
            user=self.user,
            course=self.course,
            title="AI Session",
        )

        response = self.client.post(
            f"/api/conversations/{conversation.id}/messages/",
            {
                "role": "user",
                "content": "What is artificial intelligence?",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            response.data["role"],
            "user",
        )
        self.assertEqual(
            response.data["content"],
            "What is artificial intelligence?",
        )

        self.assertTrue(
            Message.objects.filter(
                conversation=conversation,
                role="user",
            ).exists()
        )

    def test_list_messages(self):
        conversation = Conversation.objects.create(
            user=self.user,
            course=self.course,
            title="AI Session",
        )

        Message.objects.create(
            conversation=conversation,
            role="user",
            content="What is AI?",
        )

        Message.objects.create(
            conversation=conversation,
            role="assistant",
            content="AI stands for Artificial Intelligence.",
        )

        response = self.client.get(
            f"/api/conversations/{conversation.id}/messages/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(
            response.data[0]["role"],
            "user",
        )
        self.assertEqual(
            response.data[1]["role"],
            "assistant",
        )

    def test_cannot_access_another_users_conversation(self):
        other_user = User.objects.create_user(
            username="otheruser",
            email="other@example.com",
            password="otherpassword123",
        )

        conversation = Conversation.objects.create(
            user=other_user,
            course=self.course,
            title="Private Session",
        )

        response = self.client.get(
            f"/api/conversations/{conversation.id}/"
        )

        self.assertEqual(response.status_code, 404)

