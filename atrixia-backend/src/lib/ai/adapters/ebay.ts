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
      return this._searchViaApi(clean, options);
    }
    return this._searchViaHtml(clean, options);
  }

  private async _getAppToken(): Promise<string | null> {
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
      });
      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[EbayAdapter] Token fetch failed ${res.status}: ${errText.slice(0, 200)}`);
        return null;
      }
      const json = await res.json() as { access_token?: string };
      return json.access_token || null;
    } catch (err: any) {
      console.error('[EbayAdapter] Token fetch error:', err.message);
      return null;
    }
  }

  private async _searchViaApi(
    query: string,
    options?: { category?: string; region?: string }
  ): Promise<NormalizedProduct[]> {
    const token = await this._getAppToken();
    if (!token) {
      console.warn('[EbayAdapter] Could not get OAuth token, falling back to HTML scrape.');
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
      });
      if (!res.ok) {
        console.warn(`[EbayAdapter] Browse API returned ${res.status}`);
        return [];
      }
      const json = await res.json() as { itemSummaries?: any[] };
      const items = json.itemSummaries || [];

      return items.map((item: any) => {
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
          shippingEstimate: shippingCost === 0 ? 'Free Shipping' : `Shipping: $${shippingCost}`,
          availability: item.itemAffiliateWebUrl !== undefined,
          condition: item.condition?.toLowerCase().includes('new') ? 'new'
            : item.condition?.toLowerCase().includes('refurbished') ? 'refurbished'
            : 'used',
          category: options?.category || item.categories?.[0]?.categoryName || 'General',
          attributes: {},
          confidence: 80,
          rawData: {},
        };
      });
    } catch (err: any) {
      console.error('[EbayAdapter] API error:', err.message);
      return [];
    }
  }

  // ----- HTML scraping fallback (via ScraperAPI if key present) -----
  private async _searchViaHtml(
    query: string,
    options?: { category?: string; region?: string }
  ): Promise<NormalizedProduct[]> {
    const encodedQuery = encodeURIComponent(query);
    const targetUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodedQuery}&_ipg=48&LH_BIN=1&_sop=12`;

    let html: string;
    try {
      // Use ScraperAPI plain proxy to bypass eBay's bot-detection
      html = await scraperFetch(targetUrl, { render: false, country: 'us' });
    } catch (err: any) {
      console.error('[EbayAdapter] Network error:', err.message);
      return [];
    }

    if (html.includes('robot') || html.includes('captcha') || html.includes('punish')) {
      console.warn(`[EbayAdapter] Bot-check detected. ${!hasScraperKey() ? 'Set SCRAPER_API_KEY in .env to bypass.' : 'ScraperAPI key present — check response.'}`);
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
          : conditionRaw.includes('refurbished') ? 'refurbished'
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
          id: `ebay_${Date.now()}_${Math.random().toString(36).substring(7)}`,
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
          shippingEstimate: shippingCost === 0 ? 'Free Shipping' : `Shipping: $${shippingCost}`,
          availability: true,
          condition,
          category: options?.category || 'General',
          attributes: {},
          confidence: 80,
          rawData: {},
        });
      } catch (_) {}
    });

    return products.slice(0, 6);
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
