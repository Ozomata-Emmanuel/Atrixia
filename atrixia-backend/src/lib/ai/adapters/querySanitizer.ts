/**
 * querySanitizer.ts
 *
 * Two responsibilities:
 * 1. sanitizeQuery()   — strips conversational noise before sending to marketplace adapters
 * 2. validateQuery()   — pre-flight check for queries that shouldn't be processed
 */

// ── Sanitize ──────────────────────────────────────────────────────────────────

// Leading conversational phrases to strip
const STOP_PHRASES = [
  'i am planning to buy',
  'am planning to buy',
  'am planning buy',
  'i want to buy',
  'i need to buy',
  'i want to get',
  'i need to get',
  'i am looking for',
  "i'm looking for",
  'looking to buy',
  'looking for',
  'planning to buy',
  'help me find',
  'find me a',
  'find me',
  'show me a',
  'show me',
  'give me a',
  'give me',
  'can you find',
  'search for',
  'please find',
  'i would like to buy',
  'i would like',
  'i want',
  'i need',
];

// Trailing noise words that add no value to a marketplace search
const TRAILING_NOISE = [
  'where can i buy',
  'where can i get',
  'where to buy',
  'where to get',
  'where',
  'please',
  'online',
  'near me',
];

export function sanitizeQuery(raw: string): string {
  let q = raw.trim().toLowerCase();

  // Strip leading stop phrases (longest match first)
  const sortedPhrases = [...STOP_PHRASES].sort((a, b) => b.length - a.length);
  for (const phrase of sortedPhrases) {
    if (q.startsWith(phrase)) {
      q = q.slice(phrase.length).trim();
      break;
    }
  }

  // Regex-based fallback for common typo patterns the exact phrases miss.
  // Catches: "awant to buy X", "i wnat to get X", "gonna buy X"
  q = q
    .replace(/^[ai]?\s*[aw]{1,2}an[t]?\s+(?:to\s+)?(?:buy|get|purchase|order)\s+/i, '')
    .replace(/^[ai]\s+(?:need|want|wanna|gonna\s+buy|plan\s+to\s+buy)\s+/i, '')
    .replace(/^(?:pls?|please)\s+(?:find|show|give)\s+me\s+/i, '')
    .replace(/^(?:awant|wnat|wannt)\s+(?:to\s+)?(?:buy|get)?\s*/i, '')
    .trim();

  // Strip trailing noise (e.g. "condom where" → "condom")
  const sortedTrailing = [...TRAILING_NOISE].sort((a, b) => b.length - a.length);
  for (const noise of sortedTrailing) {
    if (q.endsWith(noise)) {
      q = q.slice(0, q.length - noise.length).trim();
      break;
    }
  }

  // Strip leftover filler at the end: "...for me", "...for sale"
  q = q.replace(/\s+(?:for\s+me|for\s+sale|on\s+sale|in\s+nigeria|in\s+lagos)$/i, '').trim();

  // Remove special characters except spaces, hyphens, and common punctuation
  q = q.replace(/[^\w\s\-.,&]/g, ' ').replace(/\s{2,}/g, ' ').trim();

  // Never return empty — fall back to raw
  return q.length >= 2 ? q : raw.trim();
}

// ── Validate ──────────────────────────────────────────────────────────────────

// Queries that have nothing to do with shopping
const NON_SHOPPING_PATTERNS = [
  /\b(weather|forecast|temperature|climate)\b/i,
  /\b(news|headline|latest\s+news|breaking)\b/i,
  /\b(recipe|how\s+to\s+cook|ingredients|bake)\b/i,
  /\b(translate|translation)\b/i,
  /\b(capital\s+of|president\s+of|who\s+is|what\s+is\s+the)\b/i,
  /\b(calculate|solve\s+equation|\d+\s*[+\-*/]\s*\d+)\b/i,
  /\b(joke|tell\s+me\s+a|write\s+me\s+a|poem)\b/i,
  /^(hello|hi\s+there|how\s+are\s+you|good\s+morning|greetings)[\s!?.]*$/i,
];

// NSFW / adult content
const NSFW_PATTERNS = [
  /\bsex\s*toy|dildo|vibrator|butt\s*plug|fleshlight|masturbat|pornograph|onlyfans\b/i,
  /\b(nude|naked|porn|xxx|adult\s+content|erotic)\b/i,
  /\b(escort|prostitut|call\s*girl|brothel)\b/i,
];

// Dangerous / illegal items
const ILLEGAL_PATTERNS = [
  /\b(firearm|pistol|rifle|ammo|ammunition|silencer|suppressor)\b/i,
  /\b(cocaine|heroin|fentanyl|meth)\b/i,
  /\b(explosive|bomb|grenade|knife\s+for\s+killing)\b/i,
  /\b(malware|phishing|counterfeit|fake\s+id|forged)\b/i,
];

function isGibberish(q: string): boolean {
  const trimmed = q.trim();
  if (trimmed.length < 2) return true;
  if (/^[\d\s]+$/.test(trimmed)) return true;
  const words = trimmed.split(/\s+/);
  if (words.length === 1 && words[0].length < 2) return true;
  return false;
}

export interface QueryValidation {
  valid: boolean;
  reason?: string;
  message?: string;
}

export function validateQuery(query: string): QueryValidation {
  // Run validation on the raw query, not the sanitized version
  const q = query.trim();

  if (isGibberish(q)) {
    return {
      valid: false,
      reason: 'too_short',
      message: "That's too short to search. Try something like \"wireless headphones\" or \"HP laptop under $300\".",
    };
  }

  for (const pattern of NSFW_PATTERNS) {
    if (pattern.test(q)) {
      return {
        valid: false,
        reason: 'nsfw',
        message: "Atrixia is a shopping assistant for everyday products. We can't help with that search.",
      };
    }
  }

  for (const pattern of ILLEGAL_PATTERNS) {
    if (pattern.test(q)) {
      return {
        valid: false,
        reason: 'illegal',
        message: "We can't help with that. Try searching for a regular product instead.",
      };
    }
  }

  for (const pattern of NON_SHOPPING_PATTERNS) {
    if (pattern.test(q)) {
      return {
        valid: false,
        reason: 'non_shopping',
        message: "I'm a shopping assistant — I search marketplaces for products. Try asking for something you'd like to buy.",
      };
    }
  }

  return { valid: true };
}
