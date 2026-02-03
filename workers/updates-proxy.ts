/**
 * Eclosion Updates Proxy
 *
 * Cloudflare Worker that fetches Reddit comments from a specific post
 * and returns them as JSON updates. Caches at the edge for 5 minutes.
 */

const REDDIT_POST_ID = '1qu70p7';
const REDDIT_USERNAME = 'Ok-Quantity7501';
const SUBREDDIT = 'user/Ok-Quantity7501';
const USER_AGENT = 'Eclosion-Updates/1.0 (https://eclosion.app)';
const CACHE_TTL = 300; // 5 minutes

interface RedditComment {
  id: string;
  author: string;
  body: string;
  body_html: string;
  created_utc: number;
  edited: boolean | number;
  parent_id: string;
  permalink: string;
}

interface UpdateEntry {
  id: string;
  title: string;
  /** Truncated preview of content (without title line), max 150 chars */
  preview: string;
  date: string;
  edited: string | null;
  permalink: string;
}

interface RedditListing {
  data: {
    children: Array<{ data: RedditComment }>;
  };
}

function extractTitleAndPreview(rawBody: string): { title: string; preview: string } {
  const lines = rawBody.split('\n');
  const nonEmptyLines = lines.filter((l) => l.trim());
  let title = nonEmptyLines[0] || 'Update';
  let bodyStartIndex = 0;

  // Check for markdown heading
  if (title.startsWith('# ')) {
    title = title.slice(2).trim();
    // Find the index of the title line in original array to preserve formatting
    const titleLineIndex = lines.findIndex((l) => l.trim().startsWith('# '));
    bodyStartIndex = titleLineIndex >= 0 ? titleLineIndex + 1 : 1;
  } else if (title.startsWith('**') && title.includes('**', 2)) {
    // Bold title: **Title Here**
    const match = title.match(/^\*\*(.+?)\*\*/);
    if (match) {
      title = match[1];
      bodyStartIndex = lines.findIndex((l) => l.trim().startsWith('**')) + 1;
    }
  } else {
    // Use first sentence as title
    title = title.slice(0, 60).split(/[.!?]/)[0].trim();
    if (title.length < nonEmptyLines[0].length) title += '...';
    bodyStartIndex = lines.findIndex((l) => l.trim()) + 1;
  }

  // Get remaining content preserving markdown structure
  const body = lines
    .slice(bodyStartIndex)
    .join('\n')
    .replace(/^\n+/, '')
    .trim();

  // Truncate to ~300 chars for preview while preserving markdown
  const preview = body.length > 300 ? body.slice(0, 297) + '...' : body;

  return { title, preview };
}

function transformComment(comment: RedditComment): UpdateEntry {
  const { title, preview } = extractTitleAndPreview(comment.body);

  return {
    id: comment.id,
    title,
    preview,
    date: new Date(comment.created_utc * 1000).toISOString(),
    edited: typeof comment.edited === 'number' ? new Date(comment.edited * 1000).toISOString() : null,
    permalink: `https://www.reddit.com${comment.permalink}`,
  };
}

async function fetchRedditUpdates(): Promise<UpdateEntry[]> {
  const url = `https://www.reddit.com/${SUBREDDIT}/comments/${REDDIT_POST_ID}.json?limit=100`;

  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Reddit API error: ${response.status}`);
  }

  const data = (await response.json()) as [unknown, RedditListing | undefined];
  const commentsListing = data[1];

  // Handle case where there are no comments yet
  if (!commentsListing?.data?.children) {
    return [];
  }

  const comments: RedditComment[] = commentsListing.data.children
    .map((c) => c.data)
    .filter(
      (c: RedditComment) =>
        c.author === REDDIT_USERNAME && c.parent_id.startsWith('t3_') // Parent-level only (t3_ = post)
    );

  return comments.map(transformComment).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export default {
  async fetch(request: Request): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    try {
      const updates = await fetchRedditUpdates();

      return new Response(JSON.stringify({ updates }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': `public, s-maxage=${CACHE_TTL}`, // Edge cache
        },
      });
    } catch (error) {
      console.error('Failed to fetch updates:', error);

      return new Response(JSON.stringify({ updates: [], error: 'Failed to fetch updates' }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, s-maxage=60', // Short cache on error
        },
      });
    }
  },
};
