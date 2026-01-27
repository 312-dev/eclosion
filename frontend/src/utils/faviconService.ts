/**
 * Favicon Service
 *
 * Provides domain-based favicon fetching with:
 * - Domain extraction from URLs
 * - In-flight request deduplication (only one request per domain at a time)
 * - Domain → favicon result cache (session-level)
 * - Batch fetching with parallel requests
 */

import * as api from '../api/core/stash';
import * as demoApi from '../api/demo/demoStashConfig';

// Domain → favicon result cache (persists for session)
// Maps domain to favicon data URL or null (null means fetch failed/not found)
const faviconCache = new Map<string, string | null>();

// Domain → in-flight Promise (for deduplication of concurrent requests)
const inFlightRequests = new Map<string, Promise<string | null>>();

/**
 * Extract domain from a URL.
 * Returns lowercase domain without www prefix, or null if invalid.
 */
export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Fetch favicon for a single domain.
 * Uses caching and request deduplication.
 *
 * @param domain - The domain to fetch favicon for (e.g., "amazon.com")
 * @param isDemo - Whether we're in demo mode
 * @returns Favicon data URL or null
 */
export async function fetchFaviconForDomain(
  domain: string,
  isDemo: boolean
): Promise<string | null> {
  // Check cache first (includes null results from failed fetches)
  if (faviconCache.has(domain)) {
    return faviconCache.get(domain) ?? null;
  }

  // Check if request is already in-flight for this domain
  const existing = inFlightRequests.get(domain);
  if (existing) {
    return existing;
  }

  // Create new request with proper cleanup
  const request = (async () => {
    try {
      const result = isDemo ? await demoApi.fetchFavicon(domain) : await api.fetchFavicon(domain);
      faviconCache.set(domain, result);
      return result;
    } catch {
      // Cache failures to avoid repeated requests
      faviconCache.set(domain, null);
      return null;
    } finally {
      // Always clean up in-flight tracking
      inFlightRequests.delete(domain);
    }
  })();

  inFlightRequests.set(domain, request);
  return request;
}

/**
 * Batch fetch favicons for multiple URLs.
 * Groups URLs by domain and fetches unique domains in parallel.
 *
 * @param urls - Array of URLs to fetch favicons for
 * @param isDemo - Whether we're in demo mode
 * @returns Map of URL to favicon data URL (or null if not found)
 */
export async function batchFetchFavicons(
  urls: string[],
  isDemo: boolean
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();

  // Group URLs by domain
  const urlsByDomain = new Map<string, string[]>();
  for (const url of urls) {
    const domain = extractDomain(url);
    if (!domain) {
      results.set(url, null);
      continue;
    }

    const existing = urlsByDomain.get(domain) ?? [];
    existing.push(url);
    urlsByDomain.set(domain, existing);
  }

  // Fetch all unique domains in parallel
  const domains = Array.from(urlsByDomain.keys());
  const domainResults = await Promise.all(
    domains.map((domain) => fetchFaviconForDomain(domain, isDemo))
  );

  // Map domain results back to URLs
  domains.forEach((domain, index) => {
    const favicon = domainResults[index] ?? null;
    const domainUrls = urlsByDomain.get(domain) ?? [];
    for (const url of domainUrls) {
      results.set(url, favicon);
    }
  });

  return results;
}

/**
 * Get unique domains from bookmarks that need favicon fetching.
 * Excludes domains that are already cached or bookmarks that already have favicons.
 *
 * @param bookmarks - Array of bookmarks with url and logo_url fields
 * @returns Array of unique domains that need fetching
 */
export function getUnfetchedDomains(
  bookmarks: Array<{ url: string; logo_url: string | null }>
): string[] {
  const domains = new Set<string>();

  for (const bm of bookmarks) {
    // Skip if bookmark already has a favicon
    if (bm.logo_url) continue;

    const domain = extractDomain(bm.url);
    if (!domain) continue;

    // Skip if already cached (including null results from failed fetches)
    if (faviconCache.has(domain)) continue;

    domains.add(domain);
  }

  return Array.from(domains);
}

/**
 * Check if a domain's favicon is already cached.
 */
export function isFaviconCached(domain: string): boolean {
  return faviconCache.has(domain);
}

/**
 * Get cached favicon for a domain.
 * Returns undefined if not cached, null if cached as not found.
 */
export function getCachedFavicon(domain: string): string | null | undefined {
  if (!faviconCache.has(domain)) {
    return undefined;
  }
  return faviconCache.get(domain) ?? null;
}

/**
 * Clear the favicon cache.
 * Mainly useful for testing.
 */
export function clearFaviconCache(): void {
  faviconCache.clear();
  inFlightRequests.clear();
}
