/**
 * querySanitizer.ts
 *
 * Parses a free-form shopping query into structured intent + clean search keywords.
 */

// ── Filler words ──────────────────────────────────────────────────────────────
const FILLER_WORDS = new Set([
  'i', 'me', 'my', 'we', 'our', 'you', 'your',
  'a', 'an', 'the', 'this', 'that', 'these', 'those',
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'can',
  'need', 'want', 'looking', 'find', 'get', 'show', 'give', 'tell',
  'for', 'to', 'of', 'in', 'on', 'at', 'by', 'with', 'from',
  'about', 'into', 'through', 'during', 'before', 'after',
  'above', 'between', 'out', 'off', 'over',
  'again', 'further', 'then', 'once', 'here', 'there', 'when',
  'where', 'why', 'how', 'all', 'both', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
  'own', 'same', 'so', 'too', 'very', 'just', 'also',
  // Shopping-specific filler — NOTE: do NOT include product words like "wireless", "gaming"
  'please', 'something', 'anything', 'item', 'product', 'things',
  'recommend', 'suggest', 'help', 'search', 'buy', 'purchase',
  'show', 'give', 'tell', 'find',
  'best', 'good', 'great', 'nice', 'cheap', 'affordable', 'quality',
  'popular', 'recommended', 'top', 'rated',
  'please', 'can', 'you',
]);

// Price / budget phrases to strip
const STRIP_PHRASES = [
  /\bunder\s+\$?\d[\d,.]*k?\b/gi,
  /\bbelow\s+\$?\d[\d,.]*k?\b/gi,
  /\bless\s+than\s+\$?\d[\d,.]*k?\b/gi,
  /\bup\s+to\s+\$?\d[\d,.]*k?\b/gi,
  /\baround\s+\$?\d[\d,.]*k?\b/gi,
  /\bwithin\s+\$?\d[\d,.]*k?\b/gi,
  /\$\d[\d,.]*k?\b/gi,
  /\b\d[\d,.]*\s*dollars?\b/gi,
  /\bshow\s+me\b/gi,
  /\bfind\s+me\b/gi,
  /\bi\s+(need|want|am\s+looking\s+for|would\s+like)\b/gi,
];

// ── Parsed query intent ───────────────────────────────────────────────────────
export interface ParsedQuery {
  /** Clean keywords for marketplace search engines */
  searchKeywords: string;
  /** Detected product category (e.g. "laptop", "phone") */
  category: string;
  /** Budget ceiling in USD if mentioned */
  budgetMax: number | null;
  /** Keywords to exclude from results (accessories for this category) */
  excludeKeywords: string[];
  /** Original query */
  raw: string;
}

// Category keyword → accessory exclusion terms
const CATEGORY_MAP: { pattern: RegExp; category: string; exclude: string[] }[] = [
  {
    pattern: /\blaptop|notebook|macbook|chromebook|thinkpad|elitebook|probook|ultrabook\b/i,
    category: 'laptop',
    exclude: ['charger', 'adapter', 'cable', 'bag', 'case', 'sleeve', 'stand', 'cooling pad', 'skin', 'cover', 'screen protector', 'battery', 'power supply', 'ac adapter', 'dc adapter'],
  },
  {
    pattern: /\bphone|smartphone|iphone|android|pixel|galaxy\b/i,
    category: 'phone',
    exclude: [
      'charger', 'cable', 'case', 'cover', 'screen protector', 'holder', 'mount',
      'earphone', 'power bank', 'battery', 'adapter',
      // Phone accessories that look like phones
      'trigger', 'controller', 'gamepad', 'joystick', 'ring light',
      'pop socket', 'grip', 'stand', 'dock', 'cradle',
      'tempered glass', 'film', 'lens', 'selfie stick',
    ],
  },
  {
    pattern: /\btablet|ipad\b/i,
    category: 'tablet',
    exclude: ['charger', 'cable', 'case', 'cover', 'keyboard', 'stylus', 'stand', 'screen protector', 'battery', 'adapter'],
  },
  {
    pattern: /\b(gaming\s+)?headphone|headset|earphone|earbud|airpod\b/i,
    category: 'headphone',
    exclude: ['case', 'cable', 'adapter', 'stand', 'holder', 'cushion'],
  },
  {
    pattern: /\b(wireless\s+)?mouse\b/i,
    category: 'mouse',
    exclude: ['pad', 'mat', 'cable', 'receiver', 'dongle', 'case'],
  },
  {
    pattern: /\bkeyboard\b/i,
    category: 'keyboard',
    exclude: ['cable', 'cover', 'skin', 'stand', 'wrist rest'],
  },
  {
    pattern: /\bmonitor|display\b/i,
    category: 'monitor',
    exclude: ['cable', 'stand', 'arm', 'mount', 'screen protector'],
  },
  {
    pattern: /\bchair|seat\b/i,
    category: 'chair',
    exclude: ['cover', 'cushion', 'mat', 'caster', 'replacement'],
  },
  {
    pattern: /\b(running\s+)?shoe|sneaker|boot|sandal|trainer\b/i,
    category: 'shoe',
    exclude: ['lace', 'insole', 'bag', 'box', 'cleaning', 'polish'],
  },
  {
    pattern: /\b\bcpu\b|processor\b/i,
    category: 'cpu',
    exclude: ['cooler', 'fan', 'paste', 'thermal', 'bracket', 'socket'],
  },
  {
    pattern: /\btv\b|television\b/i,
    category: 'tv',
    exclude: ['remote', 'cable', 'mount', 'stand', 'screen protector', 'bracket'],
  },
];

/**
 * Parses a conversational query into structured intent.
 */
export function parseQuery(raw: string): ParsedQuery {
  let q = raw.trim();

  // Extract budget
  let budgetMax: number | null = null;
  const budgetMatch = q.match(/(?:under|below|less\s+than|up\s+to|within|around)\s+\$?([\d,]+(?:\.\d+)?)(k?)\b/i)
    || q.match(/\$\s*([\d,]+(?:\.\d+)?)(k?)\b/i);
  if (budgetMatch) {
    let val = parseFloat(budgetMatch[1].replace(/,/g, ''));
    if (budgetMatch[2]?.toLowerCase() === 'k') val *= 1000;
    budgetMax = val;
  }

  // Detect product category
  let category = 'general';
  let excludeKeywords: string[] = [];
  for (const entry of CATEGORY_MAP) {
    if (entry.pattern.test(q)) {
      category = entry.category;
      excludeKeywords = entry.exclude;
      break;
    }
  }

  // Strip price phrases
  for (const pattern of STRIP_PHRASES) {
    q = q.replace(pattern, ' ');
  }

  // Tokenise and remove filler — preserve brand names and product words
  const tokens = q
    .replace(/[^a-z0-9\s\-]/gi, ' ')
    .split(/\s+/)
    .map((t) => t.toLowerCase().trim())
    .filter(Boolean);

  const keywords = tokens.filter(
    (t) => t.length > 1 && !FILLER_WORDS.has(t)
  );

  const searchKeywords = keywords.length > 0
    ? keywords.slice(0, 6).join(' ')
    : raw.trim();

  return { searchKeywords, category, budgetMax, excludeKeywords, raw };
}

/**
 * Simple backward-compatible sanitizer — just returns the clean search string.
 */
export function sanitizeQuery(raw: string): string {
  return parseQuery(raw).searchKeywords;
}
