import { useState, useEffect, useMemo, useRef } from 'react';
import { SmartPagination } from './SmartPagination';

import {
  LayoutDashboard,
  Package,
  Layers,
  Store,
  KeyRound,
  RefreshCw,
  BadgePercent,
  Image as ImageIcon,
  ShoppingBag,
  Receipt,
  FileCode2,
  Settings,
  LogOut,
  ExternalLink,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  Search,
  TrendingUp,
  ShieldCheck,
  Eye,
  EyeOff,
  MessageCircle,
  Menu,
  X
} from 'lucide-react';

interface AdminDashboardProps {
  onClose: () => void;
  onRefreshPublicProducts?: () => void;
}

type TabType =
  | 'dashboard'
  | 'katalog'
  | 'supplier_products'
  | 'sellers'
  | 'api_keys'
  | 'sync'
  | 'pricing'
  | 'images'
  | 'orders'
  | 'transactions'
  | 'logs'
  | 'settings';

interface SellerItem {
  id: number;
  name: string;
  slug: string;
  base_url: string;
  auth_type: string;
  auth_header_key: string;
  masked_key: string;
  endpoint_products: string;
  endpoint_order: string;
  is_active: number;
  sync_interval_minutes?: number;
  last_status: string;
  last_synced_at: string | null;
  last_error_message: string | null;
}

interface SupplierProductItem {
  id: number;
  seller_id: number;
  seller_name: string;
  external_product_id: string;
  name: string;
  original_category: string;
  cost_price: number;
  stock: number;
  is_available: number;
  description: string;
  image_url: string;
}

interface MasterProductItem {
  id: number;
  slug: string;
  name: string;
  category: string;
  description: string;
  cost_price: number;
  selling_price: number;
  old_price: number;
  discount: number;
  pricing_mode: string;
  markup_value: number;
  is_wholesale: number;
  wholesale_min: number;
  wholesale_price: number;
  primary_seller_id: number | null;
  primary_seller_name?: string;
  image_type: string;
  custom_image_url: string;
  is_active: number;
  custom_stock: number;
}

interface ApiLogItem {
  id: number;
  seller_name: string;
  request_url: string;
  request_method: string;
  http_status: number;
  duration_ms: number;
  is_success: number;
  response_summary: string;
  error_message: string | null;
  created_at: string;
}

interface OrderItem {
  id: number;
  invoice_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_notes?: string;
  product_name?: string;
  product_provider?: string;
  products?: Array<Record<string, unknown>>;
  quantity?: number;
  product_id?: string | number;
  total_amount: number;
  total_cost?: number;
  gross_profit?: number;
  net_profit?: number;
  gateway_fee?: number;
  additional_fee?: number;
  order_status: string;
  payment_status: string;
  payment_proof_url?: string;
  payment_method: string;
  delivered_credentials?: string;
  created_at: string;
}

function parseOrderProducts(order: OrderItem): Array<{ name: string; quantity: number; provider?: string }> {
  if (order.products?.length) {
    return order.products.map(item => ({
      name: String(item.name || ''),
      quantity: Number(item.quantity || 1),
      provider: String(item.provider || order.product_provider || 'Produk Manual')
    }));
  }

  const source = order.product_name || '';
  const parsed: Array<{ name: string; quantity: number; provider?: string }> = [];
  const pattern = /(?:^|,\s*|-\s*)(.+?)\s*\(x(\d+)\)/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source)) !== null) {
    parsed.push({
      name: match[1].trim().replace(/,$/, ''),
      quantity: Number(match[2]) || 1,
      provider: order.product_provider || 'Produk Manual'
    });
  }

  if (parsed.length > 0) return parsed;

  return source
    ? [{ name: source.replace(/\s*\(x\d+\)$/, '').trim(), quantity: order.quantity || 1, provider: 'Produk Manual' }]
    : [{ name: 'Detail produk tersimpan pada pesanan', quantity: order.quantity || 1, provider: 'Produk Manual' }];
}

interface DashboardKPIs {
  total_products: number;
  active_products: number;
  out_of_stock_products: number;
  total_sellers: number;
  active_sellers: number;
  connected_sellers: number;
  failed_sellers: number;
  total_orders: number;
  total_revenue: number;
  estimated_profit: number;
  recent_sync_activity: ApiLogItem[];
  is_using_fallback?: boolean;
}

interface WebsiteSettings {
  store_name: string;
  whatsapp_number: string;
  default_markup_percent: string;
  maintenance_mode: string;
}

type MarkupMode = 'percent' | 'nominal' | 'manual';

export function AdminDashboard({ onClose, onRefreshPublicProducts }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Data states
  const [kpis, setKpis] = useState<DashboardKPIs>({
    total_products: 0,
    active_products: 0,
    out_of_stock_products: 0,
    total_sellers: 2,
    active_sellers: 2,
    connected_sellers: 2,
    failed_sellers: 0,
    total_orders: 0,
    total_revenue: 0,
    estimated_profit: 0,
    recent_sync_activity: []
  });

  const [sellers, setSellers] = useState<SellerItem[]>([]);
  const [supplierProducts, setSupplierProducts] = useState<SupplierProductItem[]>([]);
  const [masterProducts, setMasterProducts] = useState<MasterProductItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [logs, setLogs] = useState<ApiLogItem[]>([]);
  const [settings, setSettings] = useState<WebsiteSettings>({
    store_name: 'Androidstore.web.id',
    whatsapp_number: '6285867336036',
    default_markup_percent: '25',
    maintenance_mode: 'false'
  });
  const [profilePasswordForm, setProfilePasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [visibleProfilePasswords, setVisibleProfilePasswords] = useState({
    current: false,
    next: false,
    confirmation: false
  });

  // Filters & Modal states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSellerFilter, setSelectedSellerFilter] = useState<string>('');
  
  // Modals
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Partial<SellerItem> & { api_key?: string }>({});
  
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [editingProductPrice, setEditingProductPrice] = useState<MasterProductItem | null>(null);
  const [markupType, setMarkupType] = useState<MarkupMode>('percent');
  const [markupVal, setMarkupVal] = useState<number>(25);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [editingProductImage, setEditingProductImage] = useState<MasterProductItem | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const [selectedLogDetail, setSelectedLogDetail] = useState<ApiLogItem | null>(null);
  const [selectedOrderProof, setSelectedOrderProof] = useState<OrderItem | null>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<OrderItem | null>(null);
  const [revealedFormatIndices, setRevealedFormatIndices] = useState<Record<string, boolean>>({});

  const toggleRevealFormat = (key: string) => {
    setRevealedFormatIndices(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChangeAdminPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (profilePasswordForm.new_password.length < 12) {
      showNotification('error', 'Password baru minimal 12 karakter.');
      return;
    }
    if (profilePasswordForm.new_password !== profilePasswordForm.confirm_password) {
      showNotification('error', 'Konfirmasi password baru tidak sama.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: profilePasswordForm.current_password,
          new_password: profilePasswordForm.new_password
        })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        showNotification('error', data.message || 'Gagal mengganti password admin.');
        return;
      }

      setProfilePasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setVisibleProfilePasswords({ current: false, next: false, confirmation: false });
      showNotification('success', 'Password admin berhasil diperbarui.');
    } catch {
      showNotification('error', 'Tidak dapat menghubungi server autentikasi.');
    } finally {
      setIsLoading(false);
    }
  };
  const [masterCurrentPage, setMasterCurrentPage] = useState(1);
  const [masterPageSize, setMasterPageSize] = useState(5);
  const [priceCurrentPage, setPriceCurrentPage] = useState(1);
  const [pricePageSize, setPricePageSize] = useState(5);
  const [ordersCurrentPage, setOrdersCurrentPage] = useState(1);
  const [ordersPageSize, setOrdersPageSize] = useState(5);
  const mainWorkspaceRef = useRef<HTMLElement | null>(null);

  const handleOrdersPageChange = (p: number) => {
    setOrdersCurrentPage(p);
  };
  const [imagesCurrentPage, setImagesCurrentPage] = useState(1);
  const [imagesPageSize, setImagesPageSize] = useState(5);
  const [selectedOrderDelivery, setSelectedOrderDelivery] = useState<OrderItem | null>(null);
  const [isProofLightboxOpen, setIsProofLightboxOpen] = useState(false);

  // Supplier Product CRUD & Order CRUD States
  const [isSupplierProductModalOpen, setIsSupplierProductModalOpen] = useState(false);
  const [editingSupplierProduct, setEditingSupplierProduct] = useState<Partial<SupplierProductItem>>({});
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
  const [isEditOrderModalOpen, setIsEditOrderModalOpen] = useState(false);
  const [isDeleteOrderModalOpen, setIsDeleteOrderModalOpen] = useState(false);
  const [targetOrderForAction, setTargetOrderForAction] = useState<OrderItem | null>(null);
  const [editOrderForm, setEditOrderForm] = useState<Partial<OrderItem>>({});
  const [newOrderForm, setNewOrderForm] = useState({
    customer_name: '',
    customer_phone: '',
    product_name: '',
    total_amount: 25000,
    payment_method: 'QRIS Instant',
    order_status: 'pending',
    payment_status: 'unpaid'
  });

  const handleSaveSupplierProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingSupplierProduct.id ? 'PUT' : 'POST';
      const endpoint = editingSupplierProduct.id
        ? `/api/admin/supplier-products/${editingSupplierProduct.id}`
        : '/api/admin/supplier-products';
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingSupplierProduct)
      });
      const json = await res.json();
      if (json.success) {
        showNotification('success', 'Produk supplier berhasil disimpan!');
        setIsSupplierProductModalOpen(false);
        setEditingSupplierProduct({});
        loadAllData();
      } else {
        showNotification('error', json.message);
      }
    } catch {
      showNotification('error', 'Gagal menyimpan produk supplier.');
    }
  };

  const handleDeleteSupplierProduct = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus produk supplier ini?')) return;
    try {
      const res = await fetch(`/api/admin/supplier-products/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showNotification('success', 'Produk supplier berhasil dihapus (soft delete).');
        loadAllData();
      } else {
        showNotification('error', json.message);
      }
    } catch {
      showNotification('error', 'Gagal menghapus produk supplier.');
    }
  };

  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrderForm)
      });
      const json = await res.json();
      if (json.success) {
        showNotification('success', 'Pesanan manual berhasil dibuat!');
        setIsCreateOrderModalOpen(false);
        setNewOrderForm({
          customer_name: '',
          customer_phone: '',
          product_name: '',
          total_amount: 25000,
          payment_method: 'QRIS Instant',
          order_status: 'pending',
          payment_status: 'unpaid'
        });
        loadAllData();
      } else {
        showNotification('error', json.message);
      }
    } catch {
      showNotification('error', 'Gagal membuat pesanan manual.');
    }
  };

  const handleUpdateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOrderForAction) return;
    try {
      const res = await fetch(`/api/admin/orders/${targetOrderForAction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editOrderForm)
      });
      const json = await res.json();
      if (json.success) {
        showNotification('success', 'Pesanan berhasil diperbarui!');
        setIsEditOrderModalOpen(false);
        setTargetOrderForAction(null);
        loadAllData();
      } else {
        showNotification('error', json.message);
      }
    } catch {
      showNotification('error', 'Gagal memperbarui pesanan.');
    }
  };

  const handleConfirmDeleteOrder = async () => {
    if (!targetOrderForAction) return;
    try {
      const res = await fetch(`/api/admin/orders/${targetOrderForAction.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showNotification('success', `Pesanan #${targetOrderForAction.invoice_number} berhasil diarsipkan (soft delete).`);
        setIsDeleteOrderModalOpen(false);
        setTargetOrderForAction(null);
        loadAllData();
      } else {
        showNotification('error', json.message);
      }
    } catch {
      showNotification('error', 'Gagal menghapus pesanan.');
    }
  };

  // Master Products Selection & Delete State
  const [selectedMasterIds, setSelectedMasterIds] = useState<number[]>([]);
  const [selectedMasterSellerFilter, setSelectedMasterSellerFilter] = useState<string>('');
  const [masterCurrencyMode, setMasterCurrencyMode] = useState<'AUTO' | 'IDR' | 'USD'>('AUTO');

  const formatMasterPrice = (p: number) => {
    const val = Number(p || 0);
    if (masterCurrencyMode === 'USD' || (masterCurrencyMode === 'AUTO' && val > 0 && val < 100)) {
      return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    }
    return formatPrice(val);
  };

  // Orders & Transaction History Filters & Statistics State
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderDateRange, setOrderDateRange] = useState('all');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderSupplierFilter, setOrderSupplierFilter] = useState('all');

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchSearch = !orderSearchQuery ||
        o.invoice_number.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
        o.customer_name.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
        String(o.customer_phone).toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
        (o.products && o.products.some((item: Record<string, unknown>) => String(item.name || '').toLowerCase().includes(orderSearchQuery.toLowerCase()))) ||
        String(o.product_name).toLowerCase().includes(orderSearchQuery.toLowerCase());

      const matchPayment = orderPaymentFilter === 'all' || o.payment_status === orderPaymentFilter;
      const matchStatus = orderStatusFilter === 'all' || o.order_status === orderStatusFilter;
      const matchSupplier = orderSupplierFilter === 'all' || (o.products && o.products.some((item: Record<string, unknown>) => String(item.supplier_name || item.provider) === orderSupplierFilter)) || o.product_provider === orderSupplierFilter;

      let matchDate = true;
      if (orderDateRange !== 'all') {
        const orderDate = new Date(o.created_at);
        const now = new Date();
        if (orderDateRange === 'today') {
          matchDate = orderDate.toDateString() === now.toDateString();
        } else if (orderDateRange === 'yesterday') {
          const yest = new Date(now);
          yest.setDate(now.getDate() - 1);
          matchDate = orderDate.toDateString() === yest.toDateString();
        } else if (orderDateRange === 'last7') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchDate = orderDate >= sevenDaysAgo;
        } else if (orderDateRange === 'last30') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchDate = orderDate >= thirtyDaysAgo;
        } else if (orderDateRange === 'this_month') {
          matchDate = orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
        } else if (orderDateRange === 'last_month') {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          matchDate = orderDate.getMonth() === lastMonth.getMonth() && orderDate.getFullYear() === lastMonth.getFullYear();
        }
      }

      return matchSearch && matchPayment && matchStatus && matchSupplier && matchDate;
    });
  }, [orders, orderSearchQuery, orderDateRange, orderPaymentFilter, orderStatusFilter, orderSupplierFilter]);

  const orderStats = useMemo(() => {
    let totalRev = 0;
    let totalCost = 0;
    let grossProfit = 0;
    let netProfit = 0;
    let pendingCount = 0;
    let successCount = 0;
    let failedCount = 0;

    filteredOrders.forEach(o => {
      const isPaidOrSuccess = o.payment_status === 'paid' || o.payment_status === 'verified' || o.order_status === 'delivered' || o.order_status === 'success';
      const isPending = o.order_status === 'pending' || o.order_status === 'waiting_verification';
      const isFailed = o.order_status === 'failed' || o.order_status === 'cancelled' || o.order_status === 'rejected' || o.payment_status === 'rejected' || o.payment_status === 'expired';

      if (isPaidOrSuccess) {
        totalRev += Number(o.total_amount || 0);
        totalCost += Number(o.total_cost || 0);
        grossProfit += Number(o.gross_profit || 0);
        netProfit += Number(o.net_profit || 0);
        successCount++;
      } else if (isPending) {
        pendingCount++;
      } else if (isFailed) {
        failedCount++;
      }
    });

    return {
      totalTransactions: filteredOrders.length,
      totalRevenue: totalRev,
      totalCost,
      grossProfit,
      netProfit,
      pendingCount,
      successCount,
      failedCount
    };
  }, [filteredOrders]);

  const handleExportCSV = () => {
    let csv = 'Invoice,Tanggal,Nama Pelanggan,Kontak,Metode,Total Bayar,Total Modal,Keuntungan Kotor,Keuntungan Bersih,Status Pembayaran,Status Order\n';
    filteredOrders.forEach(o => {
      csv += `"${o.invoice_number}","${o.created_at}","${o.customer_name}","${o.customer_phone}","${o.payment_method || 'QRIS'}","${o.total_amount}","${o.total_cost || 0}","${o.gross_profit || 0}","${o.net_profit || 0}","${o.payment_status}","${o.order_status}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan-Transaksi-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    let html = '<table><tr><th>Invoice</th><th>Tanggal</th><th>Nama Pelanggan</th><th>Kontak</th><th>Metode</th><th>Total Bayar</th><th>Total Modal</th><th>Keuntungan Kotor</th><th>Keuntungan Bersih</th><th>Status Pembayaran</th><th>Status Order</th></tr>';
    filteredOrders.forEach(o => {
      html += `<tr><td>${o.invoice_number}</td><td>${o.created_at}</td><td>${o.customer_name}</td><td>${o.customer_phone}</td><td>${o.payment_method || 'QRIS'}</td><td>${o.total_amount}</td><td>${o.total_cost || 0}</td><td>${o.gross_profit || 0}</td><td>${o.net_profit || 0}</td><td>${o.payment_status}</td><td>${o.order_status}</td></tr>`;
    });
    html += '</table>';
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan-Keuangan-${new Date().toISOString().slice(0, 10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTestTelegram = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/telegram/test', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showNotification('success', json.message || 'Pesan uji coba Telegram berhasil dikirim!');
      } else {
        showNotification('error', json.message || 'Gagal mengirim pesan uji coba Telegram.');
      }
    } catch {
      showNotification('error', 'Gagal menghubungi server backend.');
    } finally {
      setIsLoading(false);
    }
  };

  // Supplier Products V2.0 State & Pagination
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<number[]>([]);
  const [supplierCategoryFilter, setSupplierCategoryFilter] = useState<string>('Semua');
  const [supplierStockFilter, setSupplierStockFilter] = useState<string>('all');
  const [supplierCurrentPage, setSupplierCurrentPage] = useState<number>(1);
  const [supplierPageSize, setSupplierPageSize] = useState<number>(5);

  const supplierCategories = useMemo(() => {
    const set = new Set<string>();
    supplierProducts.forEach(p => {
      if (p.original_category) set.add(p.original_category);
    });
    return Array.from(set);
  }, [supplierProducts]);

  const filteredSupplierProducts = useMemo(() => {
    return supplierProducts.filter(item => {
      const matchSeller = !selectedSellerFilter || String(item.seller_id) === selectedSellerFilter;
      const matchCategory = supplierCategoryFilter === 'Semua' || item.original_category === supplierCategoryFilter;
      const matchStock = supplierStockFilter === 'all' ||
        (supplierStockFilter === 'ready' && item.is_available === 1) ||
        (supplierStockFilter === 'empty' && item.is_available === 0);
      const matchSearch = !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.external_product_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.seller_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.original_category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSeller && matchCategory && matchStock && matchSearch;
    });
  }, [supplierProducts, selectedSellerFilter, supplierCategoryFilter, supplierStockFilter, searchQuery]);

  const paginatedSupplierProducts = useMemo(() => {
    const start = (supplierCurrentPage - 1) * supplierPageSize;
    return filteredSupplierProducts.slice(start, start + supplierPageSize);
  }, [filteredSupplierProducts, supplierCurrentPage, supplierPageSize]);

  const filteredMasterProducts = useMemo(() => {
    return masterProducts.filter(p => {
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSeller = !selectedMasterSellerFilter || String(p.primary_seller_id) === selectedMasterSellerFilter;
      return matchSearch && matchSeller;
    });
  }, [masterProducts, searchQuery, selectedMasterSellerFilter]);

  const paginatedMasterProducts = useMemo(() => {
    const start = (masterCurrentPage - 1) * masterPageSize;
    return filteredMasterProducts.slice(start, start + masterPageSize);
  }, [filteredMasterProducts, masterCurrentPage, masterPageSize]);

  const paginatedPriceProducts = useMemo(() => {
    const start = (priceCurrentPage - 1) * pricePageSize;
    return masterProducts.slice(start, start + pricePageSize);
  }, [masterProducts, priceCurrentPage, pricePageSize]);

  const paginatedOrders = useMemo(() => {
    const start = (ordersCurrentPage - 1) * ordersPageSize;
    return filteredOrders.slice(start, start + ordersPageSize);
  }, [filteredOrders, ordersCurrentPage, ordersPageSize]);

  const paginatedImageProducts = useMemo(() => {
    const start = (imagesCurrentPage - 1) * imagesPageSize;
    return masterProducts.slice(start, start + imagesPageSize);
  }, [masterProducts, imagesCurrentPage, imagesPageSize]);

  const handleBulkImport = async () => {
    if (selectedSupplierIds.length === 0) return;
    if (!confirm(`Impor ${selectedSupplierIds.length} produk terpilih ke Master Katalog?`)) return;

    setIsLoading(true);
    let added = 0;
    let updated = 0;
    let failed = 0;

    for (const id of selectedSupplierIds) {
      try {
        const res = await fetch(`/api/admin/supplier-products/${id}/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ markup_percent: settings.default_markup_percent || 25 })
        });
        const json = await res.json();
        if (json.success) {
          if (json.data?.action === 'updated') updated++;
          else added++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    setIsLoading(false);
    setSelectedSupplierIds([]);
    showNotification('success', `Bulk Import selesai: ${added} baru, ${updated} diperbarui (${failed} gagal).`);
    if (onRefreshPublicProducts) onRefreshPublicProducts();
    loadAllData();
  };

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [kpiRes, sellersRes, suppRes, masterRes, ordersRes, logsRes, settRes] = await Promise.allSettled([
        fetch('/api/admin/dashboard').then(r => r.json()),
        fetch('/api/admin/sellers').then(r => r.json()),
        fetch('/api/admin/supplier-products').then(r => r.json()),
        fetch('/api/admin/products').then(r => r.json()),
        fetch('/api/admin/orders').then(r => r.json()),
        fetch('/api/admin/logs').then(r => r.json()),
        fetch('/api/admin/settings').then(r => r.json())
      ]);

      if (kpiRes.status === 'fulfilled' && kpiRes.value?.success) setKpis(kpiRes.value.data);
      if (sellersRes.status === 'fulfilled' && sellersRes.value?.success) setSellers(sellersRes.value.data);
      if (suppRes.status === 'fulfilled' && suppRes.value?.success) setSupplierProducts(suppRes.value.data);
      if (masterRes.status === 'fulfilled' && masterRes.value?.success) setMasterProducts(masterRes.value.data);
      if (ordersRes.status === 'fulfilled' && ordersRes.value?.success) setOrders(ordersRes.value.data);
      if (logsRes.status === 'fulfilled' && logsRes.value?.success) setLogs(logsRes.value.data);
      if (settRes.status === 'fulfilled' && settRes.value?.success) setSettings(settRes.value.data);
    } catch {
      console.error('Error loading admin data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const formatPrice = (p: number) => {
    return 'Rp ' + Number(p || 0).toLocaleString('id-ID');
  };

  const [supplierCurrencyMode, setSupplierCurrencyMode] = useState<'AUTO' | 'IDR' | 'USD'>('AUTO');

  const formatSupplierPrice = (p: number) => {
    const val = Number(p || 0);
    if (supplierCurrencyMode === 'USD' || (supplierCurrencyMode === 'AUTO' && val > 0 && val < 100)) {
      return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    }
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  // -------------------------------------------------------------
  // Seller Handlers
  // -------------------------------------------------------------
  const handleTestConnection = async (sellerId: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/sellers/${sellerId}/test`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showNotification('success', `Koneksi berhasil! ${json.data.productCount} produk terdeteksi (${json.data.duration}ms).`);
      } else {
        showNotification('error', `Koneksi gagal: ${json.data?.error || json.message}`);
      }
      loadAllData();
    } catch {
      showNotification('error', 'Gagal menghubungi server backend.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncSeller = async (sellerId: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/sellers/${sellerId}/sync`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showNotification('success', json.message);
        if (onRefreshPublicProducts) onRefreshPublicProducts();
      } else {
        showNotification('error', json.message);
      }
      loadAllData();
    } catch {
      showNotification('error', 'Gagal menjalankan sinkronisasi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncAll = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/sync-all', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showNotification('success', 'Sinkronisasi seluruh supplier aktif selesai!');
        if (onRefreshPublicProducts) onRefreshPublicProducts();
      } else {
        showNotification('error', 'Gagal menyinkronkan seluruh seller.');
      }
      loadAllData();
    } catch {
      showNotification('error', 'Gagal menghubungi backend.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingSeller.id ? 'PUT' : 'POST';
      const endpoint = editingSeller.id ? `/api/admin/sellers/${editingSeller.id}` : '/api/admin/sellers';
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingSeller)
      });
      const json = await res.json();
      if (json.success) {
        showNotification('success', 'Seller berhasil disimpan!');
        setIsSellerModalOpen(false);
        setEditingSeller({});
        loadAllData();
      } else {
        showNotification('error', json.message);
      }
    } catch {
      showNotification('error', 'Gagal menyimpan seller.');
    }
  };

  const handleDeleteSeller = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus seller ini?')) return;
    try {
      const res = await fetch(`/api/admin/sellers/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showNotification('success', 'Seller berhasil dihapus.');
        loadAllData();
      }
    } catch {
      showNotification('error', 'Gagal menghapus seller.');
    }
  };

  // -------------------------------------------------------------
  // Product & Catalog Handlers
  // -------------------------------------------------------------
  const handleImportToMaster = async (supplierProductId: number) => {
    try {
      const res = await fetch(`/api/admin/supplier-products/${supplierProductId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markup_percent: settings.default_markup_percent || 25 })
      });
      const json = await res.json();
      if (json.success) {
        showNotification('success', 'Produk berhasil diimpor ke Master Katalog Androidstore!');
        if (onRefreshPublicProducts) onRefreshPublicProducts();
        loadAllData();
      } else {
        showNotification('error', json.message);
      }
    } catch {
      showNotification('error', 'Gagal mengimpor produk.');
    }
  };

  const handleImportAll = async () => {
    if (!confirm('Impor seluruh produk supplier ke Master Katalog?')) return;
    setIsLoading(true);
    showNotification('success', 'Sedang mengimpor produk...');
    try {
      const res = await fetch('/api/admin/supplier-products/import-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markup_percent: settings.default_markup_percent || 25 })
      });
      const json = await res.json();
      if (json.success) {
        showNotification('success', json.message);
        if (onRefreshPublicProducts) onRefreshPublicProducts();
        loadAllData();
      } else {
        showNotification('error', json.message || 'Gagal mengimpor seluruh produk.');
      }
    } catch {
      showNotification('error', 'Gagal mengimpor seluruh produk: kendala jaringan atau server backend.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleProductActive = async (prod: MasterProductItem) => {
    try {
      const updatedStatus = prod.is_active ? 0 : 1;
      const res = await fetch(`/api/admin/products/${prod.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...prod, is_active: updatedStatus })
      });
      if (res.ok) {
        showNotification('success', `Status produk ${prod.name} diubah menjadi ${updatedStatus ? 'Aktif' : 'Nonaktif'}.`);
        if (onRefreshPublicProducts) onRefreshPublicProducts();
        loadAllData();
      }
    } catch {
      showNotification('error', 'Gagal mengubah status produk.');
    }
  };

  const handleDeleteMasterProduct = async (id: number) => {
    if (!confirm('Hapus produk ini dari Master Katalog?')) return;
    try {
      await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      showNotification('success', 'Produk dihapus dari Master Katalog.');
      if (onRefreshPublicProducts) onRefreshPublicProducts();
      loadAllData();
    } catch {
      showNotification('error', 'Gagal menghapus produk.');
    }
  };

  const handleDeleteAllMasterProducts = async () => {
    if (!confirm('PERINGATAN: Apakah Anda yakin ingin menghapus SEMUA produk dari Master Katalog?')) return;
    try {
      const res = await fetch('/api/admin/products/all', { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showNotification('success', 'Semua produk Master Katalog berhasil dihapus.');
        setSelectedMasterIds([]);
        if (onRefreshPublicProducts) onRefreshPublicProducts();
        loadAllData();
      } else {
        showNotification('error', json.message || 'Gagal menghapus semua katalog.');
      }
    } catch {
      showNotification('error', 'Gagal menghapus semua produk Master Katalog.');
    }
  };

  const handleDeleteSelectedMasterProducts = async () => {
    if (selectedMasterIds.length === 0) return;
    if (!confirm(`Hapus ${selectedMasterIds.length} produk yang dipilih dari Master Katalog?`)) return;
    try {
      const res = await fetch('/api/admin/products/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedMasterIds })
      });
      const json = await res.json();
      if (json.success) {
        showNotification('success', `${selectedMasterIds.length} produk berhasil dihapus.`);
        setSelectedMasterIds([]);
        if (onRefreshPublicProducts) onRefreshPublicProducts();
        loadAllData();
      } else {
        showNotification('error', json.message || 'Gagal menghapus produk terpilih.');
      }
    } catch {
      showNotification('error', 'Gagal menghapus produk terpilih.');
    }
  };

  // -------------------------------------------------------------
  // Pricing Handlers
  // -------------------------------------------------------------
  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProductPrice) return;

    let finalSelling = editingProductPrice.selling_price;
    const cost = editingProductPrice.cost_price;

    if (markupType === 'percent') {
      finalSelling = Math.round((cost * (1 + markupVal / 100)) / 500) * 500;
    } else if (markupType === 'nominal') {
      finalSelling = cost + markupVal;
    }

    try {
      const res = await fetch(`/api/admin/products/${editingProductPrice.id}/price`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pricing_mode: markupType === 'manual' ? 'manual' : (markupType === 'percent' ? 'markup_percent' : 'markup_nominal'),
          markup_value: markupVal,
          selling_price: finalSelling,
          old_price: editingProductPrice.old_price,
          is_wholesale: editingProductPrice.is_wholesale,
          wholesale_min: editingProductPrice.wholesale_min,
          wholesale_price: editingProductPrice.wholesale_price
        })
      });
      const json = await res.json();
      if (json.success) {
        showNotification('success', 'Harga produk berhasil diperbarui!');
        setIsPricingModalOpen(false);
        if (onRefreshPublicProducts) onRefreshPublicProducts();
        loadAllData();
      }
    } catch {
      showNotification('error', 'Gagal menyimpan harga.');
    }
  };

  // -------------------------------------------------------------
  // Image Handlers
  // -------------------------------------------------------------
  const handleSaveImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProductImage) return;

    const formData = new FormData();
    if (imageFile) {
      formData.append('image_file', imageFile);
      formData.append('image_type', 'upload');
    } else if (imageUrlInput) {
      formData.append('image_url', imageUrlInput);
      formData.append('image_type', 'url');
    }

    try {
      const res = await fetch(`/api/admin/products/${editingProductImage.id}/image`, {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      if (json.success) {
        showNotification('success', 'Gambar produk berhasil diperbarui!');
        setIsImageModalOpen(false);
        setImageFile(null);
        setImageUrlInput('');
        setImagePreview('');
        if (onRefreshPublicProducts) onRefreshPublicProducts();
        loadAllData();
      }
    } catch {
      showNotification('error', 'Gagal menyimpan gambar produk.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#080D18] text-[#F8FAFC] flex font-sans">
      {/* Toast Notification at Bottom Left */}
      {statusMessage && (
        <div className={`fixed bottom-6 left-6 z-[100] px-4 py-3 rounded-xl border shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-fadeIn ${
          statusMessage.type === 'success'
            ? 'bg-[#111A2B] text-[#10B981] border-[#10B981]/50 shadow-[0_4px_20px_rgba(16,185,129,0.25)]'
            : 'bg-[#111A2B] text-red-400 border-red-500/50 shadow-[0_4px_20px_rgba(239,68,68,0.25)]'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-[#10B981]" /> : <XCircle className="w-4 h-4 text-red-400" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Mobile Backdrop Overlay when sidebar is open */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR DARK BLUE MODERN (Identitas AndroidStore)         */}
      {/* ========================================================= */}
      <aside className={`fixed md:relative inset-y-0 left-0 z-50 w-64 bg-[#0B1220] border-r border-[#26364D] flex flex-col justify-between flex-shrink-0 select-none transition-transform duration-300 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:hidden'
      }`}>
        <div>
          {/* Logo Brand Header */}
          <div className="p-5 border-b border-[#26364D] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2583F7] to-[#38BDF8] p-1.5 flex items-center justify-center font-black text-white shadow-[0_0_15px_rgba(37,131,247,0.4)]">
              AS
            </div>
            <div>
              <span className="font-black text-sm tracking-tight text-[#F8FAFC] block">
                ADMIN CONSOLE
              </span>
              <span className="text-[10px] text-[#38BDF8] font-bold block uppercase tracking-wider">
                Multi-Seller API System
              </span>
            </div>
          </div>

          {/* Navigation Menus */}
          <nav className="p-3 space-y-1 text-xs font-semibold overflow-y-auto max-h-[calc(100vh-140px)] scrollbar-none">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'katalog', label: 'Katalog Produk (Master)', icon: Package },
              { id: 'supplier_products', label: 'Produk Supplier Mentah', icon: Layers },
              { id: 'sellers', label: 'Manajemen Seller', icon: Store },
              { id: 'api_keys', label: 'API Key & Kredensial', icon: KeyRound },
              { id: 'sync', label: 'Sinkronisasi Produk', icon: RefreshCw },
              { id: 'pricing', label: 'Manajemen Harga', icon: BadgePercent },
              { id: 'images', label: 'Manajemen Gambar', icon: ImageIcon },
              { id: 'orders', label: 'Pesanan Pelanggan', icon: ShoppingBag },
              { id: 'transactions', label: 'Riwayat Transaksi', icon: Receipt },
              { id: 'logs', label: 'Log API & Monitoring', icon: FileCode2 },
              { id: 'settings', label: 'Pengaturan Website', icon: Settings },
            ].map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id as TabType);
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                    isActive
                      ? 'bg-[#2583F7] text-white font-bold shadow-[0_0_12px_rgba(37,131,247,0.35)]'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111A2B]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#38BDF8]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Sidebar: Store Link & Logout */}
        <div className="p-4 border-t border-[#26364D] space-y-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#111A2B] hover:bg-[#1A263D] border border-[#26364D] text-xs font-bold text-[#38BDF8] transition-colors"
          >
            <span>Buka Toko Publik</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Dashboard</span>
          </button>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* MAIN VIEWPORT AREA                                        */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar Header */}
        <header className="h-16 bg-[#0B1220] border-b border-[#26364D] px-4 md:px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(prev => !prev)}
              className="p-2 rounded-xl bg-[#111A2B] hover:bg-[#1A263D] border border-[#26364D] text-[#38BDF8] transition-colors"
              title="Sembunyikan / Tampilkan Sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
            <h1 className="text-sm md:text-base font-black tracking-tight text-[#F8FAFC] capitalize truncate max-w-[130px] md:max-w-none">
              {activeTab.replace('_', ' ')}
            </h1>
            <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
              MySQL 8 / API Engine Live
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSyncAll}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111A2B] hover:bg-[#1A263D] border border-[#26364D] text-xs font-bold text-[#38BDF8] transition-colors active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Sinkronkan Semua API</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111A2B] transition-colors"
              title="Tutup Dashboard"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Dynamic Workspace Container */}
        <main ref={mainWorkspaceRef} className="flex-1 min-w-0 overflow-y-auto overscroll-contain p-4 md:p-6 space-y-6">
          
          {/* 1. TAB: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Primary KPI Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-[#111A2B] border border-[#26364D] space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                    <span>Total Produk Master</span>
                    <Package className="w-4 h-4 text-[#38BDF8]" />
                  </div>
                  <div className="text-2xl font-black text-[#F8FAFC] tabular-nums">
                    {kpis.total_products}
                  </div>
                  <div className="text-[11px] text-[#10B981] font-semibold">
                    ✓ {kpis.active_products} aktif di katalog publik
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#111A2B] border border-[#26364D] space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                    <span>Koneksi Supplier / Seller</span>
                    <Store className="w-4 h-4 text-[#2583F7]" />
                  </div>
                  <div className="text-2xl font-black text-[#F8FAFC] tabular-nums">
                    {kpis.total_sellers} Seller
                  </div>
                  <div className="text-[11px] text-[#38BDF8] font-semibold">
                    ✓ {kpis.connected_sellers} terhubung ({kpis.failed_sellers} kendala)
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#111A2B] border border-[#26364D] space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                    <span>Total Pesanan Selesai</span>
                    <ShoppingBag className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-[#F8FAFC] tabular-nums">
                    {kpis.total_orders} Pesanan
                  </div>
                  <div className="text-[11px] text-[#10B981] font-semibold">
                    Total Omzet: {formatPrice(kpis.total_revenue)}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#111A2B] border border-[#26364D] space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                    <span>Estimasi Keuntungan</span>
                    <TrendingUp className="w-4 h-4 text-[#10B981]" />
                  </div>
                  <div className="text-2xl font-black text-[#10B981] tabular-nums">
                    {formatPrice(kpis.estimated_profit)}
                  </div>
                  <div className="text-[11px] text-[#94A3B8]">
                    Margin rata-rata: ~28% per transaksi
                  </div>
                </div>
              </div>

              {/* Quick Actions & Supplier Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 p-5 rounded-2xl bg-[#111A2B] border border-[#26364D] space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-[#F8FAFC]">Status Supplier Terdaftar</h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('sellers')}
                      className="text-xs text-[#38BDF8] hover:underline"
                    >
                      Kelola Seller →
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {sellers.map(s => (
                      <div key={s.id} className="p-3.5 bg-[#080D18] border border-[#26364D] rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="space-y-0.5 min-w-0">
                          <span className="font-bold text-xs text-[#F8FAFC] block truncate">{s.name}</span>
                          <span className="text-[11px] text-[#94A3B8] font-mono block truncate max-w-full sm:max-w-[240px]">{s.base_url}</span>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-[#26364D]/60">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded ${
                            s.last_status === 'connected'
                              ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                              : 'bg-red-950/40 text-red-400 border border-red-800'
                          }`}>
                            {s.last_status === 'connected' ? 'Connected' : 'Error'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleTestConnection(s.id)}
                            className="px-3 py-1 rounded-lg bg-[#111A2B] hover:bg-[#1A263D] text-[11px] font-bold text-[#38BDF8] border border-[#26364D] transition-colors"
                          >
                            Test
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#111A2B] border border-[#26364D] space-y-4">
                  <h3 className="font-bold text-sm text-[#F8FAFC]">Aktivitas Sinkronisasi Terakhir</h3>
                  <div className="space-y-3">
                    {kpis.recent_sync_activity?.slice(0, 4).map((log: ApiLogItem) => (
                      <div key={log.id} className="p-3 bg-[#080D18] border border-[#26364D] rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#38BDF8]">{log.seller_name}</span>
                          <span className="text-[10px] text-[#94A3B8]">{log.duration_ms}ms</span>
                        </div>
                        <p className="text-[11px] text-[#94A3B8] line-clamp-1">{log.response_summary || log.error_message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. TAB: KATALOG PRODUK (MASTER) */}
          {activeTab === 'katalog' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative w-full sm:w-80">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari produk di master katalog..."
                      className="w-full pl-9 pr-3 py-2 bg-[#111A2B] border border-[#26364D] rounded-xl text-xs text-[#F8FAFC] placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#2583F7]"
                    />
                    <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
                  </div>

                  {/* Supplier Filter */}
                  <select
                    value={selectedMasterSellerFilter}
                    onChange={(e) => { setSelectedMasterSellerFilter(e.target.value); setMasterCurrentPage(1); }}
                    className="px-3 py-2 bg-[#080F1F] border border-[#243650] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#1677FF]"
                  >
                    <option value="">Semua Supplier</option>
                    {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>

                  {/* Currency Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      setMasterCurrencyMode(prev => prev === 'AUTO' ? 'USD' : prev === 'USD' ? 'IDR' : 'AUTO');
                    }}
                    className="px-3 py-2 bg-[#080F1F] hover:bg-[#1A263D] text-[#22C7FF] border border-[#243650] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    title="Ubah Mata Uang (Auto / USD $ / IDR Rp)"
                  >
                    <span>💱 Mata Uang: {masterCurrencyMode}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {selectedMasterIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDeleteSelectedMasterProducts}
                      className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Hapus Terpilih ({selectedMasterIds.length})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleDeleteAllMasterProducts}
                    className="px-3.5 py-2 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus Semua Katalog</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('supplier_products')}
                    className="px-3.5 py-2 rounded-xl bg-[#2583F7] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Impor Produk Supplier</span>
                  </button>
                </div>
              </div>

              {/* Master Products Table */}
              <div className="bg-[#111A2B] border border-[#26364D] rounded-2xl overflow-hidden shadow-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0B1220] border-b border-[#26364D] text-[#94A3B8] font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-3.5 w-12 text-center">
                          <input
                            type="checkbox"
                            checked={paginatedMasterProducts.length > 0 && paginatedMasterProducts.every((p: MasterProductItem) => selectedMasterIds.includes(p.id))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const pageIds = paginatedMasterProducts.map((p: MasterProductItem) => p.id);
                                setSelectedMasterIds(prev => Array.from(new Set([...prev, ...pageIds])));
                              } else {
                                const pageIds = new Set(paginatedMasterProducts.map((p: MasterProductItem) => p.id));
                                setSelectedMasterIds(prev => prev.filter(id => !pageIds.has(id)));
                              }
                            }}
                            className="rounded bg-[#080F1F] border-[#26364D] text-[#1677FF] focus:ring-0 cursor-pointer"
                          />
                        </th>
                        <th className="p-3.5 w-12">No</th>
                        <th className="p-3.5">Produk</th>
                        <th className="p-3.5">Kategori</th>
                        <th className="p-3.5">Harga Modal</th>
                        <th className="p-3.5">Harga Jual</th>
                        <th className="p-3.5">Margin Laba</th>
                        <th className="p-3.5">Supplier Utama</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#26364D]/60">
                     {paginatedMasterProducts.map((prod, index) => {
                          const profit = prod.selling_price - prod.cost_price;
                          const isLoss = profit < 0;
                          return (
                      <tr key={prod.id} className="hover:bg-[#1A263D]/40 transition-colors">
                        <td className="p-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={selectedMasterIds.includes(prod.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMasterIds(prev => [...prev, prod.id]);
                              } else {
                                setSelectedMasterIds(prev => prev.filter(id => id !== prod.id));
                              }
                            }}
                            className="rounded bg-[#080F1F] border-[#26364D] text-[#1677FF] focus:ring-0 cursor-pointer"
                          />
                        </td>
                        <td className="p-3.5 font-mono text-[#94A3B8]">{(masterCurrentPage - 1) * masterPageSize + index + 1}</td>
                        <td className="p-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-9 h-9 rounded-lg bg-[#080D18] border border-[#26364D] overflow-hidden flex-shrink-0">
                                    <img src={prod.custom_image_url || '/assets/default_produk.png'} alt="" className="w-full h-full object-cover" />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-bold text-[#F8FAFC] block truncate max-w-[220px]">{prod.name}</span>
                                    <span className="text-[10px] text-[#94A3B8] font-mono">{prod.slug}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3.5 text-[#38BDF8] font-semibold">{prod.category}</td>
                              <td className="p-3.5 font-mono text-[#94A3B8]">{formatMasterPrice(prod.cost_price)}</td>
                              <td className="p-3.5 font-mono font-bold text-[#F8FAFC]">{formatMasterPrice(prod.selling_price)}</td>
                              <td className="p-3.5 font-mono">
                                <span className={isLoss ? 'text-red-400 font-bold' : 'text-[#10B981] font-bold'}>
                                  {isLoss ? 'RUGI: ' : '+'}{formatMasterPrice(profit)}
                                </span>
                              </td>
                              <td className="p-3.5">
                                <span className="px-2 py-0.5 rounded bg-[#080D18] border border-[#26364D] text-[10px] text-[#38BDF8]">
                                  {prod.primary_seller_name || 'Auto'}
                                </span>
                              </td>
                              <td className="p-3.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleProductActive(prod)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    prod.is_active ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-red-950/40 text-red-400'
                                  }`}
                                >
                                  {prod.is_active ? 'Aktif' : 'Nonaktif'}
                                </button>
                              </td>
                              <td className="p-3.5 text-right space-x-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingProductPrice(prod);
                                    setIsPricingModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg bg-[#080D18] hover:bg-[#2583F7] text-[#94A3B8] hover:text-white transition-colors"
                                  title="Atur Harga Jual"
                                >
                                  <BadgePercent className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingProductImage(prod);
                                    setImageUrlInput(prod.custom_image_url || '');
                                    setIsImageModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg bg-[#080D18] hover:bg-[#38BDF8] text-[#94A3B8] hover:text-[#080D18] transition-colors"
                                  title="Ganti Gambar"
                                >
                                  <ImageIcon className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMasterProduct(prod.id)}
                                  className="p-1.5 rounded-lg bg-[#080D18] hover:bg-red-600 text-[#94A3B8] hover:text-white transition-colors"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
               </div>
               <SmartPagination
                 currentPage={masterCurrentPage}
                 totalItems={filteredMasterProducts.length}
                 pageSize={masterPageSize}
                 onPageChange={setMasterCurrentPage}
                 onPageSizeChange={setMasterPageSize}
               />
             </div>
           )}

            {/* 3. TAB: PRODUK SUPPLIER MENTAH V2.0 */}
           {activeTab === 'supplier_products' && (
            <div className="space-y-5 animate-fadeIn">
              
              {/* Summary Header Card */}
              <div className="p-6 rounded-2xl bg-[#101D32] border border-[#243650] flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-card">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <h3 className="font-extrabold text-lg text-[#F8FAFC]">Produk Supplier Mentah</h3>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                      MySQL 8 / API Engine Live
                    </span>
                  </div>
                  <p className="text-xs text-[#94A3B8] max-w-xl leading-relaxed">
                    Kelola produk dari berbagai supplier API. Produk dapat diimpor ke katalog setelah dipilih. Gunakan filter dan pencarian untuk navigasi cepat.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSupplierProduct({
                        seller_id: sellers[0]?.id || 1,
                        name: '',
                        original_category: 'Voucher & Digital',
                        cost_price: 15000,
                        stock: 25,
                        description: ''
                      });
                      setIsSupplierProductModalOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[#2583F7] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Tambah Produk Manual</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleImportAll}
                    disabled={isLoading}
                    className="px-4 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs shadow-md flex items-center gap-2 disabled:opacity-50 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>⚡ Impor Semua Produk</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncAll}
                    disabled={isLoading}
                    className="px-4 py-2.5 rounded-xl bg-[#1677FF] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-md flex items-center gap-2 disabled:opacity-50 transition-all"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>🔄 Sinkronkan Semua API</span>
                  </button>
                </div>
              </div>

              {/* Toolbar Filter & Search */}
              <div className="p-4 rounded-2xl bg-[#101D32] border border-[#243650] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Filter Supplier */}
                  <select
                    value={selectedSellerFilter}
                    onChange={(e) => { setSelectedSellerFilter(e.target.value); setSupplierCurrentPage(1); }}
                    className="px-3 py-2 bg-[#080F1F] border border-[#243650] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#1677FF]"
                  >
                    <option value="">Semua Supplier</option>
                    {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>

                  {/* Filter Category */}
                  <select
                    value={supplierCategoryFilter}
                    onChange={(e) => { setSupplierCategoryFilter(e.target.value); setSupplierCurrentPage(1); }}
                    className="px-3 py-2 bg-[#080F1F] border border-[#243650] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#1677FF]"
                  >
                    <option value="Semua">Semua Kategori</option>
                    {supplierCategories.map((cat: string) => <option key={cat} value={cat}>{cat}</option>)}
                  </select>

                  {/* Filter Stock Status */}
                  <select
                    value={supplierStockFilter}
                    onChange={(e) => { setSupplierStockFilter(e.target.value); setSupplierCurrentPage(1); }}
                    className="px-3 py-2 bg-[#080F1F] border border-[#243650] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#1677FF]"
                  >
                    <option value="all">Semua Status Stok</option>
                    <option value="ready">Ready (Tersedia)</option>
                    <option value="empty">Habis (Kosong)</option>
                  </select>

                  {(selectedSellerFilter || supplierCategoryFilter !== 'Semua' || supplierStockFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSellerFilter('');
                        setSupplierCategoryFilter('Semua');
                        setSupplierStockFilter('all');
                        setSupplierCurrentPage(1);
                      }}
                      className="px-3 py-2 text-xs font-bold text-[#22C7FF] hover:underline"
                    >
                      Reset Filter
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSupplierCurrencyMode(prev => prev === 'AUTO' ? 'USD' : prev === 'USD' ? 'IDR' : 'AUTO');
                    }}
                    className="px-3 py-2 bg-[#080F1F] hover:bg-[#1A263D] text-[#22C7FF] border border-[#243650] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    title="Ubah Mata Uang Harga Modal (Auto / USD $ / IDR Rp)"
                  >
                    <span>💱 Mata Uang: {supplierCurrencyMode}</span>
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative w-full lg:w-80">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setSupplierCurrentPage(1); }}
                    placeholder="Cari nama produk, kategori, atau ID..."
                    className="w-full pl-9 pr-8 py-2 bg-[#080F1F] border border-[#243650] rounded-xl text-xs text-[#F8FAFC] placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#1677FF]"
                  />
                  <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5 pointer-events-none" />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-[#94A3B8] hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Bulk Action Toolbar (Appears when items are selected) */}
              {selectedSupplierIds.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-[#1677FF]/15 border border-[#1677FF]/40 flex items-center justify-between text-xs animate-fadeIn">
                  <div className="flex items-center gap-2 font-bold text-[#22C7FF]">
                    <CheckCircle2 className="w-4 h-4 text-[#22C7FF]" />
                    <span>{selectedSupplierIds.length} produk supplier dipilih</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleBulkImport}
                      disabled={isLoading}
                      className="px-4 py-2 rounded-xl bg-[#1677FF] hover:bg-[#1D4ED8] text-white font-bold shadow-sm flex items-center gap-1.5 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Impor Produk Terpilih (Bulk Import)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSupplierIds([])}
                      className="px-3 py-2 rounded-xl bg-[#080F1F] text-[#94A3B8] hover:text-white border border-[#243650]"
                    >
                      Batalkan Pilihan
                    </button>
                  </div>
                </div>
              )}

              {/* Raw Supplier Products Table (V2.0 Styler) */}
              <div className="bg-[#101D32] border border-[#243650] rounded-2xl overflow-hidden shadow-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#13243C] border-b border-[#243650] text-[#94A3B8] font-bold uppercase text-[11px] tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="p-4 w-12 text-center">
                          <input
                            type="checkbox"
                            checked={paginatedSupplierProducts.length > 0 && paginatedSupplierProducts.every((p: SupplierProductItem) => selectedSupplierIds.includes(p.id))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const pageIds = paginatedSupplierProducts.map((p: SupplierProductItem) => p.id);
                                setSelectedSupplierIds(prev => Array.from(new Set([...prev, ...pageIds])));
                              } else {
                                const pageIds = new Set(paginatedSupplierProducts.map((p: SupplierProductItem) => p.id));
                                setSelectedSupplierIds(prev => prev.filter(id => !pageIds.has(id)));
                              }
                            }}
                            className="rounded bg-[#080F1F] border-[#243650] text-[#1677FF] focus:ring-0 cursor-pointer"
                          />
                        </th>
                        <th className="p-4 w-12">No</th>
                        <th className="p-4">Supplier</th>
                        <th className="p-4">Nama Produk</th>
                        <th className="p-4">Kategori</th>
                        <th className="p-4">Harga Modal</th>
                        <th className="p-4">Stok API</th>
                        <th className="p-4 text-right">Aksi Impor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#243650]/60">
                      {paginatedSupplierProducts.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-10 text-center text-[#94A3B8]">
                            Tidak ada produk supplier yang cocok dengan filter atau pencarian Anda.
                          </td>
                        </tr>
                      ) : (
                        paginatedSupplierProducts.map((item: SupplierProductItem, idx: number) => {
                          const rowNum = (supplierCurrentPage - 1) * supplierPageSize + idx + 1;
                          const isSelected = selectedSupplierIds.includes(item.id);
                          return (
                            <tr key={`${item.seller_id}-${item.external_product_id}`} className="hover:bg-[#1677FF]/5 transition-colors h-[76px]">
                              <td className="p-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedSupplierIds(prev => [...prev, item.id]);
                                    } else {
                                      setSelectedSupplierIds(prev => prev.filter(id => id !== item.id));
                                    }
                                  }}
                                  className="rounded bg-[#080F1F] border-[#243650] text-[#1677FF] focus:ring-0 cursor-pointer"
                                />
                              </td>
                              <td className="p-4 font-mono text-[#94A3B8]">{rowNum}</td>
                              <td className="p-4 font-bold text-[#22C7FF]">{item.seller_name}</td>
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-[#080F1F] border border-[#243650] overflow-hidden flex-shrink-0 flex items-center justify-center">
                                    <img
                                      src={item.image_url || '/assets/default_produk.png'}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-bold text-[#F8FAFC] block truncate max-w-[240px]" title={item.name}>
                                      {item.name}
                                    </span>
                                    <span className="text-[11px] text-[#94A3B8] truncate block max-w-[240px]">
                                      {item.description ? item.description.replace(/[\r\n]+/g, ' ') : 'Ready instant process'}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 text-[#94A3B8] font-medium">{item.original_category}</td>
                              <td className="p-4 font-mono font-bold text-[#F8FAFC]">{formatSupplierPrice(item.cost_price)}</td>
                              <td className="p-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black ${
                                  item.is_available ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40' : 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${item.is_available ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`} />
                                  {item.is_available ? `Ready ${item.stock}` : 'Habis'}
                                </span>
                              </td>
                              <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleImportToMaster(item.id)}
                                  className="px-3 py-1.5 rounded-xl bg-[#1677FF] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-sm shadow-[#1677FF]/30 transition-all active:scale-95 inline-flex items-center gap-1"
                                  title="Impor ke Katalog"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Impor</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSupplierProduct(item);
                                    setIsSupplierProductModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-[#111A2B] hover:bg-[#2583F7] text-[#38BDF8] hover:text-white border border-[#26364D] text-xs font-bold transition-all"
                                  title="Edit Produk"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSupplierProduct(item.id)}
                                  className="px-2.5 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white border border-red-800/60 text-xs font-bold transition-all"
                                  title="Hapus Produk"
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <SmartPagination
                  currentPage={supplierCurrentPage}
                  totalItems={filteredSupplierProducts.length}
                  pageSize={supplierPageSize}
                  onPageChange={setSupplierCurrentPage}
                  onPageSizeChange={setSupplierPageSize}
                  loading={isLoading}
                />
              </div>
            </div>
          )}

          {/* 4. TAB: MANAJEMEN SELLER (SUPPLIER) */}
          {activeTab === 'sellers' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[#F8FAFC]">Daftar API Supplier Digital</h3>
                  <p className="text-xs text-[#94A3B8]">Dapat menambahkan seller ketiga, keempat, dst tanpa mengubah database.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSeller({
                      name: '',
                      base_url: '',
                      auth_type: 'header',
                      auth_header_key: 'x-api-key',
                      api_key: '',
                      endpoint_products: '/products',
                      endpoint_order: '/order',
                      is_active: 1
                    });
                    setIsSellerModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#2583F7] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah API Seller</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sellers.map(s => (
                  <div key={s.id} className="p-5 rounded-2xl bg-[#111A2B] border border-[#26364D] space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-[#F8FAFC]">{s.name}</h4>
                        <span className="font-mono text-xs text-[#38BDF8] break-all">{s.base_url}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        s.last_status === 'connected' ? 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40' : 'bg-red-950/40 text-red-400 border-red-800'
                      }`}>
                        {s.last_status === 'connected' ? 'Connected' : 'Error'}
                      </span>
                    </div>

                    <div className="p-3 bg-[#080D18] rounded-xl border border-[#26364D] text-xs space-y-1 font-mono">
                      <div className="flex justify-between text-[#94A3B8]">
                        <span>Auth Type:</span>
                        <span className="text-[#F8FAFC]">{s.auth_type} ({s.auth_header_key})</span>
                      </div>
                      <div className="flex justify-between text-[#94A3B8]">
                        <span>API Key:</span>
                        <span className="text-[#38BDF8]">{s.masked_key}</span>
                      </div>
                      <div className="flex justify-between text-[#94A3B8]">
                        <span>Sync Terakhir:</span>
                        <span className="text-[#F8FAFC]">{s.last_synced_at ? new Date(s.last_synced_at).toLocaleString('id-ID') : 'Belum pernah'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleTestConnection(s.id)}
                          className="px-3 py-1.5 rounded-lg bg-[#2583F7] hover:bg-[#1D4ED8] text-white text-xs font-bold"
                        >
                          Test Koneksi
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSyncSeller(s.id)}
                          className="px-3 py-1.5 rounded-lg bg-[#111A2B] hover:bg-[#1A263D] border border-[#26364D] text-xs font-bold text-[#38BDF8]"
                        >
                          Sync Sekarang
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSeller(s);
                            setIsSellerModalOpen(true);
                          }}
                          className="p-1.5 text-[#94A3B8] hover:text-white"
                          title="Edit Seller"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSeller(s.id)}
                          className="p-1.5 text-[#94A3B8] hover:text-red-400"
                          title="Hapus Seller"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. TAB: API KEY MANAGEMENT */}
          {activeTab === 'api_keys' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Telegram Bot Notification Test Card */}
              <div className="p-5 rounded-2xl bg-[#111A2B] border border-[#26364D] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-sm text-[#F8FAFC]">Uji Coba Notifikasi Bot Telegram</h4>
                    <p className="text-xs text-[#94A3B8] mt-0.5">Kirim pesan test order instan ke bot Telegram yang diatur di `.env`.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestTelegram}
                    disabled={isLoading}
                    className="px-4 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Test Kirim Telegram</span>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#0B1528] border border-[#2583F7] space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#38BDF8]">
                  <ShieldCheck className="w-4 h-4 text-[#2583F7]" />
                  <span>KEAMANAN KREDENSIAL TERENKRIPSI (AES-256-GCM)</span>
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Semua API Key dan Secret supplier disimpan dalam bentuk cipher terenkripsi di database. Kunci rahasia didekripsi secara aman di memori backend dan tidak pernah dikirim secara utuh ke browser klien.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sellers.map(s => (
                  <div key={s.id} className="p-5 rounded-2xl bg-[#111A2B] border border-[#26364D] space-y-3">
                    <h4 className="font-bold text-sm text-[#F8FAFC]">{s.name}</h4>
                    <div className="p-3 bg-[#080D18] border border-[#26364D] rounded-xl font-mono text-xs space-y-2">
                      <div>
                        <span className="text-[10px] text-[#94A3B8] block">Header Autentikasi:</span>
                        <span className="text-[#38BDF8]">{s.auth_header_key}: {s.masked_key}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#94A3B8] block">Algoritma Enkripsi:</span>
                        <span className="text-[#10B981] font-bold">AES-256-GCM + IV Hash</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSeller(s);
                        setIsSellerModalOpen(true);
                      }}
                      className="w-full py-2 bg-[#2583F7]/15 hover:bg-[#2583F7] text-[#38BDF8] hover:text-white border border-[#2583F7]/30 rounded-xl text-xs font-bold transition-all"
                    >
                      Rotasi / Perbarui API Key
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. TAB: SINKRONISASI PRODUK */}
          {activeTab === 'sync' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between p-5 rounded-2xl bg-[#111A2B] border border-[#26364D]">
                <div>
                  <h3 className="font-bold text-sm text-[#F8FAFC]">Sinkronisasi Otomatis & Terjadwal</h3>
                  <p className="text-xs text-[#94A3B8]">Tarik data harga modal dan stok aktual dari seluruh supplier secara berkala.</p>
                </div>
                <button
                  type="button"
                  onClick={handleSyncAll}
                  disabled={isLoading}
                  className="px-4 py-2.5 rounded-xl bg-[#2583F7] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-md flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Sinkronisasi Semua Sekarang</span>
                </button>
              </div>

              {/* Sync per seller list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sellers.map(s => (
                  <div key={s.id} className="p-4 rounded-xl bg-[#111A2B] border border-[#26364D] flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-[#F8FAFC] block">{s.name}</span>
                      <span className="text-[11px] text-[#94A3B8]">Interval: {s.sync_interval_minutes || 60} menit</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSyncSeller(s.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#080D18] hover:bg-[#1A263D] text-xs font-bold text-[#38BDF8] border border-[#26364D]"
                    >
                      Sync {s.name}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. TAB: MANAJEMEN HARGA */}
          {activeTab === 'pricing' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 bg-[#111A2B] border border-[#26364D] rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[#F8FAFC]">Kebijakan Margin &amp; Pengaturan Harga Jual</h3>
                  <p className="text-xs text-[#94A3B8]">Pelanggan hanya melihat harga jual Androidstore. Harga modal supplier bersifat rahasia.</p>
                </div>
              </div>

              <div className="bg-[#111A2B] border border-[#26364D] rounded-2xl overflow-hidden shadow-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                  <thead className="bg-[#0B1220] border-b border-[#26364D] text-[#94A3B8] font-bold uppercase text-[10px]">
                      <tr>
                       <th className="p-3.5 w-12">No</th>
                       <th className="p-3.5">Produk</th>
                      <th className="p-3.5">Modal Supplier</th>
                      <th className="p-3.5">Mode Harga</th>
                      <th className="p-3.5">Harga Jual</th>
                      <th className="p-3.5">Estimasi Laba</th>
                      <th className="p-3.5">Harga Grosir (5+)</th>
                      <th className="p-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#26364D]/60">
                     {paginatedPriceProducts.map((p, index) => {
                      const margin = p.selling_price - p.cost_price;
                      const isDanger = margin < 0;
                      return (
                         <tr key={p.id} className="hover:bg-[#1A263D]/40">
                           <td className="p-3.5 font-mono text-[#94A3B8]">{(priceCurrentPage - 1) * pricePageSize + index + 1}</td>
                           <td className="p-3.5 font-bold text-[#F8FAFC]">{p.name}</td>
                          <td className="p-3.5 font-mono text-[#94A3B8]">{formatPrice(p.cost_price)}</td>
                          <td className="p-3.5 capitalize text-[#38BDF8]">{p.pricing_mode.replace('_', ' ')}</td>
                          <td className="p-3.5 font-mono font-bold text-[#F8FAFC]">{formatPrice(p.selling_price)}</td>
                          <td className="p-3.5 font-mono font-bold">
                            <span className={isDanger ? 'text-red-400' : 'text-[#10B981]'}>
                              {isDanger ? '⚠️ ' : '+'}{formatPrice(margin)}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-[#94A3B8]">
                            {p.is_wholesale ? formatPrice(p.wholesale_price) : '-'}
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProductPrice(p);
                                setIsPricingModalOpen(true);
                              }}
                              className="px-3 py-1 rounded-lg bg-[#2583F7] hover:bg-[#1D4ED8] text-white font-bold text-[11px]"
                            >
                              Ubah Harga
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
               </div>
              </div>
               <SmartPagination
                 currentPage={priceCurrentPage}
                 totalItems={masterProducts.length}
                 pageSize={pricePageSize}
                 onPageChange={setPriceCurrentPage}
                 onPageSizeChange={setPricePageSize}
               />
             </div>
           )}

           {/* 8. TAB: MANAJEMEN GAMBAR */}
          {activeTab === 'images' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 bg-[#111A2B] border border-[#26364D] rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[#F8FAFC]">Manajemen Gambar Produk (Upload File &amp; URL Link)</h3>
                  <p className="text-xs text-[#94A3B8]">Prioritas: 1. Upload Admin → 2. Link Custom Admin → 3. Gambar Supplier.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                 {paginatedImageProducts.map(p => (
                  <div key={p.id} className="bg-[#111A2B] border border-[#26364D] rounded-2xl overflow-hidden p-3 space-y-2 flex flex-col justify-between">
                    <div className="aspect-square bg-[#080D18] rounded-xl overflow-hidden border border-[#26364D]/60 flex items-center justify-center">
                      <img src={p.custom_image_url || '/assets/default_produk.png'} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-[#F8FAFC] line-clamp-1">{p.name}</span>
                      <span className="text-[10px] text-[#38BDF8] uppercase font-semibold">Tipe: {p.image_type}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProductImage(p);
                        setImageUrlInput(p.custom_image_url || '');
                        setIsImageModalOpen(true);
                      }}
                      className="w-full py-1.5 bg-[#080D18] hover:bg-[#2583F7] text-[#38BDF8] hover:text-white border border-[#26364D] rounded-xl text-xs font-bold transition-all"
                    >
                      Ganti Gambar
                    </button>
                  </div>
                ))}
               </div>
               <SmartPagination
                 currentPage={imagesCurrentPage}
                 totalItems={masterProducts.length}
                 pageSize={imagesPageSize}
                 onPageChange={setImagesCurrentPage}
                 onPageSizeChange={setImagesPageSize}
               />
             </div>
           )}

           {/* 9. TAB: PESANAN PELANGGAN */}
          {activeTab === 'orders' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <input
                    type="text"
                    value={orderSearchQuery}
                    onChange={(e) => { setOrderSearchQuery(e.target.value); setOrdersCurrentPage(1); }}
                    placeholder="Cari nama customer, invoice, atau kontak..."
                    className="w-full pl-9 pr-3 py-2 bg-[#111A2B] border border-[#26364D] rounded-xl text-xs text-[#F8FAFC] placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#2583F7]"
                  />
                  <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateOrderModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#2583F7] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tambah Pesanan Manual</span>
                </button>
              </div>

              <div className="bg-[#111A2B] border border-[#26364D] rounded-2xl overflow-hidden shadow-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0B1220] border-b border-[#26364D] text-[#94A3B8] font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-3.5 w-12">No</th>
                        <th className="p-3.5">Invoice</th>
                        <th className="p-3.5">Pelanggan</th>
                        <th className="p-3.5">Kontak</th>
                        <th className="p-3.5">Total Bayar</th>
                        <th className="p-3.5">Detail Pesanan</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Bukti Transfer</th>
                        <th className="p-3.5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#26364D]/60">
                      {orders.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-[#94A3B8]">Belum ada transaksi pesanan yang masuk.</td>
                        </tr>
                      ) : (
                        paginatedOrders.map((o, index) => (
                          <tr key={o.id} className="hover:bg-[#1A263D]/40">
                            <td className="p-3.5 font-mono text-[#94A3B8]">{(ordersCurrentPage - 1) * ordersPageSize + index + 1}</td>
                           <td className="p-3.5 font-mono font-bold text-[#38BDF8]">{o.invoice_number}</td>
                            <td className="p-3.5 font-bold text-[#F8FAFC]">{o.customer_name}</td>
                            <td className="p-3.5 text-[#94A3B8]">{o.customer_phone}</td>
                            <td className="p-3.5 font-mono font-bold text-[#10B981]">{formatPrice(o.total_amount)}</td>
                             <td className="p-3.5">
                               <button
                                 type="button"
                                 onClick={() => setSelectedOrderDetail(o)}
                                 className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1677FF]/15 hover:bg-[#1677FF] text-[#22C7FF] hover:text-white border border-[#1677FF]/40 text-[11px] font-bold transition-all"
                               >
                                 <Eye className="w-3.5 h-3.5" />
                                 <span>Lihat Detail</span>
                               </button>
                             </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                o.order_status === 'delivered' ? 'bg-[#10B981]/20 text-[#10B981]' :
                                o.order_status === 'waiting_verification' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                                'bg-[#2583F7]/20 text-[#38BDF8]'
                              }`}>
                                {o.order_status === 'waiting_verification' ? 'Menunggu Verifikasi' : o.order_status}
                              </span>
                            </td>
                            <td className="p-3.5">
                              {o.payment_proof_url ? (
                                <div className="flex items-center gap-2">
                                  <img
                                    src={o.payment_proof_url}
                                    alt="Thumbnail"
                                    onClick={() => setSelectedOrderProof(o)}
                                    className="w-10 h-10 rounded-lg object-cover border border-[#26364D] cursor-pointer hover:scale-105 transition-transform flex-shrink-0 shadow-xs"
                                    title="Klik untuk perbesar bukti"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setSelectedOrderProof(o)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#2583F7]/20 hover:bg-[#2583F7] text-[#38BDF8] hover:text-white border border-[#2583F7]/40 text-[11px] font-bold transition-all"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Lihat Bukti</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-[#94A3B8] italic">Belum Ada Bukti</span>
                              )}
                            </td>
                            <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setSelectedOrderDelivery(o)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-[11px] font-bold transition-all shadow-xs"
                                title="Kirim ke Pembeli"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>Kirim</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setTargetOrderForAction(o);
                                  setEditOrderForm({
                                    customer_name: o.customer_name,
                                    customer_phone: o.customer_phone,
                                    payment_status: o.payment_status,
                                    order_status: o.order_status,
                                    customer_notes: o.customer_notes
                                  });
                                  setIsEditOrderModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#1677FF]/20 hover:bg-[#1677FF] text-[#22C7FF] hover:text-white border border-[#1677FF]/40 text-[11px] font-bold transition-all"
                                title="Edit Pesanan"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setTargetOrderForAction(o);
                                  setIsDeleteOrderModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white border border-red-800/60 text-[11px] font-bold transition-all"
                                title="Hapus Pesanan"
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                </table>
               </div>
              </div>
              <SmartPagination
                currentPage={ordersCurrentPage}
                totalItems={filteredOrders.length}
                pageSize={ordersPageSize}
                onPageChange={handleOrdersPageChange}
                onPageSizeChange={setOrdersPageSize}
              />
             </div>
            )}

           {/* 10. TAB: RIWAYAT TRANSAKSI & LAPORAN KEUNTUNGAN */}
          {activeTab === 'transactions' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Header & Actions */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-base text-[#F8FAFC]">Riwayat Transaksi &amp; Laporan Keuntungan</h3>
                  <span className="text-xs text-[#94A3B8]">Menampilkan rincian pesanan, modal supplier, dan analisis keuntungan bersih</span>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="px-3.5 py-2.5 rounded-xl bg-[#080F1F] hover:bg-[#1A263D] text-[#38BDF8] border border-[#243650] font-bold text-xs shadow-sm flex items-center gap-2 transition-all"
                  >
                    <span>📥 Export CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="px-3.5 py-2.5 rounded-xl bg-[#080F1F] hover:bg-[#1A263D] text-[#10B981] border border-[#243650] font-bold text-xs shadow-sm flex items-center gap-2 transition-all"
                  >
                    <span>📊 Export Excel</span>
                  </button>
                </div>
              </div>

              {/* Financial Stats Cards (Top) */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-[#111A2B] border border-[#26364D] space-y-1">
                  <span className="text-[11px] text-[#94A3B8] font-medium block">Total Transaksi</span>
                  <span className="text-xl font-black text-[#F8FAFC] font-mono">{orderStats.totalTransactions}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#111A2B] border border-[#26364D] space-y-1">
                  <span className="text-[11px] text-[#94A3B8] font-medium block">Total Omzet (Penjualan)</span>
                  <span className="text-xl font-black text-[#10B981] font-mono">{formatPrice(orderStats.totalRevenue)}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#111A2B] border border-[#26364D] space-y-1">
                  <span className="text-[11px] text-[#94A3B8] font-medium block">Total Modal Supplier</span>
                  <span className="text-xl font-black text-red-400 font-mono">{formatPrice(orderStats.totalCost)}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#111A2B] border border-[#26364D] space-y-1">
                  <span className="text-[11px] text-[#94A3B8] font-medium block">Keuntungan Kotor</span>
                  <span className="text-xl font-black text-[#38BDF8] font-mono">+{formatPrice(orderStats.grossProfit)}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#111A2B] border border-[#26364D] space-y-1">
                  <span className="text-[11px] text-[#94A3B8] font-medium block">Keuntungan Bersih (Net)</span>
                  <span className="text-xl font-black text-[#10B981] font-mono">+{formatPrice(orderStats.netProfit)}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#111A2B] border border-[#26364D] space-y-1">
                  <span className="text-[11px] text-[#94A3B8] font-medium block">Pending</span>
                  <span className="text-xl font-black text-amber-400 font-mono">{orderStats.pendingCount}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#111A2B] border border-[#26364D] space-y-1">
                  <span className="text-[11px] text-[#94A3B8] font-medium block">Berhasil (Success)</span>
                  <span className="text-xl font-black text-[#10B981] font-mono">{orderStats.successCount}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#111A2B] border border-[#26364D] space-y-1">
                  <span className="text-[11px] text-[#94A3B8] font-medium block">Gagal / Batal</span>
                  <span className="text-xl font-black text-red-400 font-mono">{orderStats.failedCount}</span>
                </div>
              </div>

              {/* Filters Toolbar */}
              <div className="p-4 rounded-2xl bg-[#111A2B] border border-[#26364D] flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={orderSearchQuery}
                    onChange={(e) => { setOrderSearchQuery(e.target.value); setOrdersCurrentPage(1); }}
                    placeholder="Cari invoice, nama pelanggan, atau nomor kontak..."
                    className="w-full pl-9 pr-3 py-2 bg-[#080F1F] border border-[#26364D] rounded-xl text-xs text-[#F8FAFC] placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#2583F7]"
                  />
                  <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
                </div>

                {/* Date Range Filter */}
                <select
                  value={orderDateRange}
                  onChange={(e) => { setOrderDateRange(e.target.value); setOrdersCurrentPage(1); }}
                  className="px-3 py-2 bg-[#080F1F] border border-[#26364D] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#2583F7]"
                >
                  <option value="all">Semua Periode</option>
                  <option value="today">Hari Ini</option>
                  <option value="yesterday">Kemarin</option>
                  <option value="last7">7 Hari Terakhir</option>
                  <option value="last30">30 Hari Terakhir</option>
                  <option value="this_month">Bulan Ini</option>
                  <option value="last_month">Bulan Sebelumnya</option>
                </select>

                {/* Payment Status Filter */}
                <select
                  value={orderPaymentFilter}
                  onChange={(e) => { setOrderPaymentFilter(e.target.value); setOrdersCurrentPage(1); }}
                  className="px-3 py-2 bg-[#080F1F] border border-[#26364D] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#2583F7]"
                >
                  <option value="all">Semua Status Bayar</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                  <option value="expired">Expired</option>
                </select>

                {/* Order Status Filter */}
                <select
                  value={orderStatusFilter}
                  onChange={(e) => { setOrderStatusFilter(e.target.value); setOrdersCurrentPage(1); }}
                  className="px-3 py-2 bg-[#080F1F] border border-[#26364D] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#2583F7]"
                >
                  <option value="all">Semua Status Order</option>
                  <option value="pending">Pending</option>
                  <option value="waiting_verification">Menunggu Verifikasi</option>
                  <option value="processing">Processing</option>
                  <option value="delivered">Delivered / Success</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="rejected">Rejected</option>
                  <option value="failed">Failed</option>
                </select>

                {/* Supplier Filter */}
                <select
                  value={orderSupplierFilter}
                  onChange={(e) => { setOrderSupplierFilter(e.target.value); setOrdersCurrentPage(1); }}
                  className="px-3 py-2 bg-[#080F1F] border border-[#26364D] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#2583F7]"
                >
                  <option value="all">Semua Supplier</option>
                  {sellers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>

                {(orderSearchQuery || orderDateRange !== 'all' || orderPaymentFilter !== 'all' || orderStatusFilter !== 'all' || orderSupplierFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setOrderSearchQuery('');
                      setOrderDateRange('all');
                      setOrderPaymentFilter('all');
                      setOrderStatusFilter('all');
                      setOrderSupplierFilter('all');
                      setOrdersCurrentPage(1);
                    }}
                    className="px-3 py-2 text-xs font-bold text-[#38BDF8] hover:underline"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              {/* Transactions & Profit Audit Table */}
              <div className="w-full min-w-0 bg-[#111A2B] border border-[#26364D] rounded-2xl overflow-x-auto overflow-y-visible shadow-card">
                <table className="w-full min-w-[960px] text-left text-xs">
                    <thead className="bg-[#0B1220] border-b border-[#26364D] text-[#94A3B8] font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-3.5 w-12">No</th>
                        <th className="p-3.5">Invoice / Tanggal</th>
                        <th className="p-3.5">Pelanggan &amp; Kontak</th>
                        <th className="p-3.5">Metode</th>
                        <th className="p-3.5">Total Bayar</th>
                        <th className="p-3.5">Modal Supplier</th>
                        <th className="p-3.5">Keuntungan</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Aksi Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#26364D]/60">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-10 text-center text-[#94A3B8]">Tidak ada transaksi yang cocok dengan filter atau pencarian Anda.</td>
                        </tr>
                      ) : (
                        paginatedOrders.map((o, index) => {
                          const rowNum = (ordersCurrentPage - 1) * ordersPageSize + index + 1;
                          const profit = Number(o.gross_profit || 0);
                          return (
                            <tr key={o.id} className="hover:bg-[#1A263D]/40 transition-colors">
                              <td className="p-3.5 font-mono text-[#94A3B8]">{rowNum}</td>
                              <td className="p-3.5">
                                <span className="font-mono font-bold text-[#38BDF8] block">{o.invoice_number}</span>
                                <span className="text-[10px] text-[#94A3B8] block">{new Date(o.created_at).toLocaleString('id-ID')}</span>
                              </td>
                              <td className="p-3.5">
                                <span className="font-bold text-[#F8FAFC] block">{o.customer_name}</span>
                                <span className="text-[10px] text-[#94A3B8] font-mono">{o.customer_phone}</span>
                              </td>
                              <td className="p-3.5 font-medium">{o.payment_method || 'QRIS Instant'}</td>
                              <td className="p-3.5 font-mono font-bold text-[#10B981]">{formatPrice(o.total_amount)}</td>
                              <td className="p-3.5 font-mono text-red-400">{formatPrice(o.total_cost || 0)}</td>
                              <td className="p-3.5 font-mono font-bold text-[#38BDF8]">+{formatPrice(profit)}</td>
                              <td className="p-3.5">
                                <div className="space-y-1">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                    o.order_status === 'delivered' || o.order_status === 'success' ? 'bg-[#10B981]/20 text-[#10B981]' :
                                    o.order_status === 'waiting_verification' ? 'bg-amber-500/20 text-amber-400' :
                                    'bg-[#2583F7]/20 text-[#38BDF8]'
                                  }`}>
                                    {o.order_status}
                                  </span>
                                  <span className={`block px-2 py-0.5 rounded text-[9px] font-bold ${
                                    o.payment_status === 'paid' || o.payment_status === 'verified' ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-red-950/40 text-red-400'
                                  }`}>
                                    Pay: {o.payment_status}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => setSelectedOrderDetail(o)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1677FF]/15 hover:bg-[#1677FF] text-[#22C7FF] hover:text-white border border-[#1677FF]/40 text-xs font-bold transition-all shadow-sm"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Detail</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
              </div>
              <SmartPagination
                currentPage={ordersCurrentPage}
                totalItems={filteredOrders.length}
                pageSize={ordersPageSize}
                onPageChange={setOrdersCurrentPage}
                onPageSizeChange={setOrdersPageSize}
              />
            </div>
          )}

           {/* Legacy transaction view stays disabled; the canonical view above owns this tab. */}
          {activeTab === 'transactions' && import.meta.env.VITE_ENABLE_LEGACY_TRANSACTIONS === 'true' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Header & Actions */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-base text-[#F8FAFC]">Riwayat Transaksi &amp; Laporan Keuntungan</h3>
                  <span className="text-xs text-[#94A3B8]">Menampilkan rincian pesanan, modal supplier, dan analisis keuntungan bersih</span>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="px-3.5 py-2.5 rounded-xl bg-[#080F1F] hover:bg-[#1A263D] text-[#38BDF8] border border-[#243650] font-bold text-xs shadow-sm flex items-center gap-2 transition-all"
                  >
                    <span>📥 Export CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="px-3.5 py-2.5 rounded-xl bg-[#080F1F] hover:bg-[#1A263D] text-[#10B981] border border-[#243650] font-bold text-xs shadow-sm flex items-center gap-2 transition-all"
                  >
                    <span>📊 Export Excel</span>
                  </button>
                </div>
              </div>

              {/* Financial Stats Cards (Top) */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-[#111A2B] border border-[#26364D] space-y-1">
                  <span className="text-[11px] text-[#94A3B8] font-medium block">Total Transaksi</span>
                  <span className="text-xl font-black text-[#F8FAFC] font-mono">{orderStats.totalTransactions}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#111A2B] border border-[#26364D] space-y-1">
                  <span className="text-[11px] text-[#94A3B8] font-medium block">Total Omzet (Penjualan)</span>
                  <span className="text-xl font-black text-[#10B981] font-mono">{formatPrice(orderStats.totalRevenue)}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#111A2B] border border-[#26364D] space-y-1">
                  <span className="text-[11px] text-[#94A3B8] font-medium block">Total Modal Supplier</span>
                  <span className="text-xl font-black text-red-400 font-mono">{formatPrice(orderStats.totalCost)}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#111A2B] border border-[#26364D] space-y-1">
                  <span className="text-[11px] text-[#94A3B8] font-medium block">Keuntungan Kotor</span>
                  <span className="text-xl font-black text-[#38BDF8] font-mono">+{formatPrice(orderStats.grossProfit)}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#111A2B] border border-[#26364D] space-y-1">
                  <span className="text-[11px] text-[#94A3B8] font-medium block">Keuntungan Bersih (Net)</span>
                  <span className="text-xl font-black text-[#10B981] font-mono">+{formatPrice(orderStats.netProfit)}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#111A2B] border border-[#26364D] space-y-1">
                  <span className="text-[11px] text-[#94A3B8] font-medium block">Pending</span>
                  <span className="text-xl font-black text-amber-400 font-mono">{orderStats.pendingCount}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#111A2B] border border-[#26364D] space-y-1">
                  <span className="text-[11px] text-[#94A3B8] font-medium block">Berhasil (Success)</span>
                  <span className="text-xl font-black text-[#10B981] font-mono">{orderStats.successCount}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#111A2B] border border-[#26364D] space-y-1">
                  <span className="text-[11px] text-[#94A3B8] font-medium block">Gagal / Batal</span>
                  <span className="text-xl font-black text-red-400 font-mono">{orderStats.failedCount}</span>
                </div>
              </div>

              {/* Filters Toolbar */}
              <div className="p-4 rounded-2xl bg-[#111A2B] border border-[#26364D] flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={orderSearchQuery}
                    onChange={(e) => { setOrderSearchQuery(e.target.value); setOrdersCurrentPage(1); }}
                    placeholder="Cari invoice, nama pelanggan, atau nomor kontak..."
                    className="w-full pl-9 pr-3 py-2 bg-[#080F1F] border border-[#26364D] rounded-xl text-xs text-[#F8FAFC] placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#2583F7]"
                  />
                  <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
                </div>

                {/* Date Range Filter */}
                <select
                  value={orderDateRange}
                  onChange={(e) => { setOrderDateRange(e.target.value); setOrdersCurrentPage(1); }}
                  className="px-3 py-2 bg-[#080F1F] border border-[#26364D] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#2583F7]"
                >
                  <option value="all">Semua Periode</option>
                  <option value="today">Hari Ini</option>
                  <option value="yesterday">Kemarin</option>
                  <option value="last7">7 Hari Terakhir</option>
                  <option value="last30">30 Hari Terakhir</option>
                  <option value="this_month">Bulan Ini</option>
                  <option value="last_month">Bulan Sebelumnya</option>
                </select>

                {/* Payment Status Filter */}
                <select
                  value={orderPaymentFilter}
                  onChange={(e) => { setOrderPaymentFilter(e.target.value); setOrdersCurrentPage(1); }}
                  className="px-3 py-2 bg-[#080F1F] border border-[#26364D] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#2583F7]"
                >
                  <option value="all">Semua Status Bayar</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                  <option value="expired">Expired</option>
                </select>

                {/* Order Status Filter */}
                <select
                  value={orderStatusFilter}
                  onChange={(e) => { setOrderStatusFilter(e.target.value); setOrdersCurrentPage(1); }}
                  className="px-3 py-2 bg-[#080F1F] border border-[#26364D] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#2583F7]"
                >
                  <option value="all">Semua Status Order</option>
                  <option value="pending">Pending</option>
                  <option value="waiting_verification">Menunggu Verifikasi</option>
                  <option value="processing">Processing</option>
                  <option value="delivered">Delivered / Success</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="rejected">Rejected</option>
                  <option value="failed">Failed</option>
                </select>

                {/* Supplier Filter */}
                <select
                  value={orderSupplierFilter}
                  onChange={(e) => { setOrderSupplierFilter(e.target.value); setOrdersCurrentPage(1); }}
                  className="px-3 py-2 bg-[#080F1F] border border-[#26364D] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#2583F7]"
                >
                  <option value="all">Semua Supplier</option>
                  {sellers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>

                {(orderSearchQuery || orderDateRange !== 'all' || orderPaymentFilter !== 'all' || orderStatusFilter !== 'all' || orderSupplierFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setOrderSearchQuery('');
                      setOrderDateRange('all');
                      setOrderPaymentFilter('all');
                      setOrderStatusFilter('all');
                      setOrderSupplierFilter('all');
                      setOrdersCurrentPage(1);
                    }}
                    className="px-3 py-2 text-xs font-bold text-[#38BDF8] hover:underline"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              {/* Transactions & Profit Audit Table */}
              <div className="bg-[#111A2B] border border-[#26364D] rounded-2xl overflow-hidden shadow-card">
                <table className="w-full text-left text-xs">
                    <thead className="bg-[#0B1220] border-b border-[#26364D] text-[#94A3B8] font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-3.5 w-12">No</th>
                        <th className="p-3.5">Invoice / Tanggal</th>
                        <th className="p-3.5">Pelanggan &amp; Kontak</th>
                        <th className="p-3.5">Metode</th>
                        <th className="p-3.5">Total Bayar</th>
                        <th className="p-3.5">Modal Supplier</th>
                        <th className="p-3.5">Keuntungan</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Aksi Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#26364D]/60">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-10 text-center text-[#94A3B8]">Tidak ada transaksi yang cocok dengan filter atau pencarian Anda.</td>
                        </tr>
                      ) : (
                        paginatedOrders.map((o, index) => {
                          const rowNum = (ordersCurrentPage - 1) * ordersPageSize + index + 1;
                          const profit = Number(o.gross_profit || 0);
                          return (
                            <tr key={o.id} className="hover:bg-[#1A263D]/40 transition-colors">
                              <td className="p-3.5 font-mono text-[#94A3B8]">{rowNum}</td>
                              <td className="p-3.5">
                                <span className="font-mono font-bold text-[#38BDF8] block">{o.invoice_number}</span>
                                <span className="text-[10px] text-[#94A3B8] block">{new Date(o.created_at).toLocaleString('id-ID')}</span>
                              </td>
                              <td className="p-3.5">
                                <span className="font-bold text-[#F8FAFC] block">{o.customer_name}</span>
                                <span className="text-[10px] text-[#94A3B8] font-mono">{o.customer_phone}</span>
                              </td>
                              <td className="p-3.5 font-medium">{o.payment_method || 'QRIS Instant'}</td>
                              <td className="p-3.5 font-mono font-bold text-[#10B981]">{formatPrice(o.total_amount)}</td>
                              <td className="p-3.5 font-mono text-red-400">{formatPrice(o.total_cost || 0)}</td>
                              <td className="p-3.5 font-mono font-bold text-[#38BDF8]">+{formatPrice(profit)}</td>
                              <td className="p-3.5">
                                <div className="space-y-1">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                    o.order_status === 'delivered' || o.order_status === 'success' ? 'bg-[#10B981]/20 text-[#10B981]' :
                                    o.order_status === 'waiting_verification' ? 'bg-amber-500/20 text-amber-400' :
                                    'bg-[#2583F7]/20 text-[#38BDF8]'
                                  }`}>
                                    {o.order_status}
                                  </span>
                                  <span className={`block px-2 py-0.5 rounded text-[9px] font-bold ${
                                    o.payment_status === 'paid' || o.payment_status === 'verified' ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-red-950/40 text-red-400'
                                  }`}>
                                    Pay: {o.payment_status}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => setSelectedOrderDetail(o)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1677FF]/15 hover:bg-[#1677FF] text-[#22C7FF] hover:text-white border border-[#1677FF]/40 text-xs font-bold transition-all shadow-sm"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Detail</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
              </div>
              <SmartPagination
                currentPage={ordersCurrentPage}
                totalItems={filteredOrders.length}
                pageSize={ordersPageSize}
                onPageChange={setOrdersCurrentPage}
                onPageSizeChange={setOrdersPageSize}
              />
            </div>
          )}

          {/* 11. TAB: LOG API & MONITORING */}
          {activeTab === 'logs' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[#F8FAFC]">Audit Request API &amp; Health Monitoring</h3>
                  <p className="text-xs text-[#94A3B8]">Setiap request HTTP ke seller dicatat dengan durasi dan response code aman.</p>
                </div>
                <button
                  type="button"
                  onClick={loadAllData}
                  className="px-3 py-1.5 rounded-xl bg-[#111A2B] hover:bg-[#1A263D] border border-[#26364D] text-xs font-bold text-[#38BDF8]"
                >
                  Refresh Log
                </button>
              </div>

              <div className="bg-[#111A2B] border border-[#26364D] rounded-2xl overflow-hidden shadow-card">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0B1220] border-b border-[#26364D] text-[#94A3B8] font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3.5">Waktu</th>
                      <th className="p-3.5">Supplier</th>
                      <th className="p-3.5">Metode / URL</th>
                      <th className="p-3.5">Status HTTP</th>
                      <th className="p-3.5">Durasi</th>
                      <th className="p-3.5">Ringkasan Respons</th>
                      <th className="p-3.5 text-right">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#26364D]/60 font-mono text-[11px]">
                    {logs.map(log => (
                      <tr key={log.id} className="hover:bg-[#1A263D]/40">
                        <td className="p-3.5 text-[#94A3B8]">{new Date(log.created_at).toLocaleTimeString()}</td>
                        <td className="p-3.5 font-bold text-[#38BDF8]">{log.seller_name}</td>
                        <td className="p-3.5 truncate max-w-xs">{log.request_method} {log.request_url}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.is_success ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-red-950/40 text-red-400'
                          }`}>
                            {log.http_status || (log.is_success ? 200 : 500)}
                          </span>
                        </td>
                        <td className="p-3.5 text-[#94A3B8]">{log.duration_ms}ms</td>
                        <td className="p-3.5 text-[#94A3B8] truncate max-w-xs">{log.response_summary || log.error_message}</td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedLogDetail(log)}
                            className="p-1 rounded bg-[#080D18] hover:bg-[#2583F7] text-[#94A3B8] hover:text-white"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 12. TAB: PENGATURAN WEBSITE */}
          {activeTab === 'settings' && (
            <div className="space-y-4 max-w-2xl animate-fadeIn">
              <form onSubmit={handleChangeAdminPassword} className="p-6 bg-[#111A2B] border border-[#26364D] rounded-2xl space-y-4">
                <div>
                  <h3 className="font-bold text-base text-[#F8FAFC]">Profil Administrator</h3>
                  <p className="text-xs text-[#94A3B8] mt-1">Email admin tetap dan hanya password yang dapat diperbarui.</p>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[#94A3B8] font-semibold block mb-1">Email Admin</label>
                    <input
                      type="email"
                      value="androidstore279@gmail.com"
                      readOnly
                      className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#94A3B8] cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-[#94A3B8] font-semibold block mb-1">Password Lama</label>
                    <div className="relative">
                      <input
                        type={visibleProfilePasswords.current ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={profilePasswordForm.current_password}
                        onChange={(event) => setProfilePasswordForm({ ...profilePasswordForm, current_password: event.target.value })}
                        className="w-full px-3 pr-10 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                      />
                      <button
                        type="button"
                        onClick={() => setVisibleProfilePasswords((visible) => ({ ...visible, current: !visible.current }))}
                        className="absolute right-3 top-2 text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
                        aria-label={visibleProfilePasswords.current ? 'Hide current password' : 'Show current password'}
                      >
                        {visibleProfilePasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[#94A3B8] font-semibold block mb-1">Password Baru</label>
                    <div className="relative">
                      <input
                        type={visibleProfilePasswords.next ? 'text' : 'password'}
                        required
                        minLength={12}
                        autoComplete="new-password"
                        value={profilePasswordForm.new_password}
                        onChange={(event) => setProfilePasswordForm({ ...profilePasswordForm, new_password: event.target.value })}
                        className="w-full px-3 pr-10 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                      />
                      <button
                        type="button"
                        onClick={() => setVisibleProfilePasswords((visible) => ({ ...visible, next: !visible.next }))}
                        className="absolute right-3 top-2 text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
                        aria-label={visibleProfilePasswords.next ? 'Hide new password' : 'Show new password'}
                      >
                        {visibleProfilePasswords.next ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-[#94A3B8] mt-1 block">Minimal 12 karakter.</span>
                  </div>
                  <div>
                    <label className="text-[#94A3B8] font-semibold block mb-1">Konfirmasi Password Baru</label>
                    <div className="relative">
                      <input
                        type={visibleProfilePasswords.confirmation ? 'text' : 'password'}
                        required
                        minLength={12}
                        autoComplete="new-password"
                        value={profilePasswordForm.confirm_password}
                        onChange={(event) => setProfilePasswordForm({ ...profilePasswordForm, confirm_password: event.target.value })}
                        className="w-full px-3 pr-10 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                      />
                      <button
                        type="button"
                        onClick={() => setVisibleProfilePasswords((visible) => ({ ...visible, confirmation: !visible.confirmation }))}
                        className="absolute right-3 top-2 text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
                        aria-label={visibleProfilePasswords.confirmation ? 'Hide password confirmation' : 'Show password confirmation'}
                      >
                        {visibleProfilePasswords.confirmation ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded-xl bg-[#2583F7] hover:bg-[#1D4ED8] text-white font-bold text-xs disabled:opacity-50"
                >
                  {isLoading ? 'Menyimpan...' : 'Ganti Password Admin'}
                </button>
              </form>

              <div className="p-6 bg-[#111A2B] border border-[#26364D] rounded-2xl space-y-4">
                <h3 className="font-bold text-base text-[#F8FAFC]">Konfigurasi Toko &amp; Integrasi CS</h3>
                
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[#94A3B8] font-semibold block mb-1">Nama Toko Online</label>
                    <input
                      type="text"
                      value={settings.store_name || ''}
                      onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                      className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                    />
                  </div>

                  <div>
                    <label className="text-[#94A3B8] font-semibold block mb-1">Nomor WhatsApp Resmi Admin</label>
                    <input
                      type="text"
                      value={settings.whatsapp_number || ''}
                      onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                      className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                    />
                  </div>

                  <div>
                    <label className="text-[#94A3B8] font-semibold block mb-1">Default Markup Impor Produk (%)</label>
                    <input
                      type="number"
                      value={settings.default_markup_percent || 25}
                      onChange={(e) => setSettings({ ...settings, default_markup_percent: e.target.value })}
                      className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await fetch('/api/admin/settings', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(settings)
                      });
                      showNotification('success', 'Pengaturan berhasil disimpan!');
                    } catch {
                      showNotification('error', 'Gagal menyimpan pengaturan.');
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#2583F7] hover:bg-[#1D4ED8] text-white font-bold text-xs"
                >
                  Simpan Pengaturan
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ========================================================= */}
      {/* MODAL: TAMBAH / EDIT SELLER                               */}
      {/* ========================================================= */}
      {isSellerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#101827] border border-[#26364D] rounded-2xl shadow-modal overflow-hidden text-xs text-[#F8FAFC]">
            <div className="px-5 py-4 bg-[#0B1220] border-b border-[#26364D] flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingSeller.id ? 'Edit Konfigurasi Seller' : 'Tambah Seller / Supplier Baru'}
              </h3>
              <button type="button" onClick={() => setIsSellerModalOpen(false)}>
                <X className="w-4 h-4 text-[#94A3B8]" />
              </button>
            </div>

            <form onSubmit={handleSaveSeller} className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-[#94A3B8] mb-1 font-semibold">Nama Seller</label>
                <input
                  type="text"
                  required
                  value={editingSeller.name || ''}
                  onChange={(e) => setEditingSeller({ ...editingSeller, name: e.target.value })}
                  placeholder="Contoh: Seller 3 Telegram API"
                  className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                />
              </div>

              <div>
                <label className="block text-[#94A3B8] mb-1 font-semibold">Base URL API Endpoint</label>
                <input
                  type="url"
                  required
                  value={editingSeller.base_url || ''}
                  onChange={(e) => setEditingSeller({ ...editingSeller, base_url: e.target.value })}
                  placeholder="https://api.supplier.com/v1"
                  className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#94A3B8] mb-1 font-semibold">Metode Autentikasi</label>
                  <select
                    value={editingSeller.auth_type || 'header'}
                    onChange={(e) => setEditingSeller({ ...editingSeller, auth_type: e.target.value })}
                    className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                  >
                    <option value="header">Custom HTTP Header</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="query">Query Parameter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#94A3B8] mb-1 font-semibold">Nama Header Key</label>
                  <input
                    type="text"
                    value={editingSeller.auth_header_key || 'x-api-key'}
                    onChange={(e) => setEditingSeller({ ...editingSeller, auth_header_key: e.target.value })}
                    placeholder="x-api-key"
                    className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#94A3B8] mb-1 font-semibold">
                  API Key / Token Rahasia <span className="text-[#10B981] text-[10px]">(Terenkripsi AES-256)</span>
                </label>
                <input
                  type="password"
                  value={editingSeller.api_key || ''}
                  onChange={(e) => setEditingSeller({ ...editingSeller, api_key: e.target.value })}
                  placeholder={editingSeller.id ? '(Biarkan kosong jika tidak diubah)' : 'Masukkan API Key Anda'}
                  className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#94A3B8] mb-1 font-semibold">Endpoint Produk</label>
                  <input
                    type="text"
                    value={editingSeller.endpoint_products || '/products'}
                    onChange={(e) => setEditingSeller({ ...editingSeller, endpoint_products: e.target.value })}
                    className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                  />
                </div>
                <div>
                  <label className="block text-[#94A3B8] mb-1 font-semibold">Endpoint Order</label>
                  <input
                    type="text"
                    value={editingSeller.endpoint_order || '/order'}
                    onChange={(e) => setEditingSeller({ ...editingSeller, endpoint_order: e.target.value })}
                    className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#26364D]">
                <button
                  type="button"
                  onClick={() => setIsSellerModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#111A2B] text-[#94A3B8]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2583F7] hover:bg-[#1D4ED8] text-white font-bold"
                >
                  Simpan Seller
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: MANAJEMEN HARGA JUAL                               */}
      {/* ========================================================= */}
      {isPricingModalOpen && editingProductPrice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#101827] border border-[#26364D] rounded-2xl shadow-modal p-5 text-xs text-[#F8FAFC] space-y-4">
            <div className="flex items-center justify-between border-b border-[#26364D] pb-3">
              <h3 className="font-bold text-sm">Pengaturan Harga: {editingProductPrice.name}</h3>
              <button type="button" onClick={() => setIsPricingModalOpen(false)}>
                <X className="w-4 h-4 text-[#94A3B8]" />
              </button>
            </div>

            <form onSubmit={handleSavePrice} className="space-y-3.5">
              <div className="p-3 bg-[#080D18] rounded-xl border border-[#26364D] flex justify-between font-mono">
                <span className="text-[#94A3B8]">Harga Modal Supplier:</span>
                <span className="text-[#38BDF8] font-bold">{formatPrice(editingProductPrice.cost_price)}</span>
              </div>

              <div>
                <label className="block text-[#94A3B8] mb-1 font-semibold">Metode Markup</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'percent', label: 'Markup %' },
                    { id: 'nominal', label: 'Markup Rp' },
                    { id: 'manual', label: 'Manual' },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMarkupType(m.id as MarkupMode)}
                      className={`py-2 rounded-xl border font-bold text-xs ${
                        markupType === m.id ? 'bg-[#2583F7] text-white border-[#2583F7]' : 'bg-[#111A2B] border-[#26364D] text-[#94A3B8]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {markupType !== 'manual' && (
                <div>
                  <label className="block text-[#94A3B8] mb-1 font-semibold">
                    Nilai Markup {markupType === 'percent' ? '(%)' : '(Rp)'}
                  </label>
                  <input
                    type="number"
                    value={markupVal}
                    onChange={(e) => setMarkupVal(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                  />
                </div>
              )}

              <div>
                <label className="block text-[#94A3B8] mb-1 font-semibold">Harga Jual Akhir Androidstore</label>
                <input
                  type="number"
                  value={
                    markupType === 'percent'
                      ? Math.round((editingProductPrice.cost_price * (1 + markupVal / 100)) / 500) * 500
                      : markupType === 'nominal'
                      ? editingProductPrice.cost_price + markupVal
                      : editingProductPrice.selling_price
                  }
                  onChange={(e) => setEditingProductPrice({ ...editingProductPrice, selling_price: Number(e.target.value) })}
                  disabled={markupType !== 'manual'}
                  className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#10B981] font-bold font-mono text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#26364D]">
                <button type="button" onClick={() => setIsPricingModalOpen(false)} className="px-4 py-2 rounded-xl bg-[#111A2B] text-[#94A3B8]">
                  Batal
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-[#2583F7] hover:bg-[#1D4ED8] text-white font-bold">
                  Simpan Harga
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: MANAJEMEN GAMBAR (Upload File / Custom URL)        */}
      {/* ========================================================= */}
      {isImageModalOpen && editingProductImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#101827] border border-[#26364D] rounded-2xl shadow-modal p-5 text-xs text-[#F8FAFC] space-y-4">
            <div className="flex items-center justify-between border-b border-[#26364D] pb-3">
              <h3 className="font-bold text-sm">Ganti Gambar: {editingProductImage.name}</h3>
              <button type="button" onClick={() => setIsImageModalOpen(false)}>
                <X className="w-4 h-4 text-[#94A3B8]" />
              </button>
            </div>

            <form onSubmit={handleSaveImage} className="space-y-4">
              {/* Preview Box */}
              <div className="aspect-[16/10] bg-[#080D18] border border-[#26364D] rounded-xl overflow-hidden flex items-center justify-center">
                <img
                  src={imagePreview || imageUrlInput || editingProductImage.custom_image_url || '/assets/default_produk.png'}
                  alt=""
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Metode 1: Upload File */}
              <div>
                <label className="block text-[#94A3B8] mb-1 font-semibold">METODE 1 — Upload File (JPG, PNG, WEBP, SVG)</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                    }
                  }}
                  className="w-full text-xs text-[#94A3B8] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#2583F7] file:text-white hover:file:bg-[#1D4ED8]"
                />
              </div>

              {/* Metode 2: Link URL */}
              <div>
                <label className="block text-[#94A3B8] mb-1 font-semibold">METODE 2 — Link URL Gambar Eksternal</label>
                <input
                  type="url"
                  value={imageUrlInput}
                  onChange={(e) => {
                    setImageUrlInput(e.target.value);
                    setImageFile(null);
                    setImagePreview(e.target.value);
                  }}
                  placeholder="https://domain.com/gambar-produk.jpg"
                  className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#26364D]">
                <button type="button" onClick={() => setIsImageModalOpen(false)} className="px-4 py-2 rounded-xl bg-[#111A2B] text-[#94A3B8]">
                  Batal
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-[#2583F7] hover:bg-[#1D4ED8] text-white font-bold">
                  Simpan Gambar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DETAIL LOG API                                     */}
      {/* ========================================================= */}
      {selectedLogDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#101827] border border-[#26364D] rounded-2xl shadow-modal p-5 text-xs text-[#F8FAFC] space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-[#26364D] pb-3">
              <span className="font-bold text-sm text-[#38BDF8]">Log #{selectedLogDetail.id} - {selectedLogDetail.seller_name}</span>
              <button type="button" onClick={() => setSelectedLogDetail(null)}>
                <X className="w-4 h-4 text-[#94A3B8]" />
              </button>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div><strong className="text-[#94A3B8]">URL:</strong> {selectedLogDetail.request_method} {selectedLogDetail.request_url}</div>
              <div><strong className="text-[#94A3B8]">HTTP Status:</strong> {selectedLogDetail.http_status}</div>
              <div><strong className="text-[#94A3B8]">Durasi:</strong> {selectedLogDetail.duration_ms}ms</div>
              <div><strong className="text-[#94A3B8]">Waktu:</strong> {new Date(selectedLogDetail.created_at).toLocaleString('id-ID')}</div>
              <div><strong className="text-[#94A3B8]">Hasil Respons:</strong></div>
              <div className="p-3 bg-[#080D18] rounded-xl border border-[#26364D] text-[#10B981] whitespace-pre-wrap">
                {selectedLogDetail.response_summary || selectedLogDetail.error_message || 'Tidak ada detail error.'}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================= */}
      {/* MODAL: PREVIEW BUKTI PEMBAYARAN                           */}
      {/* ========================================================= */}
      {selectedOrderProof && (
        <div className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-xl bg-[#101827] border border-[#26364D] rounded-2xl shadow-modal overflow-hidden text-xs text-[#F8FAFC]">
            <div className="px-5 py-4 bg-[#0B1220] border-b border-[#26364D] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#38BDF8]">Verifikasi Bukti Transfer</h3>
                <span className="text-[10px] text-[#94A3B8]">Invoice: #{selectedOrderProof.invoice_number}</span>
              </div>
              <button type="button" onClick={() => setSelectedOrderProof(null)}>
                <X className="w-4 h-4 text-[#94A3B8]" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#080D18] border border-[#26364D] rounded-xl">
                <div>
                  <span className="text-[#94A3B8] block text-[10px]">Pelanggan:</span>
                  <span className="font-bold text-[#F8FAFC]">{selectedOrderProof.customer_name}</span>
                </div>
                <div>
                  <span className="text-[#94A3B8] block text-[10px]">WhatsApp:</span>
                  <span className="font-bold text-[#38BDF8]">{selectedOrderProof.customer_phone}</span>
                </div>
                <div>
                  <span className="text-[#94A3B8] block text-[10px]">Total Tagihan:</span>
                  <span className="font-bold text-[#10B981]">{formatPrice(selectedOrderProof.total_amount)}</span>
                </div>
                <div>
                  <span className="text-[#94A3B8] block text-[10px]">Waktu Pesan:</span>
                  <span className="text-[#F8FAFC]">{new Date(selectedOrderProof.created_at).toLocaleString('id-ID')}</span>
                </div>
              </div>

              {selectedOrderProof.customer_notes && (
                <div className="p-2.5 bg-[#111A2B] rounded-xl border border-[#26364D] text-[#94A3B8]">
                  <strong className="text-[#F8FAFC]">Catatan:</strong> {selectedOrderProof.customer_notes}
                </div>
              )}

              {/* High-res Image Preview */}
              <div
                className="relative aspect-video w-full bg-[#080D18] border border-[#26364D] rounded-xl overflow-hidden flex items-center justify-center p-2 cursor-zoom-in group"
                onClick={() => setIsProofLightboxOpen(true)}
              >
                <img
                  src={selectedOrderProof.payment_proof_url || '/assets/default_produk.png'}
                  alt="Bukti Transfer"
                  className="w-full h-full object-contain rounded-lg group-hover:scale-[1.02] transition-transform"
                />
                <span className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/70 text-white text-[11px] font-bold flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye className="w-3.5 h-3.5" /> Perbesar
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#26364D] flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await fetch(`/api/admin/orders/${selectedOrderProof.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ payment_status: 'paid', order_status: 'processing' })
                        });
                        showNotification('success', `Pembayaran untuk #${selectedOrderProof.invoice_number} disetujui!`);
                        setSelectedOrderProof(null);
                        loadAllData();
                      } catch {
                        showNotification('error', 'Gagal menyetujui pembayaran.');
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs"
                  >
                    ✓ Setujui Pembayaran (Approve)
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await fetch(`/api/admin/orders/${selectedOrderProof.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ payment_status: 'rejected', order_status: 'rejected' })
                        });
                        showNotification('error', `Pembayaran untuk #${selectedOrderProof.invoice_number} ditolak.`);
                        setSelectedOrderProof(null);
                        loadAllData();
                      } catch {
                        showNotification('error', 'Gagal menolak pembayaran.');
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-red-900/50 hover:bg-red-800 text-red-300 font-bold border border-red-700 text-xs"
                  >
                    ✕ Tolak Pembayaran
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={selectedOrderProof.payment_proof_url || '#'}
                    download={`Bukti-Transfer-${selectedOrderProof.invoice_number}.jpg`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-xl bg-[#2583F7] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-xs"
                  >
                    Unduh Bukti
                  </a>

                  <button
                    type="button"
                    onClick={() => setSelectedOrderProof(null)}
                    className="px-4 py-2 rounded-xl bg-[#111A2B] text-[#94A3B8] text-xs font-bold"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen payment proof lightbox */}
      {isProofLightboxOpen && selectedOrderProof && (
        <div
          className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsProofLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsProofLightboxOpen(false)}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-[#111A2B] text-white flex items-center justify-center border border-[#26364D] hover:bg-[#2583F7]"
          >
            <X className="w-5 h-5" />
          </button>
          <div onClick={(event) => event.stopPropagation()} className="max-w-[95vw] max-h-[92vh] flex flex-col items-center gap-4">
            <span className="text-xs font-bold text-[#22C7FF]">Bukti Transfer #{selectedOrderProof.invoice_number}</span>
            <img
              src={selectedOrderProof.payment_proof_url || '/assets/default_produk.png'}
              alt="Bukti Transfer diperbesar"
              className="max-w-[95vw] max-h-[78vh] object-contain rounded-xl bg-[#080D18] border border-[#26364D] p-2"
            />
            <a
              href={selectedOrderProof.payment_proof_url || '#'}
              download={`Bukti-Transfer-${selectedOrderProof.invoice_number}.jpg`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-xl bg-[#1677FF] hover:bg-[#1D4ED8] text-white text-xs font-bold"
            >
              Unduh Gambar Asli
            </a>
          </div>
        </div>
      )}

      {/* Modal Detail Pesanan & Audit Keuangan */}
      {selectedOrderDetail && (
        <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-2xl bg-[#101D32] border border-[#243650] rounded-2xl shadow-modal overflow-hidden text-xs text-[#F8FAFC] max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 bg-[#0B1426] border-b border-[#243650] flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-bold text-sm text-[#22C7FF]">Detail Transaksi &amp; Audit Keuntungan</h3>
                <span className="text-[10px] text-[#94A3B8]">Invoice: #{selectedOrderDetail.invoice_number} | Tanggal: {new Date(selectedOrderDetail.created_at).toLocaleString('id-ID')}</span>
              </div>
              <button type="button" onClick={() => setSelectedOrderDetail(null)} className="text-[#94A3B8] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 bg-[#080F1F] border border-[#243650] rounded-xl">
                <div><span className="text-[#94A3B8] block text-[10px]">Pelanggan</span><strong className="text-sm">{selectedOrderDetail.customer_name}</strong></div>
                <div><span className="text-[#94A3B8] block text-[10px]">Kontak</span><strong className="text-[#22C7FF]">{selectedOrderDetail.customer_phone}</strong></div>
                <div><span className="text-[#94A3B8] block text-[10px]">Metode</span><strong>{selectedOrderDetail.payment_method || 'QRIS Instant'}</strong></div>
                <div><span className="text-[#94A3B8] block text-[10px]">Total Pembayaran</span><strong className="text-[#10B981] text-sm">{formatPrice(selectedOrderDetail.total_amount)}</strong></div>
                <div><span className="text-[#94A3B8] block text-[10px]">Status Pembayaran</span><span className="px-2 py-0.5 rounded bg-[#1677FF]/20 text-[#38BDF8] font-bold">{selectedOrderDetail.payment_status}</span></div>
                <div><span className="text-[#94A3B8] block text-[10px]">Status Order</span><span className="px-2 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] font-bold">{selectedOrderDetail.order_status}</span></div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-[#F8FAFC]">Produk dan Jumlah (Rincian Item Supplier)</h4>
                {Array.isArray(selectedOrderDetail.products) && selectedOrderDetail.products.length > 0 ? (
                  selectedOrderDetail.products.map((item: Record<string, unknown>, index: number) => {
                    const itemKey = `${selectedOrderDetail.id}-${index}`;
                    const isRevealed = !!revealedFormatIndices[itemKey];
                    const formatText = String(item.format || item.description || 'email | kata sandi - Akun Pro Team pri');
                    return (
                      <div key={itemKey} className="p-3.5 bg-[#080F1F] border border-[#243650] rounded-xl space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="w-full">
                            <span className="font-bold text-[#F8FAFC] text-sm block">{index + 1}. {String(item.name || '')}</span>
                            
                            <div className="mt-1.5 p-2.5 bg-[#1677FF]/10 rounded-xl border border-[#1677FF]/30 flex items-center justify-between gap-2">
                              <span className="text-[11px] text-[#38BDF8] font-mono truncate">
                                Format: {isRevealed ? formatText : '••••••••••••••••••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleRevealFormat(itemKey)}
                                className="p-1.5 rounded-lg bg-[#080D18] hover:bg-[#2583F7] text-[#38BDF8] hover:text-white transition-colors flex-shrink-0 flex items-center gap-1 text-[10px] font-bold"
                                title={isRevealed ? 'Sembunyikan format' : 'Tampilkan format'}
                              >
                                {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-[#94A3B8]">
                              <span className="px-2 py-0.5 rounded bg-[#1677FF]/15 text-[#38BDF8] font-semibold">Supplier: {String(item.supplier_name || item.provider || selectedOrderDetail.product_provider || '')}</span>
                              <span>ID Supplier: <strong className="font-mono text-[#F8FAFC]">{String(item.supplier_product_id || '-')}</strong></span>
                              <span>Qty: <strong className="text-[#10B981]">x{Number(item.quantity || 1)}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-[#243650]/60 text-[11px] font-mono">
                          <div><span className="text-[#94A3B8] block text-[10px]">Harga Modal/unit</span>{formatPrice(Number(item.supplier_cost || 0))}</div>
                          <div><span className="text-[#94A3B8] block text-[10px]">Harga Jual/unit</span>{formatPrice(Number(item.customer_price || 0))}</div>
                          <div><span className="text-[#94A3B8] block text-[10px]">Subtotal Modal</span>{formatPrice(Number(item.subtotal_cost || 0))}</div>
                          <div><span className="text-[#94A3B8] block text-[10px]">Keuntungan</span><strong className="text-[#10B981]">+{formatPrice(Number(item.profit || 0))}</strong></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  parseOrderProducts(selectedOrderDetail).map((item, index) => {
                    const fallbackKey = `fallback-${selectedOrderDetail.id}-${index}`;
                    const isRevealed = !!revealedFormatIndices[fallbackKey];
                    return (
                      <div key={fallbackKey} className="p-3.5 bg-[#080F1F] border border-[#243650] rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold block text-sm">{item.name}</span>
                          <span className="text-[#22C7FF] font-bold">x{item.quantity}</span>
                        </div>
                        <div className="p-2.5 bg-[#1677FF]/10 rounded-xl border border-[#1677FF]/30 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-[#38BDF8] font-mono truncate">
                            Format: {isRevealed ? 'email | kata sandi - Akun Pro Team pri' : '••••••••••••••••••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleRevealFormat(fallbackKey)}
                            className="p-1.5 rounded-lg bg-[#080D18] hover:bg-[#2583F7] text-[#38BDF8] hover:text-white transition-colors flex-shrink-0 flex items-center gap-1 text-[10px] font-bold"
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <span className="text-[10px] text-[#94A3B8] block">Supplier: {selectedOrderDetail.product_provider || 'Produk Manual'}</span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Financial Summary Calculation */}
              <div className="p-4 bg-[#080F1F] border border-[#243650] rounded-xl space-y-2.5">
                <h4 className="font-bold text-sm text-[#22C7FF] border-b border-[#243650] pb-2">Ringkasan Keuangan Transaksi</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>Total Pembayaran Pelanggan (Omzet)</span>
                    <strong className="font-mono text-[#F8FAFC]">{formatPrice(selectedOrderDetail.total_amount)}</strong>
                  </div>
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>Total Modal Seluruh Supplier</span>
                    <strong className="font-mono text-red-400">-{formatPrice(selectedOrderDetail.total_cost || 0)}</strong>
                  </div>
                  <div className="flex justify-between text-[#94A3B8] border-t border-[#243650]/60 pt-1.5 font-bold">
                    <span>Total Keuntungan Kotor</span>
                    <strong className="font-mono text-[#10B981]">+{formatPrice(selectedOrderDetail.gross_profit || 0)}</strong>
                  </div>
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>Biaya Payment Gateway</span>
                    <strong className="font-mono text-amber-400">-{formatPrice(selectedOrderDetail.gateway_fee || 0)}</strong>
                  </div>
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>Biaya Tambahan Lainnya</span>
                    <strong className="font-mono text-amber-400">-{formatPrice(selectedOrderDetail.additional_fee || 0)}</strong>
                  </div>
                  <div className="flex justify-between text-sm font-black text-white border-t border-[#243650] pt-2">
                    <span className="text-[#10B981]">KEUNTUNGAN BERSIH</span>
                    <span className="font-mono text-[#10B981]">+{formatPrice(selectedOrderDetail.net_profit || selectedOrderDetail.gross_profit || 0)}</span>
                  </div>
                </div>
              </div>

              {selectedOrderDetail.customer_notes && (
                <div className="p-3 bg-[#080F1F] border border-[#243650] rounded-xl text-[#94A3B8]">
                  <strong className="text-white">Catatan:</strong> {selectedOrderDetail.customer_notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: KIRIM PESAN & PENGIRIMAN KE PEMBELI (WHATSAPP)     */}
      {/* ========================================================= */}
      {selectedOrderDelivery && (
        <div className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-[#101827] border border-[#26364D] rounded-2xl shadow-modal overflow-hidden text-xs text-[#F8FAFC]">
            <div className="px-5 py-4 bg-[#0B1220] border-b border-[#26364D] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#10B981]">Kirim Detail Pesanan ke Pembeli</h3>
                <span className="text-[10px] text-[#94A3B8]">Invoice: #{selectedOrderDelivery.invoice_number} | Telp: {selectedOrderDelivery.customer_phone}</span>
              </div>
              <button type="button" onClick={() => setSelectedOrderDelivery(null)}>
                <X className="w-4 h-4 text-[#94A3B8]" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[#94A3B8] mb-1 font-semibold">Pesan WhatsApp Manual untuk Pelanggan</label>
                <textarea
                  rows={6}
                  defaultValue={`Halo Kak ${selectedOrderDelivery.customer_name}, Terima kasih telah berbelanja di Androidstore.web.id! 🙌\nPesanan Anda dengan Invoice #${selectedOrderDelivery.invoice_number} telah kami verifikasi dan proses.\n\n📦 Detail Akun / Lisensi:\n[Isi email, password, atau link akses produk di sini...]\n\nSilakan login dan nikmati layanannya. Jika ada kendala, hubungi admin kami ya kak. Terima kasih!`}
                  id="whatsapp-delivery-message"
                  className="w-full p-3 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC] font-mono text-xs focus:outline-none focus:border-[#2583F7]"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#26364D]">
                <button
                  type="button"
                  onClick={async () => {
                    const textarea = document.getElementById('whatsapp-delivery-message') as HTMLTextAreaElement;
                    const msg = textarea ? textarea.value : '';
                    const phone = selectedOrderDelivery.customer_phone;

                    try {
                      await fetch(`/api/admin/orders/${selectedOrderDelivery.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          order_status: 'delivered',
                          payment_status: 'paid',
                          delivered_credentials: msg
                        })
                      });
                      showNotification('success', `Pesanan #${selectedOrderDelivery.invoice_number} ditandai Selesai (Delivered)!`);
                      setSelectedOrderDelivery(null);
                      loadAllData();
                      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                    } catch {
                      showNotification('error', 'Gagal memperbarui status pesanan.');
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Kirim WhatsApp &amp; Selesaikan Pesanan</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedOrderDelivery(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#111A2B] text-[#94A3B8]"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: TAMBAH / EDIT PRODUK SUPPLIER MANUAL               */}
      {/* ========================================================= */}
      {isSupplierProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#101827] border border-[#26364D] rounded-2xl shadow-modal overflow-hidden text-xs text-[#F8FAFC]">
            <div className="px-5 py-4 bg-[#0B1220] border-b border-[#26364D] flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingSupplierProduct.id ? 'Edit Produk Supplier' : 'Tambah Produk Supplier Manual'}
              </h3>
              <button type="button" onClick={() => setIsSupplierProductModalOpen(false)}>
                <X className="w-4 h-4 text-[#94A3B8]" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplierProduct} className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-[#94A3B8] mb-1 font-semibold">Pilih Supplier / Seller</label>
                <select
                  value={editingSupplierProduct.seller_id || sellers[0]?.id || 1}
                  onChange={(e) => setEditingSupplierProduct({ ...editingSupplierProduct, seller_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                >
                  {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[#94A3B8] mb-1 font-semibold">Nama Produk</label>
                <input
                  type="text"
                  required
                  value={editingSupplierProduct.name || ''}
                  onChange={(e) => setEditingSupplierProduct({ ...editingSupplierProduct, name: e.target.value })}
                  placeholder="Contoh: Netflix Premium 1 Month"
                  className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#94A3B8] mb-1 font-semibold">Kategori (Dari Database / Seller API)</label>
                  <select
                    value={editingSupplierProduct.original_category || 'Voucher & Digital'}
                    onChange={(e) => setEditingSupplierProduct({ ...editingSupplierProduct, original_category: e.target.value })}
                    className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                  >
                    {Array.from(new Set(['Voucher & Digital', 'Editing & Desain', 'AI & Edukasi', 'Streaming & Hiburan', ...supplierCategories])).map((cat: string) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#94A3B8] mb-1 font-semibold">Harga Modal (Rp)</label>
                  <input
                    type="number"
                    required
                    value={editingSupplierProduct.cost_price || 15000}
                    onChange={(e) => setEditingSupplierProduct({ ...editingSupplierProduct, cost_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#94A3B8] mb-1 font-semibold">Stok</label>
                  <input
                    type="number"
                    required
                    value={editingSupplierProduct.stock || 25}
                    onChange={(e) => setEditingSupplierProduct({ ...editingSupplierProduct, stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                  />
                </div>
                <div>
                  <label className="block text-[#94A3B8] mb-1 font-semibold">External ID</label>
                  <input
                    type="text"
                    value={editingSupplierProduct.external_product_id || `manual_${Date.now()}`}
                    onChange={(e) => setEditingSupplierProduct({ ...editingSupplierProduct, external_product_id: e.target.value })}
                    className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#94A3B8] mb-1 font-semibold">Deskripsi</label>
                <textarea
                  rows={3}
                  value={editingSupplierProduct.description || ''}
                  onChange={(e) => setEditingSupplierProduct({ ...editingSupplierProduct, description: e.target.value })}
                  placeholder="Deskripsi produk supplier..."
                  className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#26364D]">
                <button
                  type="button"
                  onClick={() => setIsSupplierProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#111A2B] text-[#94A3B8]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2583F7] text-white font-bold"
                >
                  Simpan Produk Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: TAMBAH PESANAN MANUAL                              */}
      {/* ========================================================= */}
      {isCreateOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#101827] border border-[#26364D] rounded-2xl shadow-modal p-5 text-xs text-[#F8FAFC] space-y-4">
            <div className="flex items-center justify-between border-b border-[#26364D] pb-3">
              <h3 className="font-bold text-sm">Tambah Pesanan Manual</h3>
              <button type="button" onClick={() => setIsCreateOrderModalOpen(false)}>
                <X className="w-4 h-4 text-[#94A3B8]" />
              </button>
            </div>

            <form onSubmit={handleCreateManualOrder} className="space-y-3">
              <div>
                <label className="block text-[#94A3B8] mb-1 font-semibold">Nama Pelanggan</label>
                <input
                  type="text"
                  required
                  value={newOrderForm.customer_name}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, customer_name: e.target.value })}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                />
              </div>

              <div>
                <label className="block text-[#94A3B8] mb-1 font-semibold">Nomor WhatsApp</label>
                <input
                  type="tel"
                  required
                  value={newOrderForm.customer_phone}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, customer_phone: e.target.value })}
                  placeholder="08123456789"
                  className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                />
              </div>

              <div>
                <label className="block text-[#94A3B8] mb-1 font-semibold">Nama Produk / Paket</label>
                <input
                  type="text"
                  required
                  value={newOrderForm.product_name}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, product_name: e.target.value })}
                  placeholder="Contoh: Netflix Premium 1 Bulan"
                  className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#94A3B8] mb-1 font-semibold">Total Tagihan (Rp)</label>
                  <input
                    type="number"
                    required
                    value={newOrderForm.total_amount}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, total_amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                  />
                </div>
                <div>
                  <label className="block text-[#94A3B8] mb-1 font-semibold">Metode Pembayaran</label>
                  <input
                    type="text"
                    value={newOrderForm.payment_method}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#26364D]">
                <button type="button" onClick={() => setIsCreateOrderModalOpen(false)} className="px-4 py-2 rounded-xl bg-[#111A2B] text-[#94A3B8]">
                  Batal
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-[#2583F7] text-white font-bold">
                  Buat Pesanan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIT PESANAN                                       */}
      {/* ========================================================= */}
      {isEditOrderModalOpen && targetOrderForAction && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#101827] border border-[#26364D] rounded-2xl shadow-modal p-5 text-xs text-[#F8FAFC] space-y-4">
            <div className="flex items-center justify-between border-b border-[#26364D] pb-3">
              <h3 className="font-bold text-sm">Edit Pesanan: #{targetOrderForAction.invoice_number}</h3>
              <button type="button" onClick={() => setIsEditOrderModalOpen(false)}>
                <X className="w-4 h-4 text-[#94A3B8]" />
              </button>
            </div>

            <form onSubmit={handleUpdateOrderSubmit} className="space-y-3">
              <div>
                <label className="block text-[#94A3B8] mb-1 font-semibold">Nama Pelanggan</label>
                <input
                  type="text"
                  required
                  value={editOrderForm.customer_name || ''}
                  onChange={(e) => setEditOrderForm({ ...editOrderForm, customer_name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                />
              </div>

              <div>
                <label className="block text-[#94A3B8] mb-1 font-semibold">Nomor WhatsApp</label>
                <input
                  type="tel"
                  required
                  value={editOrderForm.customer_phone || ''}
                  onChange={(e) => setEditOrderForm({ ...editOrderForm, customer_phone: e.target.value })}
                  className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#94A3B8] mb-1 font-semibold">Status Pembayaran</label>
                  <select
                    value={editOrderForm.payment_status || 'pending'}
                    onChange={(e) => setEditOrderForm({ ...editOrderForm, payment_status: e.target.value })}
                    className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#94A3B8] mb-1 font-semibold">Status Order</label>
                  <select
                    value={editOrderForm.order_status || 'pending'}
                    onChange={(e) => setEditOrderForm({ ...editOrderForm, order_status: e.target.value })}
                    className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                  >
                    <option value="pending">Pending</option>
                    <option value="waiting_verification">Menunggu Verifikasi</option>
                    <option value="processing">Processing</option>
                    <option value="delivered">Delivered (Selesai)</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#94A3B8] mb-1 font-semibold">Catatan Admin</label>
                <textarea
                  rows={2}
                  value={editOrderForm.customer_notes || ''}
                  onChange={(e) => setEditOrderForm({ ...editOrderForm, customer_notes: e.target.value })}
                  className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#26364D]">
                <button type="button" onClick={() => setIsEditOrderModalOpen(false)} className="px-4 py-2 rounded-xl bg-[#111A2B] text-[#94A3B8]">
                  Batal
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-[#2583F7] text-white font-bold">
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: KONFIRMASI HAPUS PESANAN (SOFT DELETE)             */}
      {/* ========================================================= */}
      {isDeleteOrderModalOpen && targetOrderForAction && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#101827] border border-[#26364D] rounded-2xl shadow-modal p-5 text-xs text-[#F8FAFC] space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-950/60 text-red-400 border border-red-800 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-sm text-[#F8FAFC] mb-1">Hapus Pesanan?</h3>
              <p className="text-[#94A3B8]">
                Apakah Anda yakin ingin menghapus pesanan <strong>#{targetOrderForAction.invoice_number}</strong> milik <strong>{targetOrderForAction.customer_name}</strong>? Data akan diarsipkan (soft delete).
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteOrderModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#111A2B] text-[#94A3B8] font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteOrder}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-sm"
              >
                Hapus Pesanan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
