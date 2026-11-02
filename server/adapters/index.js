import { scrubSensitiveData } from '../utils/crypto.js';

/**
 * Base Seller Adapter Interface
 */
export class BaseSellerAdapter {
  constructor(sellerConfig) {
    this.seller = sellerConfig;
  }

  async testConnection() {
    throw new Error('testConnection() must be implemented by adapter');
  }

  async fetchProducts() {
    throw new Error('fetchProducts() must be implemented by adapter');
  }

  async fetchProductDetail(_externalId) {
    throw new Error('fetchProductDetail() must be implemented by adapter');
  }

  async checkStock(_externalId) {
    throw new Error('checkStock() must be implemented by adapter');
  }

  async createOrder(_orderParams) {
    throw new Error('createOrder() must be implemented by adapter');
  }

  async checkOrderStatus(_orderId) {
    throw new Error('checkOrderStatus() must be implemented by adapter');
  }

  getHeaders() {
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    if (this.seller.auth_type === 'header' && this.seller.api_key) {
      headers[this.seller.auth_header_key || 'x-api-key'] = this.seller.api_key;
    } else if (this.seller.auth_type === 'bearer' && this.seller.api_key) {
      headers['Authorization'] = `Bearer ${this.seller.api_key}`;
    }

    return headers;
  }
}

/**
 * Adapter 1: Prs Digital (api.prastyaaneki.biz.id)
 */
export class PrsDigitalAdapter extends BaseSellerAdapter {
  async testConnection() {
    const start = Date.now();
    const url = `${this.seller.base_url}/products?lang=id`;
    try {
      const res = await fetch(url, { headers: this.getHeaders() });
      const duration = Date.now() - start;
      if (!res.ok) {
        return { success: false, status: res.status, duration, error: `HTTP ${res.status}: ${res.statusText}` };
      }
      const data = await res.json();
      return {
        success: data.success ?? true,
        status: res.status,
        duration,
        productCount: data.products?.length || data.count || 0
      };
    } catch (err) {
      return { success: false, status: 0, duration: Date.now() - start, error: err.message };
    }
  }

  async fetchProducts() {
    const url = `${this.seller.base_url}/products?lang=id`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`Prs Digital HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    const products = data.products || [];

    return products.map(item => ({
      external_product_id: String(item.id),
      name: item.name,
      original_category: 'Digital',
      cost_price: Number(item.price_idr || item.price || 0),
      stock: item.availability === 'in_stock' ? 25 : 0,
      is_available: item.availability === 'in_stock' ? 1 : 0,
      description: item.description || '',
      image_url: '',
      requires_email: !!item.requires_email,
      raw_response: scrubSensitiveData(item)
    }));
  }

  async createOrder({ productId, quantity, email }) {
    const url = `${this.seller.base_url}/order`;
    const payload = {
      product_id: productId,
      quantity: quantity || 1,
      email: email || undefined
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  }

  async checkOrderStatus(orderId) {
    const url = `${this.seller.base_url}/order/${orderId}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  }
}

/**
 * Adapter 2: Abellab Reseller API (abellab.biz.id)
 */
export class AbellabAdapter extends BaseSellerAdapter {
  async testConnection() {
    const start = Date.now();
    const url = `${this.seller.base_url}/products`;
    try {
      const res = await fetch(url, { headers: this.getHeaders() });
      const duration = Date.now() - start;
      if (!res.ok) {
        return { success: false, status: res.status, duration, error: `HTTP ${res.status}: ${res.statusText}` };
      }
      const data = await res.json();
      return {
        success: data.ok ?? true,
        status: res.status,
        duration,
        productCount: data.products?.length || 0
      };
    } catch (err) {
      return { success: false, status: 0, duration: Date.now() - start, error: err.message };
    }
  }

  async fetchProducts() {
    const url = `${this.seller.base_url}/products`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`Abellab HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    const products = data.products || [];

    return products.map(item => {
      const finalCost = Number(item.reseller_price || item.price || item.base_price || 0);
      const stock = typeof item.stock === 'number' ? item.stock : 5;
      return {
        external_product_id: String(item.id),
        name: item.name,
        original_category: item.category || 'Digital',
        cost_price: finalCost,
        stock: stock,
        is_available: stock > 0 ? 1 : 0,
        description: item.description || '',
        image_url: '',
        requires_email: false,
        raw_response: scrubSensitiveData(item)
      };
    });
  }

  async createOrder({ productId, quantity }) {
    const url = `${this.seller.base_url}/order`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ product_id: productId, quantity: quantity || 1 })
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  }
}

/**
 * Adapter 3: Generic Configurable REST Adapter (For Seller 3, 4, N added dynamically via Admin UI)
 */
export class GenericRestAdapter extends BaseSellerAdapter {
  async testConnection() {
    const start = Date.now();
    const endpoint = this.seller.endpoint_products || '/products';
    const url = `${this.seller.base_url.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
    try {
      const res = await fetch(url, { headers: this.getHeaders() });
      const duration = Date.now() - start;
      const data = await res.json().catch(() => ({}));
      return {
        success: res.ok,
        status: res.status,
        duration,
        productCount: Array.isArray(data) ? data.length : (data.products?.length || data.data?.length || 0)
      };
    } catch (err) {
      return { success: false, status: 0, duration: Date.now() - start, error: err.message };
    }
  }

  async fetchProducts() {
    const endpoint = this.seller.endpoint_products || '/products';
    const url = `${this.seller.base_url.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`Seller ${this.seller.name} HTTP ${res.status}`);
    const data = await res.json();
    
    // Auto-detect list container
    let list = [];
    if (Array.isArray(data)) list = data;
    else if (Array.isArray(data.products)) list = data.products;
    else if (Array.isArray(data.data)) list = data.data;
    else if (Array.isArray(data.items)) list = data.items;

    return list.map((item, idx) => ({
      external_product_id: String(item.id || item.product_id || item.code || idx + 1),
      name: item.name || item.title || item.product_name || 'Produk Tanpa Nama',
      original_category: item.category || item.type || 'Digital',
      cost_price: Number(item.price || item.cost || item.price_idr || 0),
      stock: typeof item.stock === 'number' ? item.stock : (item.is_active || item.availability === 'in_stock' ? 20 : 0),
      is_available: item.availability === 'out_of_stock' || item.stock === 0 ? 0 : 1,
      description: item.description || '',
      image_url: item.image || item.image_url || '',
      requires_email: !!item.requires_email,
      raw_response: scrubSensitiveData(item)
    }));
  }
}

/**
 * Factory to instantiate the appropriate adapter based on seller configuration
 */
export function createSellerAdapter(sellerConfig) {
  const url = (sellerConfig.base_url || '').toLowerCase();
  const slug = (sellerConfig.slug || '').toLowerCase();

  if (slug.includes('prs') || url.includes('prastyaaneki.biz.id')) {
    return new PrsDigitalAdapter(sellerConfig);
  }
  if (slug.includes('abellab') || url.includes('abellab.biz.id')) {
    return new AbellabAdapter(sellerConfig);
  }
  return new GenericRestAdapter(sellerConfig);
}
