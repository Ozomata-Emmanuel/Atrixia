/**
 * querySanitizer.ts
 *
 * Two responsibilities:
 * 1. sanitizeQuery()   — strips noise before sending to marketplace adapters
 * 2. validateQuery()   — pre-flight check for queries that shouldn't be processed
 *                        Returns null if OK, or an error message string if rejected
 */

// ── Sanitize ──────────────────────────────────────────────────────────────────

const STOP_PHRASES = [
  'i want to buy', 'i want', 'i need', 'i am looking for', "i'm looking for",
  'am planning to buy', 'am planning buy', 'planning to buy', 'help me find',
  'find me', 'show me', 'give me', 'can you find', 'looking for', 'search for',
  'please find', 'i would like', 'suggest', 'recommend',
];

export function sanitizeQuery(raw: string): string {
  let q = raw.trim().toLowerCase();

  // Strip leading stop phrases
  for (const phrase of STOP_PHRASES) {
    if (q.startsWith(phrase)) {
      q = q.slice(phrase.length).trim();
      break; // only strip one leading phrase
    }
  }

  // Remove special characters except spaces, hyphens, and common punctuation
  q = q.replace(/[^\w\s\-.,&]/g, ' ').replace(/\s{2,}/g, ' ').trim();

  return q || raw.trim(); // never return empty
}

// ── Validate ──────────────────────────────────────────────────────────────────

// Categories that are not shoppable on these marketplaces
const NON_SHOPPING_PATTERNS = [
  /\b(weather|forecast|temperature|climate)\b/i,
  /\b(news|headline|latest news|breaking)\b/i,
  /\b(recipe|how to cook|ingredients|bake|cooking)\b/i,
  /\b(translate|translation|what does .* mean)\b/i,
  /\b(capital of|president of|who is|what is the)\b/i,
  /\b(math|calculate|solve|equation|\d+\s*[+\-*/]\s*\d+)\b/i,
  /\b(joke|tell me a|funny|poem|write me)\b/i,
  /\b(hello|hi there|how are you|good morning|greetings)\b/i,
];

// NSFW / adult content
const NSFW_PATTERNS = [
  /\bsex\s*toy|dildo|vibrator|butt\s*plug|fleshlight|masturbat|pornograph|onlyfans\b/i,
  /\b(nude|naked|porn|xxx|adult\s+content|erotic)\b/i,
  /\b(escort|prostitut|call\s*girl|brothel)\b/i,
];

// Dangerous / illegal items
const ILLEGAL_PATTERNS = [
  /\b(gun|firearm|pistol|rifle|ammo|ammunition|silencer|suppressor)\b/i,
  /\b(drug|cocaine|heroin|fentanyl|meth|cannabis|weed|marijuana)\b/i,
  /\b(explosive|bomb|grenade|weapon|knife\s*for\s*killing)\b/i,
  /\b(hack|malware|phishing|stolen|counterfeit|fake\s*id|forged)\b/i,
];

// Too short / gibberish
function isGibberish(q: string): boolean {
  const trimmed = q.trim();
  if (trimmed.length < 2) return true;
  // All digits or all special chars
  if (/^[\d\s]+$/.test(trimmed)) return true;
  // Random character strings (no vowels, very short words)
  const words = trimmed.split(/\s+/);
  if (words.length === 1 && words[0].length < 2) return true;
  return false;
}

export interface QueryValidation {
  valid: boolean;
  reason?: string;
  /** Friendly message to show the user */
  message?: string;
}

export function validateQuery(query: string): QueryValidation {
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
