"""
Tests for custom exception hierarchy.

Tests cover:
- Exception inheritance
- Error codes
- Custom attributes
"""

import pytest

from core.exceptions import (
    AuthenticationError,
    CategoryNotFoundError,
    ConfigurationError,
    MFARequiredError,
    MonarchAPIError,
    MonarchTrackerError,
    RateLimitError,
    ValidationError,
)


class TestExceptionHierarchy:
    """Test exception inheritance and attributes."""

    def test_base_exception(self) -> None:
        """MonarchTrackerError should be base for all."""
        exc = MonarchTrackerError("Test error")
        assert str(exc) == "Test error"
        assert exc.code == "UNKNOWN_ERROR"

    def test_custom_code(self) -> None:
        """Should accept custom error code."""
        exc = MonarchTrackerError("Test", code="CUSTOM")
        assert exc.code == "CUSTOM"

    def test_authentication_error(self) -> None:
        """AuthenticationError should have correct code."""
        exc = AuthenticationError("Auth failed")
        assert exc.code == "AUTH_ERROR"
        assert isinstance(exc, MonarchTrackerError)

    def test_mfa_required_error(self) -> None:
        """MFARequiredError should inherit from AuthenticationError."""
        exc = MFARequiredError("MFA needed")
        assert exc.code == "MFA_REQUIRED"
        assert isinstance(exc, AuthenticationError)
        assert isinstance(exc, MonarchTrackerError)

    def test_monarch_api_error(self) -> None:
        """MonarchAPIError should have correct code."""
        exc = MonarchAPIError("API error")
        assert exc.code == "MONARCH_API_ERROR"
        assert isinstance(exc, MonarchTrackerError)

    def test_rate_limit_error(self) -> None:
        """RateLimitError should have retry_after."""
        exc = RateLimitError(retry_after=120)
        assert exc.code == "RATE_LIMITED"
        assert exc.retry_after == 120
        assert isinstance(exc, MonarchAPIError)

    def test_rate_limit_error_default(self) -> None:
        """RateLimitError should have default retry_after."""
        exc = RateLimitError()
        assert exc.retry_after == 60

    def test_category_not_found_error(self) -> None:
        """CategoryNotFoundError should have correct code."""
        exc = CategoryNotFoundError("Category missing")
        assert exc.code == "CATEGORY_NOT_FOUND"
        assert isinstance(exc, MonarchTrackerError)

    def test_configuration_error(self) -> None:
        """ConfigurationError should have correct code."""
        exc = ConfigurationError("Not configured")
        assert exc.code == "NOT_CONFIGURED"
        assert isinstance(exc, MonarchTrackerError)

    def test_validation_error(self) -> None:
        """ValidationError should have correct code."""
        exc = ValidationError("Invalid input")
        assert exc.code == "VALIDATION_ERROR"
        assert isinstance(exc, MonarchTrackerError)


class TestExceptionCatching:
    """Test exception catch patterns."""

    def test_catch_specific_auth_error(self) -> None:
        """Should be able to catch specific auth errors."""
        try:
            raise MFARequiredError("Need MFA")
        except MFARequiredError as e:
            assert e.code == "MFA_REQUIRED"
        except AuthenticationError:
            pytest.fail("Should have caught MFARequiredError specifically")

    def test_catch_parent_auth_error(self) -> None:
        """Should be able to catch auth errors by parent type."""
        caught = False
        try:
            raise MFARequiredError("Need MFA")
        except AuthenticationError:
            caught = True
        assert caught

    def test_catch_base_error(self) -> None:
        """Should be able to catch all tracker errors by base type."""
        errors = [
            AuthenticationError("auth"),
            MFARequiredError("mfa"),
            MonarchAPIError("api"),
            RateLimitError(),
            CategoryNotFoundError("cat"),
            ConfigurationError("config"),
            ValidationError("valid"),
        ]

        for error in errors:
            try:
                raise error
            except MonarchTrackerError as e:
                assert e.code is not None
