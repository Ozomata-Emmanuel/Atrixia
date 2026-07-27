import { IMarketplaceAdapter } from './interface';
import { NormalizedProduct } from '../models/product';

// Rich mock dataset categories
const LAPTOPS: Omit<NormalizedProduct, 'id' | 'marketplace'>[] = [
  {
    title: 'Dell XPS 15 9530 Laptop',
    brand: 'Dell',
    price: 1849.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45',
    productUrl: 'https://amazon.com/dp/B0BWMG4M72',
    seller: 'Dell Authorized Store',
    sellerRating: 96,
    reviewCount: 342,
    shippingCost: 0,
    shippingEstimate: '2-3 business days',
    availability: true,
    condition: 'new',
    category: 'Laptops',
    attributes: { ram: '32GB', storage: '1TB SSD', cpu: 'Intel Core i9' },
    confidence: 100,
    rawData: { model: 'XPS 15', stock: 12 }
  },
  {
    title: 'MacBook Air M3 13-inch',
    brand: 'Apple',
    price: 1099.00,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8',
    productUrl: 'https://amazon.com/dp/B0CXF12345',
    seller: 'Apple Store',
    sellerRating: 99,
    reviewCount: 1420,
    shippingCost: 0,
    shippingEstimate: 'Next-day delivery',
    availability: true,
    condition: 'new',
    category: 'Laptops',
    attributes: { ram: '8GB', storage: '256GB SSD', cpu: 'Apple M3' },
    confidence: 100,
    rawData: { apple_care_eligible: true }
  },
  {
    title: 'HP Pavilion 15 Core i5',
    brand: 'HP',
    price: 549.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed',
    productUrl: 'https://ebay.com/itm/123456789',
    seller: 'BestValueElectronics',
    sellerRating: 88,
    reviewCount: 94,
    shippingCost: 15.00,
    shippingEstimate: '5-7 business days',
    availability: true,
    condition: 'new',
    category: 'Laptops',
    attributes: { ram: '16GB', storage: '512GB SSD', cpu: 'Intel Core i5' },
    confidence: 90,
    rawData: { warranty: '1-year depot' }
  },
  {
    title: 'Refurbished Lenovo ThinkPad T490',
    brand: 'Lenovo',
    price: 299.00,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef',
    productUrl: 'https://ebay.com/itm/987654321',
    seller: 'ThinkServerOutlet',
    sellerRating: 94,
    reviewCount: 450,
    shippingCost: 0,
    shippingEstimate: '3-4 business days',
    availability: true,
    condition: 'refurbished',
    category: 'Laptops',
    attributes: { ram: '8GB', storage: '256GB SSD', cpu: 'Intel Core i5-8365U' },
    confidence: 95,
    rawData: { grade: 'A+' }
  }
];

const PHONES: Omit<NormalizedProduct, 'id' | 'marketplace'>[] = [
  {
    title: 'Samsung Galaxy S24 Ultra 512GB',
    brand: 'Samsung',
    price: 1299.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf',
    productUrl: 'https://amazon.com/dp/B0CMGalaxyS24',
    seller: 'Samsung US Official',
    sellerRating: 98,
    reviewCount: 856,
    shippingCost: 0,
    shippingEstimate: '2 business days',
    availability: true,
    condition: 'new',
    category: 'Phones',
    attributes: { storage: '512GB', screen: '6.8 inch', camera: '200MP' },
    confidence: 100,
    rawData: { color: 'Titanium Gray' }
  },
  {
    title: 'iPhone 15 Pro Max 256GB',
    brand: 'Apple',
    price: 1199.00,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5',
    productUrl: 'https://ebay.com/itm/iphone15promax256',
    seller: 'QuickShipCellular',
    sellerRating: 91,
    reviewCount: 201,
    shippingCost: 5.99,
    shippingEstimate: '3 business days',
    availability: true,
    condition: 'new',
    category: 'Phones',
    attributes: { storage: '256GB', screen: '6.7 inch', camera: '48MP' },
    confidence: 100,
    rawData: { unlocked: true }
  },
  {
    title: 'Jumia: Infinix Hot 40 Pro 256GB',
    brand: 'Infinix',
    price: 195000,
    currency: 'NGN',
    image: null,
    productUrl: 'https://jumia.com.ng/infinix-hot-40-pro',
    seller: 'Infinix Mobile Store',
    sellerRating: 85,
    reviewCount: 140,
    shippingCost: 2000,
    shippingEstimate: '2-4 business days',
    availability: true,
    condition: 'new',
    category: 'Phones',
    attributes: { storage: '256GB', ram: '8GB' },
    confidence: 85,
    rawData: { battery: '5000mAh' }
  }
];

const HEADPHONES: Omit<NormalizedProduct, 'id' | 'marketplace'>[] = [
  {
    title: 'Sony WH-1000XM5 Noise Canceling Headphones',
    brand: 'Sony',
    price: 348.00,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
    productUrl: 'https://amazon.com/dp/B09XS7JWHH',
    seller: 'Amazon Retail',
    sellerRating: 99,
    reviewCount: 4521,
    shippingCost: 0,
    shippingEstimate: 'Next-day delivery',
    availability: true,
    condition: 'new',
    category: 'Headphones',
    attributes: { battery: '30h', anc: true },
    confidence: 100,
    rawData: { color: 'Black' }
  },
  {
    title: 'Bose QuietComfort Ultra Headphones',
    brand: 'Bose',
    price: 379.00,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b',
    productUrl: 'https://ebay.com/itm/bosequietcomfortultra',
    seller: 'DirectBoseOutlet',
    sellerRating: 97,
    reviewCount: 180,
    shippingCost: 0,
    shippingEstimate: '3 business days',
    availability: true,
    condition: 'new',
    category: 'Headphones',
    attributes: { battery: '24h', anc: true },
    confidence: 100,
    rawData: { immersive_audio: true }
  }
];

const CONSOLES: Omit<NormalizedProduct, 'id' | 'marketplace'>[] = [
  {
    title: 'PlayStation 5 Slim Digital Edition',
    brand: 'Sony',
    price: 449.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db',
    productUrl: 'https://amazon.com/dp/B0CKF5SLIM',
    seller: 'Sony PlayStation Store',
    sellerRating: 97,
    reviewCount: 1540,
    shippingCost: 0,
    shippingEstimate: '2 days delivery',
    availability: true,
    condition: 'new',
    category: 'Gaming Consoles',
    attributes: { storage: '1TB SSD', resolution: '4K UHD' },
    confidence: 100,
    rawData: { weight: '3.2kg' }
  },
  {
    title: 'Nintendo Switch OLED Model',
    brand: 'Nintendo',
    price: 349.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477',
    productUrl: 'https://ebay.com/itm/nintendoswitcholed',
    seller: 'Nintendo_Authorized_Store',
    sellerRating: 99,
    reviewCount: 4230,
    shippingCost: 0,
    shippingEstimate: '2-4 business days',
    availability: true,
    condition: 'new',
    category: 'Gaming Consoles',
    attributes: { screen: '7 inch OLED', storage: '64GB' },
    confidence: 100,
    rawData: { model: 'OLED' }
  }
];

const CHAIRS: Omit<NormalizedProduct, 'id' | 'marketplace'>[] = [
  {
    title: 'Herman Miller Aeron Chair Size B',
    brand: 'Herman Miller',
    price: 1450.00,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b',
    productUrl: 'https://amazon.com/dp/B01HMARONB',
    seller: 'OfficeDesignDirect',
    sellerRating: 94,
    reviewCount: 89,
    shippingCost: 75.00,
    shippingEstimate: '4-7 business days',
    availability: true,
    condition: 'new',
    category: 'Office Chairs',
    attributes: { tilt: 'adjustable', lumbar: 'PostureFit SL' },
    confidence: 95,
    rawData: { color: 'Graphite' }
  },
  {
    title: 'Ergonomic Mesh Lumbar Desk Chair',
    brand: 'Steelcase',
    price: 149.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1580481072988-1ef3405400ae',
    productUrl: 'https://amazon.com/dp/B08DESKCHAIR',
    seller: 'ErgoStore Online',
    sellerRating: 98,
    reviewCount: 452,
    shippingCost: 0,
    shippingEstimate: '2-3 business days',
    availability: true,
    condition: 'new',
    category: 'Office Chairs',
    attributes: { adjustment: '3D Armrests', lumbar: 'adjustable' },
    confidence: 94,
    rawData: { structure: 'nylon frame' }
  }
];

const MONITORS: Omit<NormalizedProduct, 'id' | 'marketplace'>[] = [
  {
    title: 'Dell UltraSharp U2723QE 27-inch 4K Monitor',
    brand: 'Dell',
    price: 529.00,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf',
    productUrl: 'https://amazon.com/dp/B09VUltraSharpQE',
    seller: 'Dell Retail',
    sellerRating: 96,
    reviewCount: 680,
    shippingCost: 0,
    shippingEstimate: '3-4 business days',
    availability: true,
    condition: 'new',
    category: 'Monitors',
    attributes: { size: '27-inch', resolution: '3840x2160', panel: 'IPS Black' },
    confidence: 100,
    rawData: { hub: 'USB-C hub integrated' }
  },
  {
    title: 'Gigabyte M27Q 27-inch 170Hz QHD Gaming Monitor',
    brand: 'Gigabyte',
    price: 279.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a',
    productUrl: 'https://ebay.com/itm/gigabytem27q170hz',
    seller: 'ComputeOutlet',
    sellerRating: 92,
    reviewCount: 430,
    shippingCost: 9.99,
    shippingEstimate: '4 business days',
    availability: true,
    condition: 'new',
    category: 'Monitors',
    attributes: { size: '27-inch', resolution: '2560x1440', hz: 170 },
    confidence: 95,
    rawData: { kvm: 'integrated KVM switch' }
  }
];

export class MockAdapter implements IMarketplaceAdapter {
  readonly marketplaceName = 'mock';

  async search(query: string, options?: { category?: string; region?: string }): Promise<NormalizedProduct[]> {
    const cleanQuery = query.toLowerCase();
    let selectedSet: Omit<NormalizedProduct, 'id' | 'marketplace'>[] = [];

    if (cleanQuery.includes('laptop') || cleanQuery.includes('macbook') || cleanQuery.includes('thinkpad') || cleanQuery.includes('dell xps')) {
      selectedSet = LAPTOPS;
    } else if (cleanQuery.includes('phone') || cleanQuery.includes('galaxy') || cleanQuery.includes('iphone') || cleanQuery.includes('infinix')) {
      selectedSet = PHONES;
    } else if (cleanQuery.includes('headphone') || cleanQuery.includes('sony wh') || cleanQuery.includes('bose')) {
      selectedSet = HEADPHONES;
    } else if (cleanQuery.includes('console') || cleanQuery.includes('ps5') || cleanQuery.includes('nintendo') || cleanQuery.includes('switch')) {
      selectedSet = CONSOLES;
    } else if (cleanQuery.includes('chair') || cleanQuery.includes('aeron') || cleanQuery.includes('desk chair')) {
      selectedSet = CHAIRS;
    } else if (cleanQuery.includes('monitor') || cleanQuery.includes('ultrasharp') || cleanQuery.includes('gaming monitor')) {
      selectedSet = MONITORS;
    } else {
      // General fallback mix of some random assets if no search matches
      selectedSet = [...LAPTOPS.slice(0, 1), ...PHONES.slice(0, 1), ...CHAIRS.slice(0, 1)];
    }

    return selectedSet.map((item, idx) => ({
      ...item,
      id: `mock_item_${idx}_${Date.now()}`,
      marketplace: 'mock'
    }));
  }

  async health(): Promise<'healthy' | 'degraded' | 'offline'> {
    return 'healthy';
  }

  supportsRegion(region: string): boolean {
    return true;
  }

  supportsCategory(category: string): boolean {
    return true;
  }
}
