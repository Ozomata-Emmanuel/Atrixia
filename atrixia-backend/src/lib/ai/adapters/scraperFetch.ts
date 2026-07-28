/**
 * scraperFetch.ts
 *
 * A drop-in replacement for fetch() that routes requests through ScraperAPI
 * when SCRAPER_API_KEY is set in the environment. ScraperAPI handles JS rendering,
 * CAPTCHA solving, and rotating proxies automatically.
 *
 * Usage:
 *   const html = await scraperFetch('https://www.aliexpress.com/...');
 *
 * If SCRAPER_API_KEY is not set it falls through to a plain fetch().
 */

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || '';
const SCRAPER_BASE = 'https://api.scraperapi.com';

interface ScraperOptions {
  /** Enable ScraperAPI's JS rendering (slower but handles React/Next.js SPAs). Default false. */
  render?: boolean;
  /** Country code for geo-targeted scraping, e.g. 'us', 'gb'. Default 'us'. */
  country?: string;
  /** Extra headers to forward. */
  headers?: Record<string, string>;
}

export async function scraperFetch(
  url: string,
  opts: ScraperOptions = {}
): Promise<string> {
  if (!SCRAPER_API_KEY) {
    // No key — plain fetch with a realistic UA
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        ...(opts.headers || {}),
      },
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  }

  // Build the ScraperAPI request URL
  const params = new URLSearchParams({
    api_key: SCRAPER_API_KEY,
    url,
    country_code: opts.country || 'us',
  });

  if (opts.render) {
    params.set('render', 'true');
  }

  const scraperUrl = `${SCRAPER_BASE}?${params.toString()}`;

  const res = await fetch(scraperUrl, {
    headers: { 'Accept-Language': 'en-US,en;q=0.9' },
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(`ScraperAPI returned HTTP ${res.status} for ${url}`);
  }

  return res.text();
}

/** Returns true when ScraperAPI is configured. */
export function hasScraperKey(): boolean {
  return !!SCRAPER_API_KEY;
}
