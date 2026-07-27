export interface NormalizedProduct {
  id: string;
  marketplace: 'amazon' | 'ebay' | 'jumia' | 'aliexpress' | 'temu' | 'mock';
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
}
