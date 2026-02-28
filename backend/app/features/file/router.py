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
    SmartUploadResponse,
)
from app.features.auth.dependencies import get_current_user
from app.features.openai.search import search_files
from app.features.openai.organizer import suggest_file_path
from app.features.openai.transcription import transcribe_audio
from app.features.openai.embedding import generate_embedding

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
                embedding=generate_embedding(f"{name} {description or ''}"),
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
# Smart Upload — AI-powered file organization
# ──────────────────────────────────────────────

@router.post("/smart-upload", response_model=SmartUploadResponse, status_code=status.HTTP_201_CREATED)
async def smart_upload(
    file: UploadFile = FastAPIFile(...),
    name: str = Form(...),
    description: Optional[str] = Form(None),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a file and let GPT-4o decide the best folder.

    The AI analyzes the file name and type against the user's existing
    folder structure and suggests (or creates) the optimal path.
    """
    repo = FileRepository(db)

    user_folders = await repo.get_user_folders(current_user.id)
    logger.info("Smart upload: user %s has folders %s", current_user.id, user_folders)

    suggestion = await suggest_file_path(
        filename=name,
        mime_type=file.content_type,
        existing_folders=user_folders,
    )
    logger.info("AI suggested path: %s (new_folder=%s)", suggestion.path, suggestion.new_folder)

    created_new_folder = False
    if suggestion.new_folder or suggestion.path not in user_folders:
        existing = await repo.get_files_by_path(
            user_id=current_user.id, path="/", skip=0, limit=1000
        )
        folder_names = {f.name for f in existing if f.file_type == "dir"}
        folder_name = suggestion.path.strip("/")

        if folder_name and folder_name not in folder_names:
            folder_data = FileCreateDB(
                name=folder_name,
                description=f"Auto-created by Zenith AI",
                path="/",
                file_type="dir",
                user_id=current_user.id,
                url=None,
                cloudinary_public_id=None,
                size=0,
                format=None,
                mime_type=None,
            )
            await repo.create(folder_data.model_dump())
            created_new_folder = True

    transcription = None
    if file.content_type and file.content_type.startswith("audio/"):
        logger.info("Audio detected. Transcribing: %s", name)
        # Read file once for transcription
        file_bytes = await file.read()
        transcription = transcribe_audio(file_bytes, file.filename)
        # Reset file pointer for Cloudinary upload
        file.file.seek(0)

    try:
        cloudinary.config(cloudinary_url=settings.CLOUDINARY_URL)
        result = cloudinary.uploader.upload(
            file.file,
            folder="zenith_files",
            resource_type="auto",
            use_filename=True,
            unique_filename=True,
        )
    except Exception as e:
        logger.error("Cloudinary upload failed during smart-upload: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading file to Cloudinary: {str(e)}",
        )

    # 5. Save file record
    file_data = FileCreateDB(
        name=name,
        description=description,
        path=suggestion.path,
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
        embedding=generate_embedding(
            f"{name} {description or ''} {transcription or ''}"
        ),
        transcription=transcription,
    )
    new_file = await repo.create(file_data.model_dump())

    return SmartUploadResponse(
        id=new_file.id,
        user_id=new_file.user_id,
        name=new_file.name,
        description=new_file.description,
        path=new_file.path,
        file_type=new_file.file_type,
        mime_type=new_file.mime_type,
        url=new_file.url,
        cloudinary_public_id=new_file.cloudinary_public_id,
        size=new_file.size,
        format=new_file.format,
        transcription=new_file.transcription,
        created_at=new_file.created_at,
        updated_at=new_file.updated_at,
        suggested_path=suggestion.path,
        created_new_folder=created_new_folder,
        ai_reason=suggestion.reason,
    )



# ──────────────────────────────────────────────
# Recent Files
# ──────────────────────────────────────────────

@router.get("/recent", response_model=List[FileResponse])
async def get_recent_files(
    limit: int = Query(default=10, ge=1, le=50, description="Number of recent files to return"),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the N most recently created files for the current user."""
    repo = FileRepository(db)
    return await repo.get_recent_files(user_id=current_user.id, limit=limit)


# ──────────────────────────────────────────────
# File Tree Navigation
# ──────────────────────────────────────────────

@router.get("/", response_model=List[FileResponse])
async def get_my_files(
    path: str = "/",
    category: Optional[str] = Query(None, description="Filter by category: image, video, audio, document"),
    skip: int = 0,
    limit: int = 20,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List the current user's files in a given directory path or by category."""
    repo = FileRepository(db)
    return await repo.get_files_by_path(
        user_id=current_user.id, path=path, skip=skip, limit=limit, category=category
    )


@router.get("/all", response_model=List[FileResponse])
async def get_all_files(
    category: Optional[str] = Query(None, description="Filter by category: image, video, audio, document"),
    mime_type: Optional[str] = Query(None, description="Filter by specific MIME type (supports * wildcard)"),
    skip: int = 0,
    limit: int = 50,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all user files across all paths (flat view).
    Supports filtering by category or specific MIME type.
    """
    repo = FileRepository(db)
    return await repo.get_all_files(
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        category=category,
        mime_type=mime_type
    )


@router.get("/info", response_model=Optional[FileResponse])
async def get_file_info(
    path: str = "/",
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get metadata for a specific file or folder by its absolute path."""
    repo = FileRepository(db)
    return await repo.get_file_by_full_path(user_id=current_user.id, full_path=path)


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
    logger.info(f"Search request: user_id={current_user.id}, query='{q}', mode='{mode}'")
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
        import httpx
        async with httpx.AsyncClient() as client:
            # Cloudinary URLs are usually public, but we add a User-Agent just in case
            response = await client.get(file_obj.url, follow_redirects=True, timeout=30.0)
            
            if response.status_code != 200:
                logger.error(f"Download from Cloudinary failed with status {response.status_code}: {response.text}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Cloudinary returned error {response.status_code}: {response.reason_phrase}"
                )
            
            file_data = response.content

        return {
            "name": file_obj.name,
            "description": file_obj.description,
            "path": file_obj.path,
            "file_type": file_obj.file_type,
            "mime_type": file_obj.mime_type,
            "content": file_data,
        }
    except HTTPException:
        raise
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