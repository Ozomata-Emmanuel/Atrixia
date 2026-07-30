export interface NormalizedProduct {
  id: string;
  marketplace: 'amazon' | 'ebay' | 'jumia' | 'konga' | 'aliexpress' | 'temu' | 'jiji';
  title: string;
  brand: string | null;
  price: number;
  currency: string;
  image: string | null;
  productUrl: string;
  seller: string | null;
  sellerRating: number | null;
  reviewCount: number | null;
  shippingCost: number | null;
  shippingEstimate: string | null;
  availability: boolean;
  condition: 'new' | 'refurbished' | 'used' | null;
  category: string | null;
  attributes: Record<string, string | number | boolean> | null;
  confidence: number | null;
  rawData: any;

  // Per-product AI-enriched fields (populated after Gemma analysis)
  description: string | null;
  pros: string[];
  cons: string[];
}
