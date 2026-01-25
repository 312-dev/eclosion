"""
Background scheduler for automated sync tasks.

Uses APScheduler with in-memory job store for background task execution.
Jobs are recreated on startup from persisted state in the SQLite database.
"""

import asyncio
import contextlib
import logging
from collections.abc import Callable
from typing import Optional

from apscheduler.jobstores.memory import MemoryJobStore
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)


class SyncScheduler:
    """
    Manages background sync scheduling.

    Singleton pattern ensures only one scheduler instance exists.
    Jobs are executed in background threads via APScheduler.

    Supports adaptive intervals based on app visibility:
    - Foreground: More frequent syncing (5 min) when user is active
    - Background: Less frequent syncing (60 min) when app is hidden
    """

    _instance: Optional["SyncScheduler"] = None
    _scheduler: BackgroundScheduler | None = None

    SYNC_JOB_ID = "automated_sync"
    FOREGROUND_INTERVAL_MINUTES = 5  # When app is visible/active
    BACKGROUND_INTERVAL_MINUTES = 60  # When app is hidden/background
    MAX_INTERVAL_MINUTES = 1440  # 24 hours max
    DEFAULT_INTERVAL_MINUTES = 360  # 6 hours default (legacy)

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
        self._sync_callback: Callable | None = None
        self._is_started = False
        self._is_foreground = True  # Assume foreground on start
        self._auto_sync_enabled = False  # Track if auto-sync is active

    def start(self) -> None:
        """Start the scheduler if not already running."""
        if not self._is_started and self._scheduler is not None:
            self._scheduler.start()
            self._is_started = True
            logger.info("Background scheduler started")

    def shutdown(self) -> None:
        """Gracefully shutdown the scheduler."""
        if self._is_started and self._scheduler is not None:
            self._scheduler.shutdown(wait=False)
            self._is_started = False
            logger.info("Background scheduler shutdown")

    def set_sync_callback(self, callback: Callable) -> None:
        """
        Set the async function to call for sync.

        Args:
            callback: Async function that performs the sync operation
        """
        self._sync_callback = callback

    def enable_auto_sync(self, _interval_minutes: int | None = None) -> int:
        """
        Enable automatic sync with adaptive intervals based on visibility.

        Uses foreground interval (5 min) when app is visible,
        background interval (60 min) when app is hidden.

        Args:
            interval_minutes: Ignored (kept for API compatibility).
                             Interval is now determined by visibility state.

        Returns:
            Current interval in use (foreground or background)
        """
        # Determine interval based on visibility state
        interval = (
            self.FOREGROUND_INTERVAL_MINUTES
            if self._is_foreground
            else self.BACKGROUND_INTERVAL_MINUTES
        )

        # Remove existing job if present
        if self._scheduler is not None:
            with contextlib.suppress(Exception):
                self._scheduler.remove_job(self.SYNC_JOB_ID)

        if self._scheduler is None:
            logger.error("Cannot enable auto-sync: scheduler not initialized")
            return interval

        self._auto_sync_enabled = True

        # Add new job
        self._scheduler.add_job(
            self._run_sync_wrapper,
            trigger=IntervalTrigger(minutes=interval),
            id=self.SYNC_JOB_ID,
            name="Automated Monarch Sync",
            replace_existing=True,
            max_instances=1,
            coalesce=True,  # Combine missed runs
        )
        mode = "foreground" if self._is_foreground else "background"
        logger.info(f"Auto-sync enabled: every {interval} minutes ({mode} mode)")
        return interval

    def disable_auto_sync(self) -> None:
        """Disable automatic sync."""
        self._auto_sync_enabled = False

        if self._scheduler is None:
            return

        with contextlib.suppress(Exception):
            self._scheduler.remove_job(self.SYNC_JOB_ID)
            logger.info("Auto-sync disabled")

    def set_foreground(self, is_foreground: bool) -> int | None:
        """
        Set visibility state and adjust sync interval accordingly.

        Args:
            is_foreground: True if app is visible/active, False if hidden

        Returns:
            New interval in minutes, or None if auto-sync is not enabled
        """
        if self._is_foreground == is_foreground:
            return None  # No change needed

        self._is_foreground = is_foreground
        mode = "foreground" if is_foreground else "background"
        logger.info(f"App visibility changed to {mode}")

        # If auto-sync is enabled, reschedule with new interval
        if self._auto_sync_enabled:
            return self.enable_auto_sync()

        return None

    def is_enabled(self) -> bool:
        """Check if auto-sync is currently enabled."""
        if self._scheduler is None:
            return False
        job = self._scheduler.get_job(self.SYNC_JOB_ID)
        return job is not None

    def get_status(self) -> dict:
        """
        Get current scheduler status.

        Returns:
            Dict with enabled, next_run, interval_minutes, and is_foreground
        """
        if self._scheduler is None:
            return {
                "enabled": False,
                "next_run": None,
                "interval_minutes": None,
                "is_foreground": self._is_foreground,
            }

        job = self._scheduler.get_job(self.SYNC_JOB_ID)
        if job:
            next_run = job.next_run_time.isoformat() if job.next_run_time else None
            interval = (
                job.trigger.interval.total_seconds() / 60
                if hasattr(job.trigger, "interval")
                else None
            )
            return {
                "enabled": True,
                "next_run": next_run,
                "interval_minutes": interval,
                "is_foreground": self._is_foreground,
            }
        return {
            "enabled": False,
            "next_run": None,
            "interval_minutes": None,
            "is_foreground": self._is_foreground,
        }

    def _run_sync_wrapper(self) -> None:
        """
        Wrapper to run async sync callback in sync context.

        APScheduler runs jobs in threads, so we need to create
        an event loop to run our async callback.
        """
        if self._sync_callback is None:
            logger.warning("Auto-sync triggered but no callback set")
            return

        try:
            logger.info("Starting automated sync")
            # Create new event loop for this thread
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(self._sync_callback())
                logger.info("Automated sync completed successfully")
            finally:
                loop.close()
        except Exception as e:
            logger.error(f"Automated sync failed: {e}")
