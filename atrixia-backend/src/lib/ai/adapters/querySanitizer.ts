/**
 * querySanitizer.ts
 *
 * Converts a free-form conversational shopping query into clean keywords
 * that marketplace search engines can understand.
 *
 * Examples:
 *   "comfortable ergonomic chair for home office under $300"  → "ergonomic chair"
 *   "show me the best gaming laptop under $1000"              → "gaming laptop"
 *   "i need a good wireless mouse"                            → "wireless mouse"
 *   "laptop"                                                  → "laptop"  (already clean)
 */

// Words that add no search value on any marketplace
const FILLER_WORDS = new Set([
  'i', 'me', 'my', 'we', 'our', 'you', 'your',
  'a', 'an', 'the', 'this', 'that', 'these', 'those',
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'can',
  'need', 'want', 'looking', 'find', 'get', 'show', 'give', 'tell',
  'for', 'to', 'of', 'in', 'on', 'at', 'by', 'with', 'from',
  'about', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'between', 'out', 'off', 'over', 'under',
  'again', 'further', 'then', 'once', 'here', 'there', 'when',
  'where', 'why', 'how', 'all', 'both', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
  'own', 'same', 'so', 'than', 'too', 'very', 'just', 'also',
  // Shopping-specific filler
  'best', 'good', 'great', 'nice', 'cheap', 'affordable', 'quality',
  'budget', 'premium', 'top', 'rated', 'popular', 'recommended',
  'please', 'something', 'anything', 'item', 'product', 'things',
  'home', 'office', 'work', 'use', 'used', 'using',
  'comfortable', 'efficient', 'powerful', 'fast', 'reliable',
  'high', 'low', 'new', 'old', 'latest', 'modern',
  'recommend', 'suggest', 'help', 'looking', 'search', 'buy', 'purchase',
]);

// Phrases to strip before tokenising
const STRIP_PHRASES = [
  /\bunder\s+\$?\d+(\.\d+)?\b/gi,
  /\bbelow\s+\$?\d+(\.\d+)?\b/gi,
  /\bless\s+than\s+\$?\d+(\.\d+)?\b/gi,
  /\bup\s+to\s+\$?\d+(\.\d+)?\b/gi,
  /\baround\s+\$?\d+(\.\d+)?\b/gi,
  /\bwithin\s+\$?\d+(\.\d+)?\b/gi,
  /\$\d+(\.\d+)?k?\b/gi,              // bare prices like $300 or $1.5k
  /\b\d+(\.\d+)?\s*dollars?\b/gi,
  /\bshow\s+me\b/gi,
  /\bfind\s+me\b/gi,
  /\bi\s+(need|want|am\s+looking\s+for|would\s+like)\b/gi,
  /\bcan\s+you\b/gi,
  /\bplease\b/gi,
];

/**
 * Sanitizes a conversational query into 2-4 clean search keywords.
 *
 * Strategy:
 * 1. Strip known price/filler phrases
 * 2. Tokenise into words
 * 3. Remove single-char tokens and known filler words
 * 4. Return the remaining words joined by space (max 5 words)
 *
 * Falls back to the original query if nothing meaningful is left.
 */
export function sanitizeQuery(raw: string): string {
  let q = raw.trim();

  // Step 1 — strip phrases
  for (const pattern of STRIP_PHRASES) {
    q = q.replace(pattern, ' ');
  }

  // Step 2 — tokenise
  const tokens = q
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')   // remove punctuation except hyphens
    .split(/\s+/)
    .filter(Boolean);

  // Step 3 — remove filler words and single-char tokens
  const keywords = tokens.filter(
    (t) => t.length > 1 && !FILLER_WORDS.has(t)
  );

  if (keywords.length === 0) {
    // Nothing left — return original query trimmed
    return raw.trim();
  }

  // Step 4 — cap at 5 words so search engines don't get confused
  return keywords.slice(0, 5).join(' ');
}
