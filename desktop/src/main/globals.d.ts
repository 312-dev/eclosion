/**
 * Global Type Declarations for Desktop Main Process
 *
 * These constants are injected at build time via esbuild define.
 * See desktop/scripts/build-main.js for the injection logic.
 */

/**
 * App version injected at build time.
 * Falls back to '0.0.0' if not provided during build.
 * Set via ECLOSION_VERSION environment variable.
 */
declare const __APP_VERSION__: string;

/**
 * Release channel injected at build time.
 * One of: 'stable', 'beta', or 'dev'
 * Set via RELEASE_CHANNEL environment variable.
 */
declare const __RELEASE_CHANNEL__: string;
