"""JWT service re-exporting core JWT functionality for consistent token handling."""

from app.core.jwt import create_access_token, decode_access_token

__all__ = ["create_access_token", "decode_access_token"]
