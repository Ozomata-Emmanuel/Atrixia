import { IMarketplaceAdapter } from './interface';
import { NormalizedProduct } from '../models/product';
import * as cheerio from 'cheerio';
import { sanitizeQuery } from './querySanitizer';

export class KongaAdapter implements IMarketplaceAdapter {
  readonly marketplaceName = 'konga';

  async search(query: string, options?: { category?: string; region?: string }): Promise<NormalizedProduct[]> {
    const clean = sanitizeQuery(query);
    const encodedQuery = encodeURIComponent(clean);
    const url = `https://www.konga.com/search?search=${encodedQuery}`;

    let html: string;
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.konga.com/',
          'Cache-Control': 'no-cache',
        },
        redirect: 'follow',
      });

      if (!res.ok) {
        console.warn(`[KongaAdapter] HTTP ${res.status}`);
        return [];
      }
      html = await res.text();
    } catch (err: any) {
      console.error('[KongaAdapter] Network error:', err.message);
      return [];
    }

    // Strategy 1: Konga embeds product JSON in a script tag as window.__STORE__ or similar
    const fromScript = this._extractFromScript(html, options);
    if (fromScript && fromScript.length > 0) {
      return fromScript.slice(0, 3);
    }

    // Strategy 2: HTML parsing
    const fromHtml = this._extractFromHtml(html, clean, options);
    return fromHtml.slice(0, 3);
  }

  private _extractFromScript(
    html: string,
    options?: { category?: string; region?: string }
  ): NormalizedProduct[] | null {
    // Konga uses Next.js streaming: self.__next_f.push([1,"..."])
    // Products are embedded as double-encoded JSON inside these calls.
    
    // Find every push call and look for one containing "products"
    const pushPattern = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
    let match: RegExpExecArray | null;

    while ((match = pushPattern.exec(html)) !== null) {
      const raw = match[1];
      if (!raw.includes('\\"products\\"')) continue;

      // Unescape the double-encoded string
      let decoded: string;
      try {
        // JSON.parse to unescape — wrap in quotes since it's a JSON string value
        decoded = JSON.parse(`"${raw}"`);
      } catch (_) {
        continue;
      }

      // Now find the products array in the decoded string
      // It lives inside initialData: {"products":[...]}
      const prodIdx = decoded.indexOf('"products":[');
      if (prodIdx === -1) continue;

      // Find the matching closing bracket by counting brackets
      const arrStart = decoded.indexOf('[', prodIdx);
      if (arrStart === -1) continue;

      let depth = 0;
      let arrEnd = -1;
      for (let i = arrStart; i < decoded.length; i++) {
        if (decoded[i] === '[' || decoded[i] === '{') depth++;
        else if (decoded[i] === ']' || decoded[i] === '}') {
          depth--;
          if (depth === 0) { arrEnd = i + 1; break; }
        }
      }
      if (arrEnd === -1) continue;

      const arrStr = decoded.slice(arrStart, arrEnd);
      try {
        const items: any[] = JSON.parse(arrStr);
        if (!items || items.length === 0) continue;

        const mapped = items
          .filter((item: any) => item && item.name)
          .map((item: any) => {
            const price = parseFloat(item.special_price || item.final_price || item.price || '0');

            // Real Konga image fields from API response
            const image = item.image_thumbnail_path ||
              item.image_thumbnail ||
              item.image_full ||
              (Array.isArray(item.images) && item.images[0]) ||
              null;

            const productUrl = item.url_key
              ? `https://www.konga.com/product/${item.url_key}`
              : `https://www.konga.com/search?search=${encodeURIComponent(item.name)}`;

            const desc = typeof item.description === 'string' &&
              !item.description.includes('[object Object]') &&
              item.description.length > 5
              ? item.description.slice(0, 200)
              : (item.short_description || null);

            // Real seller name is nested in seller.name
            const sellerName = typeof item.seller === 'object'
              ? item.seller?.name || 'Konga Seller'
              : item.seller_name || item.store_name || 'Konga Seller';

            // Real rating is nested in product_rating.quality.average
            const ratingRaw = item.product_rating?.quality?.average;
            const sellerRating = ratingRaw && ratingRaw > 0
              ? Math.round((ratingRaw / 5) * 100)
              : null;

            const reviewCount = item.product_rating?.quality?.number_of_ratings ||
              item.review_count || 0;

            const inStock = item.stock?.in_stock !== false &&
              item.is_in_stock !== false;

            return {
              id: `konga_${item.sku || item.product_id || Math.random().toString(36).substring(7)}`,
              marketplace: 'konga' as const,
              title: item.name,
              brand: (typeof item.brand === 'string' && item.brand.trim())
                ? item.brand.trim() : null,
              price,
              currency: 'NGN',
              image,
              productUrl,
              seller: sellerName,
              sellerRating,
              reviewCount,
              shippingCost: item.is_free_shipping ? 0 : null,
              shippingEstimate: item.express_delivery
                ? 'Express Delivery (Same/Next Day)'
                : 'Standard Delivery (1-3 days)',
              availability: inStock,
              condition: 'new' as const,
              category: options?.category || 'General',
              attributes: {},
              confidence: 80,
              rawData: {},
              description: desc,
              pros: [],
              cons: [],
            };
          })
          .filter((p: NormalizedProduct) => p.price > 0);

        if (mapped.length > 0) {
          console.log(`[KongaAdapter] Extracted ${mapped.length} products via __next_f script.`);
          return mapped;
        }
      } catch (_) {
        continue;
      }
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

    // Konga uses various class names — try a broad set
    // The key pattern in Konga's HTML is data-test-id on product cards
    const cardSelectors = [
      '[data-test-id="product-card"]',
      '[class*="-product-card"]',
      '[class*="product-card"]',
      '[class*="ProductCard"]',
      '[class*="product-item"]',
      '[class*="ProductItem"]',
      'section[class*="search"] > ul > li',
      '[class*="search-result"] li',
    ];

    let cards = $<any, any>([]);
    for (const sel of cardSelectors) {
      const found = $(sel);
      if (found.length > 1) {
        cards = found;
        break;
      }
    }

    if (cards.length === 0) {
      // Generic fallback — any anchor with a price inside
      $('a[href*="/product/"], a[href*="konga.com/"]').each((_: number, el: any) => {
        const text = $(el).text();
        if (text.includes('₦') || /\d{4,}/.test(text)) {
          cards = cards.add(el);
        }
      });
    }

    cards.each((_: number, el: any) => {
      try {
        // Title
        const titleEl = $(el).find('[class*="name"], [class*="title"], h3, h4').first();
        const title = titleEl.text().trim();
        if (!title || title.length < 3) return;

        // Price — Konga uses ₦ prefix
        const priceText = $(el).find('[class*="price"], [class*="Price"]').first().text().trim();
        const priceMatch = priceText.replace(/[^\d,]/g, '').replace(/,/g, '');
        const price = priceMatch ? parseFloat(priceMatch) : 0;
        if (price === 0) return;

        // URL
        const href = $(el).is('a') ? $(el).attr('href') : $(el).find('a').first().attr('href');
        const productUrl = href
          ? href.startsWith('http') ? href : `https://www.konga.com${href}`
          : `https://www.konga.com/search?search=${encodeURIComponent(title)}`;

        // Image
        const imgEl = $(el).find('img').first();
        const image = imgEl.attr('data-src') || imgEl.attr('src') || null;

        products.push({
          id: `konga_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          marketplace: 'konga',
          title,
          brand: null,
          price,
          currency: 'NGN',
          image,
          productUrl,
          seller: 'Konga Seller',
          sellerRating: null,
          reviewCount: 0,
          shippingCost: 0,
          shippingEstimate: 'Standard Delivery (1-3 days)',
          availability: true,
          condition: 'new',
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

    if (products.length === 0) {
      console.warn(`[KongaAdapter] No products found for "${query}". HTML length: ${html.length}`);
    }

    return products;
  }

  async health(): Promise<'healthy' | 'degraded' | 'offline'> {
    return 'healthy';
  }

  supportsRegion(region: string): boolean {
    return ['NG', 'US'].includes(region.toUpperCase());
  }

  supportsCategory(_category: string): boolean {
    return true;
  }
}
