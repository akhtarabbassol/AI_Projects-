from pathlib import Path

from langchain_community.document_loaders import (
    CSVLoader,
    Docx2txtLoader,
    PyPDFLoader,
    TextLoader,
)
from langchain_core.documents import Document as LangChainDocument


def load_document(file_path: str, file_type: str) -> list[LangChainDocument]:
    """
    Load a file using the appropriate LangChain document loader.

    """
    path = Path(file_path)
    if file_type == "application/pdf":
        loader = PyPDFLoader(str(path))
    elif file_type == ("application/vnd.openxmlformats-officedocument.wordprocessingml.document"):
        loader = Docx2txtLoader(str(path))
    elif file_type == "text/plain":
        loader = TextLoader(str(path), encoding="utf-8")

    elif file_type == "text/csv":
        loader = CSVLoader(str(path), encoding="utf-8")

    else:
        raise ValueError(f"Unsupported File type {file_type}")

    return loader.load()
