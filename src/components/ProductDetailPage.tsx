import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Minus,
  Check,
  Info,
  ShoppingBag,
  MessageCircle,
  ExternalLink,
  HelpCircle,
  Clock,
  Layers,
  AlertCircle,
  X,
  ShieldCheck,
  Share2
} from 'lucide-react';
import { Product } from '../types/product';
import { FormattedDescription } from './FormattedDescription';

interface ProductDetailPageProps {
  product: Product;
  allProducts?: Product[];
  onBack: () => void;
  onAddToCart: (product: Product, quantity: number, recipientEmail?: string, recipientId?: string) => void;
  onInstantBuy: (product: Product, quantity: number, recipientEmail?: string, recipientId?: string) => void;
  onSelectProduct?: (product: Product) => void;
  onCategorySelect?: (category: string) => void;
  isDarkMode?: boolean;
}

function getProductType(product: Product): 'voucher' | 'account' {
  const text = `${product.name} ${product.description || ''} ${product.category || ''}`.toLowerCase();
  if (text.includes('redeem') || text.includes('voucher') || text.includes('api key') || text.includes('token') || text.includes('kupon') || text.includes('tautan') || text.includes('license') || text.includes('mirai')) {
    return 'voucher';
  }
  return 'account';
}

export function ProductDetailPage({
  product,
  allProducts = [],
  onBack,
  onAddToCart,
  onInstantBuy,
  onSelectProduct,
  onCategorySelect,
  isDarkMode = false
}: ProductDetailPageProps) {
  const [quantity, setQuantity] = useState(1);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [activeTab, setActiveTab] = useState<'desc' | 'terms'>('desc');
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [isOutOfStockModalOpen, setIsOutOfStockModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Scroll to top whenever product changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setQuantity(1);
  }, [product.id]);

  const maxStock = typeof product.stock === 'number' && product.stock > 0 ? product.stock : 25;
  const isUnconfigured = !product.price || product.price <= 0;
  const isOutOfStock = product.availability === 'out_of_stock' || (typeof product.stock === 'number' && product.stock <= 0) || isUnconfigured;

  // Wholesale calculation
  const isWholesaleApplied = !!(
    product.isWholesale &&
    product.wholesaleMin &&
    quantity >= product.wholesaleMin &&
    product.wholesalePrice
  );
  const unitPrice = isWholesaleApplied ? (product.wholesalePrice || product.price) : product.price;
  const subtotal = unitPrice * quantity;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  // Find related variations of this product from allProducts
  const productKeyword = product.name.split(' ')[0]?.toLowerCase() || '';
  const variations = allProducts.filter(p => {
    if (!productKeyword || productKeyword.length < 3) return false;
    return p.name.toLowerCase().includes(productKeyword) || p.category === product.category;
  }).slice(0, 5);

  const getVariationLabel = (p: Product) => {
    const tokenMatch = p.name.match(/(\d+\s*B|\d+\s*GB|\d+\s*Bulan|\d+\s*Hari|\d+\s*Thn)/i);
    if (tokenMatch) return tokenMatch[0];
    const parts = p.name.split('-');
    if (parts.length > 1) return parts[parts.length - 1].trim();
    return p.name.length > 18 ? p.name.slice(0, 16) + '...' : p.name;
  };

  const isMuseAi = product.name.toLowerCase().includes('muse');
  const quotaMatch = product.name.match(/(\d+\s*B|\d+\s*GB|\d+\s*Bulan|\d+\s*Hari)/i);
  const quotaName = quotaMatch ? quotaMatch[0] : (isMuseAi ? '15B Token' : 'Full Access');

  const productSku = `AS-${product.provider === 'Abellab Reseller' ? 'AB' : 'PRS'}-${String(product.id).replace(/\D/g, '').slice(-4) || '9241'}`;

  const handleAddToCartClick = () => {
    if (isOutOfStock) {
      setIsOutOfStockModalOpen(true);
      return;
    }
    if (product.requires_email && !recipientEmail.trim()) {
      alert('Mohon masukkan email penerima untuk aktivasi pesanan ini.');
      return;
    }

    onAddToCart(product, quantity, recipientEmail, recipientId);
    setShowSuccessNotification(true);
    setTimeout(() => setShowSuccessNotification(false), 2500);
  };

  const handleInstantBuyClick = () => {
    if (isOutOfStock) {
      setIsOutOfStockModalOpen(true);
      return;
    }
    if (product.requires_email && !recipientEmail.trim()) {
      alert('Mohon masukkan email penerima untuk aktivasi pesanan ini.');
      return;
    }
    onInstantBuy(product, quantity, recipientEmail, recipientId);
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="py-4 sm:py-8 pb-24 lg:pb-8 text-[#0F172A] dark:text-[#F8FAFC] font-sans">
      
      {/* Breadcrumb & Navigation Bar */}
      <nav aria-label="Breadcrumb" className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 font-semibold text-[#2583F7] hover:text-[#1D4ED8] dark:hover:text-[#38BDF8] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke katalog</span>
          </button>
          <span>/</span>
          <span
            onClick={() => {
              if (onCategorySelect) onCategorySelect(product.category);
              onBack();
            }}
            className="hidden sm:inline cursor-pointer text-[#2583F7] dark:text-[#38BDF8] hover:underline font-semibold"
            title={`Lihat semua produk kategori ${product.category}`}
          >
            {product.category}
          </span>
          <span className="hidden sm:inline">/</span>
          <span className="text-[#0F172A] dark:text-[#F8FAFC] font-medium truncate max-w-[200px] sm:max-w-[320px]">
            {product.name}
          </span>
        </div>

        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#111A2B] border border-[#E2E8F0] dark:border-[#26364D] hover:border-[#2583F7] text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] hover:text-[#2583F7] shadow-xs transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{copiedLink ? 'Link Tersalin!' : 'Bagikan'}</span>
        </button>
      </nav>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        {/* ========================================================= */}
        {/* KOLOM KIRI (Gambar Produk 45% + Bagian Tentang Paket Ini) */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card Gambar Produk Utama */}
          <div className="bg-white dark:bg-[#111A2B] rounded-2xl border border-[#E2E8F0] dark:border-[#26364D] p-5 sm:p-7 shadow-[0_4px_20px_rgba(15,23,42,0.06)] dark:shadow-card relative group">
            {/* Badges on Top of Image */}
            <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
              {isOutOfStock ? (
                <span className="bg-[#FEE2E2] dark:bg-red-950/60 text-[#DC2626] dark:text-red-400 border border-[#FECACA] dark:border-red-900/60 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                  Stok Habis
                </span>
              ) : (
                <span className="bg-[#ECFDF5] dark:bg-emerald-950/60 text-[#059669] dark:text-emerald-400 border border-[#A7F3D0] dark:border-emerald-800/60 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                  Ready {maxStock} unit
                </span>
              )}

              {product.isWholesale && (
                <span className="bg-[#EFF6FF] dark:bg-[#2583F7]/15 text-[#2583F7] dark:text-[#38BDF8] border border-[#DBEAFE] dark:border-[#2583F7]/30 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                  Grosir
                </span>
              )}
            </div>

            <div className="absolute top-4 right-4 z-10">
              <span className="bg-[#F8FAFC] dark:bg-[#0B1220]/90 text-[#64748B] dark:text-[#38BDF8] border border-[#E2E8F0] dark:border-[#26364D] text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-xs">
                {product.category}
              </span>
            </div>

            {/* Main Image Container */}
            <div className="aspect-square w-full rounded-xl overflow-hidden bg-[#F8FAFC] dark:bg-[#080D18] border border-[#F1F5F9] dark:border-[#101827] flex items-center justify-center p-4">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-contain rounded-lg group-hover:scale-105 transition-transform duration-300 ease-out"
                loading="eager"
              />
            </div>

            {/* Provider and security note */}
            <div className="mt-4 pt-3 border-t border-[#F1F5F9] dark:border-[#26364D] flex items-center justify-between text-xs text-[#64748B] dark:text-[#94A3B8]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                <span>100% Produk Legal &amp; Bergaransi</span>
              </span>
              <span className="font-semibold text-[#2583F7] dark:text-[#38BDF8] bg-[#EFF6FF] dark:bg-[#2583F7]/15 px-2 py-0.5 rounded text-[11px]">
                {product.provider === 'Abellab Reseller' ? 'Supplier Abellab Reseller' : 'Supplier Prs Digital'}
              </span>
            </div>
          </div>

          {/* Bagian: Tentang Paket Ini (Tepat di Bawah Gambar) */}
          <div className="bg-white dark:bg-[#111A2B] rounded-2xl border border-[#E2E8F0] dark:border-[#26364D] p-6 shadow-[0_4px_20px_rgba(15,23,42,0.06)] dark:shadow-card space-y-5">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
                Tentang paket ini
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                Rincian paket dan petunjuk penggunaan dari penyedia.
              </p>
            </div>

            {isMuseAi ? (
              <div className="space-y-5 text-xs sm:text-sm text-[#334155] dark:text-[#CBD5E1] leading-relaxed">
                
                {/* Kuota pada nama paket */}
                <div>
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-1.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#2583F7]" />
                    Kuota pada nama paket
                  </h3>
                  <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#080D18] border border-[#E2E8F0] dark:border-[#26364D] font-semibold text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                    {quotaName}
                  </div>
                </div>

                {/* Detail Layanan */}
                <div>
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-2">
                    Detail Layanan
                  </h3>
                  <ul className="space-y-1.5 pl-1">
                    <li className="flex items-start gap-2">
                      <span className="text-[#2583F7] font-bold">•</span>
                      <span>Jasa refill Muse AI {quotaName}.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#2583F7] font-bold">•</span>
                      <span>Proses refill dilakukan secara manual oleh admin.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#2583F7] font-bold">•</span>
                      <span>Pesanan diproses sesuai antrean.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#2583F7] font-bold">•</span>
                      <span>Mohon bersabar selama proses pengerjaan berlangsung.</span>
                    </li>
                  </ul>
                </div>

                {/* Card Peringatan PENTING! WAJIB DIBACA */}
                <div className="bg-[#EFF6FF] dark:bg-[#0B1528] border border-[#BFDBFE] dark:border-[#2583F7]/50 rounded-xl p-4 sm:p-5 space-y-2.5 text-[#1E3A8A] dark:text-[#93C5FD]">
                  <div className="flex items-center gap-2 text-xs font-bold tracking-wide uppercase text-[#1D4ED8] dark:text-[#38BDF8]">
                    <Info className="w-4 h-4 text-[#2583F7] flex-shrink-0" />
                    <span>PENTING! WAJIB DIBACA</span>
                  </div>

                  <p className="text-xs leading-relaxed">
                    Pastikan token yang diminta <strong className="font-bold underline decoration-[#2583F7]">BENAR, TEPAT, DAN SESUAI</strong> sebelum melakukan pemesanan.
                  </p>
                  <p className="text-xs leading-relaxed text-[#1E40AF] dark:text-[#93C5FD]/90">
                    Kesalahan dalam pengisian atau pemilihan token menjadi tanggung jawab pembeli.
                  </p>
                  <p className="text-xs leading-relaxed text-[#1E40AF] dark:text-[#93C5FD]/90">
                    Refill dilakukan secara manual, sehingga proses membutuhkan waktu. Mohon menunggu hingga admin memproses pesanan sesuai antrean.
                  </p>
                  <p className="text-xs font-semibold leading-relaxed">
                    Jangan melakukan pemesanan berulang hanya karena proses belum selesai.
                  </p>
                </div>

                {/* Ketentuan Pemesanan */}
                <div>
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-1">
                    Ketentuan Pemesanan
                  </h3>
                  <p className="text-xs text-[#475569] dark:text-[#94A3B8] leading-relaxed">
                    Harap periksa kembali detail token sebelum memesan. Dengan melakukan pemesanan, pembeli dianggap telah memahami dan menyetujui ketentuan di atas.
                  </p>
                </div>

                {/* Ketentuan Garansi */}
                <div>
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-1">
                    Ketentuan Garansi
                  </h3>
                  <p className="text-xs text-[#475569] dark:text-[#94A3B8] leading-relaxed">
                    Jika terjadi kesalahan token, garansi <strong className="text-[#DC2626] font-bold">HANGUS</strong>.
                  </p>
                </div>

                {/* Di mana melihat akses setelah membeli? */}
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#080D18] border border-[#E2E8F0] dark:border-[#26364D] space-y-1">
                  <h4 className="font-semibold text-xs text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#2583F7]" />
                    Di mana melihat akses setelah membeli?
                  </h4>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                    Masuk ke akun yang digunakan saat checkout, lalu buka Pesanan Saya. Akses ditampilkan setelah pembayaran dan pengiriman selesai.
                  </p>
                </div>

                {/* Butuh bantuan aktivasi? */}
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#080D18] border border-[#E2E8F0] dark:border-[#26364D] space-y-1.5">
                  <h4 className="font-semibold text-xs text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-[#2583F7]" />
                    Butuh bantuan aktivasi?
                  </h4>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                    Hubungi tim kami lewat Telegram / WhatsApp dengan menyertakan ID pesanan. Jangan kirim kata sandi akun pribadimu.
                  </p>
                  <a
                    href="https://wa.me/6285867336036"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2583F7] hover:underline pt-0.5"
                  >
                    <span>Hubungi CS WhatsApp Resmi</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

              </div>
            ) : (
              <div className="space-y-4 text-xs sm:text-sm text-[#334155] dark:text-[#CBD5E1] leading-relaxed">
                <div>
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-1.5">
                    Rincian Fitur &amp; Spesifikasi
                  </h3>
                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#080D18] border border-[#E2E8F0] dark:border-[#26364D] text-xs text-[#475569] dark:text-[#94A3B8] break-words overflow-hidden max-w-full leading-relaxed">
                    <FormattedDescription
                      text={product.description || 'Layanan produk digital bergaransi resmi dengan aktivasi instan.'}
                      isDarkMode={isDarkMode}
                    />
                  </div>
                </div>

                <div className="bg-[#EFF6FF] dark:bg-[#0B1528] border border-[#BFDBFE] dark:border-[#2583F7]/50 rounded-xl p-4 text-[#1E3A8A] dark:text-[#93C5FD] space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#1D4ED8] dark:text-[#38BDF8]">
                    <Info className="w-4 h-4 text-[#2583F7]" />
                    <span>PANDUAN PEMESANAN</span>
                  </div>
                  <p className="text-xs text-[#1E40AF] dark:text-[#93C5FD]">
                    Pastikan data penerima seperti email aktivasi atau nomor akun diisi secara valid untuk kelancaran proses pengiriman.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-1">
                    Ketentuan Garansi
                  </h3>
                  <p className="text-xs text-[#475569] dark:text-[#94A3B8] leading-relaxed">
                    Produk ini dilindungi garansi penggantian atau bantuan perbaikan selama masa aktif yang tertera pada paket langganan.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ========================================================= */}
        {/* KOLOM KANAN (Informasi & Card Pembelian Lengkap 55%)       */}
        {/* ========================================================= */}
        <div className="lg:col-span-7">
          <div className="bg-white dark:bg-[#111A2B] rounded-2xl border border-[#E2E8F0] dark:border-[#26364D] p-6 sm:p-8 shadow-[0_4px_20px_rgba(15,23,42,0.06)] dark:shadow-card space-y-5">
            
            {/* 1. Nama Produk */}
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-[26px] font-bold text-[#0F172A] dark:text-[#F8FAFC] leading-snug tracking-tight">
                {product.name}
              </h1>

              {/* 2 & 3. SKU & Badges */}
              <div className="flex items-center gap-3 mt-2 flex-wrap text-xs">
                <span className="font-mono text-[#64748B] dark:text-[#94A3B8] bg-[#F1F5F9] dark:bg-[#080D18] px-2 py-0.5 rounded font-medium border border-[#E2E8F0] dark:border-[#26364D]">
                  SKU: {productSku}
                </span>

                <span className="bg-[#EFF6FF] dark:bg-[#2583F7]/15 text-[#2583F7] dark:text-[#38BDF8] font-semibold px-2.5 py-0.5 rounded-full border border-[#DBEAFE] dark:border-[#2583F7]/30">
                  Terlaris
                </span>

                {isOutOfStock ? (
                  <span className="bg-[#FEE2E2] dark:bg-red-950/60 text-[#DC2626] dark:text-red-400 font-semibold px-2.5 py-0.5 rounded-full border border-[#FECACA] dark:border-red-900/60">
                    Stok Habis
                  </span>
                ) : (
                  <span className="bg-[#ECFDF5] dark:bg-emerald-950/60 text-[#059669] dark:text-emerald-400 font-semibold px-2.5 py-0.5 rounded-full border border-[#A7F3D0] dark:border-emerald-800/60">
                    Ready Stok
                  </span>
                )}
              </div>
            </div>

            {/* 4. Harga Utama */}
            <div className="pt-2 border-t border-[#F1F5F9] dark:border-[#26364D]">
              <div className="flex items-baseline gap-3 flex-wrap">
                {isUnconfigured ? (
                  <span className="text-sm sm:text-base font-bold text-amber-500">
                    Produk belum diatur / Stok kosong
                  </span>
                ) : (
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#2583F7] dark:text-[#38BDF8] tabular-nums tracking-tight">
                    {formatPrice(unitPrice)}
                  </span>
                )}

                {product.oldPrice > product.price && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#94A3B8] line-through tabular-nums">
                      {formatPrice(product.oldPrice)}
                    </span>
                    <span className="text-xs font-bold bg-[#FEE2E2] dark:bg-red-950/60 text-[#DC2626] dark:text-red-400 px-1.5 py-0.5 rounded">
                      -{product.discount || 25}%
                    </span>
                  </div>
                )}
              </div>
              <span className="text-xs text-[#64748B] dark:text-[#94A3B8] block mt-0.5">
                Harga satuan resmi
              </span>
            </div>

            {/* 6. Statistik Penjualan dan Stok */}
            <div className="grid grid-cols-2 divide-x divide-[#E2E8F0] dark:divide-[#26364D] bg-[#F8FAFC] dark:bg-[#080D18] border border-[#E2E8F0] dark:border-[#26364D] rounded-xl p-3 text-center">
              <div className="px-2">
                <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] block uppercase tracking-wide">Terjual</span>
                <span className="font-bold text-sm text-[#0F172A] dark:text-[#F8FAFC] mt-0.5 block">1.4rb+</span>
              </div>
              <div className="px-2">
                <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] block uppercase tracking-wide">Stok</span>
                <span className={`font-bold text-sm mt-0.5 block ${isOutOfStock ? 'text-[#DC2626] dark:text-red-400' : 'text-[#059669] dark:text-emerald-400'}`}>
                  {isOutOfStock ? 'Kosong' : `${maxStock} unit`}
                </span>
              </div>
            </div>

            {/* 7. Pilihan Variasi Produk (Tombol Pill) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wide">
                  PILIHAN VARIASI:
                </span>
                <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Pilih paket yang diinginkan
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {variations.length > 1 ? (
                  variations.map(v => {
                    const isCurrent = v.id === product.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => onSelectProduct && onSelectProduct(v)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                          isCurrent
                            ? 'bg-[#2583F7] text-white border-[#2583F7] shadow-sm'
                            : 'bg-white dark:bg-[#080D18] text-[#0F172A] dark:text-[#F8FAFC] border-[#E2E8F0] dark:border-[#26364D] hover:border-[#2583F7] hover:text-[#2583F7]'
                        }`}
                      >
                        {getVariationLabel(v)}
                      </button>
                    );
                  })
                ) : (
                  <>
                    <button
                      type="button"
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#2583F7] text-white border border-[#2583F7] shadow-sm"
                    >
                      {quotaName}
                    </button>
                    <button
                      type="button"
                      onClick={() => alert('Varian ini sedang dalam persiapan server.')}
                      className="px-3.5 py-2 rounded-xl text-xs font-medium bg-white dark:bg-[#080D18] text-[#64748B] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#26364D] hover:border-[#CBD5E1]"
                    >
                      Paket Pro (30 Hari)
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 8. Kotak Promo atau Harga Grosir (Border Putus-Putus) */}
            <div className="p-3.5 rounded-xl border-2 border-dashed border-[#2583F7]/50 bg-[#EFF6FF]/60 dark:bg-[#2583F7]/10 text-xs text-[#1E40AF] dark:text-[#93C5FD] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#1D4ED8] dark:text-[#38BDF8] flex items-center gap-1.5">
                  <span className="text-base">🔥</span> Promo Pembelian Grosir
                </span>
                {isWholesaleApplied && (
                  <span className="bg-[#10B981] text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                    Hemat Grosir Diterapkan
                  </span>
                )}
              </div>
              <p className="text-[#3B82F6] dark:text-[#93C5FD] text-[11px] leading-relaxed">
                {product.isWholesale && product.wholesalePrice
                  ? `Beli ${product.wholesaleMin || 5}+ unit otomatis mendapatkan harga grosir Rp ${product.wholesalePrice.toLocaleString('id-ID')} /unit.`
                  : 'Beli 5 unit atau lebih untuk mendapatkan potongan harga grosir langsung saat checkout.'}
              </p>
            </div>

            {/* 9. Informasi Ketersediaan Stok */}
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-[#64748B] dark:text-[#94A3B8]">Ketersediaan Stok:</span>
              {isOutOfStock ? (
                <span className="font-bold text-[#DC2626] dark:text-red-400 bg-[#FEE2E2] dark:bg-red-950/60 px-2 py-0.5 rounded">
                  Habis (Restock Segera)
                </span>
              ) : (
                <span className="font-bold text-[#059669] dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Tersedia ({maxStock} unit siap kirim)
                </span>
              )}
            </div>

            {/* 10 & 11. Tab Deskripsi dan Syarat & Ketentuan */}
            <div className="pt-2 border-t border-[#F1F5F9] dark:border-[#26364D] space-y-3">
              <div className="flex border-b border-[#E2E8F0] dark:border-[#26364D] gap-6 text-sm">
                <button
                  type="button"
                  onClick={() => setActiveTab('desc')}
                  className={`pb-2.5 font-bold transition-all relative ${
                    activeTab === 'desc'
                      ? 'text-[#2583F7] dark:text-[#38BDF8]'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
                  }`}
                >
                  <span>Deskripsi</span>
                  {activeTab === 'desc' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2583F7] rounded-full" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('terms')}
                  className={`pb-2.5 font-bold transition-all relative ${
                    activeTab === 'terms'
                      ? 'text-[#2583F7] dark:text-[#38BDF8]'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
                  }`}
                >
                  <span>Syarat &amp; Ketentuan</span>
                  {activeTab === 'terms' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2583F7] rounded-full" />
                  )}
                </button>
              </div>

              <div className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed min-h-[90px] break-words overflow-hidden max-w-full">
                {activeTab === 'desc' ? (
                  <div className="space-y-3">
                    <p className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                      Ringkasan Layanan {product.name}:
                    </p>
                    <p className="line-clamp-3">
                      {product.description ? product.description.replace(/[\r\n]+/g, ' ') : `Layanan ${product.name} bergaransi resmi dengan proses aktivasi instan & aman.`}
                    </p>
                    <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#080D18] border border-[#E2E8F0] dark:border-[#26364D] space-y-2 mt-2">
                      <p className="font-bold text-xs text-[#2583F7] dark:text-[#38BDF8]">
                        {getProductType(product) === 'voucher' ? '🎁 Panduan Klaim & Penukaran Voucher / Redeem Code:' : '🔐 Panduan Penggunaan & Login Akun:'}
                      </p>
                      {getProductType(product) === 'voucher' ? (
                        <ol className="list-decimal pl-4 space-y-1 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                          <li>Selesaikan pembayaran pesanan Anda di Androidstore.</li>
                          <li>Salin kode voucher atau tautan redeem dari menu <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Pesanan Saya</strong> atau chat WhatsApp.</li>
                          <li>Kunjungi situs resmi/portal penukaran yang tertera pada rincian fitur di atas.</li>
                          <li>Masukkan kode/tautan untuk mengaktifkan layanan secara instan.</li>
                        </ol>
                      ) : (
                        <ol className="list-decimal pl-4 space-y-1 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                          <li>Selesaikan pembayaran pesanan Anda.</li>
                          <li>Dapatkan detail login (email & kata sandi) dari menu <strong className="text-[#0F172A] dark:text-[#F8FAFC]">Pesanan Saya</strong> atau WhatsApp admin.</li>
                          <li>Login ke aplikasi/web resmi menggunakan kredensial yang diberikan.</li>
                          <li>Patuhi ketentuan layanan (jangan mengubah email/password utama) agar garansi tetap aktif.</li>
                        </ol>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                      Ketentuan Pembelian Androidstore.web.id:
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-[#64748B] dark:text-[#94A3B8]">
                      <li>Pastikan data akun / email yang diberikan sudah benar sebelum menyelesaikan pesanan.</li>
                      <li>Klaim garansi wajib menyertakan nomor invoice atau ID pesanan WhatsApp.</li>
                      <li>Dilarang mengubah data akun atau melanggar TOS layanan penyedia.</li>
                      <li>Penyelesaian pesanan rata-rata berlangsung 5 - 15 menit sesuai antrean.</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Input Data Penerima (Email) jika diperlukan */}
            {product.requires_email && (
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#080D18] border border-[#E2E8F0] dark:border-[#26364D] space-y-1.5">
                <label className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] block">
                  Email Akun Penerima / Aktivasi <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="contoh: akunanda@gmail.com"
                  className="w-full px-3.5 py-2 bg-white dark:bg-[#111A2B] border border-[#CBD5E1] dark:border-[#26364D] rounded-xl text-xs text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#2583F7] focus:ring-2 focus:ring-[#2583F7]/20"
                  required
                />
                <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                  Link aktivasi atau token pesanan akan diproses ke email ini.
                </span>
              </div>
            )}

            {/* Optional Telegram ID */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] block">
                ID Telegram / Catatan <span className="text-[11px] font-normal text-[#94A3B8]">(Opsional)</span>
              </label>
              <input
                type="text"
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                placeholder="@username_telegram atau catatan pesanan..."
                className="w-full px-3.5 py-2 bg-white dark:bg-[#111A2B] border border-[#CBD5E1] dark:border-[#26364D] rounded-xl text-xs text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#2583F7] focus:ring-2 focus:ring-[#2583F7]/20"
              />
            </div>

            {/* 12. Kontrol Jumlah Produk */}
            <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9] dark:border-[#26364D]">
              <div>
                <label className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] block">
                  Jumlah Pembelian
                </label>
                <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                  Pilih kuantitas unit yang diinginkan
                </span>
              </div>

              <div className="flex items-center border border-[#CBD5E1] dark:border-[#26364D] rounded-xl bg-white dark:bg-[#080D18] overflow-hidden shadow-xs">
                <button
                  type="button"
                  disabled={quantity <= 1 || isOutOfStock}
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-9 h-9 flex items-center justify-center text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#111A2B] hover:text-[#0F172A] disabled:opacity-30 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <input
                  type="number"
                  min="1"
                  max={maxStock}
                  value={quantity}
                  disabled={isOutOfStock}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setQuantity(Math.min(maxStock, Math.max(1, val)));
                  }}
                  className="w-12 text-center text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none bg-transparent"
                />

                <button
                  type="button"
                  disabled={quantity >= maxStock || isOutOfStock}
                  onClick={() => setQuantity(q => Math.min(maxStock, q + 1))}
                  className="w-9 h-9 flex items-center justify-center text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#111A2B] hover:text-[#0F172A] disabled:opacity-30 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 13. Total Harga yang Diperbarui Otomatis */}
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#080D18] border border-[#E2E8F0] dark:border-[#26364D] flex items-center justify-between">
              <div>
                <span className="text-xs text-[#64748B] dark:text-[#94A3B8] block">Total Pembayaran:</span>
                <span className="text-[11px] text-[#94A3B8]">
                  {quantity} unit x {formatPrice(unitPrice)}
                </span>
              </div>
              <span className="text-xl sm:text-2xl font-black text-[#2583F7] dark:text-[#38BDF8] tabular-nums">
                {formatPrice(subtotal)}
              </span>
            </div>

            {/* 14. Tombol Tambah ke Keranjang dan Beli Sekarang */}
            <div className="space-y-2.5 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={handleAddToCartClick}
                  className={`py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                    isOutOfStock
                      ? 'bg-[#F1F5F9] dark:bg-[#080D18] text-[#94A3B8] border border-[#E2E8F0] dark:border-[#26364D] cursor-not-allowed'
                      : 'bg-white dark:bg-[#111A2B] border-2 border-[#2583F7] text-[#2583F7] hover:bg-[#EFF6FF] dark:hover:bg-[#1A263D] active:scale-[0.99] shadow-xs'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 text-[#2583F7]" />
                  <span>Tambah ke Keranjang</span>
                </button>

                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={handleInstantBuyClick}
                  className={`py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                    isOutOfStock
                      ? 'bg-[#E2E8F0] dark:bg-[#26364D] text-[#94A3B8] cursor-not-allowed'
                      : 'bg-[#2583F7] hover:bg-[#1D4ED8] text-white shadow-md shadow-[#2583F7]/25 active:scale-[0.99]'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Beli Sekarang</span>
                </button>
              </div>

              {/* Teks di bawah tombol */}
              <div className="pt-2 text-center space-y-1">
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Baca ketentuan paket sebelum membeli. Perlu memastikan sesuatu?{' '}
                  <a
                    href="https://wa.me/6285867336036"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#2583F7] font-semibold hover:underline inline-flex items-center gap-0.5"
                  >
                    <span>Tanya tim kami</span>
                    <span>↗</span>
                  </a>
                </p>
                <p className="text-[11px] text-[#94A3B8]">
                  Harga final dan instruksi pembayaran ditampilkan saat checkout.
                </p>
              </div>
            </div>

            {/* Notification Toast */}
            {showSuccessNotification && (
              <div className="p-3 rounded-xl bg-[#ECFDF5] dark:bg-emerald-950/40 border border-[#A7F3D0] dark:border-emerald-800/60 text-xs font-semibold text-[#065F46] dark:text-emerald-300 flex items-center gap-2 animate-fadeIn">
                <Check className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                <span>Berhasil menambahkan {quantity}x {product.name} ke keranjang belanja!</span>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Mobile Sticky Bottom Bar (Dark mode: #0B1220, Light mode: white) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-[#0B1220] border-t border-[#E2E8F0] dark:border-[#26364D] p-3 px-4 shadow-[0_-4px_25px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_25px_rgba(0,0,0,0.7)] flex items-center justify-between gap-3 transition-colors">
        <div className="min-w-0">
          <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] block leading-none">
            Total ({quantity} unit):
          </span>
          <span className="text-base font-extrabold text-[#2583F7] dark:text-[#38BDF8] tabular-nums">
            {formatPrice(subtotal)}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={handleAddToCartClick}
            className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
              isOutOfStock
                ? 'bg-[#F1F5F9] dark:bg-[#080D18] text-[#94A3B8] border-[#E2E8F0] dark:border-[#26364D] cursor-not-allowed'
                : 'bg-white dark:bg-[#111A2B] border-2 border-[#2583F7] text-[#2583F7] active:scale-95'
            }`}
            title="Tambah ke Keranjang"
          >
            <ShoppingBag className="w-4 h-4 text-[#2583F7]" />
          </button>

          <button
            type="button"
            disabled={isOutOfStock}
            onClick={handleInstantBuyClick}
            className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              isOutOfStock
                ? 'bg-[#E2E8F0] dark:bg-[#26364D] text-[#94A3B8] cursor-not-allowed'
                : 'bg-[#2583F7] hover:bg-[#1D4ED8] text-white shadow-sm shadow-[#2583F7]/30 active:scale-95'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Beli Sekarang</span>
          </button>
        </div>
      </div>

      {/* ALERT MODAL: STOK HABIS */}
      {isOutOfStockModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stock-alert-modal-title"
        >
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsOutOfStockModalOpen(false)}
            aria-hidden="true"
          />

          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-[#101827] border border-[#E2E8F0] dark:border-[#26364D] rounded-2xl shadow-2xl text-left overflow-hidden transform transition-all duration-300 animate-scaleUp text-[#0F172A] dark:text-[#F8FAFC]"
            >
              {/* Header */}
              <div className="px-5 py-4 bg-[#F8FAFC] dark:bg-[#0B1220] border-b border-[#E2E8F0] dark:border-[#26364D] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FEE2E2] dark:bg-red-950/60 text-[#DC2626] dark:text-red-400 border border-[#FECACA] dark:border-red-900/60 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <h3 id="stock-alert-modal-title" className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    Pemberitahuan: Stok Habis
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOutOfStockModalOpen(false)}
                  aria-label="Tutup notifikasi"
                  className="w-8 h-8 rounded-xl text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-[#E2E8F0] dark:hover:bg-[#111A2B] flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#080D18] border border-[#E2E8F0] dark:border-[#26364D] space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#2583F7]">
                    {product.category}
                  </span>
                  <h4 className="font-bold text-sm text-[#0F172A] dark:text-[#F8FAFC] leading-snug">
                    {product.name}
                  </h4>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#DC2626] dark:text-red-400 bg-[#FEE2E2] dark:bg-red-950/60 px-2 py-0.5 rounded-md border border-[#FECACA] dark:border-red-900/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                      Stok Sedang Kosong (0 unit)
                    </span>
                    <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                      {product.provider === 'Abellab Reseller' ? 'Supplier Abellab Reseller' : 'Supplier Prs Digital'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                  Maaf, stok untuk paket produk ini sedang habis atau dalam proses pengisian ulang oleh penyedia server. Anda dapat meminta admin untuk memprioritaskan restock atau memilih alternatif paket lain di katalog.
                </p>

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  <a
                    href={`https://wa.me/6285867336036?text=${encodeURIComponent(`Halo Admin Androidstore.web.id! Saya ingin menanyakan ketersediaan / restock untuk produk: ${product.name} (Server: ${product.provider || 'Prs Digital'}). Kapan stok ready kembali?`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-[#2583F7] hover:bg-[#1D4ED8] text-white shadow-md shadow-[#2583F7]/25 flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Tanya Admin untuk Restock (WhatsApp)</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      setIsOutOfStockModalOpen(false);
                      onBack();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-white dark:bg-[#111A2B] hover:bg-[#F1F5F9] dark:hover:bg-[#1A263D] text-[#2583F7] border border-[#CBD5E1] dark:border-[#26364D] hover:border-[#2583F7] transition-all"
                  >
                    ← Kembali &amp; Pilih Produk Lain
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 bg-[#F8FAFC] dark:bg-[#0B1220] border-t border-[#E2E8F0] dark:border-[#26364D] text-center text-[10px] text-[#94A3B8]">
                Stok produk diperbarui secara otomatis setiap kali penyedia server mengisi kuota.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shopee-style Related Products Recommendations */}
      {allProducts && allProducts.length > 1 && (
        <div className="mt-12 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight flex items-center gap-2">
              <span className="w-2 h-5 rounded-full bg-[#2583F7]" />
              <span>Rekomendasi Produk Lainnya</span>
            </h3>
            <span className="text-xs text-[#64748B] dark:text-[#94A3B8] font-semibold">Pilihan Serupa</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {(() => {
              const sameCategory = allProducts.filter(p => p.id !== product.id && p.category === product.category);
              const fallback = allProducts.filter(p => p.id !== product.id);
              const list = sameCategory.length > 0 ? sameCategory : fallback;
              return list.slice(0, 6).map(p => (
                <div
                  key={p.id}
                  onClick={() => {
                    if (onSelectProduct) onSelectProduct(p);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-white dark:bg-[#111A2B] border border-[#E2E8F0] dark:border-[#26364D] rounded-xl overflow-hidden shadow-xs hover:shadow-md hover:border-[#2583F7] dark:hover:border-[#38BDF8] transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="w-full h-28 sm:h-32 bg-[#F8FAFC] dark:bg-[#080D18] relative overflow-hidden flex items-center justify-center">
                      <img
                        src={p.image || '/assets/default_produk.png'}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[#2583F7] text-white text-[9px] font-black uppercase shadow-xs">
                        {p.category.split('&')[0].trim()}
                      </span>
                    </div>

                    <div className="p-3 space-y-1.5">
                      <h4 className="font-bold text-xs text-[#0F172A] dark:text-[#F8FAFC] line-clamp-2 group-hover:text-[#2583F7] dark:group-hover:text-[#38BDF8] transition-colors leading-snug min-h-[32px]">
                        {p.name}
                      </h4>
                    </div>
                  </div>

                  <div className="p-3 pt-0 flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-black text-[#2583F7] dark:text-[#38BDF8] tabular-nums">
                      {formatPrice(p.price)}
                    </span>
                    <span className="text-[10px] font-bold text-[#10B981] bg-[#10B981]/15 px-1.5 py-0.5 rounded">
                      Instan
                    </span>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

    </div>
  );
}
