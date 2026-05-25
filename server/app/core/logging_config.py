"""
Professional logging and error handling setup
"""

import logging
import logging.handlers
import os
from datetime import datetime
from typing import Optional
import sys
import json

# Create logs directory
LOGS_DIR = "logs"
os.makedirs(LOGS_DIR, exist_ok=True)

# ============ LOGGING CONFIGURATION ============

class JSONFormatter(logging.Formatter):
    """JSON formatter for structured logging"""
    
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id
        
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id
        
        return json.dumps(log_data)

def setup_logging(log_level: str = "INFO"):
    """Configure logging for the application"""
    
    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Console handler (formatted)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)
    
    # File handler (JSON formatted) - rotates at 10MB
    file_handler = logging.handlers.RotatingFileHandler(
        filename=os.path.join(LOGS_DIR, "aurelius.log"),
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(log_level)
    file_handler.setFormatter(JSONFormatter())
    root_logger.addHandler(file_handler)
    
    # Error file handler
    error_handler = logging.handlers.RotatingFileHandler(
        filename=os.path.join(LOGS_DIR, "aurelius_errors.log"),
        maxBytes=10 * 1024 * 1024,
        backupCount=5
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(JSONFormatter())
    root_logger.addHandler(error_handler)
    
    return root_logger

# ============ CUSTOM EXCEPTIONS ============

class AureliusException(Exception):
    """Base exception for all Aurelius errors"""
    
    def __init__(
        self,
        error_code: str,
        message: str,
        status_code: int = 400,
        details: Optional[dict] = None
    ):
        self.error_code = error_code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

class AuthenticationError(AureliusException):
    """Authentication failed"""
    def __init__(self, message: str = "Authentication failed"):
        super().__init__("AUTH_ERROR", message, 401)

class AuthorizationError(AureliusException):
    """User not authorized for action"""
    def __init__(self, message: str = "Not authorized"):
        super().__init__("AUTH_FORBIDDEN", message, 403)

class ValidationError(AureliusException):
    """Request validation failed"""
    def __init__(self, message: str, details: dict = None):
        super().__init__("VALIDATION_ERROR", message, 422, details)

class NotFoundError(AureliusException):
    """Resource not found"""
    def __init__(self, resource: str, resource_id: str = None):
        msg = f"{resource} not found"
        if resource_id:
            msg += f" (ID: {resource_id})"
        super().__init__("NOT_FOUND", msg, 404)

class ConflictError(AureliusException):
    """Resource conflict (duplicate, etc)"""
    def __init__(self, message: str):
        super().__init__("CONFLICT", message, 409)

class RateLimitExceededError(AureliusException):
    """Rate limit exceeded"""
    def __init__(self, message: str = "Rate limit exceeded"):
        super().__init__("RATE_LIMIT_EXCEEDED", message, 429)

class InternalServerError(AureliusException):
    """Internal server error"""
    def __init__(self, message: str = "Internal server error", details: dict = None):
        super().__init__("INTERNAL_ERROR", message, 500, details)

# ============ ERROR HANDLERS ============

def format_error_response(exc: AureliusException, request_id: Optional[str] = None):
    """Format exception as JSON response"""
    return {
        "error_code": exc.error_code,
        "message": exc.message,
        "details": exc.details,
        "request_id": request_id,
        "timestamp": datetime.utcnow().isoformat()
    }

def get_logger(name: str) -> logging.Logger:
    """Get named logger"""
    return logging.getLogger(name)
