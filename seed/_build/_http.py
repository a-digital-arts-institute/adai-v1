"""
Shared HTTP for gatherers.

Stdlib-only by design — gatherers should not require a venv for tier-1
operation (only embed/r2/agentic-search need .venv). All public helpers
respect:

  - Per-host concurrency caps (Wikimedia, in particular, 403s aggressive
    concurrent fetchers and will tarpit you for the rest of the run).
  - Retry-with-backoff on transient failures (HTTP 429, 5xx, timeouts,
    connection resets). NOT retried: 4xx other than 429 (the request is
    wrong, retrying won't help).
  - Descriptive User-Agent. Wikimedia 403s the default urllib UA in
    particular; every endpoint we care about is friendlier to a UA that
    says who we are.

Public API:
  get(url, *, timeout=30, headers=None, retries=3) -> bytes
  get_text(url, ...) -> str
  get_json(url, ...) -> dict | list
  head_ok(url, *, timeout=10) -> bool
  post_json(url, payload, ...) -> dict | list

  HostLimiter(host, max_concurrent) -- context manager + decorator

Default UA:
  "A(DAI) seed-build bot (https://adai-basel.fly.dev/; contact @sinkingsugar)"
  Wikidata + Wikimedia + MoMA + Met all accept this. If a new endpoint needs
  a stricter UA, pass headers={"User-Agent": ...} to override per-call.
"""
from __future__ import annotations

import json as _json
import logging
import random
import socket
import threading
import time
import urllib.error
import urllib.request
from contextlib import contextmanager
from typing import Any, Iterator
from urllib.parse import urlsplit

USER_AGENT = (
    "A(DAI) seed-build bot (https://adai-basel.fly.dev/; "
    "contact @sinkingsugar)"
)

# Retryable HTTP codes. 429 is rate-limit (back off), 5xx is server fault.
_RETRY_STATUS = {408, 425, 429, 500, 502, 503, 504}

# Per-host concurrency caps. Keys are hostnames; default is no cap.
# Wikimedia properties (commons, upload, wikipedia) are notoriously
# touchy — 2 concurrent is the sweet spot empirically.
_DEFAULT_HOST_LIMITS: dict[str, int] = {
    "commons.wikimedia.org": 2,
    "upload.wikimedia.org": 2,
    "en.wikipedia.org": 2,
    "www.wikidata.org": 4,
    "query.wikidata.org": 1,  # SPARQL — be very gentle
    "collectionapi.metmuseum.org": 4,
}

_host_semaphores: dict[str, threading.BoundedSemaphore] = {}
_semaphore_lock = threading.Lock()
_log = logging.getLogger("adai.http")


def _host_semaphore(host: str, override: int | None = None) -> threading.BoundedSemaphore | None:
    limit = override if override is not None else _DEFAULT_HOST_LIMITS.get(host)
    if not limit:
        return None
    with _semaphore_lock:
        sem = _host_semaphores.get(host)
        if sem is None:
            sem = threading.BoundedSemaphore(limit)
            _host_semaphores[host] = sem
        return sem


@contextmanager
def host_slot(url: str, *, limit: int | None = None) -> Iterator[None]:
    """Acquire a per-host concurrency slot for the duration of the block.

    Use this when your gatherer does its own concurrency (e.g. ThreadPoolExecutor)
    and you want to enforce the per-host cap manually. The bare ``get()``/``get_json()``
    helpers already do this internally.
    """
    host = urlsplit(url).hostname or ""
    sem = _host_semaphore(host, limit)
    if sem is None:
        yield
        return
    sem.acquire()
    try:
        yield
    finally:
        sem.release()


class HttpError(Exception):
    """Raised for non-retryable HTTP failures."""

    def __init__(self, url: str, status: int | None, message: str):
        self.url = url
        self.status = status
        super().__init__(f"{url}: {status} {message}")


def _build_request(url: str, *, headers: dict[str, str] | None, method: str = "GET", body: bytes | None = None) -> urllib.request.Request:
    h = {"User-Agent": USER_AGENT, "Accept": "application/json, */*;q=0.8"}
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, headers=h, method=method)
    if body is not None:
        req.data = body
    return req


def _fetch_once(req: urllib.request.Request, *, timeout: float) -> tuple[int, bytes, dict[str, str]]:
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read()
            return resp.status, body, dict(resp.headers)
    except urllib.error.HTTPError as e:
        body = e.read() if e.fp else b""
        return e.code, body, dict(e.headers or {})


def _sleep_for_retry(attempt: int, retry_after: str | None) -> None:
    if retry_after:
        try:
            time.sleep(min(float(retry_after), 60))
            return
        except ValueError:
            pass
    # Exponential backoff with jitter: 1, 2, 4, 8s + 0–1s jitter.
    delay = min(2 ** attempt, 30) + random.random()
    time.sleep(delay)


def get(
    url: str,
    *,
    timeout: float = 30,
    headers: dict[str, str] | None = None,
    retries: int = 3,
    host_limit: int | None = None,
) -> bytes:
    """Fetch bytes with retry/backoff and per-host throttling. Raises HttpError on persistent failure."""
    req = _build_request(url, headers=headers)
    sem = _host_semaphore(urlsplit(url).hostname or "", host_limit)
    for attempt in range(retries + 1):
        if sem:
            sem.acquire()
        try:
            try:
                status, body, resp_headers = _fetch_once(req, timeout=timeout)
            except (urllib.error.URLError, socket.timeout, ConnectionError) as e:
                if attempt < retries:
                    _log.warning("transient %s on %s (attempt %d) — backing off", type(e).__name__, url, attempt + 1)
                    _sleep_for_retry(attempt, None)
                    continue
                raise HttpError(url, None, f"network: {e}") from e
        finally:
            if sem:
                sem.release()

        if 200 <= status < 300:
            return body
        if status in _RETRY_STATUS and attempt < retries:
            _log.warning("HTTP %d on %s (attempt %d) — backing off", status, url, attempt + 1)
            _sleep_for_retry(attempt, resp_headers.get("Retry-After"))
            continue
        raise HttpError(url, status, body[:200].decode("utf-8", errors="replace"))
    raise HttpError(url, None, "exhausted retries")


def get_text(url: str, *, encoding: str = "utf-8", **kwargs: Any) -> str:
    return get(url, **kwargs).decode(encoding, errors="replace")


def get_json(url: str, **kwargs: Any) -> Any:
    body = get(url, **kwargs)
    return _json.loads(body)


def post_json(
    url: str,
    payload: Any,
    *,
    timeout: float = 30,
    headers: dict[str, str] | None = None,
    retries: int = 3,
    host_limit: int | None = None,
) -> Any:
    body = _json.dumps(payload).encode("utf-8")
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    req = _build_request(url, headers=h, method="POST", body=body)
    sem = _host_semaphore(urlsplit(url).hostname or "", host_limit)
    for attempt in range(retries + 1):
        if sem:
            sem.acquire()
        try:
            try:
                status, resp_body, resp_headers = _fetch_once(req, timeout=timeout)
            except (urllib.error.URLError, socket.timeout, ConnectionError) as e:
                if attempt < retries:
                    _sleep_for_retry(attempt, None)
                    continue
                raise HttpError(url, None, f"network: {e}") from e
        finally:
            if sem:
                sem.release()

        if 200 <= status < 300:
            return _json.loads(resp_body)
        if status in _RETRY_STATUS and attempt < retries:
            _sleep_for_retry(attempt, resp_headers.get("Retry-After"))
            continue
        raise HttpError(url, status, resp_body[:200].decode("utf-8", errors="replace"))
    raise HttpError(url, None, "exhausted retries")


def head_ok(url: str, *, timeout: float = 10, host_limit: int | None = None) -> bool:
    """HEAD-check a URL. Returns True for 2xx, False otherwise. Used by sanitize_images.py and friends.

    GET fallback: a few CDNs (Cloudflare R2 included) refuse HEAD on some keys
    but accept range-0 GET. Wikimedia upload.wikimedia.org has been seen to
    503 on HEAD while 200ing GET. So we retry once with a tiny GET range.
    """
    req = _build_request(url, headers={"Accept": "*/*"}, method="HEAD")
    sem = _host_semaphore(urlsplit(url).hostname or "", host_limit)
    for method_attempt in range(2):
        if sem:
            sem.acquire()
        try:
            try:
                status, _, _ = _fetch_once(req, timeout=timeout)
            except (urllib.error.URLError, socket.timeout, ConnectionError):
                return False
        finally:
            if sem:
                sem.release()
        if 200 <= status < 300:
            return True
        if method_attempt == 0 and status in (405, 501, 503):
            req = _build_request(url, headers={"Range": "bytes=0-0"}, method="GET")
            continue
        return False
    return False


if __name__ == "__main__":
    # Smoke test
    import sys

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    urls = sys.argv[1:] or [
        "https://www.wikidata.org/wiki/Special:EntityData/Q28936957.json",
        "https://collectionapi.metmuseum.org/public/collection/v1/objects/1",
    ]
    for u in urls:
        try:
            data = get_json(u, timeout=20)
            print(f"OK    {u}  ({len(_json.dumps(data))} bytes)")
        except HttpError as e:
            print(f"FAIL  {u}  ({e})")
