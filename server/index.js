import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import dotenv from 'dotenv';

import {
  initDatabase,
  getSellers,
  getSellerById,
  saveSeller,
  deleteSeller,
  updateSellerStatus,
  getSupplierProducts,
  saveSupplierProductsBatch,
  saveSupplierProduct,
  deleteSupplierProduct,
  getMasterProducts,
  getMasterProductById,
  saveMasterProduct,
  deleteMasterProduct,
  deleteAllMasterProducts,
  deleteMultipleMasterProducts,
  importSupplierToMaster,
  addApiLog,
  getApiLogs,
  getOrders,
  saveOrder,
  updateOrderStatus,
  deleteOrder,
  getSettings,
  updateSettings,
  getDashboardKPIs,
  sendTelegramNotification,
  verifyAdminCredentials,
  changeAdminPassword
} from './db.js';
import { createSellerAdapter } from './adapters/index.js';
import { maskApiKey } from './utils/crypto.js';
import { uploadPaymentProof, uploadProductImage, getSecureProofUrl, getSecureStorageUrl } from './utils/r2storage.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Setup Uploads Directory in public/uploads
const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|svg/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowed.test(ext) || allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Hanya format JPG, JPEG, PNG, WEBP, atau SVG yang diperbolehkan!'));
    }
  }
});

// Memory upload for R2 Cloudflare Object Storage
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowed.test(ext) || allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Hanya format JPG, JPEG, PNG, atau WEBP yang diizinkan! (Maksimal 5MB)'));
    }
  }
});

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve Uploaded Files statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Initialize Database connection
await initDatabase();

// ==========================================
// ADMIN AUTHENTICATION
// ==========================================
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;
  const targetEmail = process.env.ADMIN_EMAIL || 'androidstore279@gmail.com';

  if (await verifyAdminCredentials(email, password)) {
    return res.json({
      success: true,
      token: 'as_token_' + Buffer.from(targetEmail + Date.now()).toString('base64'),
      user: { email: targetEmail, role: 'super_admin', name: 'Admin Androidstore' }
    });
  }
  return res.status(401).json({ success: false, message: 'Email atau password admin salah.' });
});

app.put('/api/admin/profile/password', async (req, res) => {
  try {
    const { current_password: currentPassword, new_password: newPassword } = req.body;
    await changeAdminPassword(currentPassword, newPassword);
    res.json({ success: true, message: 'Password admin berhasil diperbarui.' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ==========================================
// DASHBOARD & SETTINGS
// ==========================================
app.get('/api/admin/dashboard', async (_req, res) => {
  try {
    const kpis = await getDashboardKPIs();
    res.json({ success: true, data: kpis });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/admin/settings', async (_req, res) => {
  try {
    const settings = await getSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/settings', async (req, res) => {
  try {
    const updated = await updateSettings(req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/telegram/test', async (_req, res) => {
  try {
    const testOrder = {
      invoice_number: 'INV-TEST-' + Date.now().toString().slice(-4),
      customer_name: 'Admin Tester',
      customer_phone: '628123456789',
      total_amount: 50000,
      payment_method: 'QRIS Instant',
      product_name: 'Test Telegram Notif (x1)',
      products: [{ name: 'Test Telegram Notif', quantity: 1, price: 50000 }]
    };
    await sendTelegramNotification(testOrder);
    res.json({ success: true, message: 'Pesan uji coba berhasil dikirim ke Telegram!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// SELLER MANAGEMENT
// ==========================================
app.get('/api/admin/sellers', async (_req, res) => {
  try {
    const sellers = await getSellers();
    res.json({ success: true, data: sellers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/sellers', async (req, res) => {
  try {
    const saved = await saveSeller(req.body);
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/sellers/:id', async (req, res) => {
  try {
    const saved = await saveSeller({ ...req.body, id: req.params.id });
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/sellers/:id', async (req, res) => {
  try {
    const result = await deleteSeller(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Test Connection for a Seller
app.post('/api/admin/sellers/:id/test', async (req, res) => {
  const sellerId = req.params.id;
  try {
    const seller = await getSellerById(sellerId, true);
    if (!seller) return res.status(404).json({ success: false, message: 'Seller tidak ditemukan' });

    const adapter = createSellerAdapter(seller);
    const testResult = await adapter.testConnection();

    await addApiLog({
      seller_id: seller.id,
      seller_name: seller.name,
      request_url: `${seller.base_url} (Test Connection)`,
      request_method: 'GET',
      http_status: testResult.status || 0,
      duration_ms: testResult.duration || 0,
      is_success: testResult.success,
      error_message: testResult.error || null,
      response_summary: `Test connection: ${testResult.success ? 'Success' : 'Failed'}. Products count: ${testResult.productCount ?? 'N/A'}`
    });

    await updateSellerStatus(seller.id, testResult.success ? 'connected' : 'error', testResult.error);
    res.json({ success: testResult.success, data: testResult });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Sync products from a Seller
app.post('/api/admin/sellers/:id/sync', async (req, res) => {
  const sellerId = req.params.id;
  const startTime = Date.now();
  try {
    const seller = await getSellerById(sellerId, true);
    if (!seller) return res.status(404).json({ success: false, message: 'Seller tidak ditemukan' });

    const adapter = createSellerAdapter(seller);
    const rawProducts = await adapter.fetchProducts();

    const syncStats = await saveSupplierProductsBatch(seller.id, rawProducts);
    const duration = Date.now() - startTime;

    await addApiLog({
      seller_id: seller.id,
      seller_name: seller.name,
      request_url: `${seller.base_url}/products`,
      request_method: 'GET',
      http_status: 200,
      duration_ms: duration,
      is_success: 1,
      response_summary: `Sinkronisasi selesai: ${syncStats.total} produk (${syncStats.inserted} baru, ${syncStats.updated} diupdate)`
    });

    await updateSellerStatus(seller.id, 'connected', null);

    res.json({
      success: true,
      message: `Berhasil menyinkronkan ${syncStats.total} produk dari ${seller.name}`,
      data: syncStats
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    await addApiLog({
      seller_id: sellerId,
      seller_name: 'Seller #' + sellerId,
      request_url: 'Sync Attempt',
      request_method: 'GET',
      http_status: 500,
      duration_ms: duration,
      is_success: 0,
      error_message: err.message
    });
    await updateSellerStatus(sellerId, 'error', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Sync All Active Sellers
app.post('/api/admin/sync-all', async (_req, res) => {
  try {
    const sellers = await getSellers();
    const active = sellers.filter(s => s.is_active);
    const results = [];

    for (const seller of active) {
      const full = await getSellerById(seller.id, true);
      const adapter = createSellerAdapter(full);
      try {
        const rawProducts = await adapter.fetchProducts();
        const stats = await saveSupplierProductsBatch(seller.id, rawProducts);
        await updateSellerStatus(seller.id, 'connected', null);
        results.push({ seller: seller.name, success: true, count: stats.total });
      } catch (err) {
        await updateSellerStatus(seller.id, 'error', err.message);
        results.push({ seller: seller.name, success: false, error: err.message });
      }
    }

    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// SUPPLIER PRODUCTS
// ==========================================
app.get('/api/admin/supplier-products', async (req, res) => {
  try {
    const products = await getSupplierProducts(req.query);
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/supplier-products/:id/import', async (req, res) => {
  try {
    const markup = Number(req.body.markup_percent || 25);
    const master = await importSupplierToMaster(req.params.id, markup);
    res.json({ success: true, message: 'Produk berhasil diimpor ke Master Katalog', data: master });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/supplier-products/import-all', async (req, res) => {
  try {
    const markup = Number(req.body.markup_percent || 25);
    const supplierProducts = await getSupplierProducts({});
    let importedCount = 0;
    let skippedCount = 0;

    for (const item of supplierProducts) {
      try {
        await importSupplierToMaster(item.id, markup);
        importedCount++;
      } catch {
        skippedCount++;
      }
    }

    res.json({
      success: true,
      message: `Berhasil mengimpor ${importedCount} produk baru ke Master Katalog (${skippedCount} produk sudah ada sebelumnya).`,
      importedCount,
      skippedCount
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/supplier-products', async (req, res) => {
  try {
    const saved = await saveSupplierProduct(req.body);
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/supplier-products/:id', async (req, res) => {
  try {
    const saved = await saveSupplierProduct({ ...req.body, id: req.params.id });
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/supplier-products/:id', async (req, res) => {
  try {
    const result = await deleteSupplierProduct(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// MASTER PRODUCTS (KATALOG ANDROIDSTORE)
// ==========================================
app.get('/api/admin/products', async (req, res) => {
  try {
    const products = await getMasterProducts(req.query);
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/products', async (req, res) => {
  try {
    const saved = await saveMasterProduct(req.body);
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/products/:id', async (req, res) => {
  try {
    const saved = await saveMasterProduct({ ...req.body, id: req.params.id });
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/products/:id', async (req, res) => {
  try {
    const result = await deleteMasterProduct(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/products/all', async (req, res) => {
  try {
    const result = await deleteAllMasterProducts();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/products/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    const result = await deleteMultipleMasterProducts(ids);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Manage Product Price (Manual / Markup Nominal / Markup Percent)
app.put('/api/admin/products/:id/price', async (req, res) => {
  try {
    const { pricing_mode, markup_value, selling_price, old_price, is_wholesale, wholesale_min, wholesale_price } = req.body;
    const current = await getMasterProductById(req.params.id);
    if (!current) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });

    let finalSelling = Number(selling_price);
    const cost = Number(current.cost_price || 0);

    if (pricing_mode === 'markup_nominal') {
      finalSelling = cost + Number(markup_value);
    } else if (pricing_mode === 'markup_percent') {
      finalSelling = Math.round((cost * (1 + Number(markup_value) / 100)) / 500) * 500;
    }

    const updated = await saveMasterProduct({
      ...current,
      pricing_mode: pricing_mode || current.pricing_mode,
      markup_value: Number(markup_value || current.markup_value),
      selling_price: finalSelling,
      old_price: Number(old_price || current.old_price),
      discount: old_price > finalSelling ? Math.round(((old_price - finalSelling) / old_price) * 100) : 0,
      is_wholesale: is_wholesale !== undefined ? (is_wholesale ? 1 : 0) : current.is_wholesale,
      wholesale_min: Number(wholesale_min || current.wholesale_min),
      wholesale_price: Number(wholesale_price || current.wholesale_price)
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Manage Product Image (Upload File or Custom URL)
app.post('/api/admin/products/:id/image', memoryUpload.single('image_file'), async (req, res) => {
  try {
    const current = await getMasterProductById(req.params.id);
    if (!current) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });

    let imageType = req.body.image_type || 'url';
    let imageUrl = req.body.image_url || current.custom_image_url;

    if (req.file) {
      const uploadResult = await uploadProductImage(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        req.params.id
      );
      imageType = 'upload';
      imageUrl = uploadResult.url || uploadResult.pathOrKey;
    }

    const updated = await saveMasterProduct({
      ...current,
      image_type: imageType,
      custom_image_url: imageUrl
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Standalone File Upload (payment proof uses the dedicated order endpoint)
app.post('/api/upload', memoryUpload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Tidak ada file yang diunggah' });
  }

  try {
    const uploadResult = await uploadPaymentProof(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'general'
    );
    res.json({ success: true, url: uploadResult.url, filename: req.file.originalname, storage: uploadResult.storageType });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/storage/signed-url', async (req, res) => {
  try {
    const key = String(req.query.key || '');
    if (!key) return res.status(400).json({ success: false, message: 'Storage key wajib diisi' });
    const url = await getSecureStorageUrl(key);
    if (!url) return res.status(404).json({ success: false, message: 'File tidak ditemukan' });
    return res.redirect(url);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// PUBLIC STOREFRONT ENDPOINTS
// ==========================================
app.get('/api/public/products', async (req, res) => {
  try {
    // Only return active products and clean presentation (no seller credentials, no sensitive supplier keys!)
    const all = await getMasterProducts({ is_active: 1, ...req.query });

    const formatted = all.map(p => {
      let activeImage = p.custom_image_url;
      if (!activeImage || activeImage.includes('images.unsplash.com')) {
        activeImage = '/assets/default_produk.png';
      }

      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        category: p.category,
        price: p.selling_price,
        oldPrice: p.old_price,
        discount: p.discount,
        image: activeImage,
        stock: p.custom_stock || 25,
        availability: (p.custom_stock || 25) > 0 ? 'in_stock' : 'out_of_stock',
        isWholesale: !!p.is_wholesale,
        wholesaleMin: p.wholesale_min,
        wholesalePrice: p.wholesale_price,
        provider: p.primary_seller_name || 'Prs Digital',
        description: p.description
      };
    });

    res.json({ success: true, count: formatted.length, products: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/leaderboard/top-sultan', async (_req, res) => {
  try {
    const store = loadLocalStore();
    const orders = Array.isArray(store.orders) ? store.orders : [];
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const customerMap = new Map();

    orders.forEach(o => {
      if (o.customer_name) {
        const customerKey = (o.customer_phone || o.customer_email || o.customer_name).trim().toLowerCase();
        const customerName = o.customer_name.trim();
        
        const current = customerMap.get(customerKey) || { 
          name: customerName, 
          totalSpent: 0, 
          totalOrders: 0 
        };
        
        current.totalSpent += Number(o.total_amount || 0);
        current.totalOrders += 1;
        customerMap.set(customerKey, current);
      }
    });

    let leaderboard = Array.from(customerMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    leaderboard = leaderboard.map((s, idx) => ({
      rank: idx + 1,
      name: s.name,
      totalSpent: s.totalSpent,
      totalOrders: s.totalOrders,
      tier: idx === 0 ? 'Sultan Mythic' : idx < 3 ? 'Sultan Diamond' : 'Sultan Platinum'
    }));

    res.json({
      success: true,
      period: 'current_month',
      data: leaderboard,
      leaderboard
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const store = loadLocalStore();
    const orders = Array.isArray(store.orders) ? store.orders : [];
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const customerMap = new Map();

    orders.forEach(o => {
      if (o.customer_name) {
        const customerKey = (o.customer_phone || o.customer_email || o.customer_name).trim().toLowerCase();
        const customerName = o.customer_name.trim();
        
        const current = customerMap.get(customerKey) || { 
          name: customerName, 
          totalSpent: 0, 
          totalOrders: 0 
        };
        
        current.totalSpent += Number(o.total_amount || 0);
        current.totalOrders += 1;
        customerMap.set(customerKey, current);
      }
    });

    let sultans = Array.from(customerMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    sultans = sultans.map((s, idx) => ({
      ...s,
      rank: idx + 1,
      tier: idx === 0 ? 'Sultan Mythic' : idx < 3 ? 'Sultan Diamond' : 'Sultan Platinum'
    }));

    res.json({ success: true, data: sultans });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/public/products/:slug', async (req, res) => {
  try {
    const p = await getMasterProductById(req.params.slug);
    if (!p || !p.is_active) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan atau tidak aktif' });
    }

    res.json({
      success: true,
      product: {
        id: p.id,
        slug: p.slug,
        name: p.name,
        category: p.category,
        price: p.selling_price,
        oldPrice: p.old_price,
        discount: p.discount,
        image: p.custom_image_url,
        stock: p.custom_stock || 25,
        availability: (p.custom_stock || 25) > 0 ? 'in_stock' : 'out_of_stock',
        isWholesale: !!p.is_wholesale,
        wholesaleMin: p.wholesale_min,
        wholesalePrice: p.wholesale_price,
        provider: p.primary_seller_name || 'Prs Digital',
        description: p.description
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// ORDERS & TRANSACTION CHECKING
// ==========================================
app.get('/api/orders/:id', async (req, res) => {
  try {
    const orders = await getOrders();
    const order = orders.find(o => o.invoice_number === req.params.id || String(o.id) === req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/admin/orders', async (_req, res) => {
  try {
    const orders = await getOrders();
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const saved = await saveOrder(req.body);
    res.json({ success: true, message: 'Pesanan berhasil dibuat', order: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/orders/:orderId/payment-proof', memoryUpload.single('file'), async (req, res) => {
  try {
    const orderId = req.params.orderId;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File bukti pembayaran wajib diunggah (maks 5MB)' });
    }

    const uploadResult = await uploadPaymentProof(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      orderId
    );

    const updated = await updateOrderStatus(orderId, {
      payment_proof_url: uploadResult.url || uploadResult.pathOrKey,
      order_status: 'waiting_verification',
      payment_status: 'pending',
      customer_notes: req.body.customer_notes || ''
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });
    }

    res.json({
      success: true,
      message: 'Bukti pembayaran berhasil diunggah ke Cloudflare R2 / Storage!',
      order: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/admin/orders/:id/proof-url', async (req, res) => {
  try {
    const orders = await getOrders();
    const order = orders.find(o => String(o.id) === req.params.id || o.invoice_number === req.params.id);
    if (!order || !order.payment_proof_url) {
      return res.status(404).json({ success: false, message: 'Bukti pembayaran tidak ditemukan' });
    }

    const secureUrl = await getSecureProofUrl(order.payment_proof_url);
    res.json({ success: true, url: secureUrl });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/orders/:id', async (req, res) => {
  try {
    const updated = await updateOrderStatus(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/orders', async (req, res) => {
  try {
    const saved = await saveOrder(req.body);
    res.json({ success: true, message: 'Pesanan manual berhasil dibuat', order: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/orders/:id', async (req, res) => {
  try {
    const result = await deleteOrder(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Dispatch / Process Order Through Seller API
app.post('/api/admin/orders/:id/process', async (req, res) => {
  try {
    const orders = await getOrders();
    const order = orders.find(o => String(o.id) === req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });

    // Determine seller: use order's seller or default to Seller 1
    const sellerId = order.selected_seller_id || 1;
    const seller = await getSellerById(sellerId, true);
    if (!seller) return res.status(400).json({ success: false, message: 'Supplier tidak terkonfigurasi' });

    const adapter = createSellerAdapter(seller);
    const orderResult = await adapter.createOrder({
      productId: order.external_product_id || order.product_id,
      quantity: order.quantity || 1,
      email: order.customer_email
    });

    if (orderResult.ok) {
      const deliveredKey = orderResult.data?.delivered_key || orderResult.data?.license_key || 'Order sent to seller';
      await updateOrderStatus(order.id, {
        order_status: 'delivered',
        external_order_id: String(orderResult.data?.order_id || Date.now()),
        delivered_credentials: deliveredKey
      });
      res.json({ success: true, message: 'Pesanan berhasil diproses oleh supplier!', data: orderResult.data });
    } else {
      await updateOrderStatus(order.id, {
        order_status: 'failed',
        error_log: JSON.stringify(orderResult.data)
      });
      res.status(400).json({ success: false, message: 'Supplier menolak pesanan', data: orderResult.data });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// API LOGS & MONITORING
// ==========================================
app.get('/api/admin/logs', async (req, res) => {
  try {
    const logs = await getApiLogs(req.query.limit || 50);
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  const tgToken = process.env.TELEGRAM_BOT_TOKEN || process.env.TG_BOT_TOKEN;
  const tgChatId = process.env.TELEGRAM_CHAT_ID || process.env.TG_CHAT_ID;
  console.log(`=======================================================`);
  console.log(`🚀 [Backend] Androidstore Multi-Seller API Service`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🔒 Security: AES-256-GCM Credential Encryption Active`);
  console.log(`🤖 Telegram Bot: ${tgToken && tgChatId ? 'Configured & Active 🔔' : 'Not Configured (Missing Token or Chat ID in .env)'}`);
  console.log(`=======================================================`);
});
