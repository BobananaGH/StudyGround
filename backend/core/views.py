# backend/core/views.py

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from .models import Course, Conversation, Document, Message, Evidence
from .services.retrieval import retrieve_chunks, sample_course_chunks
from .services.answer_generation import generate_answer, generate_broad_answer
from .services.answer_verification import verify_answer
from .services.document_ingestion import ingest_document

class CourseListView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        courses = Course.objects.filter(
            created_by=request.user,
        ).order_by("name")

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
            created_by=request.user,
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

    def get_course(self, request, course_id):
        return Course.objects.filter(
            id=course_id,
            created_by=request.user,
        ).first()

    def get(self, request, course_id):
        course = self.get_course(request, course_id)

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

    def delete(self, request, course_id):
        course = self.get_course(request, course_id)

        if course is None:
            return Response(
                {"error": "Course not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Conversation.course uses SET_NULL, so delete them explicitly.
        Conversation.objects.filter(course=course).delete()

        course.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


class CourseDocumentsView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, course_id):
        course = Course.objects.filter(
            id=course_id,
            created_by=request.user,
        ).first()

        if course is None:
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

        course = Course.objects.filter(
            id=course_id,
            created_by=request.user,
        ).first()

        if course is None:
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

class DocumentDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, document_id):
        document = Document.objects.filter(
            id=document_id,
            course__created_by=request.user,
        ).first()

        if document is None:
            return Response(
                {"error": "Document not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        document.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
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
                "created_at": conversation.created_at,
            }
            for conversation in conversations
        ]

        return Response(data)

    def post(self, request):
        title = request.data.get("title", "")
        course_id = request.data.get("course_id")

        course = None

        if course_id:
            course = Course.objects.filter(
                id=course_id,
                created_by=request.user,
            ).first()

            if course is None:
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
                "created_at": conversation.created_at,
            },
            status=status.HTTP_201_CREATED,
        )


class ConversationDetailView(APIView):
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

        return Response(
            {
                "id": conversation.id,
                "title": conversation.title,
                "course_id": conversation.course_id,
            }
        )

    def delete(self, request, conversation_id):
        conversation = self.get_conversation(
            request,
            conversation_id,
        )

        if conversation is None:
            return Response(
                {"error": "Conversation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        conversation.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


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

        messages = (
            conversation.messages
            .prefetch_related("evidence__chunk__document")
            .order_by("created_at")
        )

        data = []

        for message in messages:
            evidence = [
                {
                    "chunk_id": str(item.chunk.id),
                    "document": item.chunk.document.title,
                    "page": item.chunk.page_number,
                }
                for item in message.evidence.all()
            ]

            data.append(
                {
                    "id": message.id,
                    "role": message.role,
                    "content": message.content,
                    "evidence": evidence,
                }
            )

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

        user_message = Message.objects.create(
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
                    "user_message_id": user_message.id,
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
            limit=40,
            fusion_window=1,
            max_chunks=15,
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
                    "user_message_id": user_message.id,
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

        if result.get("error") == "model_unavailable":
            return Response(
                {
                    "error": (
                        "The AI service is temporarily unavailable. "
                        "Please try again in a moment."
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # The chunks used for evidence verification.
        # This changes to the broad sampled chunks if the model
        # determines that a document-level overview is needed.
        verification_chunks = chunks

        # If the normal retrieval context is insufficient for a broad
        # document-level question, sample chunks across the whole course.
        if result.get("needs_document_overview"):
            broad_chunks = sample_course_chunks(
                conversation.course,
                count_per_document=4,
            )

            if broad_chunks:
                broad_result = generate_broad_answer(
                    content,
                    broad_chunks,
                )

                if broad_result.get("error") == "model_unavailable":
                    return Response(
                        {
                            "error": (
                                "The AI service is temporarily unavailable. "
                                "Please try again in a moment."
                            )
                        },
                        status=status.HTTP_503_SERVICE_UNAVAILABLE,
                    )

                result = broad_result
                verification_chunks = broad_chunks

        # Verify the final answer against the exact chunks
        # that were used to generate it.
        verified_result = verify_answer(
            result,
            verification_chunks,
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
                    "user_message_id": user_message.id,
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
                    for chunk in verification_chunks
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
                "user_message_id": user_message.id,
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