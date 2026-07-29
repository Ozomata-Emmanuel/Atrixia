import { NormalizedProduct } from '../models/product';
import { RankingResult, RankedProduct } from '../ranking/engine';

export interface RecommendationReport {
  id: string;
  executiveSummary: string;
  bestOverall: RankedProduct | null;
  bestBudget: RankedProduct | null;
  bestPerformance: RankedProduct | null;
  bestValue: RankedProduct | null;
  pros: string[];
  cons: string[];
  tradeoffs: string;
  confidenceScore: number;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  confidenceExplanation: string;
  explanation: string;
  rankingCriteria: {
    priceWeight: number;
    qualityWeight: number;
    shippingWeight: number;
    sellerWeight: number;
  };
  rankedProducts: RankedProduct[];
  alternatives: RankedProduct[];
  warnings: string[];
  shoppingTips: string[];
  marketplacesSearched: string[];
  totalProductsFound: number;
}

// AI returns this shape for each product
export interface AIProductAnalysis {
  productId: string;
  description: string;
  pros: string[];
  cons: string[];
  reason?: string;
  specs?: Record<string, string>;
}

// ── Dynamic spec extraction ─────────────────────────────────────────────────

const CATEGORY_SPEC_KEYS: Record<string, string[]> = {
  laptop:     ['cpu', 'ram', 'storage', 'screen', 'battery', 'os', 'gpu'],
  phone:      ['cpu', 'ram', 'storage', 'screen', 'battery', 'camera', 'os'],
  cpu:        ['cores', 'threads', 'base_clock', 'boost_clock', 'tdp', 'socket', 'architecture'],
  shoe:       ['size', 'material', 'color', 'style', 'weight'],
  headphone:  ['driver_size', 'impedance', 'frequency_response', 'wireless', 'battery'],
  tablet:     ['cpu', 'ram', 'storage', 'screen', 'battery', 'os'],
  tv:         ['screen', 'resolution', 'refresh_rate', 'smart', 'hdmi_ports'],
  camera:     ['megapixels', 'sensor', 'lens', 'video', 'battery', 'weight'],
  keyboard:   ['switches', 'layout', 'wireless', 'backlight', 'connection'],
  mouse:      ['dpi', 'buttons', 'wireless', 'weight', 'sensor'],
  monitor:    ['screen', 'resolution', 'refresh_rate', 'panel', 'response_time'],
  chair:      ['material', 'weight_capacity', 'adjustable', 'armrests', 'color'],
  bag:        ['material', 'capacity', 'dimensions', 'color', 'waterproof'],
};

function detectCategory(title: string): string {
  const t = title.toLowerCase();
  if (/laptop|notebook|macbook|chromebook|thinkpad|elitebook|probook/.test(t)) return 'laptop';
  if (/phone|iphone|samsung|android|smartphone|pixel/.test(t)) return 'phone';
  if (/\bcpu\b|processor|ryzen|core i\d|celeron|pentium/.test(t)) return 'cpu';
  if (/shoe|sneaker|boot|sandal|loafer|trainer/.test(t)) return 'shoe';
  if (/headphone|earphone|earbud|airpod|headset/.test(t)) return 'headphone';
  if (/tablet|ipad/.test(t)) return 'tablet';
  if (/\btv\b|television/.test(t)) return 'tv';
  if (/camera|dslr|mirrorless/.test(t)) return 'camera';
  if (/keyboard/.test(t)) return 'keyboard';
  if (/\bmouse\b/.test(t)) return 'mouse';
  if (/monitor|display/.test(t)) return 'monitor';
  if (/chair|seat/.test(t)) return 'chair';
  if (/bag|backpack|purse/.test(t)) return 'bag';
  return 'general';
}

/**
 * Extracts relevant spec values from a product title using the detected category.
 * Only returns keys that have actual values parsed from the title.
 */
function extractSpecs(product: NormalizedProduct): Record<string, string> {
  const category = detectCategory(product.title);
  const specs: Record<string, string> = {};
  const t = product.title;

  if (category === 'laptop' || category === 'phone' || category === 'tablet' || category === 'cpu') {
    const ramMatch = t.match(/(\d+)\s*GB\s*RAM/i);
    if (ramMatch) specs.ram = `${ramMatch[1]}GB`;

    const storageMatch = t.match(/(\d+)\s*(GB|TB)\s*(SSD|HDD|EMMC|Flash|eMMC)/i);
    if (storageMatch) specs.storage = `${storageMatch[1]}${storageMatch[2].toUpperCase()} ${storageMatch[3].toUpperCase()}`;

    const cpuMatch = t.match(/(Intel\s+\w+\s+\w+|AMD\s+\w+\s*\w*|Apple\s+\w+\s*\w*|Celeron\s*\w*|Core\s+i[3579][\s\-]\w*)/i);
    if (cpuMatch) specs.cpu = cpuMatch[0].trim();

    const screenMatch = t.match(/(\d+\.?\d*)\s*["-]?\s*inch/i) ||
                        t.match(/(\d+\.?\d*)\s*"/i);
    if (screenMatch) specs.screen = `${screenMatch[1]}"`;

    const osMatch = t.match(/(Windows\s*\d+\s*(?:Pro|Home)?|Chrome\s*OS|macOS|Android\s*\d*)/i);
    if (osMatch) specs.os = osMatch[0].trim();

    if (t.toLowerCase().includes('touchscreen') || t.toLowerCase().includes('touch screen')) {
      specs.touchscreen = 'Yes';
    }
    if (t.toLowerCase().includes('backlit')) specs.keyboard = 'Backlit';
  }

  if (category === 'phone') {
    const cameraMatch = t.match(/(\d+)\s*MP/i);
    if (cameraMatch) specs.camera = `${cameraMatch[1]}MP`;
  }

  if (category === 'mouse') {
    const dpiMatch = t.match(/(\d{3,5})\s*DPI/i);
    if (dpiMatch) specs.dpi = `${dpiMatch[1]} DPI`;
    if (/wireless/i.test(t)) specs.wireless = 'Yes';
  }

  if (category === 'headphone') {
    if (/wireless/i.test(t)) specs.wireless = 'Yes';
    const driverMatch = t.match(/(\d+)\s*mm/i);
    if (driverMatch) specs.driver_size = `${driverMatch[1]}mm`;
  }

  // Always include price-related value
  if (product.condition && product.condition !== 'new') {
    specs.condition = product.condition;
  }

  return specs;
}

// ── Per-product deterministic insights ─────────────────────────────────────

function buildProductInsights(product: NormalizedProduct): {
  description: string;
  pros: string[];
  cons: string[];
  specs: Record<string, string>;
} {
  const pros: string[] = [];
  const cons: string[] = [];
  const specs = extractSpecs(product);

  // Description
  const parts: string[] = [`Available on ${product.marketplace.toUpperCase()} for $${product.price.toFixed(2)}`];
  if (product.condition && product.condition !== 'new') parts.push(`(${product.condition})`);
  if (product.seller && product.seller !== 'Jumia Seller' && product.seller !== 'Konga Seller' && product.seller !== 'Jiji Seller') {
    parts.push(`from ${product.seller}`);
  }
  if (product.shippingEstimate) parts.push(`· ${product.shippingEstimate}`);
  const description = parts.join(' ');

  // Pros
  if (product.shippingCost === 0) pros.push('Free shipping included');
  if (product.sellerRating !== null && product.sellerRating >= 85) {
    pros.push(`Strong seller rating (${product.sellerRating}%)`);
  }
  if (product.reviewCount && product.reviewCount > 50) {
    pros.push(`${product.reviewCount.toLocaleString()} verified buyer reviews`);
  }
  if (product.condition === 'new') pros.push('Brand new condition');
  if (product.availability) pros.push('In stock');

  // Cons
  if (product.shippingCost !== null && product.shippingCost > 15) {
    cons.push(`Additional shipping cost ($${product.shippingCost})`);
  }
  if (product.sellerRating !== null && product.sellerRating < 75) {
    cons.push(`Below-average seller rating (${product.sellerRating}%)`);
  }
  if (!product.reviewCount || product.reviewCount < 5) {
    cons.push('Very few buyer reviews');
  }
  if (product.condition === 'used' || product.condition === 'refurbished') {
    cons.push(`Listed as ${product.condition} — inspect carefully`);
  }
  if (!product.sellerRating) {
    cons.push('No seller rating available');
  }

  return { description, pros, cons, specs };
}

// ── Recommendation reason generator ────────────────────────────────────────

function buildReason(
  product: RankedProduct,
  role: 'overall' | 'budget' | 'performance' | 'value',
  allProducts: RankedProduct[]
): string {
  switch (role) {
    case 'overall':
      return `Ranked #1 by balanced scoring (price + quality + shipping + seller). Score: ${product.confidence}/100 from ${product.marketplace.toUpperCase()}.`;
    case 'budget':
      return `Cheapest option at $${product.price.toFixed(2)} — $${(Math.max(...allProducts.map(p => p.price)) - product.price).toFixed(2)} less than the most expensive option. Free shipping: ${product.shippingCost === 0 ? 'Yes' : 'No'}.`;
    case 'performance':
      return `Highest quality + seller score combination (${product.scoreBreakdown.qualityScore + product.scoreBreakdown.sellerScore}/200). Best specs for its price tier on ${product.marketplace.toUpperCase()}.`;
    case 'value':
      const ratio = ((product.scoreBreakdown.qualityScore + product.scoreBreakdown.sellerScore) / (product.price || 1)).toFixed(2);
      return `Best quality-to-price ratio (${ratio} per dollar). Strong specs relative to its $${product.price.toFixed(2)} price tag on ${product.marketplace.toUpperCase()}.`;
  }
}

// ── ReportGenerator ─────────────────────────────────────────────────────────

export class ReportGenerator {
  public static generate(
    rankingResult: RankingResult,
    aiTextSummary: string
  ): RecommendationReport {
    const {
      products, topPick, budgetPick, performancePick, valuePick,
      confidenceScore, confidenceLevel, confidenceExplanation, explanation, weights,
    } = rankingResult;

    // Enrich every product with deterministic insights + extracted specs
    const enrichedProducts: RankedProduct[] = products.map((p) => {
      const insights = buildProductInsights(p);
      return {
        ...p,
        description: p.description ?? insights.description,
        pros: p.pros?.length ? p.pros : insights.pros,
        cons: p.cons?.length ? p.cons : insights.cons,
        attributes: Object.keys(insights.specs).length > 0
          ? { ...insights.specs, ...(p.attributes || {}) }
          : p.attributes,
      };
    });

    const findEnriched = (pick: RankedProduct | null) =>
      pick ? (enrichedProducts.find((p) => p.id === pick.id) || pick) : null;

    const eTop         = findEnriched(topPick);
    const eBudget      = findEnriched(budgetPick);
    const ePerformance = findEnriched(performancePick);
    const eValue       = findEnriched(valuePick);

    // Attach reason to each pick
    const withReason = (p: RankedProduct | null, role: 'overall' | 'budget' | 'performance' | 'value') => {
      if (!p) return null;
      return { ...p, reason: buildReason(p, role, products) };
    };

    // Report-level pros/cons
    const reportPros: string[] = [];
    const reportCons: string[] = [];
    const warnings: string[] = [];

    const marketplaces = [...new Set(products.map((p) => p.marketplace))];

    if (eTop) {
      reportPros.push(`Best pick "${eTop.title.slice(0, 55)}" scored ${eTop.confidence}/100 across all criteria.`);
      if (eTop.shippingCost === 0) reportPros.push('Top pick includes free shipping.');
    }
    if (products.length > 1) {
      reportPros.push(`Compared ${products.length} products across ${marketplaces.length} marketplace(s): ${marketplaces.join(', ')}.`);
    }
    if (eBudget && eTop && eBudget.id !== eTop.id) {
      reportCons.push(`Budget option "${eBudget.title.slice(0, 55)}" has fewer features but lower cost.`);
    }
    products.forEach((p) => {
      if (p.condition === 'refurbished' || p.condition === 'used') {
        warnings.push(`"${p.title.slice(0, 40)}" is listed as ${p.condition} — verify condition before purchase.`);
      }
    });

    const alternatives = enrichedProducts
      .filter((p) => ![eTop?.id, eBudget?.id, ePerformance?.id, eValue?.id].includes(p.id))
      .slice(0, 5);

    return {
      id: crypto.randomUUID(), // valid UUID required for searches table primary key
      executiveSummary: aiTextSummary || `Found ${products.length} products across ${marketplaces.length} marketplace(s). ${eTop ? `Top pick: ${eTop.title.slice(0, 50)} at $${eTop.price.toFixed(2)}.` : ''}`,
      bestOverall:     withReason(eTop,         'overall'),
      bestBudget:      withReason(eBudget,      'budget'),
      bestPerformance: withReason(ePerformance, 'performance'),
      bestValue:       withReason(eValue,       'value'),
      pros: reportPros,
      cons: reportCons,
      tradeoffs: explanation,
      confidenceScore,
      confidenceLevel,
      confidenceExplanation,
      explanation: `MCDA scoring with ${marketplaces.length} marketplace(s) achieved ${confidenceScore}% confidence.`,
      rankingCriteria: {
        priceWeight:    Math.round(weights.priceWeight    * 100) / 100,
        qualityWeight:  Math.round(weights.qualityWeight  * 100) / 100,
        shippingWeight: Math.round(weights.shippingWeight * 100) / 100,
        sellerWeight:   Math.round(weights.sellerWeight   * 100) / 100,
      },
      rankedProducts: enrichedProducts,
      alternatives,
      warnings,
      shoppingTips: [
        'Compare shipping times if you need the item urgently.',
        'Prefer sellers with ratings above 85% for safer transactions.',
        'Check product condition carefully for refurbished or used listings.',
        'Prices may vary — always confirm on the product page before purchasing.',
      ],
      marketplacesSearched: marketplaces,
      totalProductsFound: products.length,
    };
  }

  public static mergeAIProductAnalysis(
    report: RecommendationReport,
    aiProducts: AIProductAnalysis[]
  ): RecommendationReport {
    if (!aiProducts || aiProducts.length === 0) return report;

    const analysisMap = new Map(aiProducts.map((a) => [a.productId, a]));

    const merge = (p: RankedProduct | null): RankedProduct | null => {
      if (!p) return null;
      const ai = analysisMap.get(p.id);
      if (!ai) return p;
      return {
        ...p,
        description: ai.description || p.description,
        pros: ai.pros?.length ? ai.pros : p.pros,
        cons: ai.cons?.length ? ai.cons : p.cons,
        attributes: ai.specs ? { ...(p.attributes || {}), ...ai.specs } : p.attributes,
      };
    };

    return {
      ...report,
      bestOverall:     merge(report.bestOverall),
      bestBudget:      merge(report.bestBudget),
      bestPerformance: merge(report.bestPerformance),
      bestValue:       merge(report.bestValue),
      rankedProducts:  report.rankedProducts.map((p) => merge(p)!),
      alternatives:    report.alternatives.map((p)  => merge(p)!),
    };
  }
}
