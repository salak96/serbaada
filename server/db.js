import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { encryptCredential, decryptCredential, maskApiKey } from './utils/crypto.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const DATA_DIR = path.join(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let mysqlPool = null;
let isUsingFallback = false;

function hashAdminPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, encodedHash) {
  const [algorithm, salt, storedHash] = String(encodedHash || '').split(':');
  if (algorithm !== 'scrypt' || !salt || !storedHash) return false;

  const expected = Buffer.from(storedHash, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function safeTextEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

// Initial Seed Data for Local Fallback Repository
function getDefaultStore() {
  const prsKey = process.env.VITE_API_KEY || process.env['X-API-KEY'] || '';
  const abellabKey = process.env.VITE_ABELLAB_API_KEY || process.env.ABELLAB_API_KEY || 'res_bb3f9da00d54ee973c74fe50a2c76ba7';

  return {
    sellers: [
      {
        id: 1,
        name: 'Prs Digital',
        slug: 'prs-digital',
        base_url: 'https://api.prastyaaneki.biz.id/v1',
        auth_type: 'header',
        auth_header_key: 'x-api-key',
        encrypted_api_key: encryptCredential(prsKey),
        encrypted_api_secret: '',
        endpoint_products: '/products?lang=id',
        endpoint_product_detail: '/products/{id}',
        endpoint_stock: '/products/{id}',
        endpoint_order: '/order',
        endpoint_check_order: '/order/{id}',
        request_format: 'json',
        is_active: 1,
        sync_interval_minutes: 60,
        last_synced_at: new Date().toISOString(),
        last_status: 'connected',
        last_error_message: null
      },
      {
        id: 2,
        name: 'Abellab Reseller',
        slug: 'abellab-reseller',
        base_url: 'https://abellab.biz.id/api/v1',
        auth_type: 'header',
        auth_header_key: 'x-api-key',
        encrypted_api_key: encryptCredential(abellabKey),
        encrypted_api_secret: '',
        endpoint_products: '/products',
        endpoint_product_detail: '/products',
        endpoint_stock: '/products',
        endpoint_order: '/order',
        endpoint_check_order: '/order/{id}',
        request_format: 'json',
        is_active: 1,
        sync_interval_minutes: 60,
        last_synced_at: new Date().toISOString(),
        last_status: 'connected',
        last_error_message: null
      }
    ],
    supplier_products: [],
    master_products: [],
    orders: [],
    customers: [
      { id: 1, name: 'Paijo', phone: '628123412134', email: 'paijo@gmail.com', is_active: 1, created_at: new Date().toISOString() },
      { id: 2, name: 'Simon', phone: '628123456789', email: 'simon@gmail.com', is_active: 1, created_at: new Date().toISOString() }
    ],
    api_logs: [],
    price_history: [],
    settings: {
      store_name: 'Androidstore.web.id',
      whatsapp_number: '6285867336036',
      default_markup_percent: '25',
      maintenance_mode: 'false',
      auto_sync_enabled: 'true'
    }
  };
}

function normalizeProductName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferCategoryServer(text, originalCategory = '') {
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

function loadLocalStore() {
  if (!fs.existsSync(STORE_PATH)) {
    const initial = getDefaultStore();
    fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    const data = JSON.parse(raw);



    // Re-map categories to new 16 categories
    if (Array.isArray(data.master_products)) {
      for (const p of data.master_products) {
        p.category = inferCategoryServer(p.name, p.category || '');
      }
    }
    if (Array.isArray(data.supplier_products)) {
      for (const p of data.supplier_products) {
        p.original_category = inferCategoryServer(p.name, p.original_category || '');
      }
    }

    // Strict Deduplication Pass for Master Products using normalized names & seller IDs
    if (Array.isArray(data.master_products)) {
      const uniqueMap = new Map();
      const cleaned = [];
      for (const p of data.master_products) {
        const normName = normalizeProductName(p.name);
        const key = `${p.primary_seller_id || 0}_${p.external_product_id || ''}_${normName}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, true);
          cleaned.push(p);
        }
      }
      data.master_products = cleaned;
      fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    }

    return data;
  } catch {
    return getDefaultStore();
  }
}

function saveLocalStore(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('✖ [Database] Failed to write store.json. Permission error on VPS:', err);
    throw new Error('Gagal menyimpan ke server (I/O Permission Error). Pastikan folder server/data memiliki izin tulis (chmod 777 atau chown).');
  }
}

/**
 * Initialize Database Connection: Attempts MySQL 8, falls back seamlessly to Local Storage
 */
export async function initDatabase() {
  try {
    mysqlPool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'androidstore_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    const conn = await mysqlPool.getConnection();
    await conn.query('SELECT 1');
    conn.release();
    console.log('✓ [Database] Connected successfully to MySQL 8 on port', process.env.DB_PORT || 3306);
    isUsingFallback = false;
  } catch (err) {
    console.warn(`! [Database] MySQL not reachable (${err.code || err.message}). Switching to Embedded High-Performance Storage.`);
    isUsingFallback = true;
    mysqlPool = null;
    loadLocalStore();
  }
}

// ==========================================
// SELLER MANAGEMENT METHODS
// ==========================================
export async function getSellers() {
  const store = loadLocalStore();
  return store.sellers.map(s => {
    let apiKey = '';
    try {
      apiKey = decryptCredential(s.encrypted_api_key);
    } catch {
      apiKey = s.encrypted_api_key || '';
    }
    return {
      ...s,
      masked_key: maskApiKey(apiKey),
      has_secret: !!s.encrypted_api_secret
    };
  });
}

export async function getSellerById(id, includeDecrypted = false) {
  const store = loadLocalStore();
  const seller = store.sellers.find(s => s.id === Number(id));
  if (!seller) return null;
  let apiKey = '';
  let apiSecret = '';
  try {
    apiKey = decryptCredential(seller.encrypted_api_key);
  } catch {
    apiKey = seller.encrypted_api_key || '';
  }
  try {
    apiSecret = decryptCredential(seller.encrypted_api_secret);
  } catch {
    apiSecret = seller.encrypted_api_secret || '';
  }
  return {
    ...seller,
    api_key: includeDecrypted ? apiKey : undefined,
    api_secret: includeDecrypted ? apiSecret : undefined,
    masked_key: maskApiKey(apiKey)
  };
}

export async function saveSeller(data) {
  const store = loadLocalStore();
  let id = Number(data.id);

  const encryptedKey = data.api_key ? encryptCredential(data.api_key) : undefined;
  const encryptedSecret = data.api_secret ? encryptCredential(data.api_secret) : undefined;

  if (id) {
    const idx = store.sellers.findIndex(s => s.id === id);
    if (idx !== -1) {
      store.sellers[idx] = {
        ...store.sellers[idx],
        ...data,
        id,
        encrypted_api_key: encryptedKey || store.sellers[idx].encrypted_api_key,
        encrypted_api_secret: encryptedSecret !== undefined ? encryptedSecret : store.sellers[idx].encrypted_api_secret,
        updated_at: new Date().toISOString()
      };
    }
  } else {
    id = store.sellers.length ? Math.max(...store.sellers.map(s => s.id)) + 1 : 1;
    const newSeller = {
      id,
      name: data.name,
      slug: data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      base_url: data.base_url,
      auth_type: data.auth_type || 'header',
      auth_header_key: data.auth_header_key || 'x-api-key',
      encrypted_api_key: encryptedKey || '',
      encrypted_api_secret: encryptedSecret || '',
      endpoint_products: data.endpoint_products || '/v1/products',
      endpoint_product_detail: data.endpoint_product_detail || '/v1/products/{id}',
      endpoint_stock: data.endpoint_stock || '/v1/products/{id}',
      endpoint_order: data.endpoint_order || '/v1/order',
      endpoint_check_order: data.endpoint_check_order || '/v1/order/{id}',
      request_format: data.request_format || 'json',
      is_active: data.is_active ?? 1,
      sync_interval_minutes: Number(data.sync_interval_minutes) || 60,
      last_synced_at: null,
      last_status: 'pending',
      last_error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    store.sellers.push(newSeller);
  }

  saveLocalStore(store);
  return getSellerById(id);
}

export async function deleteSeller(id) {
  const store = loadLocalStore();
  store.sellers = store.sellers.filter(s => s.id !== Number(id));
  store.supplier_products = store.supplier_products.filter(p => p.seller_id !== Number(id));
  saveLocalStore(store);
  return { success: true };
}

export async function updateSellerStatus(id, status, errorMsg = null) {
  const store = loadLocalStore();
  const seller = store.sellers.find(s => s.id === Number(id));
  if (seller) {
    seller.last_status = status;
    seller.last_error_message = errorMsg;
    if (status === 'connected') {
      seller.last_synced_at = new Date().toISOString();
    }
    saveLocalStore(store);
  }
}

// ==========================================
// SUPPLIER PRODUCTS REPOSITORY
// ==========================================
export async function getSupplierProducts(filters = {}) {
  const store = loadLocalStore();
  let list = store.supplier_products;

  if (filters.seller_id) {
    list = list.filter(p => p.seller_id === Number(filters.seller_id));
  }
  if (filters.search) {
    const s = filters.search.toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(s));
  }
  if (filters.is_available !== undefined) {
    list = list.filter(p => p.is_available === Number(filters.is_available));
  }

  // Attach seller name
  const sellerMap = new Map(store.sellers.map(s => [s.id, s.name]));
  return list.map(p => ({
    ...p,
    seller_name: sellerMap.get(p.seller_id) || 'Unknown Seller'
  }));
}

export async function saveSupplierProductsBatch(sellerId, products) {
  const store = loadLocalStore();
  const now = new Date().toISOString();

  let inserted = 0;
  let updated = 0;

  for (const item of products) {
    const idx = store.supplier_products.findIndex(
      p => p.seller_id === Number(sellerId) && p.external_product_id === String(item.external_product_id)
    );

    if (idx !== -1) {
      store.supplier_products[idx] = {
        ...store.supplier_products[idx],
        name: item.name,
        original_category: item.original_category || store.supplier_products[idx].original_category,
        cost_price: item.cost_price,
        stock: item.stock,
        is_available: item.is_available,
        description: item.description || store.supplier_products[idx].description,
        image_url: item.image_url || store.supplier_products[idx].image_url,
        requires_email: item.requires_email ?? store.supplier_products[idx].requires_email,
        raw_response: item.raw_response,
        last_synced_at: now
      };
      updated++;
    } else {
      const newId = store.supplier_products.length ? Math.max(...store.supplier_products.map(p => p.id || 0)) + 1 : 1;
      store.supplier_products.push({
        id: newId,
        seller_id: Number(sellerId),
        external_product_id: String(item.external_product_id),
        name: item.name,
        original_category: item.original_category || 'Digital',
        cost_price: item.cost_price,
        stock: item.stock,
        is_available: item.is_available,
        description: item.description || '',
        image_url: item.image_url || '',
        requires_email: !!item.requires_email,
        raw_response: item.raw_response,
        last_synced_at: now,
        created_at: now
      });
      inserted++;
    }
  }

  saveLocalStore(store);
  return { inserted, updated, total: products.length };
}

export async function saveSupplierProduct(data) {
  const store = loadLocalStore();
  let id = Number(data.id);
  const now = new Date().toISOString();

  if (id) {
    const idx = store.supplier_products.findIndex(p => p.id === id);
    if (idx !== -1) {
      store.supplier_products[idx] = {
        ...store.supplier_products[idx],
        ...data,
        id,
        cost_price: Number(data.cost_price || 0),
        stock: Number(data.stock || 0),
        is_available: Number(data.stock || 0) > 0 ? 1 : 0,
        updated_at: now
      };
    }
  } else {
    id = store.supplier_products.length ? Math.max(...store.supplier_products.map(p => p.id || 0)) + 1 : 1;
    const newProd = {
      id,
      seller_id: Number(data.seller_id || 1),
      external_product_id: data.external_product_id || `manual_${Date.now()}`,
      name: data.name,
      original_category: data.original_category || 'Voucher & Digital',
      cost_price: Number(data.cost_price || 0),
      stock: Number(data.stock || 25),
      is_available: Number(data.stock || 25) > 0 ? 1 : 0,
      description: data.description || '',
      image_url: data.image_url || '',
      requires_email: !!data.requires_email,
      created_at: now,
      updated_at: now
    };
    store.supplier_products.push(newProd);
  }

  saveLocalStore(store);
  return store.supplier_products.find(p => p.id === id);
}

export async function deleteSupplierProduct(id) {
  const store = loadLocalStore();
  const idx = store.supplier_products.findIndex(p => p.id === Number(id));
  if (idx !== -1) {
    store.supplier_products[idx].is_available = 0;
    store.supplier_products[idx].stock = 0;
    saveLocalStore(store);
  }
  return { success: true };
}

// ==========================================
// MASTER CATALOG REPOSITORY
// ==========================================
export async function getMasterProducts(filters = {}) {
  const store = loadLocalStore();
  let list = store.master_products;

  if (filters.category && filters.category !== 'Semua') {
    list = list.filter(p => p.category === filters.category);
  }
  if (filters.search) {
    const s = filters.search.toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(s));
  }
  if (filters.is_active !== undefined) {
    list = list.filter(p => p.is_active === Number(filters.is_active));
  }

  const sellerMap = new Map(store.sellers.map(s => [s.id, s.name]));
  return list.map(p => ({
    ...p,
    primary_seller_name: sellerMap.get(p.primary_seller_id) || 'Auto',
    backup_seller_name: sellerMap.get(p.backup_seller_id) || 'None'
  }));
}

export async function getMasterProductById(id) {
  const store = loadLocalStore();
  return store.master_products.find(p => p.id === Number(id) || p.slug === String(id)) || null;
}

export async function saveMasterProduct(data) {
  const store = loadLocalStore();
  let id = Number(data.id);
  const now = new Date().toISOString();

  if (id) {
    const idx = store.master_products.findIndex(p => p.id === id);
    if (idx !== -1) {
      store.master_products[idx] = {
        ...store.master_products[idx],
        ...data,
        id,
        updated_at: now
      };
    }
  } else {
    id = store.master_products.length ? Math.max(...store.master_products.map(p => p.id || 0)) + 1 : 1;
    const newMaster = {
      id,
      slug: data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: data.name,
      category: data.category || 'Voucher & Digital',
      description: data.description || '',
      cost_price: Number(data.cost_price || 0),
      selling_price: Number(data.selling_price || 0),
      old_price: Number(data.old_price || 0),
      discount: Number(data.discount || 0),
      pricing_mode: data.pricing_mode || 'manual',
      markup_value: Number(data.markup_value || 0),
      is_wholesale: data.is_wholesale ? 1 : 0,
      wholesale_min: Number(data.wholesale_min || 5),
      wholesale_price: Number(data.wholesale_price || 0),
      primary_seller_id: data.primary_seller_id ? Number(data.primary_seller_id) : null,
      backup_seller_id: data.backup_seller_id ? Number(data.backup_seller_id) : null,
      image_type: data.image_type || 'supplier',
      custom_image_url: data.custom_image_url || '',
      is_active: data.is_active ?? 1,
      is_featured: data.is_featured ?? 0,
      stock_display_mode: data.stock_display_mode || 'real',
      custom_stock: Number(data.custom_stock || 25),
      created_at: now,
      updated_at: now
    };
    store.master_products.push(newMaster);
  }

  saveLocalStore(store);
  return getMasterProductById(id);
}

export async function deleteMasterProduct(id) {
  const store = loadLocalStore();
  store.master_products = store.master_products.filter(p => p.id !== Number(id));
  saveLocalStore(store);
  return { success: true };
}

export async function deleteAllMasterProducts() {
  const store = loadLocalStore();
  store.master_products = [];
  saveLocalStore(store);
  return { success: true, message: 'Semua produk Master Katalog berhasil dihapus.' };
}

export async function deleteMultipleMasterProducts(ids) {
  const store = loadLocalStore();
  const idSet = new Set((ids || []).map(id => Number(id)));
  store.master_products = store.master_products.filter(p => !idSet.has(Number(p.id)));
  saveLocalStore(store);
  return { success: true, message: 'Produk terpilih berhasil dihapus dari Master Katalog.' };
}

// ==========================================
// IMPORT SUPPLIER PRODUCT TO MASTER
// ==========================================
export async function importSupplierToMaster(supplierProductId, markupPercent = 25) {
  const store = loadLocalStore();
  const suppProd = store.supplier_products.find(p => p.id === Number(supplierProductId));
  if (!suppProd) throw new Error('Supplier product not found');

  const suppNorm = normalizeProductName(suppProd.name);

  // Check if master product already exists linked to this supplier product, external ID + seller, or normalized name + seller
  let existingMaster = store.master_products.find(
    p => Number(p.supplier_product_id) === Number(suppProd.id) ||
         (String(p.external_product_id) === String(suppProd.external_product_id) && Number(p.primary_seller_id) === Number(suppProd.seller_id)) ||
         (p.name && normalizeProductName(p.name) === suppNorm && Number(p.primary_seller_id) === Number(suppProd.seller_id))
  );

  const cost = suppProd.cost_price;
  const markup = Number(markupPercent || 25);
  const now = new Date().toISOString();

  if (existingMaster) {
    // Update existing master product safely
    existingMaster.cost_price = cost;
    existingMaster.supplier_product_id = suppProd.id;
    existingMaster.external_product_id = suppProd.external_product_id;
    existingMaster.primary_seller_id = suppProd.seller_id;
    existingMaster.custom_stock = suppProd.stock;
    existingMaster.updated_at = now;
    if (!existingMaster.custom_image_url && suppProd.image_url) {
      existingMaster.custom_image_url = suppProd.image_url;
    }
    saveLocalStore(store);
    return { action: 'updated', product: existingMaster };
  }

  // Infer canonical category
  const category = inferCategoryServer(suppProd.name, suppProd.description || suppProd.original_category || '');

  const selling = Math.round((cost * (1 + markup / 100)) / 500) * 500;
  const oldPrice = Math.round((selling * 1.35) / 1000) * 1000;
  const newId = store.master_products.length ? Math.max(...store.master_products.map(p => p.id || 0)) + 1 : 1;

  const newMaster = {
    id: newId,
    slug: suppProd.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + newId,
    name: suppProd.name,
    category,
    description: suppProd.description || '',
    cost_price: cost,
    selling_price: selling,
    old_price: oldPrice,
    discount: Math.round(((oldPrice - selling) / oldPrice) * 100),
    pricing_mode: 'markup_percent',
    markup_value: markup,
    primary_seller_id: suppProd.seller_id,
    supplier_product_id: suppProd.id,
    external_product_id: suppProd.external_product_id,
    image_type: 'supplier',
    custom_image_url: suppProd.image_url || '',
    is_active: 1,
    is_featured: 0,
    stock_display_mode: 'real',
    custom_stock: suppProd.stock || 25,
    is_wholesale: cost > 12000 ? 1 : 0,
    wholesale_min: 5,
    wholesale_price: cost > 12000 ? Math.round((selling * 0.9) / 500) * 500 : 0,
    created_at: now,
    updated_at: now
  };

  store.master_products.push(newMaster);
  saveLocalStore(store);
  return { action: 'added', product: newMaster };
}

// ==========================================
// API LOGS & MONITORING
// ==========================================
export async function addApiLog(logData) {
  const store = loadLocalStore();
  const id = store.api_logs.length ? Math.max(...store.api_logs.map(l => l.id || 0)) + 1 : 1;
  const log = {
    id,
    seller_id: logData.seller_id ? Number(logData.seller_id) : null,
    seller_name: logData.seller_name || 'System',
    request_url: logData.request_url || '',
    request_method: logData.request_method || 'GET',
    http_status: logData.http_status || 0,
    duration_ms: logData.duration_ms || 0,
    request_payload: logData.request_payload || null,
    response_summary: logData.response_summary || null,
    is_success: logData.is_success ? 1 : 0,
    error_message: logData.error_message || null,
    created_at: new Date().toISOString()
  };

  store.api_logs.unshift(log);
  if (store.api_logs.length > 200) {
    store.api_logs = store.api_logs.slice(0, 200);
  }
  saveLocalStore(store);
  return log;
}

export async function getApiLogs(limit = 50) {
  const store = loadLocalStore();
  return store.api_logs.slice(0, Number(limit));
}

// ==========================================
// ORDERS & TRANSACTIONS
// ==========================================
export async function getOrders() {
  const store = loadLocalStore();
  const sellerMap = new Map(store.sellers.map(s => [Number(s.id), s.name]));
  const masters = Array.isArray(store.master_products) ? store.master_products : [];

  return store.orders.map(order => {
    const productText = String(order.product_name || '');
    const matchedProviders = masters
      .filter(master => {
        if (!master.name) return false;
        return productText.toLowerCase().includes(String(master.name).toLowerCase());
      })
      .map(master => sellerMap.get(Number(master.primary_seller_id)) || 'Produk Manual');

    const verifiedSupplier = matchedProviders[0];
    const storedProvider = order.product_provider;
    const provider = verifiedSupplier || storedProvider || 'Produk Manual';

    let calcTotalCost = 0;
    let calcTotalSale = 0;

    const products = Array.isArray(order.products)
      ? order.products.map(item => {
          const matchedMaster = masters.find(m => m.name && item.name && m.name.toLowerCase() === item.name.toLowerCase());
          const supplierId = matchedMaster ? Number(matchedMaster.primary_seller_id || 1) : (item.supplier_id || 1);
          const supplierName = sellerMap.get(supplierId) || item.supplier_name || item.provider || provider;
          const supplierCost = Number(item.supplier_cost !== undefined ? item.supplier_cost : (matchedMaster ? matchedMaster.cost_price : (item.price ? Math.round(item.price * 0.7) : 15000)));
          const customerPrice = Number(item.customer_price !== undefined ? item.customer_price : (item.price || 25000));
          const quantity = Number(item.quantity || 1);

          const subtotalCost = supplierCost * quantity;
          const subtotalSale = customerPrice * quantity;
          const profit = subtotalSale - subtotalCost;

          calcTotalCost += subtotalCost;
          calcTotalSale += subtotalSale;

          return {
            ...item,
            supplier_name: supplierName,
            supplier_id: supplierId,
            supplier_product_id: matchedMaster?.external_product_id || item.supplier_product_id || 'manual',
            quantity,
            supplier_cost: supplierCost,
            customer_price: customerPrice,
            subtotal_cost: subtotalCost,
            subtotal_sale: subtotalSale,
            profit,
            provider: supplierName
          };
        })
      : [];

    const totalAmount = Number(order.total_amount || calcTotalSale || 25000);
    const totalCost = Number(order.total_cost || calcTotalCost || Math.round(totalAmount * 0.7));
    const grossProfit = Number(order.gross_profit !== undefined ? order.gross_profit : (totalAmount - totalCost));
    const gatewayFee = Number(order.gateway_fee !== undefined ? order.gateway_fee : Math.round(totalAmount * 0.015));
    const additionalFee = Number(order.additional_fee || 0);
    const netProfit = Number(order.net_profit !== undefined ? order.net_profit : (grossProfit - gatewayFee - additionalFee));

    return {
      ...order,
      product_provider: provider,
      products,
      total_amount: totalAmount,
      total_cost: totalCost,
      gross_profit: grossProfit,
      gateway_fee: gatewayFee,
      additional_fee: additionalFee,
      net_profit: netProfit
    };
  });
}

export async function sendTelegramNotification(order) {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.TG_BOT_TOKEN || '';
  const chatId = process.env.TELEGRAM_CHAT_ID || process.env.TG_CHAT_ID || '';
  
  console.log('🤖 [Telegram Bot] Attempting notification. Token present:', !!token, 'Chat ID present:', !!chatId);
  if (!token || !chatId) {
    console.log('⚠ [Telegram Bot] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not configured in .env');
    return;
  }

  try {
    const text = `🔔 *PESANAN BARU MASUK!*

🆔 Invoice: \`${order.invoice_number}\`
👤 Pelanggan: *${order.customer_name}* (\`${order.customer_phone}\`)
💳 Metode: ${order.payment_method || 'QRIS Instant'}
💰 Total: *Rp ${Number(order.total_amount || 0).toLocaleString('id-ID')}*
📦 Produk: ${order.product_name || 'Produk Digital'}

🚀 Silakan cek Admin Console untuk verifikasi pembayaran & proses order.`;

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown'
      })
    });
    const result = await response.json();
    if (result.ok) {
      console.log('✓ [Telegram Bot] Notification sent successfully for order:', order.invoice_number);
    } else {
      console.error('✖ [Telegram Bot] Error response from Telegram API:', result);
    }
  } catch (err) {
    console.error('✖ [Telegram Bot] Failed to send Telegram notification:', err);
  }
}

export async function saveOrder(orderData) {
  const store = loadLocalStore();
  const id = store.orders.length ? Math.max(...store.orders.map(o => o.id || 0)) + 1 : 1;
  const invoice = orderData.invoice_number || `INV-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(id).padStart(3, '0')}`;
  
  const sellerMap = new Map(store.sellers.map(s => [Number(s.id), s.name]));
  const masters = Array.isArray(store.master_products) ? store.master_products : [];

  let calculatedTotalCost = 0;
  let calculatedTotalSale = 0;

  const enrichedProducts = Array.isArray(orderData.products) ? orderData.products.map(item => {
    const matchedMaster = masters.find(m => m.name && item.name && m.name.toLowerCase() === item.name.toLowerCase());
    const supplierId = matchedMaster ? Number(matchedMaster.primary_seller_id || 1) : 1;
    const supplierName = sellerMap.get(supplierId) || item.provider || 'Produk Manual';
    const supplierCost = Number(matchedMaster ? matchedMaster.cost_price : (item.cost_price || (item.price ? Math.round(item.price * 0.7) : 15000)));
    const customerPrice = Number(item.price || item.customer_price || 25000);
    const quantity = Number(item.quantity || 1);
    
    const subtotalCost = supplierCost * quantity;
    const subtotalSale = customerPrice * quantity;
    const profit = subtotalSale - subtotalCost;

    calculatedTotalCost += subtotalCost;
    calculatedTotalSale += subtotalSale;

    return {
      name: item.name,
      supplier_name: supplierName,
      supplier_id: supplierId,
      supplier_product_id: matchedMaster?.external_product_id || item.supplier_product_id || 'manual',
      quantity,
      supplier_cost: supplierCost,
      customer_price: customerPrice,
      subtotal_cost: subtotalCost,
      subtotal_sale: subtotalSale,
      profit,
      provider: supplierName
    };
  }) : [];

  const totalAmount = Number(orderData.total_amount || calculatedTotalSale || 25000);
  const totalCost = Number(calculatedTotalCost || Math.round(totalAmount * 0.7));
  const grossProfit = totalAmount - totalCost;
  const gatewayFee = Math.round(totalAmount * 0.015);
  const additionalFee = 0;
  const netProfit = grossProfit - gatewayFee - additionalFee;

  const order = {
    ...orderData,
    id,
    invoice_number: invoice,
    products: enrichedProducts,
    total_amount: totalAmount,
    total_cost: totalCost,
    gross_profit: grossProfit,
    gateway_fee: gatewayFee,
    additional_fee: additionalFee,
    net_profit: netProfit,
    order_status: orderData.order_status || 'pending',
    payment_status: orderData.payment_status || 'unpaid',
    created_at: orderData.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  store.orders.unshift(order);
  saveLocalStore(store);
  sendTelegramNotification(order);
  return order;
}

export async function updateOrderStatus(id, updates) {
  const store = loadLocalStore();
  const targetId = String(id);
  const idx = store.orders.findIndex(o => String(o.id) === targetId || o.invoice_number === targetId);
  if (idx !== -1) {
    store.orders[idx] = {
      ...store.orders[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    saveLocalStore(store);

    if (updates.payment_proof_url || updates.order_status === 'waiting_verification') {
      sendTelegramNotification({
        ...store.orders[idx],
        product_name: `[UPLOAD BUKTI TRANSFER] ${store.orders[idx].product_name || 'Pesanan Baru'}`
      });
    }

    return store.orders[idx];
  }
  return null;
}

export async function deleteOrder(id) {
  const store = loadLocalStore();
  const targetId = String(id);
  store.orders = store.orders.filter(o => String(o.id) !== targetId && o.invoice_number !== targetId);
  saveLocalStore(store);
  return { success: true };
}

// ==========================================
// SETTINGS REPOSITORY
// ==========================================
export async function getSettings() {
  const store = loadLocalStore();
  return store.settings;
}

export async function updateSettings(newSettings) {
  const store = loadLocalStore();
  store.settings = { ...store.settings, ...newSettings };
  saveLocalStore(store);
  return store.settings;
}

export async function verifyAdminCredentials(email, password) {
  const targetEmail = process.env.ADMIN_EMAIL || 'androidstore279@gmail.com';
  if (!safeTextEqual(String(email || '').trim().toLowerCase(), targetEmail.toLowerCase())) return false;

  const store = loadLocalStore();
  const storedHash = store.admin_auth?.password_hash;
  if (storedHash) return verifyPassword(String(password || ''), storedHash);

  const initialPassword = process.env.ADMIN_PASSWORD;
  return !!initialPassword && safeTextEqual(String(password || ''), initialPassword);
}

export async function changeAdminPassword(currentPassword, newPassword) {
  const targetEmail = process.env.ADMIN_EMAIL || 'androidstore279@gmail.com';
  const isCurrentPasswordValid = await verifyAdminCredentials(targetEmail, currentPassword);
  if (!isCurrentPasswordValid) throw new Error('Password saat ini tidak sesuai.');
  if (typeof newPassword !== 'string' || newPassword.length < 12) {
    throw new Error('Password baru minimal 12 karakter.');
  }
  if (newPassword === currentPassword) throw new Error('Password baru harus berbeda dari password saat ini.');

  const store = loadLocalStore();
  store.admin_auth = {
    password_hash: hashAdminPassword(newPassword),
    updated_at: new Date().toISOString()
  };
  saveLocalStore(store);
  return { success: true };
}

// ==========================================
// DASHBOARD KPIS CALCULATION
// ==========================================
export async function getDashboardKPIs() {
  const store = loadLocalStore();
  const totalMaster = store.master_products.length;
  const activeMaster = store.master_products.filter(p => p.is_active).length;
  const outOfStockMaster = store.master_products.filter(p => p.custom_stock <= 0).length;

  const totalSellers = store.sellers.length;
  const activeSellers = store.sellers.filter(s => s.is_active).length;
  const connectedSellers = store.sellers.filter(s => s.last_status === 'connected').length;
  const failedSellers = store.sellers.filter(s => s.last_status === 'error').length;

  const totalOrders = store.orders.length;
  const totalRevenue = store.orders
    .filter(o => o.payment_status === 'paid' || o.order_status === 'delivered')
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const estimatedProfit = Math.round(totalRevenue * 0.28);

  const recentLogs = store.api_logs.slice(0, 5);

  return {
    total_products: totalMaster,
    active_products: activeMaster,
    out_of_stock_products: outOfStockMaster,
    total_sellers: totalSellers,
    active_sellers: activeSellers,
    connected_sellers: connectedSellers,
    failed_sellers: failedSellers,
    total_orders: totalOrders,
    total_revenue: totalRevenue,
    estimated_profit: estimatedProfit,
    recent_sync_activity: recentLogs,
    is_using_fallback: isUsingFallback
  };
}
