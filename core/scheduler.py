"""
Background scheduler for automated sync tasks.

Always-on scheduler that runs two jobs while the app is running:
- Full sync: every 60 minutes (includes IFTTT event checks)
- IFTTT sync: every 15 minutes (lightweight, skips if full sync ran recently)

Uses active session credentials — no automation credentials or user consent needed.
"""

import asyncio
import logging
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Optional

from apscheduler.jobstores.memory import MemoryJobStore
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)


class SyncScheduler:
    """
    Always-on background scheduler for sync tasks.

    Singleton pattern ensures only one scheduler instance exists.
    Jobs are executed in background threads via APScheduler.

    Two jobs run automatically:
    - Full sync every 60 minutes
    - IFTTT event check every 15 minutes (skips if full sync ran within 15 min)
    """

    _instance: Optional["SyncScheduler"] = None
    _scheduler: BackgroundScheduler | None = None

    FULL_SYNC_JOB_ID = "full_sync"
    IFTTT_SYNC_JOB_ID = "ifttt_sync"
    FULL_SYNC_INTERVAL_MINUTES = 60
    IFTTT_SYNC_INTERVAL_MINUTES = 15

    @classmethod
    def get_instance(cls) -> "SyncScheduler":
        """Get or create the singleton scheduler instance."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        """Initialize the scheduler (use get_instance() instead)."""
        if SyncScheduler._instance is not None:
            raise RuntimeError("Use SyncScheduler.get_instance() instead")

        self._scheduler = BackgroundScheduler(
            jobstores={"default": MemoryJobStore()}, timezone="UTC"
        )
        self._full_sync_callback: Callable | None = None
        self._ifttt_sync_callback: Callable | None = None
        self._is_started = False

    def set_full_sync_callback(self, callback: Callable) -> None:
        """Set the async function to call for full sync."""
        self._full_sync_callback = callback

    def set_ifttt_sync_callback(self, callback: Callable) -> None:
        """Set the async function to call for IFTTT event checks."""
        self._ifttt_sync_callback = callback

    def start(self) -> None:
        """Start the scheduler and register both jobs."""
        if self._is_started or self._scheduler is None:
            return

        self._scheduler.start()
        self._is_started = True

        # Register full sync job (60 min)
        self._scheduler.add_job(
            self._run_full_sync_wrapper,
            trigger=IntervalTrigger(minutes=self.FULL_SYNC_INTERVAL_MINUTES),
            id=self.FULL_SYNC_JOB_ID,
            name="Full Monarch Sync",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )

        # Register IFTTT sync job (15 min)
        self._scheduler.add_job(
            self._run_ifttt_sync_wrapper,
            trigger=IntervalTrigger(minutes=self.IFTTT_SYNC_INTERVAL_MINUTES),
            id=self.IFTTT_SYNC_JOB_ID,
            name="IFTTT Event Check",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )

        logger.info(
            "Background scheduler started: full sync every %d min, IFTTT every %d min",
            self.FULL_SYNC_INTERVAL_MINUTES,
            self.IFTTT_SYNC_INTERVAL_MINUTES,
        )

    def shutdown(self) -> None:
        """Gracefully shutdown the scheduler."""
        if self._is_started and self._scheduler is not None:
            self._scheduler.shutdown(wait=False)
            self._is_started = False
            logger.info("Background scheduler shutdown")

    def _has_session_credentials(self) -> bool:
        """Check if active session credentials are available."""
        from services.credentials_service import CredentialsService

        return CredentialsService._session_credentials is not None

    def _run_full_sync_wrapper(self) -> None:
        """
        Run full sync in a new event loop.

        APScheduler runs jobs in threads, so we create
        a new event loop for the async callback.
        Skips silently if no active session credentials.
        """
        if self._full_sync_callback is None:
            return

        if not self._has_session_credentials():
            logger.debug("Skipping scheduled full sync — no active session")
            return

        try:
            logger.info("Starting scheduled full sync")
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(self._full_sync_callback())
                logger.info("Scheduled full sync completed")
            finally:
                loop.close()
        except Exception as e:
            logger.error(f"Scheduled full sync failed: {e}")

    def _run_ifttt_sync_wrapper(self) -> None:
        """
        Run IFTTT event check in a new event loop.

        Skips if:
        - No active session credentials
        - A full sync ran within the last 15 minutes (it already checked IFTTT events)
        """
        if self._ifttt_sync_callback is None:
            return

        if not self._has_session_credentials():
            logger.debug("Skipping scheduled IFTTT sync — no active session")
            return

        # Skip if full sync ran within the last 15 minutes
        try:
            from state import StateManager

            state = StateManager().load()
            if state.last_sync:
                last_sync_str = state.last_sync.replace("Z", "+00:00")
                last_sync_time = datetime.fromisoformat(last_sync_str)
                elapsed = (datetime.now(UTC) - last_sync_time).total_seconds()
                if elapsed < self.IFTTT_SYNC_INTERVAL_MINUTES * 60:
                    logger.debug(
                        "Skipping IFTTT sync — full sync ran %d seconds ago",
                        int(elapsed),
                    )
                    return
        except Exception as e:
            logger.warning(f"Could not check last_sync time: {e}")
            # Continue with IFTTT sync if we can't check

        try:
            logger.info("Starting scheduled IFTTT event check")
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(self._ifttt_sync_callback())
                logger.info("Scheduled IFTTT event check completed")
            finally:
                loop.close()
        except Exception as e:
            logger.error(f"Scheduled IFTTT event check failed: {e}")
