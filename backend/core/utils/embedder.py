# backend/core/utils/embedder.py
from sentence_transformers import SentenceTransformer


MODEL_NAME = "intfloat/multilingual-e5-small"

_model = None


def get_model():
    """
    Load the embedding model only when it is first needed.
    """
    global _model

    if _model is None:
        _model = SentenceTransformer(MODEL_NAME)

    return _model


def _embed(text, prefix):
    """
    Create a normalized E5 embedding using the appropriate prefix.
    """
    if not text or not text.strip():
        raise ValueError("text must not be empty")

    model = get_model()

    embedding = model.encode(
        f"{prefix}: {text}",
        normalize_embeddings=True,
    )

    return embedding.tolist()


def embed_query(text):
    """Convert a search query into a 384-dimensional embedding."""
    return _embed(text, "query")


def embed_passage(text):
    """Convert a document passage into a 384-dimensional embedding."""
    return _embed(text, "passage")


def embed_passages(texts):
    """
    Batch-embed multiple passages in one encode() call.
    More efficient than calling embed_passage() in a loop.
    """
    if not texts:
        return []

    for text in texts:
        if not text or not text.strip():
            raise ValueError("text must not be empty")

    model = get_model()

    prefixed = [f"passage: {text}" for text in texts]

    embeddings = model.encode(
        prefixed,
        normalize_embeddings=True,
    )

    return [embedding.tolist() for embedding in embeddings]