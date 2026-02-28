"""File router"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File as FastAPIFile, Form
from sqlalchemy.ext.asyncio import AsyncSession
import cloudinary
import cloudinary.uploader

from app.core.database import get_db
from app.core.config import settings

from app.features.file.repository import FileRepository
from app.features.file.schemas import FileResponse, FileCreateDB, FileUpdate, FolderCreate, FileContent
from app.common.exceptions import NotFoundException
from app.features.auth.dependencies import get_current_user

router = APIRouter()

@router.post("/", response_model=FileResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: Optional[UploadFile] = FastAPIFile(None),
    name: str = Form(...),
    description: Optional[str] = Form(None),
    path: str = Form("/"),
    file_type: str = Form("file"),  # "file" or "dir"
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):    
    if file_type == "dir":
        # Folder creation logic
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
            mime_type=None
        )
    else:
        # File upload logic
        if not file:
            raise HTTPException(status_code=400, detail="File must be provided when file_type is 'file'")
            
        try:
            cloudinary.config(cloudinary_url=settings.CLOUDINARY_URL)
            
            result = cloudinary.uploader.upload(
                file.file, 
                folder="zenith_files",
                resource_type="auto", 
                use_filename=True,
                unique_filename=True
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
                format=result.get("format", file.filename.split('.')[-1] if file.filename and '.' in file.filename else "unknown")
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error uploading file to Cloudinary: {str(e)}"
            )

    repo = FileRepository(db)
    new_file = await repo.create(file_data.model_dump())
    return new_file

# obtener ficheros de un usuario por path (estilo sistema de ficheros en arbol)
@router.get("/", response_model=List[FileResponse])
async def get_my_files(
    path: str = "/",
    skip: int = 0,
    limit: int = 20,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    repo = FileRepository(db)
    return await repo.get_files_by_path(user_id=current_user.id, path=path, skip=skip, limit=limit)

# a partir del id del objeto que representa al fichero que guarda el url de cloudinary obtener 
# el fichero en si mismo como base64 para poder mostrarlo en el frontend. 
# Usa la api de cloudinary para obtener el fichero en base64
@router.get("/{file_id}/download", response_model=FileContent)
async def get_file(
    file_id: int,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    repo = FileRepository(db)
    file_obj = await repo.get_or_fail(file_id)
    
    if file_obj.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this file")
    
    if not file_obj.url:
        raise HTTPException(status_code=404, detail="File has no URL assigned")
        
    try:
        import urllib.request
        import base64
        
        req = urllib.request.Request(file_obj.url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            file_data = response.read()
            
        file_dict = {
            "name": file_obj.name,
            "description": file_obj.description,
            "path": file_obj.path,
            "file_type": file_obj.file_type,
            "mime_type": file_obj.mime_type,
            "content": file_data
        }
        return file_dict
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error downloading file content: {str(e)}")


# actualizar informacion del fichero 
@router.patch("/{file_id}", response_model=FileResponse)
async def update_file_metadata(
    file_id: int,
    file_update: FileUpdate,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    repo = FileRepository(db)
    file_obj = await repo.get_or_fail(file_id)
    
    if file_obj.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this file")
        
    return await repo.update(file_id, file_update.model_dump(exclude_unset=True))

# elimina ficheros de la base de datos y de cloudinary
@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: int,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    repo = FileRepository(db)
    file_obj = await repo.get_or_fail(file_id)
    
    if file_obj.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this file")
    try:
        if file_obj.cloudinary_public_id:
            # Configurar cloudinary
            cloudinary.config(cloudinary_url=settings.CLOUDINARY_URL)
            
            # Destruir el archivo en Cloudinary usando su public_id
            # Cloudinary usa "image", "video" o "raw"
            resource_type = "raw"
            if file_obj.mime_type:
                if file_obj.mime_type.startswith("image/"):
                    resource_type = "image"
                elif file_obj.mime_type.startswith("video/"):
                    resource_type = "video"
            else:
                # Fallback por si no tenemos mime_type viejo
                if file_obj.format in ['mp4', 'webm', 'ogg', 'mov', 'avi']:
                    resource_type = "video"
                elif file_obj.format in ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']:
                    resource_type = "image"

            cloudinary.uploader.destroy(file_obj.cloudinary_public_id, resource_type=resource_type)
        
        await repo.delete(file_id)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting file from Cloudinary: {str(e)}"
        )