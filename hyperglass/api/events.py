"""API Events."""

# Standard Library
import typing as t

# Third Party
from litestar import Litestar

# Project
from hyperglass.state import use_state

# Local
from .als_startup import on_startup, on_shutdown

__all__ = ("check_redis", "startup_handler", "shutdown_handler")


async def check_redis(_: Litestar) -> t.NoReturn:
    """Ensure Redis is running before starting server."""
    cache = use_state("cache")
    cache.check()


async def startup_handler(_: Litestar) -> None:
    """Application startup handler."""
    await check_redis(_)
    await on_startup()


async def shutdown_handler(_: Litestar) -> None:
    """Application shutdown handler."""
    await on_shutdown()
