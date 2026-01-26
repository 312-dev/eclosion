# Rate limiting configuration
# Shared limiter instance for use in blueprints

from flask import Flask
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# TEMPORARY: Default rate limits disabled for debugging
# Original: from core import config, then default_limits=list(config.DEFAULT_RATE_LIMITS)
# Auth endpoint limits (5 per minute) are still enforced via @limiter.limit decorators

# Create limiter instance without app binding
# Will be initialized with app in init_limiter()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],  # TEMPORARY: Disabled - was list(config.DEFAULT_RATE_LIMITS)
    storage_uri="memory://",
)


def init_limiter(app: Flask) -> Limiter:
    """Initialize rate limiter with Flask app.

    Call once during app setup, before registering blueprints.
    Returns the limiter instance for reference.

    Note: Uses in-memory storage, suitable for single-process deployments.
    For multi-process, configure storage_uri to use Redis.
    """
    limiter.init_app(app)
    return limiter
