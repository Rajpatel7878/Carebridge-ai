"""Thread-safe in-memory sliding-window rate limiter for authentication endpoints."""

from collections import deque
import math
from threading import Lock
import time

from fastapi import Request

from app.core.exceptions import RateLimitException


class SlidingWindowRateLimiter:
    """Per-process sliding-window rate limiter with bounded memory pruning."""

    def __init__(self, *, max_tracked_keys: int = 10_000) -> None:
        self._buckets: dict[str, deque[float]] = {}
        self._lock = Lock()
        self._max_tracked_keys = max_tracked_keys

    def enforce(self, key: str, *, limit: int, window_seconds: int, message: str) -> None:
        """Record an attempt for ``key`` or raise ``RateLimitException`` when exceeded."""
        now = time.monotonic()
        cutoff = now - window_seconds

        with self._lock:
            if len(self._buckets) >= self._max_tracked_keys and key not in self._buckets:
                self._prune_expired(cutoff)

            bucket = self._buckets.get(key)
            if bucket is None:
                bucket = deque()
                self._buckets[key] = bucket

            while bucket and bucket[0] <= cutoff:
                bucket.popleft()

            if len(bucket) >= limit:
                retry_after = max(1, math.ceil(bucket[0] + window_seconds - now))
                raise RateLimitException(message, retry_after_seconds=retry_after)

            bucket.append(now)

    def reset(self) -> None:
        """Clear all recorded rate-limit buckets (intended for test isolation)."""
        with self._lock:
            self._buckets.clear()

    def _prune_expired(self, cutoff: float) -> None:
        stale_keys = [
            key
            for key, timestamps in self._buckets.items()
            if not timestamps or timestamps[-1] <= cutoff
        ]
        for key in stale_keys:
            self._buckets.pop(key, None)


auth_rate_limiter = SlidingWindowRateLimiter()


def get_client_ip(request: Request) -> str:
    """Return the direct peer IP address for rate-limit bucketing."""
    if request.client and request.client.host:
        return request.client.host
    return "unknown"
