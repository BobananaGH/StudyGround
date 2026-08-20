# backend/core/views.py

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from .models import Course, Conversation, Document, Message, Evidence
from .services.retrieval import retrieve_chunks
from .services.answer_generation import generate_answer
from .services.answer_verification import verify_answer
from .services.document_ingestion import ingest_document

# backend/core/views.py

class CourseListView(APIView):
    permission_classes = [IsAuthenticated]
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
    permission_classes = [IsAuthenticated]
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
    permission_classes = [IsAuthenticated]
    def get(self, request, course_id):
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response(
                {"error": "Course not found."},
                status=status.HTTP_404_NOT_FOUND,
    )

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
    permission_classes = [IsAuthenticated]
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
            uploaded_by=request.user
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
    permission_classes = [IsAuthenticated]
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
    permission_classes = [IsAuthenticated]
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
    permission_classes = [IsAuthenticated]
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

        content = request.data.get("content")

        if not content:
            return Response(
                {"error": "content is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        Message.objects.create(
            conversation=conversation,
            role="user",
            content=content,
        )

        # If the conversation has no course, there is nothing to search.
        if conversation.course is None:
            assistant_message = Message.objects.create(
                conversation=conversation,
                role="assistant",
                content=(
                    "I couldn't find enough information "
                    "in the course materials."
                ),
            )

            return Response(
                {
                    "id": assistant_message.id,
                    "role": assistant_message.role,
                    "content": assistant_message.content,
                    "evidence": [],
                },
                status=status.HTTP_201_CREATED,
            )

        # Retrieve relevant chunks from the conversation's course
        chunks = retrieve_chunks(
            conversation.course,
            content,
        )

        # No relevant chunks found
        if not chunks:
            assistant_message = Message.objects.create(
                conversation=conversation,
                role="assistant",
                content=(
                    "I couldn't find enough information "
                    "in the course materials."
                ),
            )

            return Response(
                {
                    "id": assistant_message.id,
                    "role": assistant_message.role,
                    "content": assistant_message.content,
                    "evidence": [],
                },
                status=status.HTTP_201_CREATED,
            )

        # Generate an answer using the retrieved chunks
        result = generate_answer(
            content,
            chunks,
        )

        # Verify Gemini's evidence against the actual retrieved chunks
        verified_result = verify_answer(
            result,
            chunks,
        )

        if not verified_result["found"]:
            assistant_message = Message.objects.create(
                conversation=conversation,
                role="assistant",
                content=(
                    "I couldn't find enough information "
                    "in the course materials."
                ),
            )

            return Response(
                {
                    "id": assistant_message.id,
                    "role": assistant_message.role,
                    "content": assistant_message.content,
                    "evidence": [],
                },
                status=status.HTTP_201_CREATED,
            )

        # Save the verified assistant answer
        assistant_message = Message.objects.create(
            conversation=conversation,
            role="assistant",
            content=verified_result["answer"],
        )

        # Save verified evidence
        evidence_data = verified_result.get("evidence", [])

        for item in evidence_data:
            chunk_id = item.get("chunk_id")

            try:
                chunk = next(
                    chunk
                    for chunk in chunks
                    if str(chunk.id) == str(chunk_id)
                )
            except StopIteration:
                continue

            Evidence.objects.create(
                message=assistant_message,
                chunk=chunk,
            )

        return Response(
            {
                "id": assistant_message.id,
                "role": assistant_message.role,
                "content": assistant_message.content,
                "evidence": [
                    {
                        "chunk_id": str(item["chunk_id"]),
                        "document": item["document"],
                        "page": item["page"],
                    }
                    for item in evidence_data
                ],
            },
            status=status.HTTP_201_CREATED,
        )