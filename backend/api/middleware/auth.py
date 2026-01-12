import base64
import secrets
from typing import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from api.config import AuthSettings


EXCLUDED_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}


class AuthMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, auth_settings: AuthSettings):
        super().__init__(app)
        self.auth_settings = auth_settings

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip auth for excluded paths
        if request.url.path in EXCLUDED_PATHS:
            return await call_next(request)

        # Skip auth for static files (anything not starting with /api/)
        if not request.url.path.startswith("/api/"):
            return await call_next(request)

        # If auth is disabled, allow all requests
        if not self.auth_settings.enabled:
            return await call_next(request)

        # Validate based on auth type
        if self.auth_settings.type == "basic":
            if not self._validate_basic_auth(request):
                return self._unauthorized_response("Basic")
        elif self.auth_settings.type == "api_key":
            if not self._validate_api_key_auth(request):
                return self._unauthorized_response("Bearer")
        elif self.auth_settings.type == "proxy":
            if not self._validate_proxy_auth(request):
                return self._unauthorized_response()

        return await call_next(request)

    def _validate_basic_auth(self, request: Request) -> bool:
        """Validate Basic authentication."""
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Basic "):
            return False

        try:
            encoded = auth_header[6:]
            decoded = base64.b64decode(encoded).decode("utf-8")
            username, password = decoded.split(":", 1)
        except (ValueError, UnicodeDecodeError):
            return False

        expected_username = self.auth_settings.username or ""
        expected_password = self.auth_settings.password or ""

        username_valid = secrets.compare_digest(username, expected_username)
        password_valid = secrets.compare_digest(password, expected_password)

        return username_valid and password_valid

    def _validate_api_key_auth(self, request: Request) -> bool:
        """Validate API key authentication via Bearer token or X-API-Key header."""
        expected_key = self.auth_settings.api_key or ""

        # Check Bearer token
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            if secrets.compare_digest(token, expected_key):
                return True

        # Check X-API-Key header
        api_key_header = request.headers.get("X-API-Key", "")
        if api_key_header and secrets.compare_digest(api_key_header, expected_key):
            return True

        return False

    def _validate_proxy_auth(self, request: Request) -> bool:
        """Validate proxy authentication via Remote-User header."""
        remote_user = request.headers.get("Remote-User", "")
        return bool(remote_user)

    def _unauthorized_response(self, scheme: str | None = None) -> JSONResponse:
        """Return 401 Unauthorized response."""
        headers = {}
        if scheme:
            headers["WWW-Authenticate"] = scheme

        return JSONResponse(
            status_code=401,
            content={
                "error": True,
                "code": "unauthorized",
                "message": "Authentication required",
                "details": {},
            },
            headers=headers,
        )
