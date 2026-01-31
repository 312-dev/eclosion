/**
 * Remote Access Tunnel Manager
 *
 * Manages a Cloudflare Quick Tunnel to expose the local Flask backend
 * to the internet for remote access from phones/browsers.
 *
 * Security model:
 * - Tunnel is opt-in and disabled by default
 * - Remote users authenticate with the desktop app passphrase (PBKDF2 validated)
 * - Tunnel URL is random and unguessable
 * - TLS termination at Cloudflare (HTTPS automatic)
 * - Real client IP forwarded via CF-Connecting-IP header
 */

import { spawn, type ChildProcess } from 'child_process';
import { createWriteStream, existsSync, mkdirSync, chmodSync } from 'fs';
import { get as httpsGet } from 'https';
import { join } from 'path';
import { app } from 'electron';
import { debugLog } from './logger';
import { getStore } from './store';

/**
 * Storage key for tracking if remote access is enabled.
 */
const REMOTE_ACCESS_ENABLED_KEY = 'security.remoteAccessEnabled' as const;

/**
 * Active tunnel state.
 */
interface ActiveTunnel {
  url: string;
  port: number;
  process: ChildProcess;
}

let activeTunnel: ActiveTunnel | null = null;

/**
 * Get the cloudflared binary path for the current platform.
 */
function getCloudflaredPath(): string {
  const userDataPath = app.getPath('userData');
  const binDir = join(userDataPath, 'bin');

  // Ensure bin directory exists
  if (!existsSync(binDir)) {
    mkdirSync(binDir, { recursive: true });
  }

  const platform = process.platform;
  const arch = process.arch;

  let binaryName = 'cloudflared';
  if (platform === 'win32') {
    binaryName = 'cloudflared.exe';
  }

  return join(binDir, binaryName);
}

/**
 * Get the download URL for cloudflared based on platform/arch.
 */
function getCloudflaredDownloadUrl(): string {
  const platform = process.platform;
  const arch = process.arch;

  // Cloudflare's download URLs
  // https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
  const baseUrl = 'https://github.com/cloudflare/cloudflared/releases/latest/download';

  if (platform === 'darwin') {
    // macOS - universal binary works for both Intel and Apple Silicon
    return `${baseUrl}/cloudflared-darwin-amd64.tgz`;
  } else if (platform === 'win32') {
    if (arch === 'x64') {
      return `${baseUrl}/cloudflared-windows-amd64.exe`;
    } else {
      return `${baseUrl}/cloudflared-windows-386.exe`;
    }
  } else if (platform === 'linux') {
    if (arch === 'x64') {
      return `${baseUrl}/cloudflared-linux-amd64`;
    } else if (arch === 'arm64') {
      return `${baseUrl}/cloudflared-linux-arm64`;
    } else if (arch === 'arm') {
      return `${baseUrl}/cloudflared-linux-arm`;
    }
  }

  throw new Error(`Unsupported platform: ${platform}-${arch}`);
}

/**
 * Download a file from URL to destination path.
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    debugLog(`[Tunnel] Downloading from ${url}`);

    const handleResponse = (response: NodeJS.ReadableStream & { statusCode?: number; headers?: { location?: string } }): void => {
      // Handle redirects
      const res = response as { statusCode?: number; headers?: { location?: string } };
      if (res.statusCode === 302 || res.statusCode === 301) {
        const redirectUrl = res.headers?.location;
        if (redirectUrl) {
          debugLog(`[Tunnel] Following redirect to ${redirectUrl}`);
          httpsGet(redirectUrl, handleResponse).on('error', reject);
          return;
        }
      }

      if (res.statusCode !== 200) {
        reject(new Error(`Download failed with status ${res.statusCode}`));
        return;
      }

      const file = createWriteStream(destPath);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        // Make executable on Unix
        if (process.platform !== 'win32') {
          chmodSync(destPath, 0o755);
        }
        debugLog(`[Tunnel] Download complete: ${destPath}`);
        resolve();
      });
      file.on('error', (err) => {
        reject(err);
      });
    };

    httpsGet(url, handleResponse).on('error', reject);
  });
}

/**
 * Ensure cloudflared binary is available, downloading if necessary.
 */
async function ensureCloudflared(): Promise<string> {
  const binaryPath = getCloudflaredPath();

  if (existsSync(binaryPath)) {
    debugLog(`[Tunnel] cloudflared already exists at ${binaryPath}`);
    return binaryPath;
  }

  debugLog('[Tunnel] cloudflared not found, downloading...');
  const downloadUrl = getCloudflaredDownloadUrl();

  // For macOS, we download a .tgz file that needs extraction
  if (process.platform === 'darwin') {
    const tgzPath = `${binaryPath}.tgz`;
    await downloadFile(downloadUrl, tgzPath);

    // Extract the binary using tar
    const { execSync } = await import('child_process');
    const binDir = join(app.getPath('userData'), 'bin');
    execSync(`tar -xzf "${tgzPath}" -C "${binDir}"`, { stdio: 'ignore' });

    // Remove the tgz file
    const { unlinkSync } = await import('fs');
    unlinkSync(tgzPath);

    debugLog(`[Tunnel] Extracted cloudflared to ${binaryPath}`);
  } else {
    await downloadFile(downloadUrl, binaryPath);
  }

  return binaryPath;
}

/**
 * Start a tunnel to the specified local port.
 * Returns the public HTTPS URL.
 *
 * @param port The local port to tunnel (Flask backend port)
 * @returns The public HTTPS URL
 */
export async function startTunnel(port: number): Promise<string> {
  if (activeTunnel) {
    debugLog(`[Tunnel] Already active at ${activeTunnel.url}`);
    return activeTunnel.url;
  }

  debugLog(`[Tunnel] Starting Cloudflare tunnel to port ${port}...`);

  try {
    const binaryPath = await ensureCloudflared();

    // Spawn cloudflared with quick tunnel
    const tunnelProcess = spawn(binaryPath, ['tunnel', '--url', `http://localhost:${port}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Wait for the URL to appear in output
    const url = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        tunnelProcess.kill();
        reject(new Error('Tunnel connection timeout'));
      }, 60000); // Cloudflare can take longer than Tunnelmole

      let output = '';

      const handleOutput = (data: Buffer): void => {
        const text = data.toString();
        output += text;
        debugLog(`[Tunnel] ${text.trim()}`);

        // Look for the URL in the output
        // Format: "Your quick Tunnel has been created! Visit it at (it may take some time to be reachable): https://xxx.trycloudflare.com"
        // Or simpler: just find the trycloudflare.com URL
        const urlMatch = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
        if (urlMatch) {
          clearTimeout(timeout);
          resolve(urlMatch[0]);
        }
      };

      tunnelProcess.stdout?.on('data', handleOutput);
      tunnelProcess.stderr?.on('data', handleOutput);

      tunnelProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      tunnelProcess.on('exit', (code) => {
        if (!activeTunnel) {
          clearTimeout(timeout);
          reject(new Error(`cloudflared exited with code ${code}\n${output}`));
        }
      });
    });

    activeTunnel = { url, port, process: tunnelProcess };
    debugLog(`[Tunnel] Started successfully: ${url}`);

    // Mark remote access as enabled
    getStore().set(REMOTE_ACCESS_ENABLED_KEY, true);

    return url;
  } catch (error) {
    debugLog(`[Tunnel] Failed to start: ${error}`);
    throw error;
  }
}

/**
 * Stop the active tunnel.
 */
export function stopTunnel(): void {
  if (!activeTunnel) {
    debugLog('[Tunnel] No active tunnel to stop');
    return;
  }

  debugLog(`[Tunnel] Stopping tunnel at ${activeTunnel.url}`);

  // Kill the cloudflared process
  try {
    activeTunnel.process.kill();
    debugLog('[Tunnel] Process killed');
  } catch (error) {
    debugLog(`[Tunnel] Error killing process: ${error}`);
  }

  activeTunnel = null;

  // Mark remote access as disabled
  getStore().set(REMOTE_ACCESS_ENABLED_KEY, false);

  debugLog('[Tunnel] Stopped');
}

/**
 * Get the current tunnel URL, or null if not active.
 */
export function getTunnelUrl(): string | null {
  return activeTunnel?.url ?? null;
}

/**
 * Check if a tunnel is currently active.
 */
export function isTunnelActive(): boolean {
  return activeTunnel !== null;
}

/**
 * Check if remote access is enabled (persisted setting).
 */
export function isRemoteAccessEnabled(): boolean {
  return getStore().get(REMOTE_ACCESS_ENABLED_KEY, false);
}

// =============================================================================
// Cleanup on app quit
// =============================================================================

/**
 * Clean up tunnel resources when the app is quitting.
 * Called from the main process during app shutdown.
 */
export function cleanupTunnel(): void {
  if (activeTunnel) {
    debugLog('[Tunnel] Cleaning up on app quit');
    try {
      activeTunnel.process.kill();
    } catch {
      // Ignore errors during cleanup
    }
    activeTunnel = null;
  }
}
