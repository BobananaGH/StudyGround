# backend/core/utils/embedder.py
from sentence_transformers import SentenceTransformer


MODEL_NAME = "all-MiniLM-L6-v2"

_model = SentenceTransformer(MODEL_NAME)


def embed_text(text):
    """
    Convert text into a 384-dimensional embedding vector.
    """
    if not text or not text.strip():
        raise ValueError("text must not be empty")

    embedding = _model.encode(
        text,
        normalize_embeddings=True,
    )

    return embedding.tolist()