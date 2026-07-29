import { IMarketplaceAdapter } from './interface';
import { NormalizedProduct } from '../models/product';
import * as cheerio from 'cheerio';
import { scraperFetch, hasScraperKey } from './scraperFetch';
import { sanitizeQuery } from './querySanitizer';

interface AliRawItem {
  productId?: string | number;
  title?: string;
  productTitle?: string;
  name?: string;
  price?: { minPrice?: number; maxPrice?: number; salePrice?: number } | number;
  productUrl?: string;
  detailUrl?: string;
  averageStar?: string | number;
  starRating?: string | number;
  totalTrades?: string | number;
  reviews?: string | number;
  imageUrl?: string;
  image?: string;
  storeName?: string;
  store?: { storeName?: string };
  shippingFee?: string | number;
}

function safeFloat(val: string | number | undefined | null): number {
  if (val == null) return 0;
  return parseFloat(String(val).replace(/[^\d.]/g, '')) || 0;
}

export class AliexpressAdapter implements IMarketplaceAdapter {
  readonly marketplaceName = 'aliexpress';

  async search(query: string, options?: { category?: string; region?: string }): Promise<NormalizedProduct[]> {
    const clean = sanitizeQuery(query);
    const encodedQuery = encodeURIComponent(clean);
    const targetUrl = `https://www.aliexpress.com/wholesale?SearchText=${encodedQuery}&SortType=default_desc&page=1`;

    let html: string;
    try {
      // ScraperAPI in plain proxy mode (no JS render — free tier doesn't support it reliably)
      html = await scraperFetch(targetUrl, { render: false, country: 'us' });
    } catch (err: any) {
      console.error('[AliexpressAdapter] Fetch error:', err.message);
      return [];
    }

    // Try embedded JSON first (fastest, most reliable)
    const fromJson = this._extractFromJson(html, options);
    if (fromJson && fromJson.length > 0) return fromJson.slice(0, 3);

    // Fall back to HTML parsing
    const fromHtml = this._extractFromHtml(html, clean, options);
    return fromHtml.slice(0, 3);
  }

  private _extractFromJson(
    html: string,
    options?: { category?: string; region?: string }
  ): NormalizedProduct[] | null {
    const patterns = [
      // AliExpress desktop search embeds runParams
      /window\.runParams\s*=\s*(\{[\s\S]*?\});\s*(?:window|var|const|let|<\/script>)/,
      // Sometimes the itemList content is extracted inline
      /"mods"\s*:\s*\{[\s\S]*?"itemList"\s*:\s*\{[\s\S]*?"content"\s*:\s*(\[[\s\S]*?\])\s*[,}]/,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (!match) continue;
      try {
        if (pattern.source.includes('content')) {
          const items: AliRawItem[] = JSON.parse(match[1]);
          return this._mapItems(items, options);
        }
        const runParams = JSON.parse(match[1]);
        const content: AliRawItem[] =
          runParams?.data?.mods?.itemList?.content ||
          runParams?.mods?.itemList?.content ||
          [];
        if (content.length > 0) return this._mapItems(content, options);
      } catch (_) {}
    }
    return null;
  }

  private _extractFromHtml(
    html: string,
    query: string,
    options?: { category?: string; region?: string }
  ): NormalizedProduct[] {
    const $ = cheerio.load(html);
    const products: NormalizedProduct[] = [];

    // Detect bot-challenge before parsing
    if (html.length < 8000 && (html.includes('captcha') || html.includes('punish'))) {
      console.warn('[AliexpressAdapter] Bot-challenge page — ScraperAPI JS render may fix this.');
      return [];
    }

    const cardSelectors = [
      '.search-item-card-wrapper-gallery',
      '[class*="manhattan--container"]',
      '.list--gallery--C2f2tvm',
      '[class*="SearchItemCardV2"]',
      '.item-content',
    ];

    let cards = $<any, any>([]);
    for (const sel of cardSelectors) {
      cards = $(sel);
      if (cards.length > 0) break;
    }

    cards.each((_: number, el: any) => {
      try {
        const title = $(el).find('[class*="title"], h1, h3').first().text().trim();
        if (!title) return;

        const priceText = $(el).find('[class*="price"], .price').first().text().trim();
        const priceMatch = priceText.match(/[\d.]+/);
        const price = priceMatch ? parseFloat(priceMatch[0]) : 0;
        if (price === 0) return;

        const href = $(el).find('a').first().attr('href') || '';
        const productUrl = href.startsWith('http') ? href : `https://www.aliexpress.com${href}`;

        const imgEl = $(el).find('img').first();
        let image = imgEl.attr('src') || imgEl.attr('data-src') || null;
        if (image?.startsWith('//')) image = `https:${image}`;

        products.push({
          id: `ali_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          marketplace: 'aliexpress',
          title,
          brand: null,
          price,
          currency: 'USD',
          image,
          productUrl,
          seller: 'AliExpress Seller',
          sellerRating: null,
          reviewCount: 0,
          shippingCost: 0,
          shippingEstimate: 'Free Shipping (15-30 days)',
          availability: true,
          condition: 'new',
          category: options?.category || 'General',
          attributes: {},
          confidence: 70,
          rawData: {},
          description: null,
          pros: [],
          cons: [],
        });
      } catch (_) {}
    });

    if (products.length === 0) {
      console.warn(`[AliexpressAdapter] No products parsed. HTML length: ${html.length}. ${!hasScraperKey() ? 'Add SCRAPER_API_KEY to .env to enable bot bypass.' : 'ScraperAPI key present — check render mode.'}`);
    }

    return products;
  }

  private _mapItems(
    items: AliRawItem[],
    options?: { category?: string; region?: string }
  ): NormalizedProduct[] {
    return items
      .filter((item) => item && (item.title || item.productTitle || item.name))
      .map((item) => {
        const title = item.title || item.productTitle || item.name || '';

        let price = 0;
        if (typeof item.price === 'object' && item.price !== null) {
          price = item.price.salePrice || item.price.minPrice || 0;
        } else if (typeof item.price === 'number') {
          price = item.price;
        }

        const productId = String(item.productId || Math.random().toString(36).substring(7));
        const href = item.productUrl || item.detailUrl || '';
        const productUrl = href.startsWith('http') ? href : `https://www.aliexpress.com/item/${productId}.html`;

        let image = item.imageUrl || item.image || null;
        if (image?.startsWith('//')) image = `https:${image}`;

        const sellerRating = item.averageStar || item.starRating
          ? Math.round((safeFloat(item.averageStar || item.starRating) / 5) * 100)
          : null;
        const reviewCount = parseInt(
          String(item.totalTrades || item.reviews || '0').replace(/[^\d]/g, ''),
          10
        );
        const storeName =
          (typeof item.store === 'object' ? item.store?.storeName : undefined) ||
          item.storeName ||
          'AliExpress Seller';
        const shippingCost = safeFloat(item.shippingFee);
        const shippingEstimate = shippingCost === 0
          ? 'Free Shipping (15-30 days)'
          : `Shipping: $${shippingCost} (15-30 days)`;

        return {
          id: `ali_${productId}`,
          marketplace: 'aliexpress' as const,
          title,
          brand: null,
          price,
          currency: 'USD',
          image,
          productUrl,
          seller: storeName,
          sellerRating,
          reviewCount,
          shippingCost,
          shippingEstimate,
          availability: true,
          condition: 'new' as const,
          category: options?.category || 'General',
          attributes: {},
          confidence: 75,
          rawData: {},
          description: null,
          pros: [],
          cons: [],
        };
      })
      .filter((p) => p.price > 0);
  }

  async health(): Promise<'healthy' | 'degraded' | 'offline'> {
    return hasScraperKey() ? 'healthy' : 'degraded';
  }

  supportsRegion(_region: string): boolean { return true; }
  supportsCategory(_category: string): boolean { return true; }
}
