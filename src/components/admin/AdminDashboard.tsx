import { useState, useEffect, useMemo, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { SmartPagination } from './SmartPagination';
import { cleanProductName } from '../../utils/cleanProductName';

import {
  Home,
  LayoutGrid,
  Package,
  Layers,
  Store,
  KeyRound,
  RefreshCw,
  BadgePercent,
  Image as ImageIcon,
  ShoppingBag,
  ShoppingCart,
  Receipt,
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
  X,
  Users,
  History,
  Code,
  BarChart3,
  Tag,
  Globe,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  Database,
  HardDrive,
  AlertTriangle,
  Zap,
  FileText,
  Star
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

// Struktur menu sidebar (accordion). Satu-satunya sumber kebenaran untuk
// navigasi — route/tab id di sini harus sama dengan TabType di atas.
interface SidebarMenuItem {
  id: TabType;
  label: string;
  icon: LucideIcon;
}

interface SidebarMenuGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: SidebarMenuItem[];
}

const MENU_GROUPS: SidebarMenuGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: Home,
    items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutGrid }],
  },
  {
    id: 'produk_supplier',
    label: 'Produk & Supplier',
    icon: Package,
    items: [
      { id: 'katalog', label: 'Katalog Produk (Master)', icon: Package },
      { id: 'supplier_products', label: 'Produk Supplier Mentah', icon: Layers },
    ],
  },
  {
    id: 'operasional',
    label: 'Operasional',
    icon: ShoppingCart,
    items: [
      { id: 'sellers', label: 'Manajemen Seller', icon: Users },
      { id: 'orders', label: 'Pesanan Pelanggan', icon: Receipt },
      { id: 'transactions', label: 'Riwayat Transaksi', icon: History },
    ],
  },
  {
    id: 'api',
    label: 'API & Integrasi',
    icon: Code,
    items: [
      { id: 'api_keys', label: 'API Key & Kredensial', icon: KeyRound },
      { id: 'sync', label: 'Sinkronisasi Produk', icon: RefreshCw },
      { id: 'logs', label: 'Log API & Monitoring', icon: BarChart3 },
    ],
  },
  {
    id: 'pengaturan',
    label: 'Pengaturan',
    icon: Settings,
    items: [
      { id: 'pricing', label: 'Manajemen Harga', icon: Tag },
      { id: 'images', label: 'Manajemen Gambar', icon: ImageIcon },
      { id: 'settings', label: 'Pengaturan Website', icon: Globe },
    ],
  },
];

// Cari kelompok yang memuat sebuah tab (untuk auto-buka accordion).
function findGroupIdOfTab(tab: TabType): string | null {
  const group = MENU_GROUPS.find(g => g.items.some(item => item.id === tab));
  return group ? group.id : null;
}

// Waktu relatif Indonesia ("3 menit lalu", "2 jam lalu", "kemarin").
function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'Belum pernah';
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '—';
  const diff = Date.now() - d;
  const menit = Math.floor(diff / 60000);
  if (menit < 1) return 'baru saja';
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari === 1) return 'kemarin';
  if (hari < 30) return `${hari} hari lalu`;
  return new Date(iso).toLocaleDateString('id-ID');
}


// Uraikan item produk dari satu order (untuk Produk Terlaris).
// Utamakan array `products` (punya nama, qty, subtotal per item).
// Fallback: parse `product_name` ("Netflix VIP (x3)" / "A (x1), B (x1)").
// Omzet per item hanya bisa dihitung bila ada harga per item; untuk order
// multi-produk tanpa array `products`, omzet tidak diatribusikan (0).
function getOrderItems(o: {
  product_name?: string;
  product_provider?: string;
  total_amount?: number;
  products?: Array<Record<string, unknown>>;
}): { name: string; qty: number; revenue: number; provider: string }[] {
  const provider = String(o.product_provider || '—');
  if (o.products && o.products.length > 0) {
    return o.products.map(p => ({
      name: cleanProductName(String(p.name || 'Produk')) || 'Produk',
      qty: Number(p.quantity || 1),
      revenue: Number(p.subtotal_sale ?? p.customer_price ?? 0),
      provider: String(p.supplier_name || p.provider || provider),
    }));
  }
  const raw = String(o.product_name || '').trim();
  if (!raw) return [];
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
  const parsed = parts.map(part => {
    const m = part.match(/^(.*?)\s*\(x(\d+)\)\s*$/);
    if (m) return { name: cleanProductName(m[1].trim()) || 'Produk', qty: Number(m[2]) };
    return { name: cleanProductName(part) || 'Produk', qty: 1 };
  });
  // Omzet hanya bisa diatribusikan bila order berisi 1 produk.
  const revenue = parsed.length === 1 ? Number(o.total_amount || 0) : 0;
  return parsed.map(p => ({ ...p, revenue, provider }));
}

// Label tanggal pendek Indonesia, mis. "4 Nov".
function shortDayLabel(d: Date): string {
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

// Sparkline SVG mungil (tanpa library) untuk kartu KPI.
// data = angka per hari (7 hari). Bila semua nol, garis datar.
function Sparkline({ data, color = '#38BDF8', height = 32, width = 120 }: { data: number[]; color?: string; height?: number; width?: number }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const yOf = (v: number) => height - 4 - ((v - min) / range) * (height - 8);
  const points = data.map((v, i) => {
    const x = data.length <= 1 ? width / 2 : (i / (data.length - 1)) * width;
    return `${x.toFixed(1)},${yOf(v).toFixed(1)}`;
  }).join(' ');
  const lastX = data.length <= 1 ? width / 2 : width;
  const lastY = yOf(data[data.length - 1] ?? 0);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible flex-shrink-0" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r="3" fill={color} />
    </svg>
  );
}

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

interface ProductVariant {
  id: string;
  name: string;
  account_type: 'private' | 'share';
  duration: string;
  selling_price: number;
  cost_price: number;
  stock: number;
  is_active: number;
  image?: string;
}

interface ProductReview {
  id: string;
  name: string;
  rating: number;
  text: string;
  photo?: string;
  date?: string;
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
  variants?: ProductVariant[];
  terms?: string;
  reviews?: ProductReview[];
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
  delivery_email?: string;
  delivery_password?: string;
  created_at: string;
}

// Keuntungan bersih tanpa biaya payment gateway (gateway belum dipakai).
function netProfitNoGateway(order: OrderItem): number {
  return (order.gross_profit || 0) - (order.additional_fee || 0);
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
  default_markup_mode: string;
  default_markup_nominal: string;
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
    default_markup_mode: 'percent',
    default_markup_nominal: '25000',
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
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [editingProductContent, setEditingProductContent] = useState<MasterProductItem | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [editingProductReviews, setEditingProductReviews] = useState<MasterProductItem | null>(null);
  const [markupType, setMarkupType] = useState<MarkupMode>('percent');
  const [markupVal, setMarkupVal] = useState<number>(25);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // Tema light/dark (preferensi tersimpan). Bila tema admin belum pernah
  // diatur, ikuti tema toko (light = default toko) supaya tidak bentrok.
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('serbadigital_admin_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      const storeTheme = localStorage.getItem('androidstore_theme') || localStorage.getItem('klikLanggananTheme');
      return storeTheme === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('serbadigital_admin_theme', theme);
    } catch {
      // abaikan bila storage tidak tersedia
    }
  }, [theme]);
  // Mode compact: sidebar hanya ikon (tanpa label).
  const [isCompact, setIsCompact] = useState(false);
  // Accordion: hanya satu kelompok yang terbuka. Default = kelompok halaman aktif.
  const [expandedGroup, setExpandedGroup] = useState<string | null>(() => findGroupIdOfTab('dashboard'));

  // Kelompok menu aktif otomatis terbuka mengikuti halaman aktif.
  useEffect(() => {
    const groupId = findGroupIdOfTab(activeTab);
    if (groupId) setExpandedGroup(groupId);
  }, [activeTab]);

  // Label menu aktif untuk judul di top navbar.
  const activeMenuLabel = useMemo(() => {
    const item = MENU_GROUPS.flatMap(g => g.items).find(i => i.id === activeTab);
    return item ? item.label : activeTab.replace('_', ' ');
  }, [activeTab]);

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
  const [priceSearchQuery, setPriceSearchQuery] = useState('');
  const [ordersCurrentPage, setOrdersCurrentPage] = useState(1);
  const [ordersPageSize, setOrdersPageSize] = useState(5);
  const mainWorkspaceRef = useRef<HTMLElement | null>(null);

  const handleOrdersPageChange = (p: number) => {
    setOrdersCurrentPage(p);
  };
  const [imagesCurrentPage, setImagesCurrentPage] = useState(1);
  const [imagesPageSize, setImagesPageSize] = useState(5);
  const [imageSearchQuery, setImageSearchQuery] = useState('');
  const [selectedOrderDelivery, setSelectedOrderDelivery] = useState<OrderItem | null>(null);
  const [isProofLightboxOpen, setIsProofLightboxOpen] = useState(false);

  // Supplier Product CRUD & Order CRUD States
  const [isSupplierProductModalOpen, setIsSupplierProductModalOpen] = useState(false);
  const [editingSupplierProduct, setEditingSupplierProduct] = useState<Partial<SupplierProductItem>>({});
  const [isManualSeller, setIsManualSeller] = useState(false);
  const [manualSellerName, setManualSellerName] = useState('');
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
  const [isEditOrderModalOpen, setIsEditOrderModalOpen] = useState(false);
  const [isDeleteOrderModalOpen, setIsDeleteOrderModalOpen] = useState(false);
  const [targetOrderForAction, setTargetOrderForAction] = useState<OrderItem | null>(null);
  const [editOrderForm, setEditOrderForm] = useState<Partial<OrderItem>>({});
  const [editOrderProofFile, setEditOrderProofFile] = useState<File | null>(null);
  const [editOrderProofPreview, setEditOrderProofPreview] = useState<string | null>(null);
  const [newOrderForm, setNewOrderForm] = useState({
    customer_name: '',
    customer_phone: '',
    product_name: '',
    total_amount: 25000,
    payment_method: 'QRIS Instant',
    order_status: 'pending',
    payment_status: 'unpaid'
  });
  const [newOrderProductId, setNewOrderProductId] = useState<string>('');
  const [newOrderVariantId, setNewOrderVariantId] = useState<string>('');
  const newOrderSelectedProd = newOrderProductId ? masterProducts.find(p => String(p.id) === newOrderProductId) || null : null;
  const [newOrderProofFile, setNewOrderProofFile] = useState<File | null>(null);
  const [newOrderProofPreview, setNewOrderProofPreview] = useState<string | null>(null);
  const [newOrderSuggestOpen, setNewOrderSuggestOpen] = useState(false);
  const [togglingProductId, setTogglingProductId] = useState<number | null>(null);

  // Saran produk dari katalog saat mengetik (hanya produk aktif, maks 8).
  const newOrderSuggestions = useMemo(() => {
    const q = newOrderForm.product_name.trim().toLowerCase();
    return masterProducts
      .filter(p => p.is_active !== 0 && (!q || p.name.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [masterProducts, newOrderForm.product_name]);

  const handleSaveSupplierProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    // Seller manual (tanpa API): nama seller ditulis sendiri; backend akan
    // membuat/mencari seller manual (auth_type 'manual') dari nama ini.
    if (isManualSeller && !manualSellerName.trim()) {
      showNotification('error', 'Isi nama seller manual dulu.');
      return;
    }
    const payload = isManualSeller
      ? { ...editingSupplierProduct, seller_id: 0, seller_name: manualSellerName.trim() }
      : editingSupplierProduct;
    try {
      const method = editingSupplierProduct.id ? 'PUT' : 'POST';
      const endpoint = editingSupplierProduct.id
        ? `/api/admin/supplier-products/${editingSupplierProduct.id}`
        : '/api/admin/supplier-products';
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        showNotification('success', 'Produk supplier berhasil disimpan!');
        setIsSupplierProductModalOpen(false);
        setEditingSupplierProduct({});
        setIsManualSeller(false);
        setManualSellerName('');
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
      const selectedProd = newOrderProductId
        ? masterProducts.find(p => String(p.id) === newOrderProductId)
        : null;
      const payload: Record<string, unknown> = { ...newOrderForm };
      if (selectedProd) {
        const selVariant = newOrderVariantId
          ? (selectedProd.variants || []).find(v => String(v.id) === newOrderVariantId)
          : null;
        const prodName = selVariant
          ? `${selectedProd.name} ${selVariant.name} (${selVariant.account_type === 'private' ? 'Private' : 'Shared'})${selVariant.duration && selVariant.duration !== 'Semua' ? ` - ${selVariant.duration}` : ''}`
          : selectedProd.name;
        payload.products = [{
          name: prodName,
          quantity: 1,
          price: selVariant ? Number(selVariant.selling_price || 0) : selectedProd.selling_price,
          provider: selectedProd.primary_seller_name || 'Produk Manual',
          variant_id: selVariant ? selVariant.id : null,
          variant_name: selVariant ? selVariant.name : null,
          account_type: selVariant ? selVariant.account_type : null,
          duration: selVariant ? selVariant.duration : null
        }];
      }
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        // Upload bukti pembayaran (bila admin memilih file) — endpoint admin
        // hanya mengisi payment_proof_url, tidak mengubah status pesanan.
        if (newOrderProofFile && json.order) {
          const proofData = new FormData();
          proofData.append('file', newOrderProofFile);
          const proofRes = await fetch(`/api/admin/orders/${json.order.id}/proof`, {
            method: 'POST',
            body: proofData
          });
          const proofJson = await proofRes.json();
          if (!proofJson.success) {
            showNotification('error', 'Pesanan dibuat, tapi bukti gagal diunggah: ' + (proofJson.message || ''));
          }
        }
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
        setNewOrderProductId('');
        setNewOrderProofFile(null);
        setNewOrderProofPreview(null);
        setNewOrderSuggestOpen(false);
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
      // Upload bukti transfer manual dulu (bila admin memilih file).
      // Endpoint admin hanya mengisi payment_proof_url, tidak mengubah status.
      if (editOrderProofFile) {
        const proofData = new FormData();
        proofData.append('file', editOrderProofFile);
        const proofRes = await fetch(`/api/admin/orders/${targetOrderForAction.id}/proof`, {
          method: 'POST',
          body: proofData
        });
        const proofJson = await proofRes.json();
        if (!proofJson.success) {
          showNotification('error', proofJson.message || 'Gagal mengunggah bukti transfer.');
          return;
        }
      }
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
        setEditOrderProofFile(null);
        setEditOrderProofPreview(null);
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

  const filteredPriceProducts = useMemo(() => {
    if (!priceSearchQuery.trim()) return masterProducts;
    const q = priceSearchQuery.toLowerCase();
    return masterProducts.filter(p => p.name.toLowerCase().includes(q));
  }, [masterProducts, priceSearchQuery]);

  const paginatedPriceProducts = useMemo(() => {
    const start = (priceCurrentPage - 1) * pricePageSize;
    return filteredPriceProducts.slice(start, start + pricePageSize);
  }, [filteredPriceProducts, priceCurrentPage, pricePageSize]);

  const paginatedOrders = useMemo(() => {
    const start = (ordersCurrentPage - 1) * ordersPageSize;
    return filteredOrders.slice(start, start + ordersPageSize);
  }, [filteredOrders, ordersCurrentPage, ordersPageSize]);

  const filteredImageProducts = useMemo(() => {
    if (!imageSearchQuery.trim()) return masterProducts;
    const q = imageSearchQuery.toLowerCase();
    return masterProducts.filter(p => p.name.toLowerCase().includes(q));
  }, [masterProducts, imageSearchQuery]);

  const paginatedImageProducts = useMemo(() => {
    const start = (imagesCurrentPage - 1) * imagesPageSize;
    return filteredImageProducts.slice(start, start + imagesPageSize);
  }, [filteredImageProducts, imagesCurrentPage, imagesPageSize]);

  // Jumlah produk per seller (untuk kartu Manajemen Seller):
  // supplier = produk mentah dari API seller, master = produk di katalog.
  const sellerProductCounts = useMemo(() => {
    const map = new Map<number, { supplier: number; master: number }>();
    supplierProducts.forEach(p => {
      const cur = map.get(p.seller_id) || { supplier: 0, master: 0 };
      cur.supplier += 1;
      map.set(p.seller_id, cur);
    });
    masterProducts.forEach(p => {
      if (p.primary_seller_id == null) return;
      const cur = map.get(p.primary_seller_id) || { supplier: 0, master: 0 };
      cur.master += 1;
      map.set(p.primary_seller_id, cur);
    });
    return map;
  }, [supplierProducts, masterProducts]);

  // ---------- Data dashboard (semua dari data nyata, tanpa dummy) ----------
  // 7 hari terakhir (label + kunci tanggal) untuk grafik.
  const last7Days = useMemo(() => {
    const days: { key: string; label: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ key: d.toISOString().slice(0, 10), label: shortDayLabel(d) });
    }
    return days;
  }, []);

  // Produk Terlaris 7 hari terakhir — agregasi dari orders nyata yang lunas/delivered
  // dan dibuat dalam 7 hari terakhir (kunci tanggal dari last7Days).
  // Peringkat by jumlah unit terjual, sama seperti topProducts (semua waktu).
  const topProducts7d = useMemo(() => {
    const dayKeys = new Set(last7Days.map(d => d.key));
    const map = new Map<string, { name: string; provider: string; qty: number; revenue: number; orders: number }>();
    orders.forEach(o => {
      const key = String(o.created_at || '').slice(0, 10);
      if (!dayKeys.has(key)) return;
      const isPaid = o.payment_status === 'paid' || o.order_status === 'delivered';
      if (!isPaid) return;
      getOrderItems(o).forEach(item => {
        const k = item.name.toLowerCase();
        const cur = map.get(k) || { name: item.name, provider: item.provider, qty: 0, revenue: 0, orders: 0 };
        cur.qty += item.qty;
        cur.revenue += item.revenue;
        cur.orders += 1;
        map.set(k, cur);
      });
    });
    return [...map.values()]
      .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)
      .slice(0, 5);
  }, [orders, last7Days]);

  // Distribusi status produk (donut) — kategori saling lepas, jumlah = total produk.
  const productStatus = useMemo(() => {
    let aktif = 0;
    let stokHabis = 0;
    let nonAktif = 0;
    masterProducts.forEach(p => {
      const stock = Number(p.custom_stock || 0);
      if (stock <= 0) stokHabis += 1;
      else if (p.is_active) aktif += 1;
      else nonAktif += 1;
    });
    return [
      { name: 'Aktif', value: aktif, color: '#2583F7' },
      { name: 'Stok Habis', value: stokHabis, color: '#F59E0B' },
      { name: 'Non-aktif', value: nonAktif, color: '#64748B' },
    ];
  }, [masterProducts]);

  // Pesanan + omzet per hari (dari orders nyata: created_at + total_amount).
  // Dipakai untuk sparkline KPI (hanya bila ada data time-series).
  const ordersDaily = useMemo(() => {
    const byDay = new Map<string, { orders: number; revenue: number }>();
    orders.forEach(o => {
      const key = String(o.created_at || '').slice(0, 10);
      if (!key) return;
      const cur = byDay.get(key) || { orders: 0, revenue: 0 };
      cur.orders += 1;
      if (o.payment_status === 'paid' || o.order_status === 'delivered') {
        cur.revenue += Number(o.total_amount || 0);
      }
      byDay.set(key, cur);
    });
    return last7Days.map(d => ({
      label: d.label,
      key: d.key,
      orders: byDay.get(d.key)?.orders ?? 0,
      revenue: byDay.get(d.key)?.revenue ?? 0,
    }));
  }, [orders, last7Days]);

  // Produk Terlaris — agregasi dari orders nyata (hanya yang lunas/delivered,
  // sama seperti perhitungan omzet). Peringkat by jumlah unit terjual.
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; provider: string; qty: number; revenue: number; orders: number }>();
    orders.forEach(o => {
      const isPaid = o.payment_status === 'paid' || o.order_status === 'delivered';
      if (!isPaid) return;
      getOrderItems(o).forEach(item => {
        const key = item.name.toLowerCase();
        const cur = map.get(key) || { name: item.name, provider: item.provider, qty: 0, revenue: 0, orders: 0 };
        cur.qty += item.qty;
        cur.revenue += item.revenue;
        cur.orders += 1;
        map.set(key, cur);
      });
    });
    return [...map.values()]
      .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)
      .slice(0, 5);
  }, [orders]);

  // Top Buyer — pembeli yang paling sering beli (by jumlah order lunas/delivered).
  // Dikelompokkan by nama pelanggan (case-insensitive); nomor HP yang pertama tercatat.
  // Peringkat by jumlah order, lalu total belanja.
  const topBuyers = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; orders: number; total: number }>();
    orders.forEach(o => {
      const isPaid = o.payment_status === 'paid' || o.order_status === 'delivered';
      if (!isPaid) return;
      const rawName = String(o.customer_name || '').trim() || 'Tanpa Nama';
      const key = rawName.toLowerCase();
      const cur = map.get(key) || { name: rawName, phone: String(o.customer_phone || ''), orders: 0, total: 0 };
      if (!cur.phone && o.customer_phone) cur.phone = String(o.customer_phone);
      cur.orders += 1;
      cur.total += Number(o.total_amount || 0);
      map.set(key, cur);
    });
    return [...map.values()]
      .sort((a, b) => b.orders - a.orders || b.total - a.total)
      .slice(0, 5);
  }, [orders]);

  // Kesehatan sistem — hanya dari health check nyata, tanpa angka karangan.
  // Database: dari flag fallback backend (MySQL vs Embedded Store).
  // API Engine: online bila data dashboard berhasil dimuat (fetch sukses).
  // Sinkronisasi: dari log terbaru (sukses + <24 jam = normal).
  // Storage: TIDAK tersedia — backend belum punya endpoint health storage.
  const systemHealth = useMemo(() => {
    const latestLog = logs[0] || kpis.recent_sync_activity?.[0];
    const latestOk = latestLog
      ? Boolean(latestLog.is_success) && Date.now() - new Date(latestLog.created_at).getTime() < 24 * 60 * 60 * 1000
      : false;
    const hasLogs = Boolean(latestLog);
    return {
      dbLabel: kpis.is_using_fallback ? 'Embedded Store (fallback)' : 'Database (MySQL 8)',
      dbOk: true,
      dbNote: kpis.is_using_fallback
        ? 'MySQL tidak terhubung — memakai penyimpanan lokal'
        : 'Terhubung',
      apiOk: true,
      syncOk: latestOk,
      syncNote: !hasLogs
        ? 'Belum ada log sinkronisasi'
        : latestOk
          ? `Terakhir ${timeAgo(latestLog.created_at)}`
          : `Log terakhir gagal (${timeAgo(latestLog.created_at)})`,
    };
  }, [kpis.is_using_fallback, logs, kpis.recent_sync_activity]);

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
          body: JSON.stringify({ markup_mode: settings.default_markup_mode || 'percent', markup_percent: settings.default_markup_percent || 25, markup_nominal: settings.default_markup_nominal || 25000 })
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
        body: JSON.stringify({ markup_mode: settings.default_markup_mode || 'percent', markup_percent: settings.default_markup_percent || 25, markup_nominal: settings.default_markup_nominal || 25000 })
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
        body: JSON.stringify({ markup_mode: settings.default_markup_mode || 'percent', markup_percent: settings.default_markup_percent || 25, markup_nominal: settings.default_markup_nominal || 25000 })
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
    setTogglingProductId(prod.id);
    try {
      const updatedStatus = prod.is_active ? 0 : 1;
      const res = await fetch(`/api/admin/products/${prod.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...prod, is_active: updatedStatus })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Server menolak permintaan.');
      }
      showNotification('success', `Status produk ${cleanProductName(prod.name)} diubah menjadi ${updatedStatus ? 'Aktif' : 'Nonaktif'}.`);
      if (onRefreshPublicProducts) onRefreshPublicProducts();
      loadAllData();
    } catch (e) {
      showNotification('error', `Gagal mengubah status produk: ${(e as Error).message}`);
    } finally {
      setTogglingProductId(null);
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
  // -------------------------------------------------------------
  // Varian Produk (Varian + Tipe Akun + Durasi)
  // -------------------------------------------------------------
  const updateVariantField = (idx: number, patch: Partial<ProductVariant>) => {
    if (!editingProductPrice) return;
    const variants = [...(editingProductPrice.variants || [])];
    variants[idx] = { ...variants[idx], ...patch };
    setEditingProductPrice({ ...editingProductPrice, variants });
  };

  const addVariant = () => {
    if (!editingProductPrice) return;
    const nv: ProductVariant = {
      id: 'v_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name: '',
      account_type: 'private',
      duration: 'Semua',
      selling_price: editingProductPrice.selling_price || 0,
      cost_price: editingProductPrice.cost_price || 0,
      stock: 25,
      is_active: 1
    };
    setEditingProductPrice({ ...editingProductPrice, variants: [...(editingProductPrice.variants || []), nv] });
  };

  const removeVariant = (idx: number) => {
    if (!editingProductPrice) return;
    const variants = [...(editingProductPrice.variants || [])];
    variants.splice(idx, 1);
    setEditingProductPrice({ ...editingProductPrice, variants });
  };

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
          wholesale_price: editingProductPrice.wholesale_price,
          variants: editingProductPrice.variants || []
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

  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProductContent) return;
    try {
      const res = await fetch(`/api/admin/products/${editingProductContent.id}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editingProductContent.description || '',
          terms: editingProductContent.terms || ''
        })
      });
      const json = await res.json();
      if (json.success) {
        showNotification('success', 'Deskripsi & S&K berhasil diperbarui!');
        setIsContentModalOpen(false);
        if (onRefreshPublicProducts) onRefreshPublicProducts();
        loadAllData();
      }
    } catch {
      showNotification('error', 'Gagal menyimpan deskripsi & S&K.');
    }
  };

  const updateReviewField = (idx: number, field: keyof ProductReview, value: string | number) => {
    if (!editingProductReviews) return;
    const reviews = [...(editingProductReviews.reviews || [])];
    reviews[idx] = { ...reviews[idx], [field]: value };
    setEditingProductReviews({ ...editingProductReviews, reviews });
  };
  const addReview = () => {
    if (!editingProductReviews) return;
    const nr: ProductReview = { id: `r_${Date.now().toString(36)}`, name: '', rating: 5, text: '', photo: '', date: new Date().toISOString().slice(0, 10) };
    setEditingProductReviews({ ...editingProductReviews, reviews: [...(editingProductReviews.reviews || []), nr] });
  };
  const removeReview = (idx: number) => {
    if (!editingProductReviews) return;
    const reviews = [...(editingProductReviews.reviews || [])];
    reviews.splice(idx, 1);
    setEditingProductReviews({ ...editingProductReviews, reviews });
  };
  const handleSaveReviews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProductReviews) return;
    try {
      const res = await fetch(`/api/admin/products/${editingProductReviews.id}/reviews`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviews: editingProductReviews.reviews || [] })
      });
      const json = await res.json();
      if (json.success) {
        showNotification('success', 'Ulasan & testimoni berhasil diperbarui!');
        setIsReviewModalOpen(false);
        if (onRefreshPublicProducts) onRefreshPublicProducts();
        loadAllData();
      }
    } catch {
      showNotification('error', 'Gagal menyimpan ulasan.');
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
    <div data-theme={theme} className="fixed inset-0 z-50 overflow-hidden bg-[var(--bg-page)] text-[var(--text)] flex font-sans">
      {/* Toast Notification at Bottom Left */}
      {statusMessage && (
        <div className={`fixed bottom-6 left-6 z-[100] px-4 py-3 rounded-xl border shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-fadeIn ${
          statusMessage.type === 'success'
            ? 'bg-[var(--bg-card)] text-[var(--success)] border-[#10B981]/50 shadow-[0_4px_20px_rgba(16,185,129,0.25)]'
            : 'bg-[var(--bg-card)] text-[var(--danger)] border-red-500/50 shadow-[0_4px_20px_rgba(239,68,68,0.25)]'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-[var(--success)]" /> : <XCircle className="w-4 h-4 text-[var(--danger)]" />}
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
      {/* SIDEBAR DARK NAVY — Accordion + Compact + Drawer (Identitas AndroidStore) */}
      {/* ========================================================= */}
      <aside className={`fixed md:relative inset-y-0 left-0 z-50 ${isCompact ? 'w-[76px]' : 'w-64'} bg-[var(--bg-panel)] border-r border-[var(--border)] flex flex-col flex-shrink-0 select-none transition-all duration-300 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:hidden'
      }`}>
        {/* Logo Brand Header */}
        <div className={`flex items-center ${isCompact ? 'justify-center px-2' : 'justify-between px-5'} py-4 border-b border-[var(--border)] flex-shrink-0`}>
          <div className={`flex items-center ${isCompact ? '' : 'gap-3'} min-w-0`}>
            <button
              type="button"
              onClick={() => { if (isCompact) setIsCompact(false); }}
              title={isCompact ? 'Perluas sidebar' : 'Admin Console'}
              className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2583F7] to-[#38BDF8] flex items-center justify-center font-black text-white text-sm shadow-[0_0_15px_rgba(37,131,247,0.4)] flex-shrink-0"
            >
              AS
            </button>
            {!isCompact && (
              <div className="min-w-0">
                <span className="font-black text-sm tracking-tight text-[var(--text)] block truncate">
                  ADMIN CONSOLE
                </span>
                <span className="text-[10px] text-[var(--accent-soft)] font-bold block uppercase tracking-wider truncate">
                  Multi-Seller API System
                </span>
              </div>
            )}
          </div>
          {!isCompact && (
            <button
              type="button"
              onClick={() => setIsCompact(true)}
              title="Mode compact (ikon saja)"
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-card)] transition-colors flex-shrink-0"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Menus — scroll independen */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 text-xs font-semibold scrollbar-none">
          {isCompact ? (
            // Mode compact: rel ikon saja, dipisah antar kelompok.
            <>
              {MENU_GROUPS.map((group, gi) => (
                <div key={group.id}>
                  {group.items.map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        title={item.label}
                        onClick={() => {
                          setActiveTab(item.id);
                          if (window.innerWidth < 768) setIsSidebarOpen(false);
                        }}
                        className={`w-full flex items-center justify-center p-2.5 rounded-xl transition-all ${
                          isActive
                            ? 'bg-[#2583F7] text-white shadow-[0_0_12px_rgba(37,131,247,0.35)]'
                            : 'text-[var(--accent-soft)] hover:text-[var(--text)] hover:bg-[var(--bg-card)]'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </button>
                    );
                  })}
                  {gi < MENU_GROUPS.length - 1 && (
                    <div className="my-2 mx-2 border-t border-[var(--border)]/60" />
                  )}
                </div>
              ))}
            </>
          ) : (
            // Mode penuh: accordion per kelompok (hanya kelompok aktif yang terbuka).
            MENU_GROUPS.map(group => {
              const GroupIcon = group.icon;
              const isOpen = expandedGroup === group.id;
              const isGroupActive = group.items.some(item => item.id === activeTab);
              return (
                <div key={group.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedGroup(prev => (prev === group.id ? null : group.id))}
                    aria-expanded={isOpen}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                      isGroupActive
                        ? 'text-[var(--text)] bg-[var(--bg-card)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-card)]'
                    }`}
                  >
                    <GroupIcon className="w-4 h-4 text-[var(--accent-soft)] flex-shrink-0" />
                    <span className="flex-1 truncate">{group.label}</span>
                    <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                      <div className="ml-[22px] mt-1 mb-1 space-y-1 border-l border-[var(--border)]/60 pl-3">
                        {group.items.map(item => {
                          const Icon = item.icon;
                          const isActive = activeTab === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setActiveTab(item.id);
                                if (window.innerWidth < 768) setIsSidebarOpen(false);
                              }}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left ${
                                isActive
                                  ? 'bg-[#2583F7] text-white font-bold shadow-[0_0_12px_rgba(37,131,247,0.35)]'
                                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-card)]'
                              }`}
                            >
                              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-[var(--accent-soft)]'}`} />
                              <span className="truncate">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </nav>

        {/* Footer Sidebar: Store Link & Logout */}
        <div className="p-3 border-t border-[var(--border)] space-y-2 flex-shrink-0">
          {isCompact ? (
            <>
              <button
                type="button"
                onClick={onClose}
                title="Buka Toko Publik"
                className="w-full flex items-center justify-center p-2.5 rounded-xl bg-[var(--info-bg)] hover:bg-[var(--info-bg)] border border-[#2583F7]/50 text-[var(--accent-soft)] transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                title="Keluar Dashboard"
                className="w-full flex items-center justify-center p-2.5 rounded-xl text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsCompact(false)}
                title="Perluas sidebar"
                className="w-full flex items-center justify-center p-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-card)] border border-[var(--border)] transition-colors"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--info-bg)] hover:bg-[var(--info-bg)] border border-[#2583F7]/50 text-xs font-bold text-[var(--accent-soft)] transition-colors"
              >
                <ShoppingCart className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">Buka Toko Publik</span>
                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar Dashboard</span>
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ========================================================= */}
      {/* MAIN VIEWPORT AREA                                        */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar Header */}
        <header className="h-16 bg-[var(--bg-panel)] border-b border-[var(--border)] px-4 md:px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(prev => !prev)}
              className="p-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--accent-soft)] transition-colors"
              title="Sembunyikan / Tampilkan Sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
            <h1 className="text-sm md:text-base font-black tracking-tight text-[var(--text)] truncate max-w-[200px] md:max-w-none">
              {activeMenuLabel}
            </h1>
            <span className={`hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border ${
              kpis.is_using_fallback
                ? 'bg-amber-500/15 text-[var(--warn)] border-amber-500/30'
                : 'bg-[var(--success-bg)] text-[var(--success)] border-[#10B981]/30'
            }`}>
              {kpis.is_using_fallback ? 'Embedded Store / API Engine Live' : 'MySQL 8 / API Engine Live'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSyncAll}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-xs font-bold text-[var(--accent-soft)] transition-colors active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sinkronkan Semua API</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))}
              className="p-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--accent-soft)] transition-colors"
              title={theme === 'dark' ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-card)] transition-colors"
              title="Tutup Dashboard"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Dynamic Workspace Container */}
        <main ref={mainWorkspaceRef} className="flex-1 min-w-0 overflow-y-auto overscroll-contain p-4 md:p-6 space-y-6">
          
          {/* 1. TAB: DASHBOARD OVERVIEW */}
          {/* 1. TAB: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fadeIn">
              {/* ===== Welcome Banner ===== */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1D4ED8] via-[#2583F7] to-[#0EA5E9] p-5 md:p-6 text-white shadow-lg">
                <div className="absolute -right-12 -top-20 w-64 h-64 rounded-full bg-white/10 pointer-events-none" />
                <div className="absolute right-32 -bottom-24 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
                <div className="relative flex flex-col md:flex-row md:items-center gap-5">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl md:text-2xl font-black tracking-tight">Selamat Datang, Admin 👋</h2>
                    <p className="text-sm text-blue-100 mt-1 max-w-xl">
                      Pantau performa multi-seller, sinkronisasi produk, pesanan, dan kesehatan API dalam satu dashboard.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/15 border border-white/25">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        API Engine Live
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/15 border border-white/25">
                        {kpis.connected_sellers}/{kpis.total_sellers} Seller Terhubung
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/15 border border-white/25">
                        {kpis.is_using_fallback ? 'Embedded Store' : 'MySQL 8'}
                      </span>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-3 flex-shrink-0" aria-hidden="true">
                    <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center">
                      <Store className="w-7 h-7" />
                    </div>
                    <Zap className="w-5 h-5 text-white/70" />
                    <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center">
                      <Code className="w-7 h-7" />
                    </div>
                    <Zap className="w-5 h-5 text-white/70" />
                    <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center">
                      <Globe className="w-7 h-7" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ===== KPI Cards ===== */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[var(--text-muted)] truncate">Total Produk Master</span>
                    <span className="w-8 h-8 rounded-xl bg-[var(--info-bg)] flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-[#2583F7]" />
                    </span>
                  </div>
                  <div className="text-2xl font-black text-[var(--text)] tabular-nums whitespace-nowrap leading-none">{kpis.total_products}</div>
                  <div className="text-[11px] font-semibold text-[var(--success)] leading-tight mt-auto">
                    ✓ {kpis.active_products} aktif · {kpis.out_of_stock_products} stok habis
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[var(--text-muted)] truncate">Total Seller Terhubung</span>
                    <span className="w-8 h-8 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-violet-400" />
                    </span>
                  </div>
                  <div className="text-2xl font-black text-[var(--text)] tabular-nums whitespace-nowrap leading-none">{kpis.total_sellers} Seller</div>
                  <div className="text-[11px] font-semibold text-[var(--accent-soft)] leading-tight mt-auto">
                    ✓ {kpis.connected_sellers} terhubung{kpis.failed_sellers > 0 ? ` · ${kpis.failed_sellers} kendala` : ''}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[var(--text-muted)] truncate">Total Pesanan</span>
                    <span className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                      <ShoppingBag className="w-4 h-4 text-[var(--success)]" />
                    </span>
                  </div>
                  <div className="text-2xl font-black text-[var(--text)] tabular-nums whitespace-nowrap leading-none">{kpis.total_orders}</div>
                  <div className="flex items-end justify-between gap-2 mt-auto">
                    <span className="text-[11px] font-semibold text-[var(--success)] leading-tight">Omzet: {formatPrice(kpis.total_revenue)}</span>
                    <Sparkline data={ordersDaily.map(d => d.orders)} color="#10B981" width={96} height={28} />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[var(--text-muted)] truncate">Estimasi Keuntungan</span>
                    <span className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-4 h-4 text-[var(--warn)]" />
                    </span>
                  </div>
                  <div className="text-2xl font-black text-[var(--success)] tabular-nums whitespace-nowrap leading-none">{formatPrice(kpis.estimated_profit)}</div>
                  <div className="flex items-end justify-between gap-2 mt-auto">
                    <span className="text-[11px] text-[var(--text-muted)] leading-tight">Margin ~28% (estimasi)</span>
                    <Sparkline data={ordersDaily.map(d => d.revenue)} color="#F59E0B" width={96} height={28} />
                  </div>
                </div>
              </div>


              {/* ===== Grafik: Produk Terlaris 7 Hari Terakhir + Status Produk ===== */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-sm text-[var(--text)]">Produk Terlaris — 7 Hari Terakhir</h3>
                      <p className="text-[11px] text-[var(--text-muted)]">Top 5 by unit terjual — hanya order lunas / delivered</p>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-[var(--bg-nested)] border border-[var(--border)] text-[var(--text-muted)] flex-shrink-0">7 Hari Terakhir</span>
                  </div>
                  {topProducts7d.length === 0 ? (
                    <div className="mt-4 p-6 rounded-xl bg-[var(--bg-nested)] border border-dashed border-[var(--border)] text-center">
                      <BarChart3 className="w-6 h-6 mx-auto text-[var(--text-muted)]" />
                      <p className="text-xs font-bold text-[var(--text)] mt-2">Belum ada penjualan dalam 7 hari terakhir</p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1">Grafik muncul setelah ada order yang lunas / delivered dalam 7 hari terakhir.</p>
                    </div>
                  ) : (
                    <div className="h-64 mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topProducts7d} layout="vertical" margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v: string) => (v.length > 24 ? v.slice(0, 24) + '…' : v)} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, color: 'var(--text)' }}
                            labelStyle={{ color: 'var(--text)', fontWeight: 700 }}
                            formatter={(value, name, _item, _index, payload) => {
                              const rev = Number((payload as { revenue?: number } | undefined)?.revenue || 0);
                              return [value + ' unit · Rp' + rev.toLocaleString('id-ID'), name];
                            }}
                          />
                          <Bar dataKey="qty" name="Terjual" fill="#2583F7" radius={[0, 6, 6, 0]} maxBarSize={28} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <p className="text-[11px] text-[var(--text-muted)] mt-2">
                    Diurutkan by unit terjual dari order lunas / delivered 7 hari terakhir. Daftar lengkap semua waktu ada di panel Produk Terlaris di bawah.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
                  <h3 className="font-bold text-sm text-[var(--text)]">Status Produk</h3>
                  <p className="text-[11px] text-[var(--text-muted)]">Distribusi {kpis.total_products} produk master</p>
                  {kpis.total_products === 0 ? (
                    <div className="mt-4 p-6 rounded-xl bg-[var(--bg-nested)] border border-dashed border-[var(--border)] text-center">
                      <Package className="w-6 h-6 mx-auto text-[var(--text-muted)]" />
                      <p className="text-xs font-bold text-[var(--text)] mt-2">Belum ada produk</p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1">Import produk dari supplier untuk melihat distribusi status.</p>
                    </div>
                  ) : (
                    <>
                      <div className="relative h-48 mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={productStatus} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2} strokeWidth={0}>
                              {productStatus.map(entry => (
                                <Cell key={entry.name} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, color: 'var(--text)' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-2xl font-black text-[var(--text)] tabular-nums">{kpis.total_products}</span>
                          <span className="text-[11px] text-[var(--text-muted)]">Produk</span>
                        </div>
                      </div>
                      <div className="space-y-2 mt-2">
                        {productStatus.map(item => (
                          <div key={item.name} className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-2 text-[var(--text-muted)]">
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                              {item.name}
                            </span>
                            <span className="font-bold text-[var(--text)] tabular-nums">
                              {item.value} ({kpis.total_products ? ((item.value / kpis.total_products) * 100).toFixed(1).replace('.', ',') : '0,0'}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ===== Top Buyer + Aktivitas Sinkronisasi ===== */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-sm text-[var(--text)]">Top Buyer</h3>
                      <p className="text-[11px] text-[var(--text-muted)]">Pembeli terbanyak — hanya order lunas / delivered</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('orders')}
                      className="text-xs font-bold text-[var(--accent-soft)] hover:underline flex-shrink-0"
                    >
                      Lihat Semua Pesanan →
                    </button>
                  </div>
                  {topBuyers.length === 0 ? (
                    <div className="mt-4 p-6 rounded-xl bg-[var(--bg-nested)] border border-dashed border-[var(--border)] text-center">
                      <Users className="w-6 h-6 mx-auto text-[var(--text-muted)]" />
                      <p className="text-xs font-bold text-[var(--text)] mt-2">Belum ada pembeli</p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1">Top Buyer muncul setelah ada order yang lunas / delivered.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto mt-4 -mx-1 px-1">
                      <table className="w-full text-left text-xs min-w-[540px]">
                        <thead>
                          <tr className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] border-b border-[var(--border)]">
                            <th className="pb-2 pr-3 font-bold w-10">#</th>
                            <th className="pb-2 pr-3 font-bold">Nama Pelanggan</th>
                            <th className="pb-2 pr-3 font-bold text-right">Pesanan</th>
                            <th className="pb-2 font-bold text-right">Total Belanja</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {topBuyers.map((b, i) => (
                            <tr key={b.name.toLowerCase()}>
                              <td className="py-3 pr-3">
                                <span className={'inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-black ' + (i === 0 ? 'bg-[var(--warn-bg)] text-[var(--warn)]' : i === 1 ? 'bg-slate-400/20 text-[var(--text-muted)]' : i === 2 ? 'bg-orange-500/20 text-[var(--warn)]' : 'bg-[var(--bg-nested)] text-[var(--text-muted)]')}>
                                  {i + 1}
                                </span>
                              </td>
                              <td className="py-3 pr-3 min-w-0">
                                <span className="font-bold text-[var(--text)] block truncate max-w-[280px]">{b.name}</span>
                                <span className="text-[10px] text-[var(--text-muted)]">{b.phone || '—'}</span>
                              </td>
                              <td className="py-3 pr-3 font-bold text-[var(--text)] tabular-nums text-right whitespace-nowrap">{b.orders}×</td>
                              <td className="py-3 font-bold text-[var(--text)] tabular-nums text-right whitespace-nowrap">Rp{b.total.toLocaleString('id-ID')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-bold text-sm text-[var(--text)]">Aktivitas Sinkronisasi Terakhir</h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('logs')}
                      className="text-xs font-bold text-[var(--accent-soft)] hover:underline flex-shrink-0"
                    >
                      Lihat Semua →
                    </button>
                  </div>
                  <div className="space-y-3 mt-4">
                    {(kpis.recent_sync_activity || []).slice(0, 4).map(log => (
                      <button
                        key={log.id}
                        type="button"
                        onClick={() => { setSelectedLogDetail(log); setActiveTab('logs'); }}
                        title="Lihat detail log"
                        className="w-full text-left p-3 rounded-xl bg-[var(--bg-nested)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-[var(--accent-soft)] truncate">{log.seller_name}</span>
                          <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">{timeAgo(log.created_at)}</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] line-clamp-1 mt-1">{log.response_summary || log.error_message || '—'}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className={`text-[10px] font-bold ${log.is_success ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                            {log.is_success ? '✓ Sukses' : '✗ Gagal'}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] tabular-nums">{log.duration_ms}ms</span>
                        </div>
                      </button>
                    ))}
                    {(!kpis.recent_sync_activity || kpis.recent_sync_activity.length === 0) && (
                      <div className="p-6 rounded-xl bg-[var(--bg-nested)] border border-dashed border-[var(--border)] text-center">
                        <RefreshCw className="w-6 h-6 mx-auto text-[var(--text-muted)]" />
                        <p className="text-xs font-bold text-[var(--text)] mt-2">Belum ada aktivitas sinkronisasi</p>
                        <p className="text-[11px] text-[var(--text-muted)] mt-1">Jalankan sinkronisasi untuk melihat aktivitas terbaru di sini.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ===== Produk Terlaris ===== */}
              <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text)]">Produk Terlaris</h3>
                    <p className="text-[11px] text-[var(--text-muted)]">Top 5 by unit terjual · hanya order lunas / delivered</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-bold text-[var(--accent-soft)] hover:underline flex-shrink-0"
                  >
                    Lihat Semua Pesanan →
                  </button>
                </div>
                {topProducts.length === 0 ? (
                  <div className="mt-4 p-6 rounded-xl bg-[var(--bg-nested)] border border-dashed border-[var(--border)] text-center">
                    <ShoppingBag className="w-6 h-6 mx-auto text-[var(--text-muted)]" />
                    <p className="text-xs font-bold text-[var(--text)] mt-2">Belum ada produk terjual</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">Produk terlaris muncul setelah ada order yang lunas / delivered.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto mt-4 -mx-1 px-1">
                    <table className="w-full text-left text-xs min-w-[540px]">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] border-b border-[var(--border)]">
                          <th className="pb-2 pr-3 font-bold w-10">#</th>
                          <th className="pb-2 pr-3 font-bold">Produk</th>
                          <th className="pb-2 pr-3 font-bold">Seller</th>
                          <th className="pb-2 pr-3 font-bold text-right">Terjual</th>
                          <th className="pb-2 font-bold text-right">Omzet</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {topProducts.map((p, i) => (
                          <tr key={p.name.toLowerCase()}>
                            <td className="py-3 pr-3">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-black ${
                                i === 0
                                  ? 'bg-[var(--warn-bg)] text-[var(--warn)]'
                                  : i === 1
                                    ? 'bg-slate-400/20 text-[var(--text-muted)]'
                                    : i === 2
                                      ? 'bg-orange-500/20 text-[var(--warn)]'
                                      : 'bg-[var(--bg-nested)] text-[var(--text-muted)]'
                              }`}>
                                {i + 1}
                              </span>
                            </td>
                            <td className="py-3 pr-3 min-w-0">
                              <span className="font-bold text-[var(--text)] block truncate max-w-[280px]">{p.name}</span>
                              <span className="text-[10px] text-[var(--text-muted)]">{p.orders} order</span>
                            </td>
                            <td className="py-3 pr-3 text-[var(--text-muted)] whitespace-nowrap">{p.provider}</td>
                            <td className="py-3 pr-3 font-bold text-[var(--text)] tabular-nums text-right whitespace-nowrap">{p.qty} unit</td>
                            <td className="py-3 font-bold text-[var(--success)] tabular-nums text-right whitespace-nowrap">{formatPrice(p.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ===== Kesehatan Sistem + Quick Actions ===== */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-bold text-sm text-[var(--text)]">Kesehatan Sistem</h3>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      systemHealth.dbOk && systemHealth.apiOk && systemHealth.syncOk
                        ? 'bg-[var(--success-bg)] text-[var(--success)] border-[#10B981]/30'
                        : 'bg-amber-500/15 text-[var(--warn)] border-amber-500/30'
                    }`}>
                      {systemHealth.dbOk && systemHealth.apiOk && systemHealth.syncOk ? '✓ Sistem Normal' : '⚠ Perlu Perhatian'}
                    </span>
                  </div>
                  <div className="space-y-3 mt-4 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 font-semibold text-[var(--text)]">
                        <Database className="w-4 h-4 text-[var(--accent-soft)]" />
                        {systemHealth.dbLabel}
                      </span>
                      <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                        {systemHealth.dbNote}
                        <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 font-semibold text-[var(--text)]">
                        <Zap className="w-4 h-4 text-[var(--accent-soft)]" />
                        API Engine
                      </span>
                      <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                        Online
                        <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 font-semibold text-[var(--text)]">
                        <RefreshCw className="w-4 h-4 text-[var(--accent-soft)]" />
                        Sinkronisasi
                      </span>
                      <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                        {systemHealth.syncNote}
                        {systemHealth.syncOk
                          ? <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
                          : <AlertTriangle className="w-4 h-4 text-[var(--warn)]" />}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 font-semibold text-[var(--text)]">
                        <HardDrive className="w-4 h-4 text-[var(--accent-soft)]" />
                        Storage
                      </span>
                      <span className="flex items-center gap-1.5 text-[var(--text-muted)]" title="Backend belum menyediakan endpoint health storage">
                        Tidak tersedia
                        <AlertTriangle className="w-4 h-4 text-[var(--warn)]" />
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-4">
                    Storage belum bisa dicek — backend belum punya endpoint health storage. Perlu persetujuan untuk menambahkannya.
                  </p>
                </div>

                <div className="lg:col-span-2 p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
                  <h3 className="font-bold text-sm text-[var(--text)]">Quick Actions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('supplier_products');
                        setEditingSupplierProduct({
                          seller_id: sellers[0]?.id || 1,
                          name: '',
                          original_category: 'Voucher & Digital',
                          cost_price: 15000,
                          stock: 25,
                          description: '',
                        });
                        setIsManualSeller(false);
                        setManualSellerName('');
                        setIsSupplierProductModalOpen(true);
                      }}
                      className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--bg-nested)] border border-[var(--border)] hover:border-[var(--accent)] text-left transition-colors"
                    >
                      <span className="w-9 h-9 rounded-xl bg-[var(--info-bg)] flex items-center justify-center flex-shrink-0">
                        <Plus className="w-4 h-4 text-[#2583F7]" />
                      </span>
                      <span>
                        <span className="block text-xs font-bold text-[var(--text)]">Tambah Produk</span>
                        <span className="block text-[11px] text-[var(--text-muted)]">Produk supplier manual</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('sellers')}
                      className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--bg-nested)] border border-[var(--border)] hover:border-[var(--accent)] text-left transition-colors"
                    >
                      <span className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                        <Store className="w-4 h-4 text-violet-400" />
                      </span>
                      <span>
                        <span className="block text-xs font-bold text-[var(--text)]">Kelola Seller</span>
                        <span className="block text-[11px] text-[var(--text-muted)]">{kpis.total_sellers} seller terdaftar</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSyncAll}
                      disabled={isLoading}
                      className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--bg-nested)] border border-[var(--border)] hover:border-[var(--accent)] text-left transition-colors disabled:opacity-50"
                    >
                      <span className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                        <RefreshCw className={`w-4 h-4 text-[var(--success)] ${isLoading ? 'animate-spin' : ''}`} />
                      </span>
                      <span>
                        <span className="block text-xs font-bold text-[var(--text)]">Sinkronisasi Produk</span>
                        <span className="block text-[11px] text-[var(--text-muted)]">Sync semua seller aktif</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('logs')}
                      className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--bg-nested)] border border-[var(--border)] hover:border-[var(--accent)] text-left transition-colors"
                    >
                      <span className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                        <BarChart3 className="w-4 h-4 text-[var(--warn)]" />
                      </span>
                      <span>
                        <span className="block text-xs font-bold text-[var(--text)]">Monitoring API</span>
                        <span className="block text-[11px] text-[var(--text-muted)]">Log &amp; health request API</span>
                      </span>
                    </button>
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
                      className="w-full pl-9 pr-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-xs text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#2583F7]"
                    />
                    <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
                  </div>

                  {/* Supplier Filter */}
                  <select
                    value={selectedMasterSellerFilter}
                    onChange={(e) => { setSelectedMasterSellerFilter(e.target.value); setMasterCurrentPage(1); }}
                    className="px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-xs text-[var(--text)] focus:outline-none focus:border-[#1677FF]"
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
                    className="px-3 py-2 bg-[var(--bg-nested)] hover:bg-[var(--bg-hover)] text-[var(--accent-soft)] border border-[var(--border)] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
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
                    className="px-3.5 py-2 rounded-xl bg-[var(--danger-bg)] hover:opacity-80 text-[var(--danger)] border border-[var(--danger-border)] text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
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
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--bg-panel)] border-b border-[var(--border)] text-[var(--text-muted)] font-bold uppercase text-[10px]">
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
                            className="rounded bg-[var(--bg-nested)] border-[var(--border)] text-[#1677FF] focus:ring-0 cursor-pointer"
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
                    <tbody className="divide-y divide-[var(--border)]">
                     {paginatedMasterProducts.map((prod, index) => {
                          const profit = prod.selling_price - prod.cost_price;
                          const isLoss = profit < 0;
                          return (
                      <tr key={prod.id} className="hover:bg-[var(--bg-hover)] transition-colors">
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
                            className="rounded bg-[var(--bg-nested)] border-[var(--border)] text-[#1677FF] focus:ring-0 cursor-pointer"
                          />
                        </td>
                        <td className="p-3.5 font-mono text-[var(--text-muted)]">{(masterCurrentPage - 1) * masterPageSize + index + 1}</td>
                        <td className="p-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-9 h-9 rounded-lg bg-[var(--bg-nested)] border border-[var(--border)] overflow-hidden flex-shrink-0">
                                    <img src={prod.custom_image_url || '/assets/default_produk.png'} alt="" className="w-full h-full object-cover" />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-bold text-[var(--text)] block truncate max-w-[220px]">{cleanProductName(prod.name)}</span>
                                    <span className="text-[10px] text-[var(--text-muted)] font-mono">{prod.slug}</span>
                                    {(prod.variants || []).length > 0 && (
                                      <span className="text-[10px] font-bold text-[#2583F7] block mt-0.5">{(prod.variants || []).length} varian · mulai {formatMasterPrice(Math.min(...(prod.variants || []).filter(v => v.is_active).map(v => Number(v.selling_price || 0))))}</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-3.5 text-[var(--accent-soft)] font-semibold">{prod.category}</td>
                              <td className="p-3.5 font-mono text-[var(--text-muted)]">{formatMasterPrice(prod.cost_price)}</td>
                              <td className="p-3.5 font-mono font-bold text-[var(--text)]">{formatMasterPrice(prod.selling_price)}</td>
                              <td className="p-3.5 font-mono">
                                <span className={isLoss ? 'text-[var(--danger)] font-bold' : 'text-[var(--success)] font-bold'}>
                                  {isLoss ? 'RUGI: ' : '+'}{formatMasterPrice(profit)}
                                </span>
                              </td>
                              <td className="p-3.5">
                                <span className="px-2 py-0.5 rounded bg-[var(--bg-nested)] border border-[var(--border)] text-[10px] text-[var(--accent-soft)]">
                                  {prod.primary_seller_name || 'Auto'}
                                </span>
                              </td>
                              <td className="p-3.5">
                                <span className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={!!prod.is_active}
                                    title={prod.is_active ? 'Klik untuk menonaktifkan produk' : 'Klik untuk mengaktifkan produk'}
                                    disabled={togglingProductId === prod.id}
                                    onClick={() => handleToggleProductActive(prod)}
                                    className={`relative inline-flex h-5 w-10 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${prod.is_active ? 'bg-[#10B981]' : 'bg-[#64748B]'}`}
                                  >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${prod.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                  </button>
                                  <span className={`text-[10px] font-bold ${prod.is_active ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                                    {prod.is_active ? 'Aktif' : 'Nonaktif'}
                                  </span>
                                </span>
                              </td>
                              <td className="p-3.5 text-right space-x-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingProductPrice(prod);
                                    setIsPricingModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg bg-[var(--bg-nested)] hover:bg-[#2583F7] text-[var(--text-muted)] hover:text-white transition-colors"
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
                                  className="p-1.5 rounded-lg bg-[var(--bg-nested)] hover:bg-[#38BDF8] text-[var(--text-muted)] hover:text-[#080D18] transition-colors"
                                  title="Ganti Gambar"
                                >
                                  <ImageIcon className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingProductContent(prod);
                                    setIsContentModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg bg-[var(--bg-nested)] hover:bg-[#10B981] text-[var(--text-muted)] hover:text-white transition-colors"
                                  title="Edit Deskripsi & S&K"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingProductReviews(prod);
                                    setIsReviewModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg bg-[var(--bg-nested)] hover:bg-amber-500 text-[var(--text-muted)] hover:text-white transition-colors"
                                  title="Ulasan & Testimoni"
                                >
                                  <Star className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMasterProduct(prod.id)}
                                  className="p-1.5 rounded-lg bg-[var(--bg-nested)] hover:bg-red-600 text-[var(--text-muted)] hover:text-white transition-colors"
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
              <div className="p-6 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)] flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-card">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <h3 className="font-extrabold text-lg text-[var(--text)]">Produk Supplier Mentah</h3>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-[var(--success-bg)] text-[var(--success)] border border-[#10B981]/30">
                      MySQL 8 / API Engine Live
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] max-w-xl leading-relaxed">
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
                      setIsManualSeller(false);
                      setManualSellerName('');
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
              <div className="p-4 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border)] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Filter Supplier */}
                  <select
                    value={selectedSellerFilter}
                    onChange={(e) => { setSelectedSellerFilter(e.target.value); setSupplierCurrentPage(1); }}
                    className="px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-xs text-[var(--text)] focus:outline-none focus:border-[#1677FF]"
                  >
                    <option value="">Semua Supplier</option>
                    {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>

                  {/* Filter Category */}
                  <select
                    value={supplierCategoryFilter}
                    onChange={(e) => { setSupplierCategoryFilter(e.target.value); setSupplierCurrentPage(1); }}
                    className="px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-xs text-[var(--text)] focus:outline-none focus:border-[#1677FF]"
                  >
                    <option value="Semua">Semua Kategori</option>
                    {supplierCategories.map((cat: string) => <option key={cat} value={cat}>{cat}</option>)}
                  </select>

                  {/* Filter Stock Status */}
                  <select
                    value={supplierStockFilter}
                    onChange={(e) => { setSupplierStockFilter(e.target.value); setSupplierCurrentPage(1); }}
                    className="px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-xs text-[var(--text)] focus:outline-none focus:border-[#1677FF]"
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
                      className="px-3 py-2 text-xs font-bold text-[var(--accent-soft)] hover:underline"
                    >
                      Reset Filter
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSupplierCurrencyMode(prev => prev === 'AUTO' ? 'USD' : prev === 'USD' ? 'IDR' : 'AUTO');
                    }}
                    className="px-3 py-2 bg-[var(--bg-nested)] hover:bg-[var(--bg-hover)] text-[var(--accent-soft)] border border-[var(--border)] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
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
                    className="w-full pl-9 pr-8 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-xs text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#1677FF]"
                  />
                  <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5 pointer-events-none" />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-[var(--text-muted)] hover:text-[var(--text)]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Bulk Action Toolbar (Appears when items are selected) */}
              {selectedSupplierIds.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-[var(--info-bg)] border border-[#1677FF]/40 flex items-center justify-between text-xs animate-fadeIn">
                  <div className="flex items-center gap-2 font-bold text-[var(--accent-soft)]">
                    <CheckCircle2 className="w-4 h-4 text-[var(--accent-soft)]" />
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
                      className="px-3 py-2 rounded-xl bg-[var(--bg-nested)] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]"
                    >
                      Batalkan Pilihan
                    </button>
                  </div>
                </div>
              )}

              {/* Raw Supplier Products Table (V2.0 Styler) */}
              <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--bg-panel)] border-b border-[var(--border)] text-[var(--text-muted)] font-bold uppercase text-[11px] tracking-wider sticky top-0 z-10">
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
                            className="rounded bg-[var(--bg-nested)] border-[var(--border)] text-[#1677FF] focus:ring-0 cursor-pointer"
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
                    <tbody className="divide-y divide-[var(--border)]">
                      {paginatedSupplierProducts.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-10 text-center text-[var(--text-muted)]">
                            Tidak ada produk supplier yang cocok dengan filter atau pencarian Anda.
                          </td>
                        </tr>
                      ) : (
                        paginatedSupplierProducts.map((item: SupplierProductItem, idx: number) => {
                          const rowNum = (supplierCurrentPage - 1) * supplierPageSize + idx + 1;
                          const isSelected = selectedSupplierIds.includes(item.id);
                          return (
                            <tr key={`${item.seller_id}-${item.external_product_id}`} className="hover:bg-[var(--info-bg)] transition-colors h-[76px]">
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
                                  className="rounded bg-[var(--bg-nested)] border-[var(--border)] text-[#1677FF] focus:ring-0 cursor-pointer"
                                />
                              </td>
                              <td className="p-4 font-mono text-[var(--text-muted)]">{rowNum}</td>
                              <td className="p-4 font-bold text-[var(--accent-soft)]">{item.seller_name}</td>
                              <td className="p-4">
                                <div className="min-w-0">
                                  <span className="font-bold text-[var(--text)] block truncate max-w-[240px]" title={cleanProductName(item.name)}>
                                    {cleanProductName(item.name)}
                                  </span>
                                  <span className="text-[11px] text-[var(--text-muted)] truncate block max-w-[240px]">
                                    {item.description ? cleanProductName(item.description).replace(/[\r\n]+/g, ' ') : 'Ready instant process'}
                                  </span>
                                </div>
                              </td>
                              <td className="p-4 text-[var(--text-muted)] font-medium">{item.original_category}</td>
                              <td className="p-4 font-mono font-bold text-[var(--text)]">{formatSupplierPrice(item.cost_price)}</td>
                              <td className="p-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black ${
                                  item.is_available ? 'bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]' : 'bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]'
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
                                    setIsManualSeller(false);
                                    setManualSellerName('');
                                    setIsSupplierProductModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-card)] hover:bg-[#2583F7] text-[var(--accent-soft)] hover:text-white border border-[var(--border)] text-xs font-bold transition-all"
                                  title="Edit Produk"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSupplierProduct(item.id)}
                                  className="px-2.5 py-1.5 rounded-xl bg-[var(--danger-bg)] hover:bg-red-600 text-[var(--danger)] hover:text-white border border-[var(--danger-border)] text-xs font-bold transition-all"
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
                  <h3 className="font-bold text-sm text-[var(--text)]">Daftar API Supplier Digital</h3>
                  <p className="text-xs text-[var(--text-muted)]">Dapat menambahkan seller ketiga, keempat, dst tanpa mengubah database.</p>
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
                  <div key={s.id} className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-[var(--text)]">{s.name}</h4>
                        <span className="font-mono text-xs text-[var(--accent-soft)] break-all">{s.base_url || 'Tanpa API — produk manual'}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        s.auth_type === 'manual' ? 'bg-[var(--bg-nested)] text-[var(--text-muted)] border-[var(--border)]' : s.last_status === 'connected' ? 'bg-[var(--success-bg)] text-[var(--success)] border-[#10B981]/40' : 'bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger-border)]'
                      }`}>
                        {s.auth_type === 'manual' ? 'Manual' : s.last_status === 'connected' ? 'Connected' : 'Error'}
                      </span>
                    </div>

                    <div className="p-3 bg-[var(--bg-nested)] rounded-xl border border-[var(--border)] text-xs space-y-1 font-mono">
                      <div className="flex justify-between text-[var(--text-muted)]">
                        <span>Auth Type:</span>
                        <span className="text-[var(--text)]">{s.auth_type === 'manual' ? 'manual (tanpa API)' : s.auth_type + ' (' + s.auth_header_key + ')'}</span>
                      </div>
                      <div className="flex justify-between text-[var(--text-muted)]">
                        <span>API Key:</span>
                        <span className="text-[var(--accent-soft)]">{s.auth_type === 'manual' ? '—' : s.masked_key}</span>
                      </div>
                      <div className="flex justify-between text-[var(--text-muted)]">
                        <span>Sync Terakhir:</span>
                        <span className="text-[var(--text)]">{s.last_synced_at ? new Date(s.last_synced_at).toLocaleString('id-ID') : 'Belum pernah'}</span>
                      </div>
                      <div className="flex justify-between text-[var(--text-muted)] border-t border-[var(--border)]/60 pt-1 mt-1">
                        <span>Produk Supplier:</span>
                        <span className="text-[var(--text)] font-bold">{sellerProductCounts.get(s.id)?.supplier ?? 0} produk</span>
                      </div>
                      <div className="flex justify-between text-[var(--text-muted)]">
                        <span>Produk Katalog:</span>
                        <span className="text-[var(--text)] font-bold">{sellerProductCounts.get(s.id)?.master ?? 0} produk</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      {s.auth_type !== 'manual' && (
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
                          className="px-3 py-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-xs font-bold text-[var(--accent-soft)]"
                        >
                          Sync Sekarang
                        </button>
                      </div>)}
                      {s.auth_type === 'manual' && (
                        <span className="text-[11px] text-[var(--text-muted)]">Produk ditambah manual — tanpa sinkronisasi API.</span>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSeller(s);
                            setIsSellerModalOpen(true);
                          }}
                          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text)]"
                          title="Edit Seller"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSeller(s.id)}
                          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--danger)]"
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
              <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-sm text-[var(--text)]">Uji Coba Notifikasi Bot Telegram</h4>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">Kirim pesan test order instan ke bot Telegram yang diatur di `.env`.</p>
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

              <div className="p-4 rounded-2xl bg-[var(--bg-nested)] border border-[#2583F7] space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--accent-soft)]">
                  <ShieldCheck className="w-4 h-4 text-[#2583F7]" />
                  <span>KEAMANAN KREDENSIAL TERENKRIPSI (AES-256-GCM)</span>
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Semua API Key dan Secret supplier disimpan dalam bentuk cipher terenkripsi di database. Kunci rahasia didekripsi secara aman di memori backend dan tidak pernah dikirim secara utuh ke browser klien.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sellers.map(s => (
                  <div key={s.id} className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] space-y-3">
                    <h4 className="font-bold text-sm text-[var(--text)]">{s.name}</h4>
                    <div className="p-3 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl font-mono text-xs space-y-2">
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">Header Autentikasi:</span>
                        <span className="text-[var(--accent-soft)]">{s.auth_header_key}: {s.masked_key}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">Algoritma Enkripsi:</span>
                        <span className="text-[var(--success)] font-bold">AES-256-GCM + IV Hash</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSeller(s);
                        setIsSellerModalOpen(true);
                      }}
                      className="w-full py-2 bg-[var(--info-bg)] hover:bg-[#2583F7] text-[var(--accent-soft)] hover:text-white border border-[#2583F7]/30 rounded-xl text-xs font-bold transition-all"
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
              <div className="flex items-center justify-between p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
                <div>
                  <h3 className="font-bold text-sm text-[var(--text)]">Sinkronisasi Otomatis & Terjadwal</h3>
                  <p className="text-xs text-[var(--text-muted)]">Tarik data harga modal dan stok aktual dari seluruh supplier secara berkala.</p>
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
                  <div key={s.id} className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-[var(--text)] block">{s.name}</span>
                      <span className="text-[11px] text-[var(--text-muted)]">Interval: {s.sync_interval_minutes || 60} menit</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSyncSeller(s.id)}
                      className="px-3 py-1.5 rounded-lg bg-[var(--bg-nested)] hover:bg-[var(--bg-hover)] text-xs font-bold text-[var(--accent-soft)] border border-[var(--border)]"
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
              <div className="p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-[var(--text)]">Kebijakan Margin &amp; Pengaturan Harga Jual</h3>
                  <p className="text-xs text-[var(--text-muted)]">Pelanggan hanya melihat harga jual Androidstore. Harga modal supplier bersifat rahasia.</p>
                </div>
                <div className="relative w-full sm:w-72 shrink-0">
                  <input
                    type="text"
                    value={priceSearchQuery}
                    onChange={(e) => { setPriceSearchQuery(e.target.value); setPriceCurrentPage(1); }}
                    placeholder="Cari produk..."
                    className="w-full pl-9 pr-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-xs text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#2583F7]"
                  />
                  <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
                </div>
              </div>

              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--bg-panel)] border-b border-[var(--border)] text-[var(--text-muted)] font-bold uppercase text-[10px]">
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
                  <tbody className="divide-y divide-[var(--border)]">
                     {paginatedPriceProducts.map((p, index) => {
                      const margin = p.selling_price - p.cost_price;
                      const isDanger = margin < 0;
                      return (
                         <tr key={p.id} className="hover:bg-[var(--bg-hover)]">
                           <td className="p-3.5 font-mono text-[var(--text-muted)]">{(priceCurrentPage - 1) * pricePageSize + index + 1}</td>
                           <td className="p-3.5 font-bold text-[var(--text)]">{cleanProductName(p.name)}</td>
                          <td className="p-3.5 font-mono text-[var(--text-muted)]">{formatPrice(p.cost_price)}</td>
                          <td className="p-3.5 capitalize text-[var(--accent-soft)]">{p.pricing_mode.replace('_', ' ')}</td>
                          <td className="p-3.5 font-mono font-bold text-[var(--text)]">{formatPrice(p.selling_price)}</td>
                          <td className="p-3.5 font-mono font-bold">
                            <span className={isDanger ? 'text-[var(--danger)]' : 'text-[var(--success)]'}>
                              {isDanger ? '⚠️ ' : '+'}{formatPrice(margin)}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-[var(--text-muted)]">
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
                 totalItems={filteredPriceProducts.length}
                 pageSize={pricePageSize}
                 onPageChange={setPriceCurrentPage}
                 onPageSizeChange={setPricePageSize}
               />
             </div>
           )}

           {/* 8. TAB: MANAJEMEN GAMBAR */}
          {activeTab === 'images' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-[var(--text)]">Manajemen Gambar Produk (Upload File &amp; URL Link)</h3>
                  <p className="text-xs text-[var(--text-muted)]">Prioritas: 1. Upload Admin → 2. Link Custom Admin → 3. Gambar Supplier.</p>
                </div>
                <div className="relative w-full sm:w-72 shrink-0">
                  <input
                    type="text"
                    value={imageSearchQuery}
                    onChange={(e) => { setImageSearchQuery(e.target.value); setImagesCurrentPage(1); }}
                    placeholder="Cari produk..."
                    className="w-full pl-9 pr-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-xs text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#2583F7]"
                  />
                  <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                 {paginatedImageProducts.map(p => (
                  <div key={p.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden p-3 space-y-2 flex flex-col justify-between">
                    <div className="aspect-square bg-[var(--bg-nested)] rounded-xl overflow-hidden border border-[var(--border)]/60 flex items-center justify-center">
                      <img src={p.custom_image_url || '/assets/default_produk.png'} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-[var(--text)] line-clamp-1">{cleanProductName(p.name)}</span>
                      <span className="text-[10px] text-[var(--accent-soft)] uppercase font-semibold">Tipe: {p.image_type}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProductImage(p);
                        setImageUrlInput(p.custom_image_url || '');
                        setIsImageModalOpen(true);
                      }}
                      className="w-full py-1.5 bg-[var(--bg-nested)] hover:bg-[#2583F7] text-[var(--accent-soft)] hover:text-white border border-[var(--border)] rounded-xl text-xs font-bold transition-all"
                    >
                      Ganti Gambar
                    </button>
                  </div>
                ))}
               </div>
               <SmartPagination
                 currentPage={imagesCurrentPage}
                 totalItems={filteredImageProducts.length}
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
                    className="w-full pl-9 pr-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-xs text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#2583F7]"
                  />
                  <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewOrderForm({
                      customer_name: '',
                      customer_phone: '',
                      product_name: '',
                      total_amount: 25000,
                      payment_method: 'QRIS Instant',
                      order_status: 'pending',
                      payment_status: 'unpaid'
                    });
                    setNewOrderProductId('');
                    setNewOrderProofFile(null);
                    setNewOrderProofPreview(null);
                    setNewOrderSuggestOpen(false);
                    setIsCreateOrderModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#2583F7] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tambah Pesanan Manual</span>
                </button>
              </div>

              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--bg-panel)] border-b border-[var(--border)] text-[var(--text-muted)] font-bold uppercase text-[10px]">
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
                    <tbody className="divide-y divide-[var(--border)]">
                      {orders.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-[var(--text-muted)]">Belum ada transaksi pesanan yang masuk.</td>
                        </tr>
                      ) : (
                        paginatedOrders.map((o, index) => (
                          <tr key={o.id} className="hover:bg-[var(--bg-hover)]">
                            <td className="p-3.5 font-mono text-[var(--text-muted)]">{(ordersCurrentPage - 1) * ordersPageSize + index + 1}</td>
                           <td className="p-3.5 font-mono font-bold text-[var(--accent-soft)]">{o.invoice_number}</td>
                            <td className="p-3.5 font-bold text-[var(--text)]">{o.customer_name}</td>
                            <td className="p-3.5 text-[var(--text-muted)]">{o.customer_phone}</td>
                            <td className="p-3.5 font-mono font-bold text-[var(--success)]">{formatPrice(o.total_amount)}</td>
                             <td className="p-3.5">
                               <button
                                 type="button"
                                 onClick={() => setSelectedOrderDetail(o)}
                                 className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--info-bg)] hover:bg-[#1677FF] text-[var(--accent-soft)] hover:text-white border border-[#1677FF]/40 text-[11px] font-bold transition-all"
                               >
                                 <Eye className="w-3.5 h-3.5" />
                                 <span>Lihat Detail</span>
                               </button>
                             </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                o.order_status === 'delivered' ? 'bg-[var(--success-bg)] text-[var(--success)]' :
                                o.order_status === 'waiting_verification' ? 'bg-[var(--warn-bg)] text-[var(--warn)] border border-[var(--warn)]' :
                                'bg-[var(--info-bg)] text-[var(--accent-soft)]'
                              }`}>
                                {o.order_status === 'waiting_verification' ? 'Menunggu Verifikasi' : o.order_status}
                              </span>
                            </td>
                            <td className="p-3.5">
                              {o.payment_status === 'paid' || o.payment_status === 'verified' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--success-bg)] text-[var(--success)] text-[11px] font-bold whitespace-nowrap">
                                  ✓ Terverifikasi
                                </span>
                              ) : o.payment_proof_url ? (
                                <div className="flex items-center gap-2">
                                  <img
                                    src={o.payment_proof_url}
                                    alt="Thumbnail"
                                    onClick={() => setSelectedOrderProof(o)}
                                    className="w-10 h-10 rounded-lg object-cover border border-[var(--border)] cursor-pointer hover:scale-105 transition-transform flex-shrink-0 shadow-xs"
                                    title="Klik untuk perbesar bukti"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setSelectedOrderProof(o)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--info-bg)] hover:bg-[#2583F7] text-[var(--accent-soft)] hover:text-white border border-[#2583F7]/40 text-[11px] font-bold transition-all"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Lihat Bukti</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-[var(--text-muted)] italic">Belum Ada Bukti</span>
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
                                  setEditOrderProofFile(null);
                                  setEditOrderProofPreview(null);
                                  setIsEditOrderModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[var(--info-bg)] hover:bg-[#1677FF] text-[var(--accent-soft)] hover:text-white border border-[#1677FF]/40 text-[11px] font-bold transition-all"
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
                                className="px-2.5 py-1 rounded-lg bg-[var(--danger-bg)] hover:bg-red-600 text-[var(--danger)] hover:text-white border border-[var(--danger-border)] text-[11px] font-bold transition-all"
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
                  <h3 className="font-extrabold text-base text-[var(--text)]">Riwayat Transaksi &amp; Laporan Keuntungan</h3>
                  <span className="text-xs text-[var(--text-muted)]">Menampilkan rincian pesanan, modal supplier, dan analisis keuntungan bersih</span>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="px-3.5 py-2.5 rounded-xl bg-[var(--bg-nested)] hover:bg-[var(--bg-hover)] text-[var(--accent-soft)] border border-[var(--border)] font-bold text-xs shadow-sm flex items-center gap-2 transition-all"
                  >
                    <span>📥 Export CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="px-3.5 py-2.5 rounded-xl bg-[var(--bg-nested)] hover:bg-[var(--bg-hover)] text-[var(--success)] border border-[var(--border)] font-bold text-xs shadow-sm flex items-center gap-2 transition-all"
                  >
                    <span>📊 Export Excel</span>
                  </button>
                </div>
              </div>

              {/* Financial Stats Cards (Top) */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] space-y-1">
                  <span className="text-[11px] text-[var(--text-muted)] font-medium block">Total Transaksi</span>
                  <span className="text-xl font-black text-[var(--text)] font-mono">{orderStats.totalTransactions}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] space-y-1">
                  <span className="text-[11px] text-[var(--text-muted)] font-medium block">Total Omzet (Penjualan)</span>
                  <span className="text-xl font-black text-[var(--success)] font-mono">{formatPrice(orderStats.totalRevenue)}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] space-y-1">
                  <span className="text-[11px] text-[var(--text-muted)] font-medium block">Total Modal Supplier</span>
                  <span className="text-xl font-black text-[var(--danger)] font-mono">{formatPrice(orderStats.totalCost)}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] space-y-1">
                  <span className="text-[11px] text-[var(--text-muted)] font-medium block">Keuntungan Kotor</span>
                  <span className="text-xl font-black text-[var(--accent-soft)] font-mono">+{formatPrice(orderStats.grossProfit)}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] space-y-1">
                  <span className="text-[11px] text-[var(--text-muted)] font-medium block">Keuntungan Bersih (Net)</span>
                  <span className="text-xl font-black text-[var(--success)] font-mono">+{formatPrice(orderStats.netProfit)}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] space-y-1">
                  <span className="text-[11px] text-[var(--text-muted)] font-medium block">Pending</span>
                  <span className="text-xl font-black text-[var(--warn)] font-mono">{orderStats.pendingCount}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] space-y-1">
                  <span className="text-[11px] text-[var(--text-muted)] font-medium block">Berhasil (Success)</span>
                  <span className="text-xl font-black text-[var(--success)] font-mono">{orderStats.successCount}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] space-y-1">
                  <span className="text-[11px] text-[var(--text-muted)] font-medium block">Gagal / Batal</span>
                  <span className="text-xl font-black text-[var(--danger)] font-mono">{orderStats.failedCount}</span>
                </div>
              </div>

              {/* Filters Toolbar */}
              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={orderSearchQuery}
                    onChange={(e) => { setOrderSearchQuery(e.target.value); setOrdersCurrentPage(1); }}
                    placeholder="Cari invoice, nama pelanggan, atau nomor kontak..."
                    className="w-full pl-9 pr-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-xs text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#2583F7]"
                  />
                  <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
                </div>

                {/* Date Range Filter */}
                <select
                  value={orderDateRange}
                  onChange={(e) => { setOrderDateRange(e.target.value); setOrdersCurrentPage(1); }}
                  className="px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-xs text-[var(--text)] focus:outline-none focus:border-[#2583F7]"
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
                  className="px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-xs text-[var(--text)] focus:outline-none focus:border-[#2583F7]"
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
                  className="px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-xs text-[var(--text)] focus:outline-none focus:border-[#2583F7]"
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
                  className="px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-xs text-[var(--text)] focus:outline-none focus:border-[#2583F7]"
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
                    className="px-3 py-2 text-xs font-bold text-[var(--accent-soft)] hover:underline"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              {/* Transactions & Profit Audit Table */}
              <div className="w-full min-w-0 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-x-auto overflow-y-visible shadow-card">
                <table className="w-full min-w-[960px] text-left text-xs">
                    <thead className="bg-[var(--bg-panel)] border-b border-[var(--border)] text-[var(--text-muted)] font-bold uppercase text-[10px]">
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
                    <tbody className="divide-y divide-[var(--border)]">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-10 text-center text-[var(--text-muted)]">Tidak ada transaksi yang cocok dengan filter atau pencarian Anda.</td>
                        </tr>
                      ) : (
                        paginatedOrders.map((o, index) => {
                          const rowNum = (ordersCurrentPage - 1) * ordersPageSize + index + 1;
                          const profit = Number(o.gross_profit || 0);
                          return (
                            <tr key={o.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                              <td className="p-3.5 font-mono text-[var(--text-muted)]">{rowNum}</td>
                              <td className="p-3.5">
                                <span className="font-mono font-bold text-[var(--accent-soft)] block">{o.invoice_number}</span>
                                <span className="text-[10px] text-[var(--text-muted)] block">{new Date(o.created_at).toLocaleString('id-ID')}</span>
                              </td>
                              <td className="p-3.5">
                                <span className="font-bold text-[var(--text)] block">{o.customer_name}</span>
                                <span className="text-[10px] text-[var(--text-muted)] font-mono">{o.customer_phone}</span>
                              </td>
                              <td className="p-3.5 font-medium">{o.payment_method || 'QRIS Instant'}</td>
                              <td className="p-3.5 font-mono font-bold text-[var(--success)]">{formatPrice(o.total_amount)}</td>
                              <td className="p-3.5 font-mono text-[var(--danger)]">{formatPrice(o.total_cost || 0)}</td>
                              <td className="p-3.5 font-mono font-bold text-[var(--accent-soft)]">+{formatPrice(profit)}</td>
                              <td className="p-3.5">
                                <div className="space-y-1">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                    o.order_status === 'delivered' || o.order_status === 'success' ? 'bg-[var(--success-bg)] text-[var(--success)]' :
                                    o.order_status === 'waiting_verification' ? 'bg-[var(--warn-bg)] text-[var(--warn)]' :
                                    'bg-[var(--info-bg)] text-[var(--accent-soft)]'
                                  }`}>
                                    {o.order_status}
                                  </span>
                                  <span className={`block px-2 py-0.5 rounded text-[9px] font-bold ${
                                    o.payment_status === 'paid' || o.payment_status === 'verified' ? 'bg-[var(--success-bg)] text-[var(--success)]' : 'bg-[var(--danger-bg)] text-[var(--danger)]'
                                  }`}>
                                    Pay: {o.payment_status}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => setSelectedOrderDetail(o)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--info-bg)] hover:bg-[#1677FF] text-[var(--accent-soft)] hover:text-white border border-[#1677FF]/40 text-xs font-bold transition-all shadow-sm"
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
                  <h3 className="font-extrabold text-base text-[var(--text)]">Riwayat Transaksi &amp; Laporan Keuntungan</h3>
                  <span className="text-xs text-[var(--text-muted)]">Menampilkan rincian pesanan, modal supplier, dan analisis keuntungan bersih</span>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="px-3.5 py-2.5 rounded-xl bg-[var(--bg-nested)] hover:bg-[var(--bg-hover)] text-[var(--accent-soft)] border border-[var(--border)] font-bold text-xs shadow-sm flex items-center gap-2 transition-all"
                  >
                    <span>📥 Export CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="px-3.5 py-2.5 rounded-xl bg-[var(--bg-nested)] hover:bg-[var(--bg-hover)] text-[var(--success)] border border-[var(--border)] font-bold text-xs shadow-sm flex items-center gap-2 transition-all"
                  >
                    <span>📊 Export Excel</span>
                  </button>
                </div>
              </div>

              {/* Financial Stats Cards (Top) */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] space-y-1">
                  <span className="text-[11px] text-[var(--text-muted)] font-medium block">Total Transaksi</span>
                  <span className="text-xl font-black text-[var(--text)] font-mono">{orderStats.totalTransactions}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] space-y-1">
                  <span className="text-[11px] text-[var(--text-muted)] font-medium block">Total Omzet (Penjualan)</span>
                  <span className="text-xl font-black text-[var(--success)] font-mono">{formatPrice(orderStats.totalRevenue)}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] space-y-1">
                  <span className="text-[11px] text-[var(--text-muted)] font-medium block">Total Modal Supplier</span>
                  <span className="text-xl font-black text-[var(--danger)] font-mono">{formatPrice(orderStats.totalCost)}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] space-y-1">
                  <span className="text-[11px] text-[var(--text-muted)] font-medium block">Keuntungan Kotor</span>
                  <span className="text-xl font-black text-[var(--accent-soft)] font-mono">+{formatPrice(orderStats.grossProfit)}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] space-y-1">
                  <span className="text-[11px] text-[var(--text-muted)] font-medium block">Keuntungan Bersih (Net)</span>
                  <span className="text-xl font-black text-[var(--success)] font-mono">+{formatPrice(orderStats.netProfit)}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] space-y-1">
                  <span className="text-[11px] text-[var(--text-muted)] font-medium block">Pending</span>
                  <span className="text-xl font-black text-[var(--warn)] font-mono">{orderStats.pendingCount}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] space-y-1">
                  <span className="text-[11px] text-[var(--text-muted)] font-medium block">Berhasil (Success)</span>
                  <span className="text-xl font-black text-[var(--success)] font-mono">{orderStats.successCount}</span>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] space-y-1">
                  <span className="text-[11px] text-[var(--text-muted)] font-medium block">Gagal / Batal</span>
                  <span className="text-xl font-black text-[var(--danger)] font-mono">{orderStats.failedCount}</span>
                </div>
              </div>

              {/* Filters Toolbar */}
              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={orderSearchQuery}
                    onChange={(e) => { setOrderSearchQuery(e.target.value); setOrdersCurrentPage(1); }}
                    placeholder="Cari invoice, nama pelanggan, atau nomor kontak..."
                    className="w-full pl-9 pr-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-xs text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#2583F7]"
                  />
                  <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
                </div>

                {/* Date Range Filter */}
                <select
                  value={orderDateRange}
                  onChange={(e) => { setOrderDateRange(e.target.value); setOrdersCurrentPage(1); }}
                  className="px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-xs text-[var(--text)] focus:outline-none focus:border-[#2583F7]"
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
                  className="px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-xs text-[var(--text)] focus:outline-none focus:border-[#2583F7]"
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
                  className="px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-xs text-[var(--text)] focus:outline-none focus:border-[#2583F7]"
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
                  className="px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-xs text-[var(--text)] focus:outline-none focus:border-[#2583F7]"
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
                    className="px-3 py-2 text-xs font-bold text-[var(--accent-soft)] hover:underline"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              {/* Transactions & Profit Audit Table */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-card">
                <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--bg-panel)] border-b border-[var(--border)] text-[var(--text-muted)] font-bold uppercase text-[10px]">
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
                    <tbody className="divide-y divide-[var(--border)]">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-10 text-center text-[var(--text-muted)]">Tidak ada transaksi yang cocok dengan filter atau pencarian Anda.</td>
                        </tr>
                      ) : (
                        paginatedOrders.map((o, index) => {
                          const rowNum = (ordersCurrentPage - 1) * ordersPageSize + index + 1;
                          const profit = Number(o.gross_profit || 0);
                          return (
                            <tr key={o.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                              <td className="p-3.5 font-mono text-[var(--text-muted)]">{rowNum}</td>
                              <td className="p-3.5">
                                <span className="font-mono font-bold text-[var(--accent-soft)] block">{o.invoice_number}</span>
                                <span className="text-[10px] text-[var(--text-muted)] block">{new Date(o.created_at).toLocaleString('id-ID')}</span>
                              </td>
                              <td className="p-3.5">
                                <span className="font-bold text-[var(--text)] block">{o.customer_name}</span>
                                <span className="text-[10px] text-[var(--text-muted)] font-mono">{o.customer_phone}</span>
                              </td>
                              <td className="p-3.5 font-medium">{o.payment_method || 'QRIS Instant'}</td>
                              <td className="p-3.5 font-mono font-bold text-[var(--success)]">{formatPrice(o.total_amount)}</td>
                              <td className="p-3.5 font-mono text-[var(--danger)]">{formatPrice(o.total_cost || 0)}</td>
                              <td className="p-3.5 font-mono font-bold text-[var(--accent-soft)]">+{formatPrice(profit)}</td>
                              <td className="p-3.5">
                                <div className="space-y-1">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                    o.order_status === 'delivered' || o.order_status === 'success' ? 'bg-[var(--success-bg)] text-[var(--success)]' :
                                    o.order_status === 'waiting_verification' ? 'bg-[var(--warn-bg)] text-[var(--warn)]' :
                                    'bg-[var(--info-bg)] text-[var(--accent-soft)]'
                                  }`}>
                                    {o.order_status}
                                  </span>
                                  <span className={`block px-2 py-0.5 rounded text-[9px] font-bold ${
                                    o.payment_status === 'paid' || o.payment_status === 'verified' ? 'bg-[var(--success-bg)] text-[var(--success)]' : 'bg-[var(--danger-bg)] text-[var(--danger)]'
                                  }`}>
                                    Pay: {o.payment_status}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => setSelectedOrderDetail(o)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--info-bg)] hover:bg-[#1677FF] text-[var(--accent-soft)] hover:text-white border border-[#1677FF]/40 text-xs font-bold transition-all shadow-sm"
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
                  <h3 className="font-bold text-sm text-[var(--text)]">Audit Request API &amp; Health Monitoring</h3>
                  <p className="text-xs text-[var(--text-muted)]">Setiap request HTTP ke seller dicatat dengan durasi dan response code aman.</p>
                </div>
                <button
                  type="button"
                  onClick={loadAllData}
                  className="px-3 py-1.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-xs font-bold text-[var(--accent-soft)]"
                >
                  Refresh Log
                </button>
              </div>

              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-card">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--bg-panel)] border-b border-[var(--border)] text-[var(--text-muted)] font-bold uppercase text-[10px]">
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
                  <tbody className="divide-y divide-[var(--border)] font-mono text-[11px]">
                    {logs.map(log => (
                      <tr key={log.id} className="hover:bg-[var(--bg-hover)]">
                        <td className="p-3.5 text-[var(--text-muted)]">{new Date(log.created_at).toLocaleTimeString()}</td>
                        <td className="p-3.5 font-bold text-[var(--accent-soft)]">{log.seller_name}</td>
                        <td className="p-3.5 truncate max-w-xs">{log.request_method} {log.request_url}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.is_success ? 'bg-[var(--success-bg)] text-[var(--success)]' : 'bg-[var(--danger-bg)] text-[var(--danger)]'
                          }`}>
                            {log.http_status || (log.is_success ? 200 : 500)}
                          </span>
                        </td>
                        <td className="p-3.5 text-[var(--text-muted)]">{log.duration_ms}ms</td>
                        <td className="p-3.5 text-[var(--text-muted)] truncate max-w-xs">{log.response_summary || log.error_message}</td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedLogDetail(log)}
                            className="p-1 rounded bg-[var(--bg-nested)] hover:bg-[#2583F7] text-[var(--text-muted)] hover:text-white"
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
              <form onSubmit={handleChangeAdminPassword} className="p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl space-y-4">
                <div>
                  <h3 className="font-bold text-base text-[var(--text)]">Profil Administrator</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Email admin tetap dan hanya password yang dapat diperbarui.</p>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[var(--text-muted)] font-semibold block mb-1">Email Admin</label>
                    <input
                      type="email"
                      value="androidstore279@gmail.com"
                      readOnly
                      className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text-muted)] cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-[var(--text-muted)] font-semibold block mb-1">Password Lama</label>
                    <div className="relative">
                      <input
                        type={visibleProfilePasswords.current ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={profilePasswordForm.current_password}
                        onChange={(event) => setProfilePasswordForm({ ...profilePasswordForm, current_password: event.target.value })}
                        className="w-full px-3 pr-10 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                      />
                      <button
                        type="button"
                        onClick={() => setVisibleProfilePasswords((visible) => ({ ...visible, current: !visible.current }))}
                        className="absolute right-3 top-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                        aria-label={visibleProfilePasswords.current ? 'Hide current password' : 'Show current password'}
                      >
                        {visibleProfilePasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[var(--text-muted)] font-semibold block mb-1">Password Baru</label>
                    <div className="relative">
                      <input
                        type={visibleProfilePasswords.next ? 'text' : 'password'}
                        required
                        minLength={12}
                        autoComplete="new-password"
                        value={profilePasswordForm.new_password}
                        onChange={(event) => setProfilePasswordForm({ ...profilePasswordForm, new_password: event.target.value })}
                        className="w-full px-3 pr-10 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                      />
                      <button
                        type="button"
                        onClick={() => setVisibleProfilePasswords((visible) => ({ ...visible, next: !visible.next }))}
                        className="absolute right-3 top-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                        aria-label={visibleProfilePasswords.next ? 'Hide new password' : 'Show new password'}
                      >
                        {visibleProfilePasswords.next ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Minimal 12 karakter.</span>
                  </div>
                  <div>
                    <label className="text-[var(--text-muted)] font-semibold block mb-1">Konfirmasi Password Baru</label>
                    <div className="relative">
                      <input
                        type={visibleProfilePasswords.confirmation ? 'text' : 'password'}
                        required
                        minLength={12}
                        autoComplete="new-password"
                        value={profilePasswordForm.confirm_password}
                        onChange={(event) => setProfilePasswordForm({ ...profilePasswordForm, confirm_password: event.target.value })}
                        className="w-full px-3 pr-10 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                      />
                      <button
                        type="button"
                        onClick={() => setVisibleProfilePasswords((visible) => ({ ...visible, confirmation: !visible.confirmation }))}
                        className="absolute right-3 top-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
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

              <div className="p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl space-y-4">
                <h3 className="font-bold text-base text-[var(--text)]">Konfigurasi Toko &amp; Integrasi CS</h3>
                
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[var(--text-muted)] font-semibold block mb-1">Nama Toko Online</label>
                    <input
                      type="text"
                      value={settings.store_name || ''}
                      onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                    />
                  </div>

                  <div>
                    <label className="text-[var(--text-muted)] font-semibold block mb-1">Nomor WhatsApp Resmi Admin</label>
                    <input
                      type="text"
                      value={settings.whatsapp_number || ''}
                      onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                    />
                  </div>

                  <div>
                    <label className="text-[var(--text-muted)] font-semibold block mb-1">Default Markup Impor Produk</label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {[
                        { id: 'percent', label: 'Markup %' },
                        { id: 'nominal', label: 'Markup Rp' },
                      ].map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSettings({ ...settings, default_markup_mode: m.id })}
                          className={`py-2 rounded-xl border font-bold text-xs ${
                            (settings.default_markup_mode || 'percent') === m.id ? 'bg-[#2583F7] text-white border-[#2583F7]' : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-muted)]'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      value={(settings.default_markup_mode || 'percent') === 'percent' ? (settings.default_markup_percent || 25) : (settings.default_markup_nominal || 25000)}
                      onChange={(e) => (settings.default_markup_mode || 'percent') === 'percent'
                        ? setSettings({ ...settings, default_markup_percent: e.target.value })
                        : setSettings({ ...settings, default_markup_nominal: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                    />
                    <p className="text-[11px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                      {(() => {
                        const costs = masterProducts.map(p => Number(p.cost_price || 0)).filter(c => c > 0);
                        if (!costs.length) return 'Berlaku untuk semua produk yang diimpor setelah pengaturan disimpan.';
                        const avg = Math.round(costs.reduce((a, b) => a + b, 0) / costs.length);
                        if ((settings.default_markup_mode || 'percent') === 'percent') {
                          const pct = Number(settings.default_markup_percent || 25);
                          const profit = Math.round((avg * pct) / 100 / 500) * 500;
                          const pctFor25k = Math.max(1, Math.round((25000 / avg) * 100));
                          return `Modal rata-rata ${formatPrice(avg)} → untung ${formatPrice(profit)} / produk. Untuk untung Rp25.000, atur sekitar ${pctFor25k}%.`;
                        }
                        const nominal = Number(settings.default_markup_nominal || 25000);
                        const eqPct = Math.round((nominal / avg) * 100);
                        return `Harga jual = modal + ${formatPrice(nominal)} / produk (≈ ${eqPct}% dari modal rata-rata ${formatPrice(avg)}). Berlaku untuk semua produk yang diimpor setelah pengaturan disimpan.`;
                      })()}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/admin/settings', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(settings)
                      });
                      const data = await res.json().catch(() => null);
                      if (!res.ok || !data?.success) {
                        throw new Error(data?.message || 'Server menolak permintaan.');
                      }
                      showNotification('success', 'Pengaturan berhasil disimpan!');
                    } catch (e) {
                      showNotification('error', `Gagal menyimpan pengaturan: ${(e as Error).message}`);
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
          <div className="w-full max-w-lg bg-[var(--bg-panel)] border border-[var(--border)] rounded-2xl shadow-modal overflow-hidden text-xs text-[var(--text)]">
            <div className="px-5 py-4 bg-[var(--bg-panel)] border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingSeller.id ? 'Edit Konfigurasi Seller' : 'Tambah Seller / Supplier Baru'}
              </h3>
              <button type="button" onClick={() => setIsSellerModalOpen(false)}>
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>

            <form onSubmit={handleSaveSeller} className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Nama Seller</label>
                <input
                  type="text"
                  required
                  value={editingSeller.name || ''}
                  onChange={(e) => setEditingSeller({ ...editingSeller, name: e.target.value })}
                  placeholder="Contoh: Seller 3 Telegram API"
                  className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                />
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Base URL API Endpoint</label>
                <input
                  type="url"
                  required
                  value={editingSeller.base_url || ''}
                  onChange={(e) => setEditingSeller({ ...editingSeller, base_url: e.target.value })}
                  placeholder="https://api.supplier.com/v1"
                  className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Metode Autentikasi</label>
                  <select
                    value={editingSeller.auth_type || 'header'}
                    onChange={(e) => setEditingSeller({ ...editingSeller, auth_type: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                  >
                    <option value="header">Custom HTTP Header</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="query">Query Parameter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Nama Header Key</label>
                  <input
                    type="text"
                    value={editingSeller.auth_header_key || 'x-api-key'}
                    onChange={(e) => setEditingSeller({ ...editingSeller, auth_header_key: e.target.value })}
                    placeholder="x-api-key"
                    className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">
                  API Key / Token Rahasia <span className="text-[var(--success)] text-[10px]">(Terenkripsi AES-256)</span>
                </label>
                <input
                  type="password"
                  value={editingSeller.api_key || ''}
                  onChange={(e) => setEditingSeller({ ...editingSeller, api_key: e.target.value })}
                  placeholder={editingSeller.id ? '(Biarkan kosong jika tidak diubah)' : 'Masukkan API Key Anda'}
                  className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Endpoint Produk</label>
                  <input
                    type="text"
                    value={editingSeller.endpoint_products || '/products'}
                    onChange={(e) => setEditingSeller({ ...editingSeller, endpoint_products: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Endpoint Order</label>
                  <input
                    type="text"
                    value={editingSeller.endpoint_order || '/order'}
                    onChange={(e) => setEditingSeller({ ...editingSeller, endpoint_order: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsSellerModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-card)] text-[var(--text-muted)]"
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
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--bg-panel)] border border-[var(--border)] rounded-2xl shadow-modal p-5 text-xs text-[var(--text)] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-sm">Pengaturan Harga: {editingProductPrice.name}</h3>
              <button type="button" onClick={() => setIsPricingModalOpen(false)}>
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>

            <form onSubmit={handleSavePrice} className="space-y-3.5">
              <div className="p-3 bg-[var(--bg-nested)] rounded-xl border border-[var(--border)] flex justify-between font-mono">
                <span className="text-[var(--text-muted)]">Harga Modal Supplier:</span>
                <span className="text-[var(--accent-soft)] font-bold">{formatPrice(editingProductPrice.cost_price)}</span>
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Metode Markup</label>
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
                        markupType === m.id ? 'bg-[#2583F7] text-white border-[#2583F7]' : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-muted)]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {markupType !== 'manual' && (
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">
                    Nilai Markup {markupType === 'percent' ? '(%)' : '(Rp)'}
                  </label>
                  <input
                    type="number"
                    value={markupVal}
                    onChange={(e) => setMarkupVal(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                  />
                </div>
              )}

              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Harga Jual Akhir Androidstore</label>
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
                  className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--success)] font-bold font-mono text-sm"
                />
              </div>

              {/* Varian Produk: Tipe Akun · Varian · Durasi */}
              <div className="pt-3 border-t border-[var(--border)]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">Varian Produk</span>
                  <button
                    type="button"
                    onClick={addVariant}
                    className="px-3 py-1.5 rounded-lg bg-[#2583F7] hover:bg-[#1D4ED8] text-white font-bold text-[11px]"
                  >
                    + Tambah Varian
                  </button>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mb-2 leading-relaxed">
                  Satu varian = satu kombinasi nama, tipe akun, dan durasi — masing-masing dengan harga jual, modal, dan stok sendiri. Pembeli memilih ketiganya di halaman produk.
                </p>
                {(editingProductPrice.variants || []).map((v, idx) => (
                  <div key={v.id} className="p-2.5 bg-[var(--bg-nested)] rounded-xl border border-[var(--border)] space-y-2 mb-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-[var(--text-muted)] mb-0.5 font-semibold">Nama Varian</label>
                        <input
                          type="text"
                          value={v.name}
                          placeholder="Plus / Go / Invite"
                          onChange={(e) => updateVariantField(idx, { name: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text)]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[var(--text-muted)] mb-0.5 font-semibold">Tipe Akun</label>
                        <select
                          value={v.account_type}
                          onChange={(e) => updateVariantField(idx, { account_type: e.target.value as 'private' | 'share' })}
                          className="w-full px-2.5 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text)]"
                        >
                          <option value="private">Private</option>
                          <option value="share">Shared</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-[var(--text-muted)] mb-0.5 font-semibold">Durasi</label>
                        <input
                          type="text"
                          value={v.duration}
                          placeholder="Semua / 1 bulan / 3 bulan"
                          onChange={(e) => updateVariantField(idx, { duration: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text)]"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-[var(--text-muted)] mb-0.5 font-semibold">Harga Jual (Rp)</label>
                        <input
                          type="number"
                          value={v.selling_price}
                          onChange={(e) => updateVariantField(idx, { selling_price: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text)] font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[var(--text-muted)] mb-0.5 font-semibold">Harga Modal (Rp)</label>
                        <input
                          type="number"
                          value={v.cost_price}
                          onChange={(e) => updateVariantField(idx, { cost_price: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text)] font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[var(--text-muted)] mb-0.5 font-semibold">Stok</label>
                        <input
                          type="number"
                          value={v.stock}
                          onChange={(e) => updateVariantField(idx, { stock: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text)] font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-[var(--text-muted)] mb-0.5 font-semibold">Gambar Varian (URL) — kosong = pakai gambar utama produk</label>
                      <div className="flex items-center gap-2">
                        {v.image ? (
                          <img src={v.image} alt="" className="w-9 h-9 rounded-lg object-cover border border-[var(--border)] shrink-0" />
                        ) : null}
                        <input
                          type="text"
                          value={v.image || ''}
                          placeholder="https://... (gambar ChatGPT Go / Plus)"
                          onChange={(e) => updateVariantField(idx, { image: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text)]"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={v.is_active === 1}
                          onChange={(e) => updateVariantField(idx, { is_active: e.target.checked ? 1 : 0 })}
                          className="rounded"
                        />
                        Aktif (tampil di toko)
                      </label>
                      <button
                        type="button"
                        onClick={() => removeVariant(idx)}
                        className="text-[var(--danger)] text-[11px] font-bold hover:underline"
                      >
                        Hapus varian
                      </button>
                    </div>
                  </div>
                ))}
                {(editingProductPrice.variants || []).length === 0 && (
                  <p className="text-[11px] text-[var(--text-muted)]">Belum ada varian — produk dijual dengan satu harga di atas.</p>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button type="button" onClick={() => setIsPricingModalOpen(false)} className="px-4 py-2 rounded-xl bg-[var(--bg-card)] text-[var(--text-muted)]">
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
      {/* MODAL: EDIT DESKRIPSI & SYARAT KETENTUAN                  */}
      {/* ========================================================= */}
      {isContentModalOpen && editingProductContent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--bg-panel)] border border-[var(--border)] rounded-2xl shadow-modal p-5 text-xs text-[var(--text)] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-sm">Deskripsi & S&K: {editingProductContent.name}</h3>
              <button type="button" onClick={() => setIsContentModalOpen(false)}>
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>

            <form onSubmit={handleSaveContent} className="space-y-3.5">
              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Deskripsi (tab DESKRIPSI di toko)</label>
                <textarea
                  rows={7}
                  value={editingProductContent.description || ''}
                  onChange={(e) => setEditingProductContent({ ...editingProductContent, description: e.target.value })}
                  placeholder="Tulis deskripsi layanan, misal: Akun Private & Bergaransi. Durasi langsung 1 bulan. Stok terbatas."
                  className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                />
                <p className="text-[11px] text-[var(--text-muted)] mt-1">Tampil di tab DESKRIPSI pada halaman detail produk. Enter = baris baru.</p>
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Syarat & Ketentuan (tab S & K di toko)</label>
                <textarea
                  rows={7}
                  value={editingProductContent.terms || ''}
                  onChange={(e) => setEditingProductContent({ ...editingProductContent, terms: e.target.value })}
                  placeholder="Tulis syarat & ketentuan, misal: Garansi berlaku 25 hari. Dilarang mengubah email/password utama."
                  className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                />
                <p className="text-[11px] text-[var(--text-muted)] mt-1">Tampil di tab S &amp; K pada halaman detail produk. Kosongkan untuk memakai ketentuan standar toko.</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button type="button" onClick={() => setIsContentModalOpen(false)} className="px-4 py-2 rounded-xl bg-[var(--bg-card)] text-[var(--text-muted)]">
                  Batal
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-[#2583F7] hover:bg-[#1D4ED8] text-white font-bold">
                  Simpan Deskripsi & S&K
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ULASAN & TESTIMONI                                */}
      {/* ========================================================= */}
      {isReviewModalOpen && editingProductReviews && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--bg-panel)] border border-[var(--border)] rounded-2xl shadow-modal p-5 text-xs text-[var(--text)] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-sm">Ulasan & Testimoni: {editingProductReviews.name}</h3>
              <button type="button" onClick={() => setIsReviewModalOpen(false)}>
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>

            <form onSubmit={handleSaveReviews} className="space-y-3.5">
              <p className="text-[11px] text-[var(--text-muted)]">Ulasan diisi admin dan tampil di halaman detail produk (bagian Ulasan). Foto diisi berupa link gambar (URL).</p>

              {(editingProductReviews.reviews || []).map((rv, idx) => (
                <div key={rv.id || idx} className="p-3 rounded-xl bg-[var(--bg-nested)] border border-[var(--border)] space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      value={rv.name}
                      onChange={(e) => updateReviewField(idx, 'name', e.target.value)}
                      placeholder="Nama pembeli (misal: Budi)"
                      className="flex-1 min-w-0 px-2.5 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text)] font-semibold"
                    />
                    <button type="button" onClick={() => removeReview(idx)} className="text-[var(--danger)] text-[11px] font-bold hover:underline shrink-0">
                      Hapus
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[var(--text-muted)] font-semibold mr-1">Bintang:</span>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => updateReviewField(idx, 'rating', n)}
                        className="p-0.5"
                        title={`${n} bintang`}
                      >
                        <Star className={`w-4 h-4 ${n <= (rv.rating || 5) ? 'text-amber-400 fill-amber-400' : 'text-[var(--text-muted)]'}`} />
                      </button>
                    ))}
                    <span className="text-[11px] text-[var(--text-muted)] ml-1">{rv.rating || 5}/5</span>
                  </div>

                  <textarea
                    rows={2}
                    value={rv.text}
                    onChange={(e) => updateReviewField(idx, 'text', e.target.value)}
                    placeholder="Isi ulasan / testimoni"
                    className="w-full px-2.5 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text)]"
                  />

                  <input
                    value={rv.photo || ''}
                    onChange={(e) => updateReviewField(idx, 'photo', e.target.value)}
                    placeholder="Link foto (URL gambar, opsional)"
                    className="w-full px-2.5 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text)]"
                  />
                  {rv.photo ? (
                    <img src={rv.photo} alt="" className="w-12 h-12 rounded-lg object-cover border border-[var(--border)]" />
                  ) : null}
                </div>
              ))}

              {(editingProductReviews.reviews || []).length === 0 && (
                <p className="text-[11px] text-[var(--text-muted)]">Belum ada ulasan — tambahkan testimoni pertama.</p>
              )}

              <button
                type="button"
                onClick={addReview}
                className="w-full py-2 rounded-xl border border-dashed border-[var(--border)] text-[var(--text-muted)] font-bold hover:border-[#2583F7] hover:text-[#2583F7]"
              >
                + Tambah Ulasan
              </button>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button type="button" onClick={() => setIsReviewModalOpen(false)} className="px-4 py-2 rounded-xl bg-[var(--bg-card)] text-[var(--text-muted)]">
                  Batal
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-[#2583F7] hover:bg-[#1D4ED8] text-white font-bold">
                  Simpan Ulasan
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
          <div className="w-full max-w-md bg-[var(--bg-panel)] border border-[var(--border)] rounded-2xl shadow-modal p-5 text-xs text-[var(--text)] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-sm">Ganti Gambar: {editingProductImage.name}</h3>
              <button type="button" onClick={() => setIsImageModalOpen(false)}>
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>

            <form onSubmit={handleSaveImage} className="space-y-4">
              {/* Preview Box */}
              <div className="aspect-[16/10] bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl overflow-hidden flex items-center justify-center">
                <img
                  src={imagePreview || imageUrlInput || editingProductImage.custom_image_url || '/assets/default_produk.png'}
                  alt=""
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Metode 1: Upload File */}
              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">METODE 1 — Upload File (JPG, PNG, WEBP, SVG)</label>
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
                  className="w-full text-xs text-[var(--text-muted)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#2583F7] file:text-white hover:file:bg-[#1D4ED8]"
                />
              </div>

              {/* Metode 2: Link URL */}
              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">METODE 2 — Link URL Gambar Eksternal</label>
                <input
                  type="url"
                  value={imageUrlInput}
                  onChange={(e) => {
                    setImageUrlInput(e.target.value);
                    setImageFile(null);
                    setImagePreview(e.target.value);
                  }}
                  placeholder="https://domain.com/gambar-produk.jpg"
                  className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button type="button" onClick={() => setIsImageModalOpen(false)} className="px-4 py-2 rounded-xl bg-[var(--bg-card)] text-[var(--text-muted)]">
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
          <div className="w-full max-w-lg bg-[var(--bg-panel)] border border-[var(--border)] rounded-2xl shadow-modal p-5 text-xs text-[var(--text)] space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <span className="font-bold text-sm text-[var(--accent-soft)]">Log #{selectedLogDetail.id} - {selectedLogDetail.seller_name}</span>
              <button type="button" onClick={() => setSelectedLogDetail(null)}>
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div><strong className="text-[var(--text-muted)]">URL:</strong> {selectedLogDetail.request_method} {selectedLogDetail.request_url}</div>
              <div><strong className="text-[var(--text-muted)]">HTTP Status:</strong> {selectedLogDetail.http_status}</div>
              <div><strong className="text-[var(--text-muted)]">Durasi:</strong> {selectedLogDetail.duration_ms}ms</div>
              <div><strong className="text-[var(--text-muted)]">Waktu:</strong> {new Date(selectedLogDetail.created_at).toLocaleString('id-ID')}</div>
              <div><strong className="text-[var(--text-muted)]">Hasil Respons:</strong></div>
              <div className="p-3 bg-[var(--bg-nested)] rounded-xl border border-[var(--border)] text-[var(--success)] whitespace-pre-wrap">
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
          <div className="w-full max-w-xl bg-[var(--bg-panel)] border border-[var(--border)] rounded-2xl shadow-modal overflow-hidden text-xs text-[var(--text)]">
            <div className="px-5 py-4 bg-[var(--bg-panel)] border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[var(--accent-soft)]">Verifikasi Bukti Transfer</h3>
                <span className="text-[10px] text-[var(--text-muted)]">Invoice: #{selectedOrderProof.invoice_number}</span>
              </div>
              <button type="button" onClick={() => setSelectedOrderProof(null)}>
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl">
                <div>
                  <span className="text-[var(--text-muted)] block text-[10px]">Pelanggan:</span>
                  <span className="font-bold text-[var(--text)]">{selectedOrderProof.customer_name}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block text-[10px]">WhatsApp:</span>
                  <span className="font-bold text-[var(--accent-soft)]">{selectedOrderProof.customer_phone}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block text-[10px]">Total Tagihan:</span>
                  <span className="font-bold text-[var(--success)]">{formatPrice(selectedOrderProof.total_amount)}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block text-[10px]">Waktu Pesan:</span>
                  <span className="text-[var(--text)]">{new Date(selectedOrderProof.created_at).toLocaleString('id-ID')}</span>
                </div>
              </div>

              {selectedOrderProof.customer_notes && (
                <div className="p-2.5 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] text-[var(--text-muted)] break-all whitespace-pre-wrap">
                  <strong className="text-[var(--text)]">Catatan:</strong> {selectedOrderProof.customer_notes}
                </div>
              )}

              {/* High-res Image Preview */}
              <div
                className="relative aspect-video w-full bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl overflow-hidden flex items-center justify-center p-2 cursor-zoom-in group"
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

              <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/admin/orders/${selectedOrderProof.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ payment_status: 'paid', order_status: 'processing' })
                        });
                        const data = await res.json().catch(() => null);
                        if (!res.ok || !data?.success || !data?.data) {
                          throw new Error(data?.message || 'Server menolak permintaan.');
                        }
                        showNotification('success', `Pembayaran untuk #${selectedOrderProof.invoice_number} disetujui!`);
                        setSelectedOrderProof(null);
                        loadAllData();
                      } catch (e) {
                        showNotification('error', `Gagal menyetujui pembayaran: ${(e as Error).message}`);
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
                        const res = await fetch(`/api/admin/orders/${selectedOrderProof.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ payment_status: 'rejected', order_status: 'rejected' })
                        });
                        const data = await res.json().catch(() => null);
                        if (!res.ok || !data?.success || !data?.data) {
                          throw new Error(data?.message || 'Server menolak permintaan.');
                        }
                        showNotification('error', `Pembayaran untuk #${selectedOrderProof.invoice_number} ditolak.`);
                        setSelectedOrderProof(null);
                        loadAllData();
                      } catch (e) {
                        showNotification('error', `Gagal menolak pembayaran: ${(e as Error).message}`);
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-[var(--danger-bg)] hover:opacity-80 text-[var(--danger)] font-bold border border-[var(--danger-border)] text-xs"
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
                    className="px-4 py-2 rounded-xl bg-[var(--bg-card)] text-[var(--text-muted)] text-xs font-bold"
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
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-[var(--bg-card)] text-[var(--text)] flex items-center justify-center border border-[var(--border)] hover:bg-[#2583F7] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div onClick={(event) => event.stopPropagation()} className="max-w-[95vw] max-h-[92vh] flex flex-col items-center gap-4">
            <span className="text-xs font-bold text-[var(--accent-soft)]">Bukti Transfer #{selectedOrderProof.invoice_number}</span>
            <img
              src={selectedOrderProof.payment_proof_url || '/assets/default_produk.png'}
              alt="Bukti Transfer diperbesar"
              className="max-w-[95vw] max-h-[78vh] object-contain rounded-xl bg-[var(--bg-nested)] border border-[var(--border)] p-2"
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
          <div className="w-full max-w-2xl bg-[var(--bg-panel)] border border-[var(--border)] rounded-2xl shadow-modal overflow-hidden text-xs text-[var(--text)] max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 bg-[var(--bg-nested)] border-b border-[var(--border)] flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-bold text-sm text-[var(--accent-soft)]">Detail Transaksi &amp; Audit Keuntungan</h3>
                <span className="text-[10px] text-[var(--text-muted)]">Invoice: #{selectedOrderDetail.invoice_number} | Tanggal: {new Date(selectedOrderDetail.created_at).toLocaleString('id-ID')}</span>
              </div>
              <button type="button" onClick={() => setSelectedOrderDetail(null)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl">
                <div><span className="text-[var(--text-muted)] block text-[10px]">Pelanggan</span><strong className="text-sm">{selectedOrderDetail.customer_name}</strong></div>
                <div><span className="text-[var(--text-muted)] block text-[10px]">Kontak</span><strong className="text-[var(--accent-soft)]">{selectedOrderDetail.customer_phone}</strong></div>
                <div><span className="text-[var(--text-muted)] block text-[10px]">Metode</span><strong>{selectedOrderDetail.payment_method || 'QRIS Instant'}</strong></div>
                <div><span className="text-[var(--text-muted)] block text-[10px]">Total Pembayaran</span><strong className="text-[var(--success)] text-sm">{formatPrice(selectedOrderDetail.total_amount)}</strong></div>
                <div><span className="text-[var(--text-muted)] block text-[10px]">Status Pembayaran</span><span className="px-2 py-0.5 rounded bg-[var(--info-bg)] text-[var(--accent-soft)] font-bold">{selectedOrderDetail.payment_status}</span></div>
                <div><span className="text-[var(--text-muted)] block text-[10px]">Status Order</span><span className="px-2 py-0.5 rounded bg-[var(--success-bg)] text-[var(--success)] font-bold">{selectedOrderDetail.order_status}</span></div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-[var(--text)]">Produk dan Jumlah (Rincian Item Supplier)</h4>
                {Array.isArray(selectedOrderDetail.products) && selectedOrderDetail.products.length > 0 ? (
                  selectedOrderDetail.products.map((item: Record<string, unknown>, index: number) => {
                    const itemKey = `${selectedOrderDetail.id}-${index}`;
                    const isRevealed = !!revealedFormatIndices[itemKey];
                    const formatText = String(item.format || item.description || 'email | kata sandi - Akun Pro Team pri');
                    return (
                      <div key={itemKey} className="p-3.5 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="w-full">
                            <span className="font-bold text-[var(--text)] text-sm block">{index + 1}. {cleanProductName(String(item.name || ''))}</span>
                            
                            <div className="mt-1.5 p-2.5 bg-[var(--info-bg)] rounded-xl border border-[#1677FF]/30 flex items-center justify-between gap-2">
                              <span className="text-[11px] text-[var(--accent-soft)] font-mono truncate">
                                Format: {isRevealed ? formatText : '••••••••••••••••••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleRevealFormat(itemKey)}
                                className="p-1.5 rounded-lg bg-[var(--bg-nested)] hover:bg-[#2583F7] text-[var(--accent-soft)] hover:text-white transition-colors flex-shrink-0 flex items-center gap-1 text-[10px] font-bold"
                                title={isRevealed ? 'Sembunyikan format' : 'Tampilkan format'}
                              >
                                {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-[var(--text-muted)]">
                              <span className="px-2 py-0.5 rounded bg-[var(--info-bg)] text-[var(--accent-soft)] font-semibold">Supplier: {String(item.supplier_name || item.provider || selectedOrderDetail.product_provider || '')}</span>
                              <span>ID Supplier: <strong className="font-mono text-[var(--text)]">{String(item.supplier_product_id || '-')}</strong></span>
                              <span>Qty: <strong className="text-[var(--success)]">x{Number(item.quantity || 1)}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-[var(--border)]/60 text-[11px] font-mono">
                          <div><span className="text-[var(--text-muted)] block text-[10px]">Harga Modal/unit</span>{formatPrice(Number(item.supplier_cost || 0))}</div>
                          <div><span className="text-[var(--text-muted)] block text-[10px]">Harga Jual/unit</span>{formatPrice(Number(item.customer_price || 0))}</div>
                          <div><span className="text-[var(--text-muted)] block text-[10px]">Subtotal Modal</span>{formatPrice(Number(item.subtotal_cost || 0))}</div>
                          <div><span className="text-[var(--text-muted)] block text-[10px]">Keuntungan</span><strong className="text-[var(--success)]">+{formatPrice(Number(item.profit || 0))}</strong></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  parseOrderProducts(selectedOrderDetail).map((item, index) => {
                    const fallbackKey = `fallback-${selectedOrderDetail.id}-${index}`;
                    const isRevealed = !!revealedFormatIndices[fallbackKey];
                    return (
                      <div key={fallbackKey} className="p-3.5 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold block text-sm">{cleanProductName(item.name)}</span>
                          <span className="text-[var(--accent-soft)] font-bold">x{item.quantity}</span>
                        </div>
                        <div className="p-2.5 bg-[var(--info-bg)] rounded-xl border border-[#1677FF]/30 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-[var(--accent-soft)] font-mono truncate">
                            Format: {isRevealed ? 'email | kata sandi - Akun Pro Team pri' : '••••••••••••••••••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleRevealFormat(fallbackKey)}
                            className="p-1.5 rounded-lg bg-[var(--bg-nested)] hover:bg-[#2583F7] text-[var(--accent-soft)] hover:text-white transition-colors flex-shrink-0 flex items-center gap-1 text-[10px] font-bold"
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] block">Supplier: {selectedOrderDetail.product_provider || 'Produk Manual'}</span>
                      </div>
                    );
                  })
                )}
              </div>

              {(selectedOrderDetail.delivery_email || selectedOrderDetail.delivery_password || selectedOrderDetail.delivered_credentials) && (
                <div className="p-3.5 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl space-y-2">
                  <h4 className="font-bold text-[var(--text)]">🔐 Data Akun Terkirim <span className="text-[10px] font-semibold text-[var(--success)]">(tersimpan — tidak bisa diubah/dihapus)</span></h4>
                  {selectedOrderDetail.delivery_email && (
                    <div className="flex justify-between gap-2 text-xs">
                      <span className="text-[var(--text-muted)]">Email Akun:</span>
                      <code className="font-mono text-[var(--text)] break-all text-right">{selectedOrderDetail.delivery_email}</code>
                    </div>
                  )}
                  {selectedOrderDetail.delivery_password && (
                    <div className="flex justify-between gap-2 text-xs items-center">
                      <span className="text-[var(--text-muted)]">Password Akun:</span>
                      <span className="flex items-center gap-2">
                        <code className="font-mono text-[var(--text)]">{revealedFormatIndices[`delivery-pw-${selectedOrderDetail.id}`] ? selectedOrderDetail.delivery_password : '••••••••'}</code>
                        <button
                          type="button"
                          onClick={() => toggleRevealFormat(`delivery-pw-${selectedOrderDetail.id}`)}
                          className="p-1 rounded-lg bg-[var(--bg-card)] text-[var(--accent-soft)] hover:text-white hover:bg-[#2583F7] transition-colors"
                          title="Tampilkan/sembunyikan password"
                        >
                          {revealedFormatIndices[`delivery-pw-${selectedOrderDetail.id}`] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </span>
                    </div>
                  )}
                  {!selectedOrderDetail.delivery_email && !selectedOrderDetail.delivery_password && selectedOrderDetail.delivered_credentials && (
                    <p className="text-[11px] text-[var(--text-muted)]">Belum ada email/password tersimpan (pesanan lama). Isi lewat tombol <strong className="text-[var(--text)]">Kirim</strong> di tabel pesanan.</p>
                  )}
                </div>
              )}

              {/* Financial Summary Calculation */}
              <div className="p-4 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl space-y-2.5">
                <h4 className="font-bold text-sm text-[var(--accent-soft)] border-b border-[var(--border)] pb-2">Ringkasan Keuangan Transaksi</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-[var(--text-muted)]">
                    <span>Total Pembayaran Pelanggan (Omzet)</span>
                    <strong className="font-mono text-[var(--text)]">{formatPrice(selectedOrderDetail.total_amount)}</strong>
                  </div>
                  <div className="flex justify-between text-[var(--text-muted)]">
                    <span>Total Modal Seluruh Supplier</span>
                    <strong className="font-mono text-[var(--danger)]">-{formatPrice(selectedOrderDetail.total_cost || 0)}</strong>
                  </div>
                  <div className="flex justify-between text-[var(--text-muted)] border-t border-[var(--border)]/60 pt-1.5 font-bold">
                    <span>Total Keuntungan Kotor</span>
                    <strong className="font-mono text-[var(--success)]">+{formatPrice(selectedOrderDetail.gross_profit || 0)}</strong>
                  </div>
                  <div className="flex justify-between text-[var(--text-muted)]">
                    <span>Biaya Tambahan Lainnya</span>
                    <strong className="font-mono text-[var(--warn)]">-{formatPrice(selectedOrderDetail.additional_fee || 0)}</strong>
                  </div>
                  <div className="flex justify-between text-sm font-black text-[var(--text)] border-t border-[var(--border)] pt-2">
                    <span className="text-[var(--success)]">KEUNTUNGAN BERSIH</span>
                    <span className="font-mono text-[var(--success)]">{netProfitNoGateway(selectedOrderDetail) >= 0 ? '+' : ''}{formatPrice(netProfitNoGateway(selectedOrderDetail))}</span>
                  </div>
                </div>
              </div>

              {selectedOrderDetail.customer_notes && (
                <div className="p-3 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text-muted)] break-all whitespace-pre-wrap">
                  <strong className="text-[var(--text)]">Catatan:</strong> {selectedOrderDetail.customer_notes}
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
          <div className="w-full max-w-lg bg-[var(--bg-panel)] border border-[var(--border)] rounded-2xl shadow-modal overflow-hidden text-xs text-[var(--text)]">
            <div className="px-5 py-4 bg-[var(--bg-panel)] border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[var(--success)]">Kirim Detail Pesanan ke Pembeli</h3>
                <span className="text-[10px] text-[var(--text-muted)]">Invoice: #{selectedOrderDelivery.invoice_number} | Telp: {selectedOrderDelivery.customer_phone}</span>
              </div>
              <button type="button" onClick={() => setSelectedOrderDelivery(null)}>
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {(selectedOrderDelivery.delivery_email || selectedOrderDelivery.delivery_password) && (
                <div className="p-2.5 rounded-xl bg-[var(--success-bg)] border border-[var(--success)]/30 text-[11px] text-[var(--success)] font-semibold">
                  🔒 Email &amp; password akun sudah tersimpan di database — tidak bisa diubah atau dihapus.
                </div>
              )}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold" htmlFor="delivery-email">Email Akun</label>
                  <input
                    type="email"
                    id="delivery-email"
                    defaultValue={selectedOrderDelivery.delivery_email || ''}
                    disabled={!!selectedOrderDelivery.delivery_email}
                    placeholder="email akun produk..."
                    className="w-full px-3 py-2.5 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[#2583F7] disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold" htmlFor="delivery-password">Password Akun</label>
                  <input
                    type="text"
                    id="delivery-password"
                    defaultValue={selectedOrderDelivery.delivery_password || ''}
                    disabled={!!selectedOrderDelivery.delivery_password}
                    placeholder="password akun produk..."
                    className="w-full px-3 py-2.5 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[#2583F7] disabled:opacity-60"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Pesan WhatsApp Manual untuk Pelanggan</label>
                <textarea
                  rows={6}
                  defaultValue={`Halo Kak ${selectedOrderDelivery.customer_name}, Terima kasih telah berbelanja di Androidstore.web.id! 🙌\nPesanan Anda dengan Invoice #${selectedOrderDelivery.invoice_number} telah kami verifikasi dan proses.\n\n📦 Detail Akun / Lisensi:\n[Isi email, password, atau link akses produk di sini...]\n\nSilakan login dan nikmati layanannya. Jika ada kendala, hubungi admin kami ya kak. Terima kasih!`}
                  id="whatsapp-delivery-message"
                  className="w-full p-3 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)] font-mono text-xs focus:outline-none focus:border-[#2583F7]"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={async () => {
                    const textarea = document.getElementById('whatsapp-delivery-message') as HTMLTextAreaElement;
                    const emailInput = document.getElementById('delivery-email') as HTMLInputElement;
                    const passwordInput = document.getElementById('delivery-password') as HTMLInputElement;
                    const deliveryEmail = emailInput?.value.trim() || '';
                    const deliveryPassword = passwordInput?.value.trim() || '';
                    let msg = textarea ? textarea.value : '';
                    const phone = selectedOrderDelivery.customer_phone;

                    // Masukkan email/password ke pesan bila placeholder masih ada.
                    if (msg.includes('[Isi email, password, atau link akses produk di sini...]')) {
                      const accountLines = `🔐 DATA AKUN / PRODUK:\nEmail/User: ${deliveryEmail || '-'}\nPassword: ${deliveryPassword || '-'}`;
                      msg = msg.replace('[Isi email, password, atau link akses produk di sini...]', accountLines);
                    }

                    try {
                      const res = await fetch(`/api/admin/orders/${selectedOrderDelivery.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          order_status: 'delivered',
                          payment_status: 'paid',
                          delivered_credentials: msg,
                          ...(selectedOrderDelivery.delivery_email ? {} : (deliveryEmail ? { delivery_email: deliveryEmail } : {})),
                          ...(selectedOrderDelivery.delivery_password ? {} : (deliveryPassword ? { delivery_password: deliveryPassword } : {}))
                        })
                      });
                      const data = await res.json().catch(() => null);
                      if (!res.ok || !data?.success) {
                        throw new Error(data?.message || 'Server menolak permintaan.');
                      }
                      showNotification('success', `Pesanan #${selectedOrderDelivery.invoice_number} ditandai Selesai (Delivered)!`);
                      setSelectedOrderDelivery(null);
                      loadAllData();
                      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                    } catch (e) {
                      showNotification('error', `Gagal memperbarui status pesanan: ${(e as Error).message}`);
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
                  className="px-4 py-2.5 rounded-xl bg-[var(--bg-card)] text-[var(--text-muted)]"
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
          <div className="w-full max-w-lg bg-[var(--bg-panel)] border border-[var(--border)] rounded-2xl shadow-modal overflow-hidden text-xs text-[var(--text)]">
            <div className="px-5 py-4 bg-[var(--bg-panel)] border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingSupplierProduct.id ? 'Edit Produk Supplier' : 'Tambah Produk Supplier Manual'}
              </h3>
              <button type="button" onClick={() => setIsSupplierProductModalOpen(false)}>
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplierProduct} className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Pilih Supplier / Seller</label>
                <select
                  value={isManualSeller ? 'manual' : String(editingSupplierProduct.seller_id || sellers[0]?.id || 1)}
                  onChange={(e) => {
                    if (e.target.value === 'manual') {
                      setIsManualSeller(true);
                    } else {
                      setIsManualSeller(false);
                      setEditingSupplierProduct({ ...editingSupplierProduct, seller_id: Number(e.target.value) });
                    }
                  }}
                  className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                >
                  {sellers.map(s => <option key={s.id} value={String(s.id)}>{s.name}{s.auth_type === 'manual' ? ' (Manual)' : ''}</option>)}
                  <option value="manual">Seller Manual (tanpa API) — tulis nama sendiri</option>
                </select>
                {isManualSeller && (
                  <input
                    type="text"
                    required
                    value={manualSellerName}
                    onChange={(e) => setManualSellerName(e.target.value)}
                    placeholder="Contoh: Toko Saya / Supplier Lokal"
                    className="w-full px-3 py-2 mt-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                  />
                )}
                {isManualSeller && (
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">Seller ini tidak punya API — produk hanya tersimpan manual dan tidak disinkronisasi.</p>
                )}
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Nama Produk</label>
                <input
                  type="text"
                  required
                  value={editingSupplierProduct.name || ''}
                  onChange={(e) => setEditingSupplierProduct({ ...editingSupplierProduct, name: e.target.value })}
                  placeholder="Contoh: Netflix Premium 1 Month"
                  className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Kategori (Dari Database / Seller API)</label>
                  <select
                    value={editingSupplierProduct.original_category || 'Voucher & Digital'}
                    onChange={(e) => setEditingSupplierProduct({ ...editingSupplierProduct, original_category: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                  >
                    {Array.from(new Set(['Voucher & Digital', 'Editing & Desain', 'AI & Edukasi', 'Streaming & Hiburan', ...supplierCategories])).map((cat: string) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Harga Modal (Rp)</label>
                  <input
                    type="number"
                    required
                    value={editingSupplierProduct.cost_price || 15000}
                    onChange={(e) => setEditingSupplierProduct({ ...editingSupplierProduct, cost_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Stok</label>
                  <input
                    type="number"
                    required
                    value={editingSupplierProduct.stock || 25}
                    onChange={(e) => setEditingSupplierProduct({ ...editingSupplierProduct, stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">External ID</label>
                  <input
                    type="text"
                    value={editingSupplierProduct.external_product_id || `manual_${Date.now()}`}
                    onChange={(e) => setEditingSupplierProduct({ ...editingSupplierProduct, external_product_id: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Deskripsi</label>
                <textarea
                  rows={3}
                  value={editingSupplierProduct.description || ''}
                  onChange={(e) => setEditingSupplierProduct({ ...editingSupplierProduct, description: e.target.value })}
                  placeholder="Deskripsi produk supplier..."
                  className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsSupplierProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-card)] text-[var(--text-muted)]"
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
          <div className="w-full max-w-md bg-[var(--bg-panel)] border border-[var(--border)] rounded-2xl shadow-modal p-5 text-xs text-[var(--text)] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-sm">Tambah Pesanan Manual</h3>
              <button type="button" onClick={() => setIsCreateOrderModalOpen(false)}>
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>

            <form onSubmit={handleCreateManualOrder} className="space-y-3">
              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Nama Pelanggan</label>
                <input
                  type="text"
                  required
                  value={newOrderForm.customer_name}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, customer_name: e.target.value })}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                />
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Nomor WhatsApp</label>
                <input
                  type="tel"
                  required
                  value={newOrderForm.customer_phone}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, customer_phone: e.target.value })}
                  placeholder="08123456789"
                  className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                />
              </div>

              <div className="relative">
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Nama Produk / Paket</label>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  value={newOrderForm.product_name}
                  onChange={(e) => {
                    setNewOrderForm({ ...newOrderForm, product_name: e.target.value });
                    setNewOrderProductId('');
                    setNewOrderVariantId('');
                    setNewOrderSuggestOpen(true);
                  }}
                  onFocus={() => setNewOrderSuggestOpen(true)}
                  onBlur={() => setTimeout(() => setNewOrderSuggestOpen(false), 150)}
                  placeholder="Ketik nama produk... (pilih dari saran)"
                  className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                />
                {newOrderSuggestOpen && newOrderSuggestions.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl shadow-modal">
                    {newOrderSuggestions.map(p => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setNewOrderProductId(String(p.id));
                            setNewOrderVariantId('');
                            setNewOrderForm({ ...newOrderForm, product_name: p.name, total_amount: p.selling_price });
                            setNewOrderSuggestOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-[var(--bg-hover)] flex items-center justify-between gap-2"
                        >
                          <span className="truncate">{cleanProductName(p.name)}</span>
                          <span className="font-mono text-[var(--success)] whitespace-nowrap">{formatPrice(p.selling_price)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {newOrderSuggestOpen && newOrderForm.product_name.trim() && newOrderSuggestions.length === 0 && (
                  <div className="absolute z-10 mt-1 w-full px-3 py-2 bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl shadow-modal text-[var(--text-muted)]">
                    Tidak ada di katalog — akan disimpan sebagai produk manual.
                  </div>
                )}
              </div>

              {newOrderSelectedProd && (newOrderSelectedProd.variants || []).filter(v => v.is_active).length > 0 && (
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Varian (Tipe Akun · Varian · Durasi)</label>
                  <select
                    value={newOrderVariantId}
                    onChange={(e) => {
                      const vid = e.target.value;
                      setNewOrderVariantId(vid);
                      const v = (newOrderSelectedProd.variants || []).find(v => String(v.id) === vid);
                      if (v) setNewOrderForm({ ...newOrderForm, total_amount: Number(v.selling_price || 0) });
                    }}
                    className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                  >
                    <option value="">— Pilih varian —</option>
                    {(newOrderSelectedProd.variants || []).filter(v => v.is_active).map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.account_type === 'private' ? 'Private' : 'Shared'}) — {v.duration} — {formatPrice(Number(v.selling_price || 0))}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Total Tagihan (Rp)</label>
                  <input
                    type="number"
                    required
                    value={newOrderForm.total_amount}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, total_amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Metode Pembayaran</label>
                  <input
                    type="text"
                    value={newOrderForm.payment_method}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Bukti Pembayaran (Opsional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files && e.target.files[0];
                    setNewOrderProofFile(f || null);
                    if (f) {
                      const reader = new FileReader();
                      reader.onload = () => setNewOrderProofPreview(String(reader.result));
                      reader.readAsDataURL(f);
                    } else {
                      setNewOrderProofPreview(null);
                    }
                  }}
                  className="w-full text-xs text-[var(--text-muted)] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#1677FF] file:text-white hover:file:bg-[#1D4ED8]"
                />
                {newOrderProofPreview && (
                  <div className="mt-2">
                    <img src={newOrderProofPreview} alt="Preview Bukti" className="w-full max-h-40 object-contain rounded-xl bg-[var(--bg-nested)] border border-[var(--border)]" />
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">File baru: {newOrderProofFile?.name} — akan diunggah saat Buat Pesanan.</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button type="button" onClick={() => setIsCreateOrderModalOpen(false)} className="px-4 py-2 rounded-xl bg-[var(--bg-card)] text-[var(--text-muted)]">
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
          <div className="w-full max-w-md bg-[var(--bg-panel)] border border-[var(--border)] rounded-2xl shadow-modal p-5 text-xs text-[var(--text)] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-sm">Edit Pesanan: #{targetOrderForAction.invoice_number}</h3>
              <button type="button" onClick={() => setIsEditOrderModalOpen(false)}>
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>

            <form onSubmit={handleUpdateOrderSubmit} className="space-y-3">
              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Nama Pelanggan</label>
                <input
                  type="text"
                  required
                  value={editOrderForm.customer_name || ''}
                  onChange={(e) => setEditOrderForm({ ...editOrderForm, customer_name: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                />
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Nomor WhatsApp</label>
                <input
                  type="tel"
                  required
                  value={editOrderForm.customer_phone || ''}
                  onChange={(e) => setEditOrderForm({ ...editOrderForm, customer_phone: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Status Pembayaran</label>
                  <select
                    value={editOrderForm.payment_status || 'pending'}
                    onChange={(e) => setEditOrderForm({ ...editOrderForm, payment_status: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Status Order</label>
                  <select
                    value={editOrderForm.order_status || 'pending'}
                    onChange={(e) => setEditOrderForm({ ...editOrderForm, order_status: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
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
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Bukti Transfer (Upload Manual)</label>
                {targetOrderForAction.payment_proof_url ? (
                  <div className="mb-2 flex items-center gap-2">
                    <img src={targetOrderForAction.payment_proof_url} alt="Bukti Transfer" className="w-16 h-16 object-cover rounded-lg border border-[var(--border)]" />
                    <span className="text-[11px] text-[var(--success)]">Bukti sudah ada — pilih file baru untuk mengganti.</span>
                  </div>
                ) : (
                  <p className="mb-2 text-[11px] text-[var(--warn)]">Belum ada bukti transfer — upload manual di sini.</p>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files && e.target.files[0];
                    setEditOrderProofFile(f || null);
                    if (f) {
                      const reader = new FileReader();
                      reader.onload = () => setEditOrderProofPreview(String(reader.result));
                      reader.readAsDataURL(f);
                    } else {
                      setEditOrderProofPreview(null);
                    }
                  }}
                  className="w-full text-xs text-[var(--text-muted)] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#1677FF] file:text-white hover:file:bg-[#1D4ED8]"
                />
                {editOrderProofPreview && (
                  <div className="mt-2">
                    <img src={editOrderProofPreview} alt="Preview Bukti" className="w-full max-h-40 object-contain rounded-xl bg-[var(--bg-nested)] border border-[var(--border)]" />
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">File baru: {editOrderProofFile?.name} — akan diunggah saat Simpan Perubahan.</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Catatan Admin</label>
                <textarea
                  rows={2}
                  value={editOrderForm.customer_notes || ''}
                  onChange={(e) => setEditOrderForm({ ...editOrderForm, customer_notes: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button type="button" onClick={() => setIsEditOrderModalOpen(false)} className="px-4 py-2 rounded-xl bg-[var(--bg-card)] text-[var(--text-muted)]">
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
          <div className="w-full max-w-sm bg-[var(--bg-panel)] border border-[var(--border)] rounded-2xl shadow-modal p-5 text-xs text-[var(--text)] space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger-border)] flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-sm text-[var(--text)] mb-1">Hapus Pesanan?</h3>
              <p className="text-[var(--text-muted)]">
                Apakah Anda yakin ingin menghapus pesanan <strong>#{targetOrderForAction.invoice_number}</strong> milik <strong>{targetOrderForAction.customer_name}</strong>? Data akan diarsipkan (soft delete).
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteOrderModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[var(--bg-card)] text-[var(--text-muted)] font-bold"
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
