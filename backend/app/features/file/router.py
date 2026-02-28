"""
File router — CRUD operations, download, and search.
"""
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File as FastAPIFile, Form
from sqlalchemy.ext.asyncio import AsyncSession
import cloudinary
import cloudinary.uploader

from app.core.database import get_db
from app.core.config import settings
from app.features.file.repository import FileRepository
from app.features.file.schemas import (
    FileResponse,
    FileCreateDB,
    FileUpdate,
    FileContent,
    FileSearchResult,
)
from app.features.auth.dependencies import get_current_user
from app.features.openai.search import search_files

logger = logging.getLogger(__name__)

router = APIRouter()


# ──────────────────────────────────────────────
# CRUD Endpoints
# ──────────────────────────────────────────────

@router.post("/", response_model=FileResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: Optional[UploadFile] = FastAPIFile(None),
    name: str = Form(...),
    description: Optional[str] = Form(None),
    path: str = Form("/"),
    file_type: str = Form("file"),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a file to Cloudinary or create a folder."""
    if file_type == "dir":
        file_data = FileCreateDB(
            name=name,
            description=description,
            path=path,
            file_type="dir",
            user_id=current_user.id,
            url=None,
            cloudinary_public_id=None,
            size=0,
            format=None,
            mime_type=None,
        )
    else:
        if not file:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be provided when file_type is 'file'",
            )
        try:
            cloudinary.config(cloudinary_url=settings.CLOUDINARY_URL)
            result = cloudinary.uploader.upload(
                file.file,
                folder="zenith_files",
                resource_type="auto",
                use_filename=True,
                unique_filename=True,
            )
            file_data = FileCreateDB(
                name=name,
                description=description,
                path=path,
                file_type="file",
                mime_type=file.content_type,
                user_id=current_user.id,
                url=result["secure_url"],
                cloudinary_public_id=result["public_id"],
                size=result["bytes"],
                format=result.get(
                    "format",
                    file.filename.split(".")[-1]
                    if file.filename and "." in file.filename
                    else "unknown",
                ),
            )
        except Exception as e:
            logger.error("Cloudinary upload failed: %s", e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error uploading file to Cloudinary: {str(e)}",
            )

    repo = FileRepository(db)
    new_file = await repo.create(file_data.model_dump())
    return new_file


# ──────────────────────────────────────────────
# File Tree Navigation
# ──────────────────────────────────────────────

@router.get("/", response_model=List[FileResponse])
async def get_my_files(
    path: str = "/",
    skip: int = 0,
    limit: int = 20,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List the current user's files in a given directory path."""
    repo = FileRepository(db)
    return await repo.get_files_by_path(
        user_id=current_user.id, path=path, skip=skip, limit=limit
    )


# ──────────────────────────────────────────────
# Search (name-based + semantic)
# ──────────────────────────────────────────────

@router.get("/search", response_model=List[FileSearchResult])
async def search(
    q: str = Query(..., min_length=1, description="Search query"),
    mode: str = Query("name", description="Search mode: 'name', 'semantic', or 'deep'"),
    top_k: int = Query(default=10, ge=1, le=50, description="Max results"),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Search files with multiple modes:

    - **name**: Fast text search by file name (ILIKE).
    - **semantic**: AI-powered search using embeddings + pgvector.
    - **deep**: Semantic search + GPT-4o re-ranking for maximum accuracy.
    """
    if mode == "name":
        repo = FileRepository(db)
        files = await repo.search_by_name(
            user_id=current_user.id, query=q, limit=top_k
        )
        return [
            FileSearchResult(
                id=f.id,
                name=f.name,
                description=f.description,
                mime_type=f.mime_type,
                file_type=f.file_type,
                path=f.path,
                size=f.size,
                user_id=f.user_id,
                uploaded_at=f.created_at,
                similarity=0.0,
            )
            for f in files
        ]

    # Semantic or deep search
    results = await search_files(
        query=q,
        db=db,
        user_id=current_user.id,
        top_k=top_k,
        deep=(mode == "deep"),
    )
    return [
        FileSearchResult(
            id=r.file.id,
            name=r.file.name,
            description=r.file.description,
            mime_type=r.file.mime_type,
            file_type=r.file.file_type,
            path=r.file.path,
            size=r.file.size,
            user_id=r.file.user_id,
            uploaded_at=r.file.created_at,
            similarity=r.distance,
        )
        for r in results
    ]


# ──────────────────────────────────────────────
# Download
# ──────────────────────────────────────────────

@router.get("/{file_id}/download", response_model=FileContent)
async def download_file(
    file_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Download file content from Cloudinary as raw bytes."""
    repo = FileRepository(db)
    file_obj = await repo.get_or_fail(file_id)

    if file_obj.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this file",
        )

    if not file_obj.url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File has no URL assigned",
        )

    try:
        import urllib.request

        req = urllib.request.Request(
            file_obj.url, headers={"User-Agent": "Mozilla/5.0"}
        )
        with urllib.request.urlopen(req) as response:
            file_data = response.read()

        return {
            "name": file_obj.name,
            "description": file_obj.description,
            "path": file_obj.path,
            "file_type": file_obj.file_type,
            "mime_type": file_obj.mime_type,
            "content": file_data,
        }
    except Exception as e:
        logger.error("File download failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error downloading file content: {str(e)}",
        )


# ──────────────────────────────────────────────
# Update / Delete
# ──────────────────────────────────────────────

@router.patch("/{file_id}", response_model=FileResponse)
async def update_file_metadata(
    file_id: int,
    file_update: FileUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update file name or description."""
    repo = FileRepository(db)
    file_obj = await repo.get_or_fail(file_id)

    if file_obj.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this file",
        )

    return await repo.update(file_id, file_update.model_dump(exclude_unset=True))


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a file from the database and Cloudinary."""
    repo = FileRepository(db)
    file_obj = await repo.get_or_fail(file_id)

    if file_obj.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this file",
        )

    try:
        if file_obj.cloudinary_public_id:
            cloudinary.config(cloudinary_url=settings.CLOUDINARY_URL)
            resource_type = _resolve_resource_type(file_obj)
            cloudinary.uploader.destroy(
                file_obj.cloudinary_public_id, resource_type=resource_type
            )

        await repo.delete(file_id)

    except Exception as e:
        logger.error("File deletion failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting file: {str(e)}",
        )


def _resolve_resource_type(file_obj) -> str:
    """Determine Cloudinary resource type from MIME type or file format."""
    if file_obj.mime_type:
        if file_obj.mime_type.startswith("image/"):
            return "image"
        if file_obj.mime_type.startswith("video/"):
            return "video"
    elif file_obj.format:
        if file_obj.format in {"mp4", "webm", "ogg", "mov", "avi"}:
            return "video"
        if file_obj.format in {"png", "jpg", "jpeg", "gif", "webp", "svg"}:
            return "image"
    return "raw"