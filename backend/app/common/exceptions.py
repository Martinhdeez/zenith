"""
Custom exceptions for the application.

These exceptions are used throughout the application to handle
errors consistently with clear messages.
"""
from typing import Any, Dict, Optional


class AppException(Exception):
    """Base application exception"""
    
    def __init__(
        self,
        message: str,
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class NotFoundException(AppException):
    """Resource not found"""
    
    def __init__(
        self,
        message: str = "Resource not found",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, status_code=404, details=details)


class AlreadyExistsException(AppException):
    """Resource already exists"""
    
    def __init__(
        self,
        message: str = "Resource already exists",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, status_code=409, details=details)


class ValidationException(AppException):
    """Validation error"""
    
    def __init__(
        self,
        message: str = "Validation error",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, status_code=422, details=details)


class DatabaseException(AppException):
    """Database error"""
    
    def __init__(
        self,
        message: str = "Database access error",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, status_code=500, details=details)


class UnauthorizedException(AppException):
    """Unauthorized user"""
    
    def __init__(
        self,
        message: str = "Unauthorized",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, status_code=401, details=details)


class ForbiddenException(AppException):
    """Access forbidden"""
    
    def __init__(
        self,
        message: str = "Forbidden",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, status_code=403, details=details)
