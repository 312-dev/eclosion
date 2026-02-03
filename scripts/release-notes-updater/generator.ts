/**
 * AI Release Notes Summarizer
 *
 * Takes technical release notes and generates a brief, user-friendly summary.
 * - Stable releases: proportional tone (brief for fixes, warmer for features)
 * - Beta releases: technical, matter-of-fact tone
 */

const GITHUB_MODELS_ENDPOINT = 'https://models.inference.ai.azure.com/chat/completions';
const MODEL = 'gpt-4o'; // Using GPT-4o for release notes summarization

/**
 * Patterns that indicate a change was superseded
 */
const SUPERSEDE_PATTERNS = [
  // Add then remove/revert
  { add: /^(add|implement|create|introduce)\s+/i, remove: /^(remove|delete|revert|drop)\s+/i },
  // Enable then disable
  { add: /^enable\s+/i, remove: /^disable\s+/i },
  // Show then hide
  { add: /^(show|display)\s+/i, remove: /^hide\s+/i },
];

/**
 * Extract the subject/topic from a commit message for comparison
 */
function extractSubject(message: string): string {
  // Remove conventional commit prefix
  const withoutPrefix = message.replace(/^(feat|fix|refactor|chore|docs|style|perf|test|ci|build)(\([^)]*\))?: ?/i, '');
  // Remove PR links
  const withoutLinks = withoutPrefix.replace(/ in \[#\d+\]\([^)]+\)$/, '');
  // Normalize whitespace and case
  return withoutLinks.toLowerCase().trim();
}

/**
 * Check if two messages describe the same subject with opposite actions
 */
function areSupersedingMessages(msg1: string, msg2: string): boolean {
  const subj1 = extractSubject(msg1);
  const subj2 = extractSubject(msg2);

  for (const pattern of SUPERSEDE_PATTERNS) {
    // Check if msg1 adds and msg2 removes (or vice versa)
    const match1Add = subj1.match(pattern.add);
    const match2Remove = subj2.match(pattern.remove);
    const match1Remove = subj1.match(pattern.remove);
    const match2Add = subj2.match(pattern.add);

    if (match1Add && match2Remove) {
      // Compare subjects after removing the action verb
      const topic1 = subj1.replace(pattern.add, '').trim();
      const topic2 = subj2.replace(pattern.remove, '').trim();
      if (topic1 === topic2 || topic1.includes(topic2) || topic2.includes(topic1)) {
        return true;
      }
    }
    if (match1Remove && match2Add) {
      const topic1 = subj1.replace(pattern.remove, '').trim();
      const topic2 = subj2.replace(pattern.add, '').trim();
      if (topic1 === topic2 || topic1.includes(topic2) || topic2.includes(topic1)) {
        return true;
      }
    }
  }

  // Check for explicit "revert" of the same thing
  if (subj1.startsWith('revert') && subj2.includes(subj1.replace(/^revert\s*"?/i, '').replace(/"?\s*$/, ''))) {
    return true;
  }
  if (subj2.startsWith('revert') && subj1.includes(subj2.replace(/^revert\s*"?/i, '').replace(/"?\s*$/, ''))) {
    return true;
  }

  return false;
}

/**
 * Scrub superseded changes from release notes
 * Returns the cleaned notes with contradictory changes removed
 */
export function scrubSupersededChanges(technicalNotes: string): string {
  const lines = technicalNotes.split('\n');
  const bulletPoints: { index: number; content: string }[] = [];

  // Extract all bullet points
  lines.forEach((line, index) => {
    if (line.startsWith('* ')) {
      bulletPoints.push({ index, content: line.slice(2) });
    }
  });

  // Find pairs of superseding changes
  const indicesToRemove = new Set<number>();

  for (let i = 0; i < bulletPoints.length; i++) {
    for (let j = i + 1; j < bulletPoints.length; j++) {
      if (areSupersedingMessages(bulletPoints[i].content, bulletPoints[j].content)) {
        // Both changes cancel each other out - remove both
        indicesToRemove.add(bulletPoints[i].index);
        indicesToRemove.add(bulletPoints[j].index);
      }
    }
  }

  if (indicesToRemove.size === 0) {
    return technicalNotes;
  }

  // Rebuild notes without superseded items
  const cleanedLines = lines.filter((_, index) => !indicesToRemove.has(index));

  // Remove empty sections (header followed by another header or end)
  const result: string[] = [];
  for (let i = 0; i < cleanedLines.length; i++) {
    const line = cleanedLines[i];
    const nextLine = cleanedLines[i + 1];

    // Skip section headers that are now empty
    if (line.startsWith('### ') && (!nextLine || nextLine.startsWith('###') || nextLine.startsWith('---') || nextLine === '')) {
      continue;
    }
    result.push(line);
  }

  return result.join('\n');
}

/**
 * Scrub superseded items from structured change summary
 * Items that appear in both NEW and DELETED cancel out
 */
export function scrubSupersededStructuredChanges(changeSummary: string): string {
  const lines = changeSummary.split('\n');

  // Extract items from NEW and DELETED sections
  let inNew = false;
  let inDeleted = false;
  const newItems = new Set<string>();
  const deletedItems = new Set<string>();

  for (const line of lines) {
    if (line.includes('### NEW')) {
      inNew = true;
      inDeleted = false;
    } else if (line.includes('### REMOVED') || line.includes('### DELETED')) {
      inNew = false;
      inDeleted = true;
    } else if (line.startsWith('### ')) {
      inNew = false;
      inDeleted = false;
    }

    if (inNew && (line.startsWith('Components:') || line.startsWith('Hooks:') || line.startsWith('API') || line.startsWith('Utilities:'))) {
      const items = line.split(':')[1]?.split(',').map((s) => s.trim()) || [];
      items.forEach((item) => newItems.add(item));
    }
    if (inDeleted) {
      const items = line.split(',').map((s) => s.trim()).filter((s) => s && !s.startsWith('#'));
      items.forEach((item) => deletedItems.add(item));
    }
  }

  // Find items that cancel out
  const cancelledItems = new Set<string>();
  for (const item of newItems) {
    if (deletedItems.has(item)) {
      cancelledItems.add(item);
    }
  }

  if (cancelledItems.size === 0) {
    return changeSummary;
  }

  // Remove cancelled items from the summary
  let result = changeSummary;
  for (const item of cancelledItems) {
    // Remove from comma-separated lists
    result = result.replace(new RegExp(`${item},\\s*`, 'g'), '');
    result = result.replace(new RegExp(`,\\s*${item}`, 'g'), '');
    result = result.replace(new RegExp(`^${item}$`, 'gm'), '');
  }

  return result;
}

/**
 * Build the prompt for generating user-friendly release notes
 */
function buildPrompt(
  technicalNotes: string,
  version: string,
  isPrerelease: boolean,
  context?: string,
  diffContent?: string
): string {
  const releaseType = isPrerelease ? 'beta pre-release' : 'stable release';
  const contextSection = context ? `\n## Additional Context\n${context}\n` : '';

  // Include structured change summary if provided
  const changeSection = diffContent
    ? `\n## Code Change Analysis
This shows WHAT files were added, modified, renamed, or deleted. Use this to understand the scope and nature of changes:

${diffContent}
`
    : '';

  // Different tone for beta vs stable releases
  const toneGuidelines = isPrerelease
    ? `**Voice & Tone:**
- Technical and straightforward, like a changelog summary
- Matter-of-fact language without marketing fluff
- No exclamation points or celebratory language
- Focus on what changed, not how exciting it is
- Neutral, informative tone suitable for beta testers`
    : `**Voice & Tone:**
- Match your enthusiasm to the significance of the changes
- For bug fixes and minor updates: straightforward and brief ("Fixes an issue with...", "Resolves...")
- For notable features: warm but not over-the-top ("You can now...", "Adds support for...")
- For major releases only: celebratory language is appropriate
- Avoid marketing superlatives ("amazing", "exciting", "incredible") - just describe what changed
- Plain language a non-technical user would understand`;

  const formatGuidelines = isPrerelease
    ? `**Format:**
- Write 2-4 sentences as a brief summary
- Start directly with what changed (no greetings or fanfare)
- Keep it factual and concise
- If ALL changes are truly internal/technical with no user impact, respond with exactly: "Internal improvements and maintenance updates."`
    : `**Format:**
- Write 1-4 sentences - shorter is better for minor updates
- Get straight to the point - no fanfare for small fixes
- For bug fixes: a single sentence is often enough
- If ALL changes are truly internal/technical with no user impact, respond with exactly: "Internal improvements and maintenance."`;

  const examples = isPrerelease
    ? `**Good Examples:**
- "This beta adds a new Stash feature for saving toward goals. The burndown chart now shows progress over time."
- "You can now edit stash items inline. Several display issues with tooltips have been addressed."

**Bad Examples:**
- "Get ready for awesome improvements!" (too marketing-focused for beta)
- "Bug fixes and improvements" (too vague)
- "Fixed NSIS installer BUILD_UNINSTALLER check" (too low-level technical)
- "Refactored useEditStashHandlers hook" (too technical - describe the USER benefit)`
    : `**Good Examples (bug fix release):**
- "Fixes an issue where the app could become slow after auto-updating."
- "Resolves a display problem with the savings progress bar."

**Good Examples (feature release):**
- "You can now track savings goals with the new Stash feature. Also includes improved chart visualizations."
- "Adds burndown charts to show your savings progress over time. Several tooltip display issues have been fixed."

**Bad Examples:**
- "Bug fixes and improvements" (too vague - say WHAT was fixed)
- "Say hello to amazing new features!" (over-the-top for minor updates)
- "We're excited to announce..." (unnecessary preamble)
- "Fixed NSIS installer BUILD_UNINSTALLER check" (too technical for users)
- "Refactored API core layer" (too technical - users don't care about code structure)`;

  return `You are writing release notes for Eclosion, a desktop and web app that extends Monarch Money (a personal finance app).

**IMPORTANT: Only describe what changed in THIS release. Do not mention existing app features that aren't new.**

## Your Task
Transform the changes below into a ${isPrerelease ? 'concise technical summary' : 'friendly, conversational paragraph summary'} (2-4 sentences).

**CRITICAL: Use the Code Change Analysis to understand what REALLY changed!**
The structured summary shows new components, hooks, and APIs - use these to identify user-facing features.

## Commit Messages (For Reference Only)
${technicalNotes}
${changeSection}

## Version Info
- Version: ${version}
- Release type: ${releaseType}
${contextSection}

## Priority Order (FOLLOW THIS STRICTLY)
Your summary MUST prioritize in this order:

1. **NEW UX FEATURES (Core Features)** - Brand new capabilities users can now do
   - Look at the NEW section: new components, hooks, and API modules indicate new features
   - Example: "You can now track savings goals with the new Stash feature"

2. **RENAMED FEATURES** - If you see renames like "Wishlist → Stash", mention the rebrand
   - Example: "Wishlists have been renamed to Stashes"

3. **UI/UX IMPROVEMENTS** - Enhancements to existing features
   - Look at the MODIFIED section for improved components
   - Example: "The progress bar now animates smoothly"

4. **BUG FIXES** - Keep these BRIEF and in plain layman's terms
   - DON'T list every fix in detail - that's what Technical Details are for
   - DO summarize: "Several display issues have been addressed"
   - DON'T say: "Fixed the tooltip z-index calculation in AnimatedEmoji component"

## Writing Guidelines

${toneGuidelines}

**What to Include (based on the Code Change Analysis):**
- New features (look at NEW components, hooks, and API modules)
- Renamed features indicate major refactoring (e.g., Wishlist → Stash means the feature was renamed)
- Modified components suggest improvements or fixes
- A brief mention that bugs were fixed (without technical details)

**What to Exclude:**
- CI/CD pipeline changes, internal refactoring, dependency updates
- Build system changes (PyInstaller, signing, installers, universal binaries, architecture changes)
- Distribution details (how the app is packaged, notarized, or delivered)
- Code organization changes (moving files, renaming internal variables)
- Developer tooling, test changes
- Don't list every single bug fix - summarize them briefly

${formatGuidelines}

${examples}

Generate ONLY the paragraph. No headers, no bullets, no sign-off.`;
}

/**
 * Call Azure OpenAI API to generate the summary
 */
async function callAzureOpenAI(prompt: string): Promise<string> {
  // MODELS_TOKEN is preferred, fall back to GH_TOKEN for backwards compatibility
  const token = process.env.MODELS_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    throw new Error('MODELS_TOKEN environment variable is required');
  }

  const response = await fetch(GITHUB_MODELS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.5, // Lower temperature for more consistent output
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub Models API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content in API response');
  }

  return content.trim();
}

/**
 * Generate a user-friendly summary from technical release notes
 */
export async function generateSummary(
  technicalNotes: string,
  version: string,
  isPrerelease: boolean,
  context?: string,
  diffContent?: string
): Promise<string> {
  console.log(`Generating user-friendly summary for ${version}...`);

  // Scrub superseded changes from both notes and diff content
  console.log('Scrubbing superseded changes...');
  const scrubbedNotes = scrubSupersededChanges(technicalNotes);
  const scrubbedDiff = diffContent ? scrubSupersededStructuredChanges(diffContent) : undefined;

  const notesRemoved = technicalNotes.length - scrubbedNotes.length;
  if (notesRemoved > 0) {
    console.log(`Removed ${notesRemoved} chars of superseded content from notes`);
  }

  if (scrubbedDiff) {
    console.log(`Including ${scrubbedDiff.length} chars of diff content for analysis`);
  }

  const prompt = buildPrompt(scrubbedNotes, version, isPrerelease, context, scrubbedDiff);
  const summary = await callAzureOpenAI(prompt);

  return summary;
}

/**
 * Combine the AI summary with the original technical notes
 */
export function buildUpdatedReleaseBody(summary: string, originalBody: string): string {
  return `${summary}

---

## Technical Details

${originalBody}`;
}
