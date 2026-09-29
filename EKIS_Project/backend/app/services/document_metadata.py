from langchain_core.documents import Document


def add_document_metadata(
    documents: list[Document],
    *,
    document_id: int,
    department_id: int,
    filename: str,
) -> list[Document]:
    """
    Add EKIS metadata to LangChain Documents.
    """

    for document in documents:
        document.metadata.update(
            {
                "document_id": document_id,
                "department_id": department_id,
                "filename": filename,
            }
        )

    return documents
