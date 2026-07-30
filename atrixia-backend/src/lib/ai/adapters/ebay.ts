import { IMarketplaceAdapter } from './interface';
import { NormalizedProduct } from '../models/product';
import * as cheerio from 'cheerio';
import { scraperFetch, hasScraperKey } from './scraperFetch';
import { sanitizeQuery } from './querySanitizer';

// eBay Browse API — free with a developer account at developer.ebay.com
// Set EBAY_APP_ID + EBAY_CERT_ID in .env to enable.
// Read lazily (inside methods) so dotenv is guaranteed to have loaded.
function getEbayAppId() { return process.env.EBAY_APP_ID || ''; }
function getEbayCertId() { return process.env.EBAY_CERT_ID || ''; }

// ─── Token cache ───────────────────────────────────────────────────────────
// Cache the OAuth token in-process so we don't pay for a token round-trip on
// every single search call. eBay tokens last ~2 hours; we refresh at 110 min.
let _cachedToken: string | null = null;
let _tokenExpiresAt = 0; // epoch ms

// Rotating User-Agent pool to reduce HTML scrape 403 rate
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
];

function pickUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export class EbayAdapter implements IMarketplaceAdapter {
  readonly marketplaceName = 'ebay';

  async search(query: string, options?: { category?: string; region?: string }): Promise<NormalizedProduct[]> {
    const clean = sanitizeQuery(query);
    if (getEbayAppId()) {
      const results = await this._searchViaApi(clean, options);
      // If API returned nothing and query has multiple words, retry with first word
      if (results.length === 0) {
        const firstWord = clean.split(' ')[0];
        if (firstWord && firstWord !== clean && firstWord.length >= 3) {
          console.log(`[EbayAdapter] Retrying with simpler query: "${firstWord}"`);
          return this._searchViaApi(firstWord, options);
        }
      }
      return results;
    }
    return this._searchViaHtml(clean, options);
  }

  // ─── OAuth token (cached, with 10s fetch timeout) ─────────────────────────
  /** Pre-warm the token at startup — called from index.ts after server starts. */
  async warmupToken(): Promise<void> {
    await this._getAppToken();
  }

  private async _getAppToken(): Promise<string | null> {
    // Return cached token if still valid
    if (_cachedToken && Date.now() < _tokenExpiresAt) {
      return _cachedToken;
    }

    const clientId = getEbayAppId();
    const clientSecret = getEbayCertId();
    if (!clientId || !clientSecret) return null;

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    try {
      const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${credentials}`,
        },
        body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[EbayAdapter] Token fetch failed ${res.status}: ${errText.slice(0, 300)}`);
        return null;
      }

      const json = await res.json() as { access_token?: string; expires_in?: number };
      _cachedToken = json.access_token || null;
      // Cache for (expires_in - 600) seconds, default 110 min
      const ttlSec = (json.expires_in ?? 7200) - 600;
      _tokenExpiresAt = Date.now() + ttlSec * 1000;

      if (_cachedToken) {
        console.log('[EbayAdapter] OAuth token obtained and cached.');
      }
      return _cachedToken;
    } catch (err: any) {
      console.error('[EbayAdapter] Token fetch error:', err.message);
      return null;
    }
  }

  // ─── Official Browse API path ──────────────────────────────────────────────
  private async _searchViaApi(
    query: string,
    options?: { category?: string; region?: string }
  ): Promise<NormalizedProduct[]> {
    const token = await this._getAppToken();
    if (!token) {
      console.warn('[EbayAdapter] No OAuth token — falling back to HTML scrape.');
      return this._searchViaHtml(query, options);
    }

    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodedQuery}&limit=6&filter=buyingOptions:{FIXED_PRICE}`;

    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        },
        signal: AbortSignal.timeout(18_000),
      });

      if (!res.ok) {
        const body = await res.text();
        console.warn(`[EbayAdapter] Browse API ${res.status}: ${body.slice(0, 200)}`);
        // If token was rejected (401), clear cache so next call re-fetches
        if (res.status === 401) {
          _cachedToken = null;
          _tokenExpiresAt = 0;
        }
        return this._searchViaHtml(query, options);
      }

      const json = await res.json() as { itemSummaries?: any[] };
      const items = json.itemSummaries || [];
      console.log(`[EbayAdapter] Browse API returned ${items.length} items for "${query}"`);

      return items
        .filter((item: any) => item.price?.value)
        .map((item: any) => {
          const price = parseFloat(item.price?.value || '0');
          const shippingOptions = item.shippingOptions?.[0];
          const shippingCost = parseFloat(shippingOptions?.shippingCost?.value || '0');

          return {
            id: `ebay_${item.itemId}`,
            marketplace: 'ebay' as const,
            title: item.title || '',
            brand: item.brand || null,
            price,
            currency: item.price?.currency || 'USD',
            image: item.image?.imageUrl || null,
            productUrl: item.itemWebUrl || '',
            seller: item.seller?.username || 'eBay Seller',
            sellerRating: item.seller?.feedbackPercentage
              ? parseFloat(item.seller.feedbackPercentage)
              : null,
            reviewCount: item.seller?.feedbackScore || 0,
            shippingCost,
            shippingEstimate: shippingCost === 0 ? 'Free Shipping' : `Shipping: $${shippingCost.toFixed(2)}`,
            availability: true,
            condition: item.condition?.toLowerCase().includes('new') ? 'new'
              : item.condition?.toLowerCase().includes('refurb') ? 'refurbished'
              : 'used',
            category: options?.category || item.categories?.[0]?.categoryName || 'General',
            attributes: {},
            confidence: 85,
            rawData: {},
            description: item.shortDescription || null,
            pros: [],
            cons: [],
          } satisfies NormalizedProduct;
        });
    } catch (err: any) {
      console.error('[EbayAdapter] API search error:', err.message);
      return this._searchViaHtml(query, options);
    }
  }

  // ─── HTML scraping fallback (via ScraperAPI) ───────────────────────────────
  private async _searchViaHtml(
    query: string,
    options?: { category?: string; region?: string }
  ): Promise<NormalizedProduct[]> {
    const encodedQuery = encodeURIComponent(query);
    const targetUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodedQuery}&_ipg=48&LH_BIN=1&_sop=12`;

    let html: string;
    try {
      html = await scraperFetch(targetUrl, { render: false, country: 'us' });
    } catch (err: any) {
      console.error('[EbayAdapter] HTML scrape error:', err.message);
      return [];
    }

    if (html.length < 5000 || html.includes('robot') || html.includes('captcha')) {
      console.warn(`[EbayAdapter] Bot-check page detected (${html.length} bytes). ` +
        (hasScraperKey() ? 'ScraperAPI present but blocked.' : 'Add SCRAPER_API_KEY to .env.'));
      return [];
    }

    const $ = cheerio.load(html);
    const products: NormalizedProduct[] = [];

    $('.s-item__wrapper').each((_, el) => {
      try {
        const title = $(el).find('.s-item__title').first().text().trim();
        if (!title || title.toLowerCase().includes('shop on ebay')) return;

        const priceText = $(el).find('.s-item__price').first().text().trim();
        const priceMatch = priceText.match(/[\d,]+(\.\d{2})?/);
        const price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 0;
        if (price === 0) return;

        const productUrl = $(el).find('a.s-item__link').attr('href') || '';
        if (!productUrl) return;

        const imgEl = $(el).find('.s-item__image-img');
        const image = imgEl.attr('data-src') || imgEl.attr('src') || null;

        const conditionRaw = (
          $(el).find('.SECONDARY_INFO').text() ||
          $(el).find('.s-item__subtitle').text()
        ).toLowerCase();
        const condition: 'new' | 'refurbished' | 'used' =
          conditionRaw.includes('brand new') || conditionRaw.includes('new with') ? 'new'
          : conditionRaw.includes('refurb') ? 'refurbished'
          : 'used';

        const sellerText = $(el).find('.s-item__seller-info-text').text();
        const sellerMatch = sellerText.match(/^([^(]+)\(([^)]+)\)\s*([\d.]+)%/);
        const seller = sellerMatch ? sellerMatch[1].trim() : 'eBay Seller';
        const reviewCount = sellerMatch ? parseInt(sellerMatch[2].replace(/,/g, ''), 10) : 0;
        const sellerRating = sellerMatch ? parseFloat(sellerMatch[3]) : null;

        const shippingText = $(el).find('.s-item__shipping, .s-item__logisticsCost').text().toLowerCase();
        let shippingCost = 0;
        if (shippingText && !shippingText.includes('free')) {
          const m = shippingText.match(/[\d,]+(\.\d{2})?/);
          if (m) shippingCost = parseFloat(m[0].replace(/,/g, ''));
        }

        products.push({
          id: `ebay_html_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          marketplace: 'ebay',
          title,
          brand: title.match(/^([A-Z][a-zA-Z]+)/)?.[1] || null,
          price,
          currency: 'USD',
          image,
          productUrl: productUrl.split('?')[0],
          seller,
          sellerRating,
          reviewCount,
          shippingCost,
          shippingEstimate: shippingCost === 0 ? 'Free Shipping' : `Shipping: $${shippingCost.toFixed(2)}`,
          availability: true,
          condition,
          category: options?.category || 'General',
          attributes: {},
          confidence: 75,
          rawData: {},
          description: null,
          pros: [],
          cons: [],
        });
      } catch (_) {}
    });

    console.log(`[EbayAdapter] HTML scrape: ${products.length} products for "${query}"`);
    return products.slice(0, 3);
  }

  async health(): Promise<'healthy' | 'degraded' | 'offline'> {
    return getEbayAppId() ? 'healthy' : 'degraded';
  }

  supportsRegion(region: string): boolean {
    return ['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES'].includes(region.toUpperCase());
  }

  supportsCategory(_category: string): boolean {
    return true;
  }
}
