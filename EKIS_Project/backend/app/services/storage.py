from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

UPLOAD_DIR = Path("storage/uploads")


async def save_upload(file: UploadFile) -> tuple[str, int]:
    UPLOAD_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    extension = Path(file.filename or "").suffix

    unique_name = f"{uuid4().hex}{extension}"

    file_path = UPLOAD_DIR / unique_name

    size = 0

    with file_path.open("wb") as output:
        while chunk := await file.read(1024 * 1024):
            output.write(chunk)
            size += len(chunk)

    await file.close()

    return str(file_path), size


def delete_file(file_path: str) -> None:
    path = Path(file_path)

    if path.exists():
        path.unlink()


save_upload_file = save_upload
