/**
 * intentExtractor.ts
 *
 * Fast intent extraction combining compromise.js NLP + regex lookup tables.
 * Zero AI calls — runs in < 5ms per query.
 */
import nlp from 'compromise';
import { sanitizeQuery } from '../adapters/querySanitizer';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ShoppingIntent {
  productType: string;
  brand: string | null;
  model: string | null;
  searchTerms: string[];   // clean tokens sent to marketplace adapters
  excludeTerms: string[];  // accessory/noise keywords to filter from results
  budgetMax: number | null;
  priceFloor: number;
  queryWarning: string | null;
  summary: string;
}

// ── Category definitions ─────────────────────────────────────────────────────

interface CategoryDef { pattern: RegExp; type: string; exclude: string[]; priceFloor: number; }

const CATEGORIES: CategoryDef[] = [
  {
    pattern: /\blaptop|notebook|macbook|chromebook|thinkpad|elitebook|probook|ultrabook\b/i,
    type: 'laptop',
    exclude: ['charger','adapter','cable','bag','case','battery','sleeve','stand',
              'cooling pad','skin','cover','screen protector','power supply','ac adapter'],
    priceFloor: 40,
  },
  {
    pattern: /\bphone|iphone|smartphone|android|pixel|galaxy|redmi|poco|oneplus|infinix|tecno\b/i,
    type: 'smartphone',
    exclude: ['charger','cable','case','cover','screen protector','holder','controller',
              'trigger','gamepad','joystick','ring light','pop socket','grip','stand',
              'dock','earphone','power bank','battery','adapter','selfie stick',
              'tempered glass','gimbal','stabilizer','mount','tripod','lens'],
    priceFloor: 25,
  },
  {
    pattern: /\btablet|ipad\b/i,
    type: 'tablet',
    exclude: ['charger','cable','case','cover','keyboard','stylus','stand',
              'screen protector','battery','adapter'],
    priceFloor: 40,
  },
  {
    pattern: /\bheadphone|earphone|earbud|airpod|headset\b/i,
    type: 'headphones',
    exclude: ['case','cable','adapter','stand','holder','cushion','replacement'],
    priceFloor: 5,
  },
  {
    pattern: /\b(wireless\s+)?mouse\b/i,
    type: 'mouse',
    exclude: ['pad','mat','cable','receiver','dongle','bungee'],
    priceFloor: 3,
  },
  {
    pattern: /\bkeyboard\b/i,
    type: 'keyboard',
    exclude: ['cable','cover','skin','stand','wrist rest','keycap'],
    priceFloor: 5,
  },
  {
    pattern: /\bmonitor|display\b/i,
    type: 'monitor',
    exclude: ['cable','stand','arm','mount','screen protector','cover'],
    priceFloor: 30,
  },
  {
    pattern: /\bchair|seat\b/i,
    type: 'chair',
    exclude: ['cover','cushion','mat','caster','replacement part'],
    priceFloor: 10,
  },
  {
    pattern: /\bshoe|sneaker|boot|sandal|trainer|loafer\b/i,
    type: 'shoe',
    exclude: ['lace','insole','bag','box','cleaning','polish','rack'],
    priceFloor: 5,
  },
  {
    pattern: /\bcpu\b|processor\b/i,
    type: 'cpu',
    exclude: ['cooler','fan','paste','thermal','bracket','socket','tray'],
    priceFloor: 10,
  },
  {
    pattern: /\btv\b|television\b/i,
    type: 'tv',
    exclude: ['remote','cable','mount','stand','screen protector','bracket'],
    priceFloor: 30,
  },
];

// ── Brand detection ──────────────────────────────────────────────────────────

const BRANDS: { pattern: RegExp; brand: string; searchName: string }[] = [
  // Specific model/sub-brand patterns first (before generic brand patterns)
  { pattern: /\biphone\b/i,   brand: 'Apple',    searchName: 'iphone'        },
  { pattern: /\bmacbook\b/i,  brand: 'Apple',    searchName: 'macbook'       },
  { pattern: /\bgalaxy\b/i,   brand: 'Samsung',  searchName: 'samsung galaxy'},
  { pattern: /\bredmi\b/i,    brand: 'Xiaomi',   searchName: 'redmi'         },
  { pattern: /\bpoco\b/i,     brand: 'Xiaomi',   searchName: 'poco'          },
  { pattern: /\bpixel\b/i,    brand: 'Google',   searchName: 'google pixel'  },
  // Generic brand names
  { pattern: /\bapple\b/i,    brand: 'Apple',    searchName: 'apple'         },
  { pattern: /\bsamsung\b/i,  brand: 'Samsung',  searchName: 'samsung'       },
  { pattern: /\bhp\b/i,       brand: 'HP',       searchName: 'hp'            },
  { pattern: /\bdell\b/i,     brand: 'Dell',     searchName: 'dell'          },
  { pattern: /\blenovo\b/i,   brand: 'Lenovo',   searchName: 'lenovo'        },
  { pattern: /\basus\b/i,     brand: 'Asus',     searchName: 'asus'          },
  { pattern: /\bacer\b/i,     brand: 'Acer',     searchName: 'acer'          },
  { pattern: /\bsony\b/i,     brand: 'Sony',     searchName: 'sony'          },
  { pattern: /\blg\b/i,       brand: 'LG',       searchName: 'lg'            },
  { pattern: /\bxiaomi\b/i,   brand: 'Xiaomi',   searchName: 'xiaomi'        },
  { pattern: /\bbose\b/i,     brand: 'Bose',     searchName: 'bose'          },
  { pattern: /\bjbl\b/i,      brand: 'JBL',      searchName: 'jbl'           },
  { pattern: /\bnike\b/i,     brand: 'Nike',     searchName: 'nike'          },
  { pattern: /\badidas\b/i,   brand: 'Adidas',   searchName: 'adidas'        },
  { pattern: /\bhuawei\b/i,   brand: 'Huawei',   searchName: 'huawei'        },
  { pattern: /\boppo\b/i,     brand: 'Oppo',     searchName: 'oppo'          },
  { pattern: /\bgoogle\b/i,   brand: 'Google',   searchName: 'google'        },
  { pattern: /\binfinix\b/i,  brand: 'Infinix',  searchName: 'infinix'       },
  { pattern: /\btecno\b/i,    brand: 'Tecno',    searchName: 'tecno'         },
  { pattern: /\boneplus\b/i,  brand: 'OnePlus',  searchName: 'oneplus'       },
];

// ── Product corrections (future/non-existent products) ───────────────────────

const CORRECTIONS: { pattern: RegExp; correction: string; warning: string }[] = [
  {
    pattern: /iphone\s*1[7-9]\s*(pro\s*max)?/i,
    correction: 'iphone 16 pro max',
    warning: 'iPhone 17+ does not exist yet — searching for iPhone 16 Pro Max instead',
  },
  {
    pattern: /iphone\s*1[7-9]/i,
    correction: 'iphone 16',
    warning: 'iPhone 17+ does not exist yet — searching for iPhone 16 instead',
  },
  {
    pattern: /galaxy\s*s2[6-9]/i,
    correction: 'samsung galaxy s25',
    warning: 'Galaxy S26+ does not exist yet — searching for Galaxy S25 instead',
  },
];

// ── Filler words to strip from search tokens ─────────────────────────────────

const FILLER = new Set([
  'i','me','my','a','an','the','is','are','be','been','have','has','do','will','would',
  'could','should','can','need','want','find','get','show','give','tell','for','to','of',
  'in','on','at','by','with','from','about','please','something','anything','recommend',
  'suggest','best','good','great','nice','cheap','affordable','quality','popular','top','rated',
  'while','some','just','really','very','so','also','too','any','all','both','either',
]);

// ── Descriptive query category clues ─────────────────────────────────────────

const CLUES: [RegExp, string, string[], number][] = [
  [/\b(sit|seat|ergonomic|back\s*pain|lumbar)\b/i,            'chair',      ['cover','cushion','mat'],    10],
  [/\b(listen|audio|music|sound|noise|ear)\b/i,               'headphones', ['case','cable','stand'],      5],
  [/\b(type|typing|mechanical|keys|switch)\b/i,               'keyboard',   ['cable','cover','skin'],      5],
  [/\b(code|coding|program|develop|productivity|editing)\b/i, 'laptop',     ['charger','bag','cable'],    40],
  [/\b(game|gaming|play|stream|twitch)\b/i,                   'laptop',     ['charger','bag','cable'],    40],
  [/\b(shoot|photo|camera|vlog|content)\b/i,                  'phone',      ['charger','case','cable'],   25],
  [/\b(call|text|mobile|scroll|browse)\b/i,                   'phone',      ['charger','case','cable'],   25],
  [/\b(run|gym|sport|exercise|training|jog)\b/i,              'shoe',       ['lace','insole','cleaning'],  5],
  [/\b(point|click|cursor)\b/i,                               'mouse',      ['pad','mat','cable'],         3],
  [/\b(watch|netflix|series|tv\s*show)\b/i,                   'tv',         ['remote','cable','mount'],   30],
];

// ── NLP keyword extraction ───────────────────────────────────────────────────

function nlpKeywords(text: string): string[] {
  const doc = nlp(text);
  const nouns = (doc.nouns().out('array') as string[])
    .map((n: string) => n.toLowerCase().trim())
    .filter((n: string) => !n.includes(' '));
  const skip = new Set(['good','great','best','nice','cheap','affordable','expensive',
    'fast','slow','big','small','new','old','latest','popular','reliable','powerful',
    'comfortable','lightweight','heavy']);
  const adjs = (doc.adjectives().out('array') as string[])
    .filter((a: string) => !skip.has(a.toLowerCase()))
    .map((a: string) => a.toLowerCase().trim())
    .filter((a: string) => !a.includes(' '));
  return [...new Set([...nouns, ...adjs].filter((w: string) => w.length >= 3))].slice(0, 6);
}

// ── Main export ──────────────────────────────────────────────────────────────

export function extractIntent(query: string): ShoppingIntent {
  // Sanitize first to strip conversational noise and typos
  let q = sanitizeQuery(query).trim();
  let queryWarning: string | null = null;

  // 1. Correct non-existent / future products
  for (const c of CORRECTIONS) {
    if (c.pattern.test(q)) {
      queryWarning = c.warning;
      q = q.replace(c.pattern, c.correction);
      break;
    }
  }

  // 2. Extract budget — supports $, ₦, £, €
  let budgetMax: number | null = null;
  const bm = q.match(/(?:under|below|less\s+than|up\s+to|within|around)\s+[₦$£€]?\s*([\d,]+(?:\.\d+)?)(k?)\b/i)
          || q.match(/[₦$£€]\s*([\d,]+(?:\.\d+)?)(k?)\b/i);
  if (bm) {
    let val = parseFloat(bm[1].replace(/,/g, ''));
    if (bm[2]?.toLowerCase() === 'k') val *= 1000;
    budgetMax = val;
  }

  // 3. Detect product category
  let productType = 'general';
  let excludeTerms: string[] = [];
  let priceFloor = 0;
  for (const cat of CATEGORIES) {
    if (cat.pattern.test(q)) {
      productType = cat.type;
      excludeTerms = cat.exclude;
      priceFloor = cat.priceFloor;
      break;
    }
  }

  // 4. Detect brand — record both display name and search name
  let brand: string | null = null;
  let brandSearchName: string | null = null;
  for (const b of BRANDS) {
    if (b.pattern.test(q)) {
      brand = b.brand;
      brandSearchName = b.searchName;
      break;
    }
  }

  // 5. Strip budget/filler noise before tokenising
  const stripped = q
    .replace(/(?:under|below|less\s+than|up\s+to|within|around)\s+[₦$£€]?[\d,]+(?:\.\d+)?k?\b/gi, '')
    .replace(/[₦$£€][\d,]+(?:\.\d+)?k?\b/gi, '')
    .replace(/\b\d+(?:\.\d+)?\s*dollars?\b/gi, '')
    .replace(/\b(show|me|find|i\s+want|i\s+need|please|can\s+you|give)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // 6. Regex tokenise
  const regexTokens = stripped
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !FILLER.has(t));

  // 7. NLP enhancement for descriptive or long queries
  const isDescriptive = productType === 'general' || stripped.split(' ').length > 5;
  let searchTerms = regexTokens.slice(0, 5);

  if (isDescriptive) {
    const nlpTerms = nlpKeywords(stripped);
    if (productType === 'general') {
      for (const [pattern, type, exclude, floor] of CLUES) {
        if (pattern.test(q) || nlpTerms.some(k => pattern.test(k))) {
          productType = type;
          excludeTerms = exclude;
          priceFloor = floor;
          break;
        }
      }
    }
    const merged = [...new Set([...regexTokens, ...nlpTerms])].slice(0, 5);
    if (merged.length > 0) searchTerms = merged;
  }

  if (searchTerms.length === 0) {
    searchTerms = [stripped.toLowerCase().slice(0, 40)];
  }

  // 8. Build a focused adapter query:
  //    - Brand detected: use brand's searchName + productType  → "redmi smartphone"
  //    - ProductType only: use productType + extra tokens      → "smartphone under 200"
  //    - Neither: fall back to cleaned tokens
  //
  // This ensures marketplace adapters always get a tight, relevant search string
  // instead of raw NLP tokens that may include noise.
  let adapterQuery: string;
  if (brandSearchName && productType !== 'general') {
    adapterQuery = `${brandSearchName} ${productType}`;
  } else if (brandSearchName) {
    const extraTerms = regexTokens.filter(t => !brandSearchName!.includes(t)).slice(0, 2);
    adapterQuery = extraTerms.length ? `${brandSearchName} ${extraTerms.join(' ')}` : brandSearchName;
  } else if (productType !== 'general') {
    const extraTerms = regexTokens.filter(t => t !== productType).slice(0, 2);
    adapterQuery = extraTerms.length ? `${productType} ${extraTerms.join(' ')}` : productType;
  } else {
    adapterQuery = searchTerms.slice(0, 3).join(' ');
  }

  searchTerms = adapterQuery.split(' ').filter(t => t.length > 1);

  return {
    productType,
    brand,
    model: null,
    searchTerms,
    excludeTerms,
    budgetMax,
    priceFloor,
    queryWarning,
    summary: `Searching for ${adapterQuery}${budgetMax ? ' under ' + budgetMax : ''}`,
  };
}
