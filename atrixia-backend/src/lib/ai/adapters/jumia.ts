import { IMarketplaceAdapter } from './interface';
import { NormalizedProduct } from '../models/product';
import * as cheerio from 'cheerio';
import { sanitizeQuery } from './querySanitizer';

export class JumiaAdapter implements IMarketplaceAdapter {
  readonly marketplaceName = 'jumia';

  async search(query: string, options?: { category?: string; region?: string }): Promise<NormalizedProduct[]> {
    const clean = sanitizeQuery(query);
    const encodedQuery = encodeURIComponent(clean);
    const targetUrl = `https://www.jumia.com.ng/catalog/?q=${encodedQuery}`;

    let html: string;
    try {
      // Jumia works reliably with direct fetch — skip ScraperAPI for speed
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.jumia.com.ng/',
          'Cache-Control': 'no-cache',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        console.warn(`[JumiaAdapter] Failed to fetch: ${response.status}`);
        return [];
      }

      html = await response.text();
    } catch (err: any) {
      console.error('[JumiaAdapter] Network error:', err.message);
      return [];
    }

    const $ = cheerio.load(html);
    const products: NormalizedProduct[] = [];

    // Jumia renders product cards as <article class="prd ..."> containing <a class="core">
    $('article.prd').each((_, element) => {
      try {
        // The anchor wrapping the whole card
        const coreLink = $(element).find('a.core');
        if (!coreLink.length) return;

        // Title — Jumia uses .name inside the anchor
        const title = coreLink.find('.name').text().trim();
        if (!title) return;

        // Price — Jumia uses .prc, e.g. "₦ 149,990"
        const priceText = coreLink.find('.prc').text().trim();
        const priceMatch = priceText.replace(/[^\d,]/g, '').match(/[\d,]+/);
        const price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 0;
        if (price === 0) return;

        // Product URL
        const href = coreLink.attr('href') || '';
        const productUrl = href.startsWith('http') ? href : `https://www.jumia.com.ng${href}`;

        // Image — lazy-loaded via data-src
        const imgEl = coreLink.find('img');
        const image =
          imgEl.attr('data-src') ||
          imgEl.attr('src') ||
          null;

        // Rating — Jumia uses <div class="stars _s"> with aria-label="4 out of 5"
        // or the text may be "4 out of 5"
        let sellerRating: number | null = null;
        const starsEl = $(element).find('.stars');
        const ariaLabel = starsEl.attr('aria-label') || starsEl.text();
        const ratingMatch = ariaLabel.match(/([\d.]+)\s*out\s*of\s*5/i);
        if (ratingMatch) {
          // Normalise to 0-100 scale
          sellerRating = Math.round((parseFloat(ratingMatch[1]) / 5) * 100);
        }

        // Review count — "(1,234)" adjacent to stars
        const reviewCountText = $(element).find('.rev').text();
        const reviewMatch = reviewCountText.match(/\(?([\d,]+)\)?/);
        const reviewCount = reviewMatch ? parseInt(reviewMatch[1].replace(/,/g, ''), 10) : 0;

        // Jumia Express badge
        const isExpress = $(element).find('.-express, .-xpress, [class*="express"]').length > 0;

        // Old/discounted price — Jumia shows .old inside .prc container
        const oldPriceText = coreLink.find('.old').text().trim();
        const oldPriceMatch = oldPriceText.replace(/[^\d,]/g, '').match(/[\d,]+/);
        const originalPrice = oldPriceMatch ? parseFloat(oldPriceMatch[0].replace(/,/g, '')) : null;

        // Extract brand heuristic from title
        const brandMatch = title.match(/^([A-Z][a-zA-Z]+)/);
        const brand = brandMatch ? brandMatch[1] : null;

        products.push({
          id: `jumia_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          marketplace: 'jumia',
          title,
          brand,
          price,
          currency: 'NGN',
          image,
          productUrl: productUrl.split('?')[0],
          seller: 'Jumia Seller',
          sellerRating,
          reviewCount,
          shippingCost: 0,
          shippingEstimate: isExpress ? 'Jumia Express (1-2 days)' : 'Standard Delivery (3-7 days)',
          availability: true,
          condition: 'new',
          category: options?.category || 'General',
          attributes: originalPrice ? { originalPrice } : {},
          confidence: 80,
          rawData: { express: isExpress },
        });
      } catch (_) {
        // Skip malformed items silently
      }
    });

    if (products.length === 0) {
      console.warn(`[JumiaAdapter] No products parsed for query "${query}". HTML snippet:`, html.slice(0, 500));
    }

    return products.slice(0, 3);
  }

  async health(): Promise<'healthy' | 'degraded' | 'offline'> {
    return 'healthy';
  }

  supportsRegion(region: string): boolean {
    return ['NG', 'KE', 'EG', 'GH', 'MA', 'US'].includes(region.toUpperCase());
  }

  supportsCategory(_category: string): boolean {
    return true;
  }
}
