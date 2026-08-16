# backend/core/urls.py

from django.urls import path

from .views import (
    ConversationDetailView,
    ConversationListCreateView,
    ConversationMessagesView,
    CourseDetailView,
    CourseDocumentsView,
    CourseListView,
    DocumentUploadView,
)


urlpatterns = [
    path(
        "documents/",
        DocumentUploadView.as_view(),
        name="document-upload",
    ),

    path(
        "conversations/",
        ConversationListCreateView.as_view(),
        name="conversation-list-create",
    ),

    path(
        "conversations/<int:conversation_id>/",
        ConversationDetailView.as_view(),
        name="conversation-detail",
    ),

    path(
        "conversations/<int:conversation_id>/messages/",
        ConversationMessagesView.as_view(),
        name="conversation-messages",
    ),
    path(
    "courses/",
    CourseListView.as_view(),
    name="course-list",
    ),

    path(
        "courses/<int:course_id>/",
        CourseDetailView.as_view(),
        name="course-detail",
    ),

    path(
        "courses/<int:course_id>/documents/",
        CourseDocumentsView.as_view(),
        name="course-documents",
    ),
]