# backend/core/views.py

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Course, Conversation, Document, Message
from .services.document_ingestion import ingest_document

# backend/core/views.py

class CourseListView(APIView):

    def get(self, request):
        courses = Course.objects.all().order_by("name")

        data = [
            {
                "id": course.id,
                "name": course.name,
                "code": course.code,
                "description": course.description,
                "aliases": [
                    alias.alias
                    for alias in course.aliases.all()
                ],
            }
            for course in courses
        ]

        return Response(data)

    def post(self, request):
        name = request.data.get("name")

        if not name:
            return Response(
                {"error": "name is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        course = Course.objects.create(
            name=name,
            code=request.data.get("code", ""),
            description=request.data.get("description", ""),
        )

        return Response(
            {
                "id": course.id,
                "name": course.name,
                "code": course.code,
                "description": course.description,
                "aliases": [],
            },
            status=status.HTTP_201_CREATED,
        )


class CourseDetailView(APIView):

    def get_course(self, course_id):
        try:
            return Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return None

    def get(self, request, course_id):
        course = self.get_course(course_id)

        if course is None:
            return Response(
                {"error": "Course not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "id": course.id,
                "name": course.name,
                "code": course.code,
                "description": course.description,
                "aliases": [
                    alias.alias
                    for alias in course.aliases.all()
                ],
            }
        )


class CourseDocumentsView(APIView):

    def get(self, request, course_id):
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response([])

        documents = course.documents.all().order_by("-created_at")

        return Response(
            [
                {
                    "id": document.id,
                    "title": document.title,
                    "file_type": document.file_type,
                }
                for document in documents
            ]
        )
        
class DocumentUploadView(APIView):

    def post(self, request):
        file = request.FILES.get("file")
        course_id = request.data.get("course_id")
        title = request.data.get("title")

        if not file:
            return Response(
                {"error": "No file provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        filename = file.name.lower()

        if not filename.endswith((".pdf", ".docx")):
            return Response(
                {
                    "error": "Unsupported file type. Use PDF or DOCX."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not course_id:
            return Response(
                {"error": "course_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response(
                {"error": "Course not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        document = Document.objects.create(
            course=course,
            title=title or file.name,
            file=file,
            file_type=file.content_type or "",
            uploaded_by=(
                request.user
                if request.user.is_authenticated
                else None
            ),
        )

        chunks = ingest_document(document)

        return Response(
            {
                "id": document.id,
                "title": document.title,
                "course_id": course.id,
                "chunks_created": len(chunks),
            },
            status=status.HTTP_201_CREATED,
        )


class ConversationListCreateView(APIView):

    def get(self, request):
        conversations = Conversation.objects.filter(
            user=request.user
        ).order_by("-created_at")

        data = [
            {
                "id": conversation.id,
                "title": conversation.title,
                "course_id": conversation.course_id,
            }
            for conversation in conversations
        ]

        return Response(data)

    def post(self, request):
        title = request.data.get("title", "")
        course_id = request.data.get("course_id")

        course = None

        if course_id:
            try:
                course = Course.objects.get(id=course_id)
            except Course.DoesNotExist:
                return Response(
                    {"error": "Course not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        conversation = Conversation.objects.create(
            user=request.user,
            course=course,
            title=title,
        )

        return Response(
            {
                "id": conversation.id,
                "title": conversation.title,
                "course_id": conversation.course_id,
            },
            status=status.HTTP_201_CREATED,
        )


class ConversationDetailView(APIView):

    def get(self, request, conversation_id):
        try:
            conversation = Conversation.objects.get(
                id=conversation_id,
                user=request.user,
            )
        except Conversation.DoesNotExist:
            return Response(
                {"error": "Conversation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "id": conversation.id,
                "title": conversation.title,
                "course_id": conversation.course_id,
            }
        )


class ConversationMessagesView(APIView):

    def get_conversation(self, request, conversation_id):
        try:
            return Conversation.objects.get(
                id=conversation_id,
                user=request.user,
            )
        except Conversation.DoesNotExist:
            return None

    def get(self, request, conversation_id):
        conversation = self.get_conversation(
            request,
            conversation_id,
        )

        if conversation is None:
            return Response(
                {"error": "Conversation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        messages = conversation.messages.order_by("created_at")

        data = [
            {
                "id": message.id,
                "role": message.role,
                "content": message.content,
            }
            for message in messages
        ]

        return Response(data)

    def post(self, request, conversation_id):
        conversation = self.get_conversation(
            request,
            conversation_id,
        )

        if conversation is None:
            return Response(
                {"error": "Conversation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        role = request.data.get("role")
        content = request.data.get("content")

        if role not in {"user", "assistant"}:
            return Response(
                {"error": "Invalid role."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not content:
            return Response(
                {"error": "content is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        message = Message.objects.create(
            conversation=conversation,
            role=role,
            content=content,
        )

        return Response(
            {
                "id": message.id,
                "role": message.role,
                "content": message.content,
            },
            status=status.HTTP_201_CREATED,
        )