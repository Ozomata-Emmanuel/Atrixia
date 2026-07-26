import { NormalizedProduct } from '../models/product';

const BRAND_MAP: Record<string, string> = {
  'dell': 'Dell',
  'apple': 'Apple',
  'hp': 'HP',
  'lenovo': 'Lenovo',
  'samsung': 'Samsung',
  'infinix': 'Infinix',
  'sony': 'Sony',
  'bose': 'Bose',
  'nintendo': 'Nintendo',
  'herman miller': 'Herman Miller',
  'steelcase': 'Steelcase',
  'gigabyte': 'Gigabyte',
};

const CURRENCY_RATES: Record<string, number> = {
  'USD': 1.0,
  'EUR': 1.09,
  'GBP': 1.28,
  'NGN': 0.00067, 
};

export class MarketplaceNormalizer {
  public static normalizeBrand(brand: string | null): string | null {
    if (!brand) return null;
    const cleanBrand = brand.toLowerCase().trim();
    for (const key of Object.keys(BRAND_MAP)) {
      if (cleanBrand.includes(key)) {
        return BRAND_MAP[key];
      }
    }
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  }

  public static convertPrice(price: number, fromCurrency: string, toCurrency = 'USD'): number {
    const fromRate = CURRENCY_RATES[fromCurrency.toUpperCase()] || 1.0;
    const toRate = CURRENCY_RATES[toCurrency.toUpperCase()] || 1.0;
    const priceInUSD = price * fromRate;
    return parseFloat((priceInUSD / toRate).toFixed(2));
  }

  public static computeTitleSimilarity(titleA: string, titleB: string): number {
    const getWords = (str: string) => new Set(
      str.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2 && !['new', 'boxed', 'with', 'and', 'for'].includes(word))
    );

    const setA = getWords(titleA);
    const setB = getWords(titleB);

    if (setA.size === 0 || setB.size === 0) return 0;

    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);

    return (intersection.size / union.size) * 100;
  }

  public static deduplicateProducts(products: NormalizedProduct[], similarityThreshold = 85): NormalizedProduct[] {
    const result: NormalizedProduct[] = [];

    for (const product of products) {
      let isDuplicate = false;

      for (const existing of result) {
        if (product.marketplace === existing.marketplace) {
          const similarity = this.computeTitleSimilarity(product.title, existing.title);
          if (similarity >= similarityThreshold) {
            isDuplicate = true;
            if (product.price < existing.price) {
              const idx = result.indexOf(existing);
              result[idx] = product;
            }
            break;
          }
        }
      }

      if (!isDuplicate) {
        result.push(product);
      }
    }

    return result;
  }

  public static normalizeProduct(product: NormalizedProduct, targetCurrency = 'USD'): NormalizedProduct {
    return {
      ...product,
      brand: this.normalizeBrand(product.brand),
      price: product.currency.toUpperCase() === targetCurrency.toUpperCase() 
        ? product.price 
        : this.convertPrice(product.price, product.currency, targetCurrency),
      currency: targetCurrency.toUpperCase(),
      shippingCost: product.shippingCost !== null 
        ? (product.currency.toUpperCase() === targetCurrency.toUpperCase()
          ? product.shippingCost
          : this.convertPrice(product.shippingCost, product.currency, targetCurrency))
        : null,
      availability: !!product.availability,
      condition: product.condition || 'new',
    };
  }
}
