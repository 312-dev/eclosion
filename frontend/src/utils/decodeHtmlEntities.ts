/**
 * Decode HTML entities in strings.
 *
 * The API sanitizes responses with HTML encoding for XSS protection (CodeQL requirement).
 * This function decodes those entities for display in React components.
 *
 * Common entities decoded:
 * - &#39; or &apos; → ' (apostrophe)
 * - &amp; → & (ampersand)
 * - &lt; → < (less than)
 * - &gt; → > (greater than)
 * - &quot; → " (quote)
 */
export function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement('textarea');
  let decoded = text;
  let previous = '';

  // Decode repeatedly until stable (handles double-encoded entities like &amp;#39;)
  while (decoded !== previous) {
    previous = decoded;
    textarea.innerHTML = decoded;
    decoded = textarea.value;
  }

  return decoded;
}
