from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=150,
    length_function=len,
)


def split_documents(documents: list[Document]) -> list[Document]:
    """
    Split langchain document into smaller langchain document
    """
    return text_splitter.split_documents(documents)
