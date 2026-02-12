/**
 * Shared utilities for the Refunds feature.
 */

import React from 'react';
import { decodeHtmlEntities } from './index';
import { isSafeUrl } from './safeUrl';

/** Strip auto-generated `[Refund matched]` / `[Refund expected]` lines, return user notes or null. */
export function getUserNotes(notes: string | null): string | null {
  if (!notes) return null;
  const cleaned = notes
    .split('\n')
    .filter((line) => !line.startsWith('[Refund matched]') && !line.startsWith('[Refund expected]'))
    .join('\n')
    .trim();
  return cleaned ? decodeHtmlEntities(cleaned) : null;
}

const URL_REGEX = /https?:\/\/[^\s)]+/g;

/** Render text with URLs as clickable links. */
export function linkifyText(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_REGEX)) {
    const url = match[0];
    const start = match.index;
    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }
    if (isSafeUrl(url)) {
      parts.push(
        <a
          key={start}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:opacity-80"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {url}
        </a>
      );
    } else {
      parts.push(url);
    }
    lastIndex = start + url.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
