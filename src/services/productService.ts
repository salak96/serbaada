import youtubeImg from '../assets/youtube.jpg';
import wifiImg from '../assets/wifi.jpg';
import canvaImg from '../assets/canva.jpg';
import googleImg from '../assets/google.jpg';
import vidioImg from '../assets/vidio.png';
import capcutImg from '../assets/capcut.jpg';
import tiktokImg from '../assets/tiktok.jpg';
import igImg from '../assets/ig.jpg';
import museImg from '../assets/muse.svg';
import defaultProductImg from '../assets/default_produk.png';
import { Product } from '../types/product';

interface PrsProduct {
  id: string;
  name: string;
  availability: 'in_stock' | 'out_of_stock';
  price_idr: number;
  description?: string;
  requires_email?: boolean;
}

interface PrsApiResponse {
  code: number;
  success: boolean;
  lang?: string;
  count?: number;
  products: PrsProduct[];
}

interface AbellabProduct {
  id: number | string;
  name: string;
  category?: string;
  price?: number;
  reseller_price?: number;
  base_price?: number;
  stock?: number;
  description?: string;
}

interface AbellabApiResponse {
  ok: boolean;
  products?: AbellabProduct[];
}

const PRS_API_URL = 'https://api.prastyaaneki.biz.id/v1/products?lang=id';
const ABELLAB_API_KEY_FALLBACK = 'res_bb3f9da00d54ee973c74fe50a2c76ba7';

export function getPrsApiKey(): string {
  if (typeof __API_KEY__ !== 'undefined' && __API_KEY__) {
    return __API_KEY__;
  }
  const envKey = import.meta.env.VITE_API_KEY || (import.meta.env as Record<string, string>)['X-API-KEY'];
  return envKey || '';
}

export function getAbellabApiKey(): string {
  if (typeof __ABELLAB_API_KEY__ !== 'undefined' && __ABELLAB_API_KEY__) {
    return __ABELLAB_API_KEY__;
  }
  const envKey = import.meta.env.VITE_ABELLAB_API_KEY || (import.meta.env as Record<string, string>)['ABELLAB_API_KEY'];
  return envKey || ABELLAB_API_KEY_FALLBACK;
}

// Maps products to the 4 canonical categories of Androidstore.web.id:
// 1. Editing & Desain
// 2. AI & Edukasi
// 3. Streaming & Hiburan
// 4. Voucher & Digital
export function inferCategory(text: string, originalCategory = ''): string {
  const n = `${text} ${originalCategory}`.toLowerCase();
  
  if (/api key|token\s*\d+m|token\s*pool|claude api|deepseek api|kimi api|gpt api|anthropic api|groq api|endpoint|developer key/.test(n)) {
    return 'API & Token AI';
  }
  if (/netflix|spotify|youtube|vidio|wetv|viu|disney|prime|hbo|apple music|crunchyroll|iqiyi|deezer|tidal|music|stream|hiburan/.test(n)) {
    return 'Musik, Film & Streaming';
  }
  if (/canva|capcut|picsart|photoshop|lightroom|adobe|illustrator|vrew|clipchamp|alight motion|desain|asset/.test(n)) {
    return 'Desain & Aset Digital';
  }
  if (/mlbb|mobile legends|valorant|genshin|pubg|free fire|steam|epic games|roblox|minecraft|akun game/.test(n)) {
    return 'Akun Game';
  }
  if (/diamond|uc|top up|cp|points|genesis|item game|currency/.test(n)) {
    return 'Item & Currency Game';
  }
  if (/voucher|gift card|google play|itunes|steam wallet|psn|xbox/.test(n)) {
    return 'Voucher & Gift Card';
  }
  if (/windows|office|antivirus|kaspersky|malwarebytes|idm|winrar|license|software/.test(n)) {
    return 'Lisensi Software';
  }
  if (/vpn|nordvpn|expressvpn|surfshark|proxy|socks5|ssh|security/.test(n)) {
    return 'VPN & Keamanan';
  }
  if (/domain|hosting|vps|rdp|email|gsuite|cpanel/.test(n)) {
    return 'Email & Hosting';
  }
  if (/template|source code|script|wordpress|plugin|theme|html/.test(n)) {
    return 'Template & Source Code';
  }
  if (/ebook|kursus|course|tutorial|belajar|udemy/.test(n)) {
    return 'E-book & Kursus';
  }
  if (/followers|likes|views|subscriber|tiktok|instagram|sosmed/.test(n)) {
    return 'Layanan Sosial Media';
  }
  if (/microsoft 365|notion|grammarly|productivity|office/.test(n)) {
    return 'Produktifitas & Office';
  }
  if (/jasa|boosting|joki/.test(n)) {
    return 'Jasa & Boosting';
  }
  if (/chatgpt|openai|claude|gemini|leonardo|deepseek|midjourney|quillbot|elevenlabs|copilot|perplexity|suno|udio|duolingo|akun|subscription|langganan|premium/.test(n)) {
    return 'Akun & Langganan';
  }
  return 'Jasa Digital Lainnya';
}

function getProductImage(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('muse')) return museImg;
  if (n.includes('youtube')) return youtubeImg;
  if (n.includes('capcut')) return capcutImg;
  if (n.includes('canva')) return canvaImg;
  if (n.includes('vidio')) return vidioImg;
  if (n.includes('google play') || n.includes('play store')) return googleImg;
  if (n.includes('wifi') || n.includes('wifi.id')) return wifiImg;
  if (n.includes('tiktok')) return tiktokImg;
  if (n.includes('instagram') || n.includes('ig')) return igImg;
  if (n.includes('netflix') || n.includes('spotify') || n.includes('music') || n.includes('disney') || n.includes('office') || n.includes('microsoft') || n.includes('chatgpt') || n.includes('openai') || n.includes('claude') || n.includes('anthropic') || n.includes('gemini') || n.includes('google') || n.includes('leonardo') || n.includes('vpn') || n.includes('nord') || n.includes('surfshark') || n.includes('email') || n.includes('outlook') || n.includes('hotmail') || n.includes('zoom') || n.includes('wetv') || n.includes('viu') || n.includes('bstation') || n.includes('prime') || n.includes('alight') || n.includes('meitu') || n.includes('wink')) return defaultProductImg;
  
  return defaultProductImg;
}

async function fetchFromPrsDigital(): Promise<Product[]> {
  const apiKey = getPrsApiKey();
  if (!apiKey) return [];

  const response = await fetch(PRS_API_URL, {
    method: 'GET',
    headers: {
      'x-api-key': apiKey,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Prs Digital API error: ${response.status}`);
  }

  const json: PrsApiResponse = await response.json();
  if (!json.products || !Array.isArray(json.products)) {
    return [];
  }

  return json.products.map(item => {
    const markupFactor = 1.35;
    const oldPrice = Math.round((item.price_idr * markupFactor) / 1000) * 1000;
    const discount = oldPrice > item.price_idr
      ? Math.round(((oldPrice - item.price_idr) / oldPrice) * 100)
      : 0;

    const isAvailable = item.availability === 'in_stock';
    const isWholesale = item.price_idr > 10000;
    const wholesalePrice = isWholesale ? Math.round((item.price_idr * 0.9) / 500) * 500 : undefined;

    return {
      id: item.id,
      name: item.name,
      price: item.price_idr,
      oldPrice,
      discount,
      category: inferCategory(item.name),
      image: getProductImage(item.name),
      availability: item.availability,
      stock: isAvailable ? 25 : 0,
      description: item.description,
      requires_email: item.requires_email,
      provider: 'Prs Digital',
      isWholesale,
      wholesaleMin: isWholesale ? 5 : undefined,
      wholesalePrice
    };
  });
}

async function fetchFromAbellab(): Promise<Product[]> {
  const apiKey = getAbellabApiKey();
  if (!apiKey) return [];

  const urls = [
    '/api/abellab/products',
    'https://abellab.biz.id/api/v1/products'
  ];

  let json: AbellabApiResponse | null = null;
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Accept': 'application/json'
        }
      });
      if (response.ok) {
        json = await response.json();
        break;
      }
    } catch {
      // Continue to next URL fallback
    }
  }

  if (!json || !json.products || !Array.isArray(json.products)) {
    return [];
  }

  return json.products.map(item => {
    const finalPrice = item.reseller_price || item.price || item.base_price || 0;
    const markupFactor = 1.35;
    const oldPrice = Math.round((finalPrice * markupFactor) / 1000) * 1000;
    const discount = oldPrice > finalPrice
      ? Math.round(((oldPrice - finalPrice) / oldPrice) * 100)
      : 0;

    const actualStock = typeof item.stock === 'number' ? item.stock : 5;
    const isAvailable = actualStock > 0;
    const isWholesale = finalPrice > 12000;
    const wholesalePrice = isWholesale ? Math.round((finalPrice * 0.88) / 500) * 500 : undefined;

    return {
      id: `ab_${item.id}`,
      name: item.name,
      price: finalPrice,
      oldPrice,
      discount,
      category: inferCategory(`${item.category || ''} ${item.name}`),
      image: getProductImage(item.name),
      availability: isAvailable ? 'in_stock' : 'out_of_stock',
      stock: actualStock,
      description: item.description,
      provider: 'Abellab Reseller',
      isWholesale,
      wholesaleMin: isWholesale ? 5 : undefined,
      wholesalePrice
    };
  });
}

export async function fetchProductsFromApi(): Promise<Product[]> {
  // 1. Try fetching from Master Catalog API first (curated master products with admin custom pricing & images)
  try {
    const res = await fetch('/api/public/products');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.products) && json.products.length > 0) {
        return json.products.map((p: Product) => {
          const isBlockedRemoteImage = p.image?.includes('images.unsplash.com');
          return {
            ...p,
            image: p.image && !isBlockedRemoteImage && (p.image.startsWith('/uploads') || p.image.startsWith('/api/storage') || p.image.startsWith('http'))
              ? p.image
              : getProductImage(p.name)
          };
        });
      }
    }
  } catch {
    // Backend offline or compiling, proceed with live supplier fetch
  }

  // 2. Direct supplier fetch fallback
  const [prsResult, abellabResult] = await Promise.allSettled([
    fetchFromPrsDigital(),
    fetchFromAbellab()
  ]);

  const prsProducts = prsResult.status === 'fulfilled' ? prsResult.value : [];
  const abellabProducts = abellabResult.status === 'fulfilled' ? abellabResult.value : [];

  if (prsResult.status === 'rejected') {
    console.warn('Prs Digital fetch rejected:', prsResult.reason);
  }
  if (abellabResult.status === 'rejected') {
    console.warn('Abellab fetch rejected:', abellabResult.reason);
  }

  const combined = [...prsProducts, ...abellabProducts];

  if (combined.length === 0) {
    throw new Error('Gagal memuat produk dari server API. Mohon periksa API Key atau koneksi internet Anda.');
  }

  // Deduplicate products with exact same ID
  const seenIds = new Set<string | number>();
  const uniqueProducts: Product[] = [];
  for (const item of combined) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      uniqueProducts.push(item);
    }
  }

  return uniqueProducts;
}


