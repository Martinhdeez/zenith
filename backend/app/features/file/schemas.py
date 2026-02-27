"""
Pydantic schemas for users.
These are used for request validation and response serialization.
"""
from pydantic import BaseModel
from datetime import datetime

class FileBase(BaseModel): 
    pass