"""
pipeline/gosquad.py — GoSquad video generation API client.
All HTTP calls use httpx (async). JWT uses stdlib only (hmac, hashlib, base64).
GOSQUAD_SECRET_TOKEN never appears in logs or responses.
"""
from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac
import json
import logging
import time

import httpx

from backend.config import settings
from backend.errors import LLMError

logger = logging.getLogger(__name__)

_POLL_INTERVAL = 5          # seconds between status polls
_HTTP_TIMEOUT  = 30.0       # per-request timeout


# ---------------------------------------------------------------------------
# JWT — stdlib only, no PyJWT
# ---------------------------------------------------------------------------

def _b64url(data: bytes) -> str:
    """URL-safe base64 without padding."""
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def create_jwt(secret: str) -> str:
    """
    HS256 JWT with payload { platform: "external-script", exp: now+3600 }.
    Returns header.payload.signature string.
    """
    header  = _b64url(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    payload = _b64url(json.dumps(
        {"platform": "external-script", "exp": int(time.time()) + 3600},
        separators=(",", ":"),
    ).encode())

    signing_input = f"{header}.{payload}".encode()
    signature = _b64url(
        hmac.new(secret.encode(), signing_input, hashlib.sha256).digest()
    )
    return f"{header}.{payload}.{signature}"


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

def _auth_headers() -> dict[str, str]:
    """Generate fresh JWT headers — never cache the token."""
    return {
        "Authorization": f"Bearer {create_jwt(settings.gosquad_secret_token)}",
        "Content-Type":  "application/json",
    }


# ---------------------------------------------------------------------------
# submit_job
# ---------------------------------------------------------------------------

async def submit_job(
    topic:      str,
    grade_level: str,
    template:   str = "simulation-arc",
) -> str:
    """
    POST /api/generate — submits a video generation job.
    Returns job_id string.
    """
    body = {
        "template":        template,
        "topic":           topic,
        "environment":     "An educational classroom setting",
        "characterName":   "Professor AI",
        "gradeLevel":      grade_level,
    }
    url = f"{settings.gosquad_base_url}/api/generate"

    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        response = await client.post(url, json=body, headers=_auth_headers())

    if response.status_code not in (200, 201, 202):
        logger.error("gosquad.submit_job: HTTP %d", response.status_code)
        raise LLMError(f"GoSquad job submission failed (HTTP {response.status_code})")

    data = response.json()
    job_id = data.get("jobId") or data.get("job_id")
    if not job_id:
        raise LLMError("GoSquad response missing jobId")

    logger.info("gosquad.submit_job: job submitted — topic=%r grade=%r", topic, grade_level)
    return str(job_id)


# ---------------------------------------------------------------------------
# poll_until_complete
# ---------------------------------------------------------------------------

async def poll_until_complete(
    job_id:           str,
    max_wait_seconds: int = 300,
) -> str:
    """
    Poll GET /api/status/{job_id} every _POLL_INTERVAL seconds until COMPLETED or FAILED.
    Returns signed iframe URL on success.
    Raises LLMError on failure or timeout.
    """
    url       = f"{settings.gosquad_base_url}/api/status/{job_id}"
    elapsed   = 0

    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        while elapsed < max_wait_seconds:
            response = await client.get(url, headers=_auth_headers())

            if response.status_code != 200:
                logger.warning("gosquad.poll: HTTP %d for job %s", response.status_code, job_id)
            else:
                data   = response.json()
                status = data.get("status", "").upper()

                if status == "COMPLETED":
                    cf_id = data.get("cf_id") or data.get("cfId")
                    if not cf_id:
                        raise LLMError("GoSquad COMPLETED but missing cf_id")
                    logger.info("gosquad.poll: job %s completed", job_id)
                    return await get_signed_url(cf_id)

                if status == "FAILED":
                    logger.error("gosquad.poll: job %s FAILED", job_id)
                    raise LLMError("Video generation failed")

                logger.debug("gosquad.poll: job %s status=%s elapsed=%ds", job_id, status, elapsed)

            await asyncio.sleep(_POLL_INTERVAL)
            elapsed += _POLL_INTERVAL

    raise LLMError(f"Video generation timed out after {max_wait_seconds}s")


# ---------------------------------------------------------------------------
# get_signed_url
# ---------------------------------------------------------------------------

async def get_signed_url(cf_id: str) -> str:
    """
    POST /api/stream/signed-url — get a Cloudflare signed iframe URL.
    Returns signedUrl string.
    """
    url = f"{settings.gosquad_base_url}/api/stream/signed-url"

    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        response = await client.post(url, json={"cf_id": cf_id}, headers=_auth_headers())

    if response.status_code != 200:
        raise LLMError(f"GoSquad signed-url request failed (HTTP {response.status_code})")

    data = response.json()
    signed_url = data.get("signedUrl") or data.get("signed_url")
    if not signed_url:
        raise LLMError("GoSquad signed-url response missing signedUrl")

    return str(signed_url)
