import { IMarketplaceAdapter } from './interface';
import { NormalizedProduct } from '../models/product';
import * as cheerio from 'cheerio';
import { sanitizeQuery } from './querySanitizer';

/**
 * JijiAdapter
 *
 * Jiji.ng is a Nuxt.js / Vue SSR classifieds marketplace.
 * Search URL: https://jiji.ng/search?query=<term>
 *
 * Extraction strategy (in priority order):
 *  1. window.__NUXT__ embedded JSON  — full product objects
 *  2. <script id="__NUXT_DATA__">    — Nuxt 3 dehydrated payload
 *  3. application/json script tags   — any JSON block containing "adverts"
 *  4. Cheerio HTML fallback          — scrape rendered card elements
 */
export class JijiAdapter implements IMarketplaceAdapter {
  readonly marketplaceName = 'jiji' as const;

  private readonly BASE_URL = 'https://jiji.ng';
  private readonly MAX_RESULTS = 3;

  async search(
    query: string,
    options?: { category?: string; region?: string }
  ): Promise<NormalizedProduct[]> {
    const clean = sanitizeQuery(query);
    const searchUrl = `${this.BASE_URL}/search?query=${encodeURIComponent(clean)}`;

    let html: string;
    try {
      const res = await fetch(searchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          Referer: 'https://jiji.ng/',
          'Cache-Control': 'no-cache',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(12_000),
      });

      if (!res.ok) {
        console.warn(`[JijiAdapter] HTTP ${res.status} for "${clean}"`);
        return [];
      }

      html = await res.text();
    } catch (err: any) {
      console.error('[JijiAdapter] Network error:', err.message);
      return [];
    }

    // Strategy 1 — window.__NUXT__ object (Nuxt 2 style)
    const fromNuxt = this._extractFromNuxtState(html, clean, options);
    if (fromNuxt.length > 0) {
      console.log(`[JijiAdapter] ${fromNuxt.length} products via __NUXT__ state`);
      return fromNuxt.slice(0, this.MAX_RESULTS);
    }

    // Strategy 2 — <script id="__NUXT_DATA__"> (Nuxt 3 style)
    const fromNuxt3 = this._extractFromNuxt3Data(html, clean, options);
    if (fromNuxt3.length > 0) {
      console.log(`[JijiAdapter] ${fromNuxt3.length} products via __NUXT_DATA__`);
      return fromNuxt3.slice(0, this.MAX_RESULTS);
    }

    // Strategy 3 — any application/json script block containing "adverts"
    const fromJsonBlock = this._extractFromJsonBlocks(html, clean, options);
    if (fromJsonBlock.length > 0) {
      console.log(`[JijiAdapter] ${fromJsonBlock.length} products via JSON script block`);
      return fromJsonBlock.slice(0, this.MAX_RESULTS);
    }

    // Strategy 4 — HTML card fallback
    const fromHtml = this._extractFromHtml(html, clean, options);
    if (fromHtml.length > 0) {
      console.log(`[JijiAdapter] ${fromHtml.length} products via HTML fallback`);
    } else {
      console.warn(
        `[JijiAdapter] No products found for "${clean}". HTML length: ${html.length}. ` +
          'Jiji may have changed its SSR format.'
      );
    }
    return fromHtml.slice(0, this.MAX_RESULTS);
  }

  // ─── Strategy 1: window.__NUXT__ ──────────────────────────────────────────

  private _extractFromNuxtState(
    html: string,
    query: string,
    options?: { category?: string; region?: string }
  ): NormalizedProduct[] {
    // Match: window.__NUXT__=(...);  or  window.__NUXT__={...};
    const match = html.match(/window\.__NUXT__\s*=\s*(\{[\s\S]*?|\([\s\S]*?\));?\s*<\/script>/);
    if (!match) return [];

    let raw = match[1].trim();
    // Nuxt sometimes wraps it in a self-calling function: (function(a,b,...){return {...}}(...))
    // Simplest safe approach: extract via JSON after removing the outer function wrapper
    raw = raw.replace(/^\(function[\s\S]*?return\s*/, '').replace(/\}\([^)]*\)\)$/, '');

    try {
      const nuxt = JSON.parse(raw);
      // Products live in nuxt.data[0].adverts or nuxt.state.adverts
      const adverts: any[] =
        nuxt?.data?.[0]?.adverts ||
        nuxt?.data?.[0]?.items ||
        nuxt?.state?.adverts ||
        nuxt?.fetch?.adverts?.adverts ||
        [];
      return this._mapAdverts(adverts, query, options);
    } catch (_) {
      return [];
    }
  }

  // ─── Strategy 2: <script id="__NUXT_DATA__"> ──────────────────────────────

  private _extractFromNuxt3Data(
    html: string,
    query: string,
    options?: { category?: string; region?: string }
  ): NormalizedProduct[] {
    const match = html.match(/<script[^>]+id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
    if (!match) return [];

    try {
      // Nuxt 3 uses a dehydrated array payload; adverts are usually in the first few entries
      const payload: any[] = JSON.parse(match[1]);
      // Find the first entry that looks like an adverts array
      for (const entry of payload) {
        if (Array.isArray(entry?.adverts)) {
          return this._mapAdverts(entry.adverts, query, options);
        }
        if (Array.isArray(entry) && entry[0]?.slug) {
          return this._mapAdverts(entry, query, options);
        }
      }
    } catch (_) {}
    return [];
  }

  // ─── Strategy 3: any <script type="application/json"> with adverts ────────

  private _extractFromJsonBlocks(
    html: string,
    query: string,
    options?: { category?: string; region?: string }
  ): NormalizedProduct[] {
    const scriptPattern = /<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let m: RegExpExecArray | null;

    while ((m = scriptPattern.exec(html)) !== null) {
      const block = m[1].trim();
      if (!block.includes('adverts') && !block.includes('"slug"')) continue;

      try {
        const obj = JSON.parse(block);
        const adverts: any[] =
          obj?.adverts ||
          obj?.data?.adverts ||
          obj?.initialData?.adverts ||
          obj?.props?.pageProps?.adverts ||
          (Array.isArray(obj) && obj[0]?.slug ? obj : []);

        if (adverts.length > 0) {
          return this._mapAdverts(adverts, query, options);
        }
      } catch (_) {}
    }

    // Also try inline JSON after common variable assignments
    const inlinePatterns = [
      /(?:initialData|pageData|advertsData)\s*=\s*(\{[\s\S]*?\});\s*(?:window|var|<\/script>)/,
      /"adverts"\s*:\s*(\[[\s\S]*?\])\s*[,}]/,
    ];

    for (const pat of inlinePatterns) {
      const im = html.match(pat);
      if (!im) continue;
      try {
        const parsed = JSON.parse(im[1]);
        const adverts: any[] = Array.isArray(parsed) ? parsed : parsed?.adverts || [];
        if (adverts.length > 0) return this._mapAdverts(adverts, query, options);
      } catch (_) {}
    }

    return [];
  }

  // ─── Strategy 4: HTML card scraping ───────────────────────────────────────

  private _extractFromHtml(
    html: string,
    query: string,
    options?: { category?: string; region?: string }
  ): NormalizedProduct[] {
    const $ = cheerio.load(html);
    const products: NormalizedProduct[] = [];

    // Jiji renders ad cards in <div class="b-list-advert__item"> or similar
    const cardSelectors = [
      '[class*="b-list-advert__item"]',
      '[class*="qa-advert-list-item"]',
      '[data-testid*="advert"]',
      '[class*="advert-list"] li',
      '[class*="AdCard"]',
      'article[class*="advert"]',
      '[class*="listing-card"]',
    ];

    let cards = $<any, any>([]);
    for (const sel of cardSelectors) {
      const found = $(sel);
      if (found.length > 1) {
        cards = found;
        break;
      }
    }

    if (cards.length === 0) return [];

    cards.each((_: number, el: any) => {
      try {
        const titleEl = $(el)
          .find('[class*="title"], [class*="Title"], h3, h4, p[class*="name"]')
          .first();
        const title = titleEl.text().trim();
        if (!title || title.length < 3) return;

        // Jiji prices are in Naira (₦)
        const priceText = $(el)
          .find('[class*="price"], [class*="Price"], [class*="cost"]')
          .first()
          .text()
          .trim();
        const priceMatch = priceText.replace(/[^\d]/g, '');
        const price = priceMatch ? parseFloat(priceMatch) : 0;
        if (price === 0) return;

        const anchor = $(el).is('a') ? $(el) : $(el).find('a[href*="/"]').first();
        const href = anchor.attr('href') || '';
        const productUrl = href.startsWith('http')
          ? href
          : href
          ? `${this.BASE_URL}${href}`
          : `${this.BASE_URL}/search?query=${encodeURIComponent(title)}`;

        const imgEl = $(el).find('img').first();
        let image =
          imgEl.attr('data-src') ||
          imgEl.attr('data-lazy') ||
          imgEl.attr('src') ||
          null;
        if (image?.startsWith('//')) image = `https:${image}`;
        if (image?.startsWith('/')) image = `${this.BASE_URL}${image}`;

        const locationEl = $(el)
          .find('[class*="region"], [class*="location"], [class*="Region"]')
          .first();
        const location = locationEl.text().trim() || 'Nigeria';

        products.push({
          id: `jiji_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          marketplace: 'jiji' as const,
          title,
          brand: null,
          price,
          currency: 'NGN',
          image,
          productUrl,
          seller: location,
          sellerRating: null,
          reviewCount: 0,
          shippingCost: null,
          shippingEstimate: 'Buyer arranges pickup / delivery',
          availability: true,
          condition: this._inferCondition(title),
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

    return products;
  }

  // ─── Shared advert mapper ──────────────────────────────────────────────────

  /**
   * Maps raw Jiji advert objects (from any JSON extraction path) to NormalizedProduct.
   *
   * Jiji advert shape (typical):
   * {
   *   slug: "hp-laptop-15-laptop-computers-lagos-2345678",
   *   title: "HP Laptop 15",
   *   price_obj: { value: 150000, view: "₦150,000" },
   *   images: [{ large_url: "https://..." }],
   *   user: { name: "John Doe", phones_viewable: true },
   *   region_name: "Lagos",
   *   attrs: [{ name: "Condition", value: "Used" }, ...],
   *   description: "...",
   * }
   */
  private _mapAdverts(
    adverts: any[],
    query: string,
    options?: { category?: string; region?: string }
  ): NormalizedProduct[] {
    if (!Array.isArray(adverts) || adverts.length === 0) return [];

    return adverts
      .filter((ad: any) => ad && (ad.title || ad.name))
      .map((ad: any) => {
        const title: string = ad.title || ad.name || '';

        // Price — Jiji stores numeric value in price_obj.value
        let price = 0;
        if (ad.price_obj?.value != null) {
          price = parseFloat(String(ad.price_obj.value).replace(/[^\d.]/g, '')) || 0;
        } else if (ad.price != null) {
          price = parseFloat(String(ad.price).replace(/[^\d.]/g, '')) || 0;
        }

        // URL from slug
        const slug: string = ad.slug || '';
        const productUrl = slug
          ? `${this.BASE_URL}/${slug}`
          : `${this.BASE_URL}/search?query=${encodeURIComponent(title)}`;

        // Images — Jiji stores array of { large_url, small_url }
        let image: string | null = null;
        if (Array.isArray(ad.images) && ad.images.length > 0) {
          const img = ad.images[0];
          image =
            img?.large_url ||
            img?.image_fid ||   // sometimes a relative path
            img?.small_url ||
            null;
        } else if (typeof ad.image === 'string') {
          image = ad.image;
        }
        if (image?.startsWith('//')) image = `https:${image}`;
        if (image?.startsWith('/') && !image.startsWith('//')) {
          image = `${this.BASE_URL}${image}`;
        }

        // Seller
        const seller: string =
          ad.user?.name ||
          ad.seller_name ||
          ad.region_name ||
          'Jiji Seller';

        // Condition — from attrs array or title keywords
        const conditionAttr = (ad.attrs as any[] | undefined)?.find(
          (a: any) => a?.name?.toLowerCase() === 'condition'
        );
        const conditionRaw: string = conditionAttr?.value || ad.condition || '';
        const condition = this._normalizeCondition(conditionRaw) || this._inferCondition(title);

        // Description
        const description: string | null =
          typeof ad.description === 'string' && ad.description.length > 5
            ? ad.description.slice(0, 250)
            : null;

        // Build extra attributes map
        const attributes: Record<string, string | number | boolean> = {};
        if (ad.region_name) attributes['location'] = ad.region_name;
        if (Array.isArray(ad.attrs)) {
          for (const attr of ad.attrs) {
            if (attr?.name && attr?.value != null) {
              attributes[attr.name.toLowerCase()] = attr.value;
            }
          }
        }

        return {
          id: `jiji_${ad.public_id || ad.id || slug || Math.random().toString(36).substring(7)}`,
          marketplace: 'jiji' as const,
          title,
          brand: this._extractBrand(title, ad.attrs),
          price,
          currency: 'NGN',
          image,
          productUrl,
          seller,
          sellerRating: null,         // Jiji is classifieds — no structured seller ratings
          reviewCount: 0,
          shippingCost: null,         // Classifieds: buyer/seller negotiate
          shippingEstimate: 'Buyer arranges pickup / delivery',
          availability: true,
          condition,
          category: options?.category || ad.category_name || 'General',
          attributes,
          confidence: 78,
          rawData: {},
          description,
          pros: [],
          cons: [],
        };
      })
      .filter((p) => p.price > 0 && p.title.length > 0);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private _normalizeCondition(raw: string): 'new' | 'refurbished' | 'used' | null {
    const v = raw.toLowerCase().trim();
    if (!v) return null;
    if (v === 'new' || v === 'brand new') return 'new';
    if (v.includes('refurb') || v.includes('renewed')) return 'refurbished';
    if (v.includes('used') || v.includes('fairly') || v.includes('uk used')) return 'used';
    return null;
  }

  private _inferCondition(title: string): 'new' | 'refurbished' | 'used' | null {
    const t = title.toLowerCase();
    if (t.includes('brand new') || t.includes('sealed')) return 'new';
    if (t.includes('uk used') || t.includes('fairly used') || t.includes('tokunbo')) return 'used';
    if (t.includes('refurb')) return 'refurbished';
    return null;
  }

  private _extractBrand(title: string, attrs?: any[]): string | null {
    // Check attrs first
    if (Array.isArray(attrs)) {
      const brandAttr = attrs.find(
        (a: any) => a?.name?.toLowerCase() === 'brand' || a?.name?.toLowerCase() === 'make'
      );
      if (brandAttr?.value && typeof brandAttr.value === 'string') {
        return brandAttr.value.trim();
      }
    }

    // Common brands in Jiji listings
    const brands = [
      'Apple', 'Samsung', 'HP', 'Dell', 'Lenovo', 'Asus', 'Acer', 'LG', 'Sony',
      'Huawei', 'Xiaomi', 'Infinix', 'Tecno', 'Oppo', 'Vivo', 'Nokia', 'Motorola',
      'Microsoft', 'Toshiba', 'MSI', 'Razer', 'Google',
    ];
    for (const brand of brands) {
      if (title.toLowerCase().includes(brand.toLowerCase())) return brand;
    }
    return null;
  }

  async health(): Promise<'healthy' | 'degraded' | 'offline'> {
    try {
      const res = await fetch(`${this.BASE_URL}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5_000),
      });
      return res.ok ? 'healthy' : 'degraded';
    } catch {
      return 'offline';
    }
  }

  supportsRegion(region: string): boolean {
    return ['NG', 'GH', 'KE', 'UG', 'TZ', 'ET'].includes(region.toUpperCase());
  }

  supportsCategory(_category: string): boolean {
    return true;
  }
}
