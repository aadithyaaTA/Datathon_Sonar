"""
tests/test_detect_endpoint.py
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Tests for Bug 1 fixes on the /api/analyze endpoint.

Run with:
    cd backend
    pytest tests/test_detect_endpoint.py -v
"""
import io
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app, raise_server_exceptions=False)

# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _minimal_gray_png(width: int = 64, height: int = 64) -> bytes:
    """Return raw bytes of a minimal valid grayscale PNG using only stdlib."""
    import zlib, struct

    def _png_chunk(chunk_type: bytes, data: bytes) -> bytes:
        c = chunk_type + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    signature = b"\x89PNG\r\n\x1a\n"
    ihdr = _png_chunk(
        b"IHDR",
        struct.pack(">IIBBBBB", width, height, 8, 0, 0, 0, 0),
    )
    raw_rows = b"".join(b"\x00" + bytes(width) for _ in range(height))
    idat = _png_chunk(b"IDAT", zlib.compress(raw_rows))
    iend = _png_chunk(b"IEND", b"")
    return signature + ihdr + idat + iend


# ---------------------------------------------------------------------------
# Bug 1 tests
# ---------------------------------------------------------------------------

class TestAnalyzeNoFile:
    """Test that /api/analyze returns 400 when no file is attached at all."""

    def test_no_file_returns_400(self):
        """POST with no multipart file field must return HTTP 400, not 500."""
        resp = client.post("/api/analyze")
        assert resp.status_code == 400, (
            f"Expected 400 for missing file, got {resp.status_code}. "
            f"Body: {resp.text}"
        )

    def test_no_file_body_contains_error_key(self):
        """Error body must be JSON with a detail/error/message key describing the problem."""
        resp = client.post("/api/analyze")
        data = resp.json()
        assert "detail" in data or "error" in data or "message" in data, (
            f"Response body missing 'detail'/'error'/'message' key: {data}"
        )

    def test_no_file_message_is_descriptive(self):
        """The error message should mention 'image' so callers know what to fix."""
        resp = client.post("/api/analyze")
        body = resp.text.lower()
        assert "image" in body or "file" in body, (
            f"Expected 'image' or 'file' in error message for missing file, got: {resp.text}"
        )


class TestAnalyzeEmptyFile:
    """Test that zero-byte uploads return 400 with a clear message."""

    def test_empty_file_returns_400(self):
        resp = client.post(
            "/api/analyze",
            files={"file": ("empty.png", b"", "image/png")},
        )
        assert resp.status_code == 400, (
            f"Expected 400 for zero-byte file, got {resp.status_code}. Body: {resp.text}"
        )

    def test_empty_file_body_mentions_empty_or_bytes(self):
        resp = client.post(
            "/api/analyze",
            files={"file": ("empty.png", b"", "image/png")},
        )
        body = resp.text.lower()
        assert "empty" in body or "zero" in body or "bytes" in body, (
            f"Error for empty file should mention 'empty'/'zero'/'bytes': {resp.text}"
        )


class TestAnalyzeCorruptFile:
    """Test that undecodable / non-image bytes return 400 with a clean JSON body."""

    def test_corrupt_file_returns_400(self):
        junk = b"NOT_A_VALID_IMAGE_FILE_XXXXXXXXXXX"
        resp = client.post(
            "/api/analyze",
            files={"file": ("bad.png", junk, "image/png")},
        )
        assert resp.status_code == 400, (
            f"Expected 400 for corrupt file, got {resp.status_code}. Body: {resp.text}"
        )

    def test_corrupt_file_body_does_not_expose_traceback(self):
        """Response should be clean JSON, not an HTML traceback dump."""
        junk = b"\xFF\xFE" + b"\x00" * 200  # non-image binary garbage
        resp = client.post(
            "/api/analyze",
            files={"file": ("bad.bin", junk, "application/octet-stream")},
        )
        # Body must be parseable JSON
        try:
            data = resp.json()
        except Exception:
            pytest.fail(
                f"Expected JSON response for corrupt file, got non-JSON body: {resp.text[:200]}"
            )
        # No raw Python traceback phrases
        body_lower = resp.text.lower()
        assert "traceback" not in body_lower, (
            f"Response should not contain raw traceback: {resp.text[:400]}"
        )


class TestAnalyzeValidImage:
    """Smoke test: a valid grayscale PNG must return 200 and a well-formed body."""

    def test_valid_png_returns_200(self):
        png_bytes = _minimal_gray_png()
        resp = client.post(
            "/api/analyze",
            files={"file": ("sonar.png", png_bytes, "image/png")},
        )
        assert resp.status_code == 200, (
            f"Expected 200 for valid PNG, got {resp.status_code}. Body: {resp.text[:400]}"
        )

    def test_valid_png_response_has_required_keys(self):
        png_bytes = _minimal_gray_png()
        resp = client.post(
            "/api/analyze",
            files={"file": ("sonar.png", png_bytes, "image/png")},
        )
        if resp.status_code == 200:
            data = resp.json()
            for key in ("mission_id", "detections", "summary", "mode"):
                assert key in data, f"Response missing key '{key}': {list(data.keys())}"
