import { IMarketplaceAdapter } from './interface';
import { NormalizedProduct } from '../models/product';
import * as cheerio from 'cheerio';
import { scraperFetch, hasScraperKey } from './scraperFetch';
import { sanitizeQuery } from './querySanitizer';

interface TemuRawItem {
  goods_id?: string | number;
  goods_name?: string;
  display_price?: number;
  original_price?: number;
  price?: number;
  goods_thumbnail_url?: string;
  goods_img_url?: string;
  thumbnail_url?: string;
  img_url?: string;
  goods_url_name?: string;
  avg_rating?: string | number;
  review_num?: string | number;
  sales_num?: string | number;
  free_shipping?: boolean;
  shipping_cost?: number;
}

function safeFloat(val: string | number | undefined | null): number {
  if (val == null) return 0;
  return parseFloat(String(val).replace(/[^\d.]/g, '')) || 0;
}

export class TemuAdapter implements IMarketplaceAdapter {
  readonly marketplaceName = 'temu';

  async search(query: string, options?: { category?: string; region?: string }): Promise<NormalizedProduct[]> {
    const clean = sanitizeQuery(query);
    const encodedQuery = encodeURIComponent(clean);
    const targetUrl = `https://www.temu.com/search_result.html?search_key=${encodedQuery}&search_method=user`;

    let html: string;
    try {
      // ScraperAPI in plain proxy mode (no JS render on free tier)
      html = await scraperFetch(targetUrl, { render: false, country: 'us' });
    } catch (err: any) {
      console.error('[TemuAdapter] Fetch error:', err.message);
      return [];
    }

    // Try __NEXT_DATA__ JSON blob first
    const fromNext = this._extractFromNextData(html, options);
    if (fromNext && fromNext.length > 0) return fromNext.slice(0, 6);

    // Try window.__INITIAL_STATE__
    const fromState = this._extractFromInitialState(html, options);
    if (fromState && fromState.length > 0) return fromState.slice(0, 6);

    // HTML fallback
    const fromHtml = this._extractFromHtml(html, clean, options);
    return fromHtml.slice(0, 6);
  }

  private _extractFromNextData(
    html: string,
    options?: { category?: string; region?: string }
  ): NormalizedProduct[] | null {
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match) return null;
    try {
      const nextData = JSON.parse(match[1]);
      const pageProps = nextData?.props?.pageProps;
      const items: TemuRawItem[] =
        pageProps?.searchResult?.goods_list ||
        pageProps?.goods_list ||
        pageProps?.data?.goods_list ||
        nextData?.props?.initialState?.search?.goods_list ||
        [];
      if (items.length === 0) return null;
      return this._mapItems(items, options);
    } catch (_) {
      return null;
    }
  }

  private _extractFromInitialState(
    html: string,
    options?: { category?: string; region?: string }
  ): NormalizedProduct[] | null {
    const patterns = [
      /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});\s*(?:window|var|const|<\/script>)/,
      /window\.store\s*=\s*(\{[\s\S]*?\});\s*(?:window|var|const|<\/script>)/,
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (!match) continue;
      try {
        const state = JSON.parse(match[1]);
        const items: TemuRawItem[] = state?.search?.goods_list || state?.goods_list || [];
        if (items.length > 0) return this._mapItems(items, options);
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

    const cardSelectors = [
      '[class*="goods-card"]',
      '[class*="product-card"]',
      '[data-type="goods"]',
      '.search-item',
    ];

    let cards = $<any, any>([]);
    for (const sel of cardSelectors) {
      cards = $(sel);
      if (cards.length > 0) break;
    }

    cards.each((_: number, el: any) => {
      try {
        const title = $(el).find('[class*="title"], [class*="name"]').first().text().trim();
        if (!title) return;

        const priceText = $(el).find('[class*="price"]').first().text().trim();
        const priceMatch = priceText.match(/[\d.]+/);
        const price = priceMatch ? parseFloat(priceMatch[0]) : 0;
        if (price === 0) return;

        const href = $(el).find('a').first().attr('href') || '';
        const productUrl = href.startsWith('http') ? href : `https://www.temu.com${href}`;

        const imgEl = $(el).find('img').first();
        let image = imgEl.attr('src') || imgEl.attr('data-src') || null;
        if (image?.startsWith('//')) image = `https:${image}`;

        products.push({
          id: `temu_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          marketplace: 'temu',
          title,
          brand: null,
          price,
          currency: 'USD',
          image,
          productUrl,
          seller: 'Temu Seller',
          sellerRating: null,
          reviewCount: 0,
          shippingCost: 0,
          shippingEstimate: 'Free Shipping (7-15 days)',
          availability: true,
          condition: 'new',
          category: options?.category || 'General',
          attributes: {},
          confidence: 70,
          rawData: {},
        });
      } catch (_) {}
    });

    if (products.length === 0) {
      console.warn(`[TemuAdapter] No products parsed. HTML length: ${html.length}. ${!hasScraperKey() ? 'Add SCRAPER_API_KEY to .env.' : 'ScraperAPI key present — JS render in progress.'}`);
    }

    return products;
  }

  private _mapItems(
    items: TemuRawItem[],
    options?: { category?: string; region?: string }
  ): NormalizedProduct[] {
    return items
      .filter((item) => item && item.goods_name)
      .map((item) => {
        const title = item.goods_name || '';
        const rawPrice = item.display_price || item.price || item.original_price || 0;
        // Temu stores cents if > 1000
        const price = rawPrice > 1000 ? rawPrice / 100 : rawPrice;

        const goodsId = String(item.goods_id || Math.random().toString(36).substring(7));
        const slugName = (item.goods_url_name || title)
          .toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
        const productUrl = `https://www.temu.com/${slugName}-g-${goodsId}.html`;

        let image = item.goods_thumbnail_url || item.goods_img_url || item.thumbnail_url || item.img_url || null;
        if (image?.startsWith('//')) image = `https:${image}`;

        const sellerRating = item.avg_rating
          ? Math.round((safeFloat(item.avg_rating) / 5) * 100) : null;
        const reviewCount = parseInt(
          String(item.review_num || item.sales_num || '0').replace(/[^\d]/g, ''), 10
        );
        const shippingCost = item.free_shipping ? 0 : safeFloat(item.shipping_cost);

        return {
          id: `temu_${goodsId}`,
          marketplace: 'temu' as const,
          title,
          brand: null,
          price,
          currency: 'USD',
          image,
          productUrl,
          seller: 'Temu Seller',
          sellerRating,
          reviewCount,
          shippingCost,
          shippingEstimate: shippingCost === 0 ? 'Free Shipping (7-15 days)' : `Shipping: $${shippingCost}`,
          availability: true,
          condition: 'new' as const,
          category: options?.category || 'General',
          attributes: {},
          confidence: 70,
          rawData: {},
        };
      })
      .filter((p) => p.price > 0);
  }

  async health(): Promise<'healthy' | 'degraded' | 'offline'> {
    return hasScraperKey() ? 'healthy' : 'degraded';
  }

  supportsRegion(region: string): boolean {
    return ['US', 'CA', 'UK', 'AU', 'DE', 'FR', 'IT'].includes(region.toUpperCase());
  }
  supportsCategory(_category: string): boolean { return true; }
}
