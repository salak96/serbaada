import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Minus,
  Check,
  ShoppingBag,
  MessageCircle,
  AlertCircle,
  X,
  ShieldCheck,
  Share2,
  Star
} from 'lucide-react';
import { Product, ProductVariant } from '../types/product';

interface ProductDetailPageProps {
  product: Product;
  allProducts?: Product[];
  onBack: () => void;
  onAddToCart: (product: Product, quantity: number, recipientEmail?: string, recipientId?: string, variant?: ProductVariant) => void;
  onInstantBuy: (product: Product, quantity: number, recipientEmail?: string, recipientId?: string, variant?: ProductVariant) => void;
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
  onCategorySelect
}: ProductDetailPageProps) {
  const [quantity, setQuantity] = useState(1);
  // ---- Varian produk (Tipe Akun · Varian · Durasi) ----
  const activeVariants = (product.variants || []).filter(v => v.is_active !== 0);
  const hasVariants = activeVariants.length > 0;
  const [selAccountType, setSelAccountType] = useState<string>(activeVariants[0]?.account_type || 'private');
  const [selVariantName, setSelVariantName] = useState<string>(activeVariants[0]?.name || '');
  const [selDuration, setSelDuration] = useState<string>(activeVariants[0]?.duration || 'Semua');
  const accountTypes = [...new Set(activeVariants.map(v => v.account_type))];
  const variantNames = [...new Set(activeVariants.filter(v => v.account_type === selAccountType).map(v => v.name))];
  // Durasi = semua durasi untuk tipe akun terpilih (tidak disaring nama varian),
  // supaya durasi tampil sebagai sumbu pilihan sendiri (Plus=1 bulan, Go=3 bulan).
  const durations = [...new Set(activeVariants.filter(v => v.account_type === selAccountType).map(v => v.duration))];
  // Sumbu varian yang benar-benar bisa dipilih (2+ opsi). Bila hanya satu sumbu, labelnya "Pilih Variasi".
  const variantGroupCount = (accountTypes.length > 1 ? 1 : 0) + (variantNames.length > 1 ? 1 : 0) + (durations.length > 1 ? 1 : 0);
  const singleVariantGroup = variantGroupCount === 1;
  // ---- Ulasan & testimoni (diisi admin) ----
  const productReviews = product.reviews || [];
  const avgRating = productReviews.length > 0
    ? productReviews.reduce((s, r) => s + (Number(r.rating) || 5), 0) / productReviews.length
    : 0;
  const selectedVariant: ProductVariant | null = hasVariants
    ? (activeVariants.find(v => v.account_type === selAccountType && v.name === selVariantName && v.duration === selDuration)
      || activeVariants.find(v => v.account_type === selAccountType && v.name === selVariantName)
      || activeVariants.find(v => v.account_type === selAccountType)
      || activeVariants[0])
    : null;
  // Gambar ikut varian terpilih bila varian punya gambar sendiri, kalau tidak pakai gambar utama produk.
  const displayImage = (hasVariants && selectedVariant && selectedVariant.image) ? selectedVariant.image : product.image;
  const handleAccountType = (at: string) => {
    setSelAccountType(at);
    const next = activeVariants.find(v => v.account_type === at && v.name === selVariantName)
      || activeVariants.find(v => v.account_type === at);
    if (next) { setSelVariantName(next.name); setSelDuration(next.duration); }
  };
  const handleVariantName = (name: string) => {
    setSelVariantName(name);
    const next = activeVariants.find(v => v.account_type === selAccountType && v.name === name)
      || activeVariants.find(v => v.name === name);
    if (next) setSelDuration(next.duration);
  };
  const handleDuration = (d: string) => {
    setSelDuration(d);
    // Bila varian terpilih tidak punya durasi ini, pindah ke varian yang punya.
    const hasIt = activeVariants.some(v => v.account_type === selAccountType && v.name === selVariantName && v.duration === d);
    if (!hasIt) {
      const next = activeVariants.find(v => v.account_type === selAccountType && v.duration === d);
      if (next) setSelVariantName(next.name);
    }
  };
  const displayName = hasVariants && selectedVariant
    ? `${product.name} ${selectedVariant.name} ${selectedVariant.account_type === 'private' ? 'Private' : 'Shared'}`
    : product.name;
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
    const first = (product.variants || []).find(v => v.is_active !== 0);
    if (first) {
      setSelAccountType(first.account_type);
      setSelVariantName(first.name);
      setSelDuration(first.duration);
    }
  }, [product.id]);

  const effectiveStock = hasVariants && selectedVariant ? Number(selectedVariant.stock || 0) : product.stock;
  const maxStock = typeof effectiveStock === 'number' && effectiveStock > 0 ? effectiveStock : 25;
  const effectivePrice = hasVariants && selectedVariant ? Number(selectedVariant.selling_price || 0) : product.price;
  const isUnconfigured = hasVariants ? (!selectedVariant || effectivePrice <= 0) : (!product.price || product.price <= 0);
  const isOutOfStock = hasVariants
    ? (!selectedVariant || Number(selectedVariant.stock || 0) <= 0 || isUnconfigured)
    : (product.availability === 'out_of_stock' || (typeof product.stock === 'number' && product.stock <= 0) || isUnconfigured);

  // Wholesale calculation (hanya untuk produk tanpa varian)
  const isWholesaleApplied = !hasVariants && !!(
    product.isWholesale &&
    product.wholesaleMin &&
    quantity >= product.wholesaleMin &&
    product.wholesalePrice
  );
  const unitPrice = hasVariants
    ? effectivePrice
    : (isWholesaleApplied ? (product.wholesalePrice || product.price) : product.price);
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

    onAddToCart(product, quantity, recipientEmail, recipientId, selectedVariant || undefined);
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
    onInstantBuy(product, quantity, recipientEmail, recipientId, selectedVariant || undefined);
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
                src={displayImage}
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

          {/* Bagian: Ulasan & Testimoni (diisi admin) */}
          <div className="bg-white dark:bg-[#111A2B] rounded-2xl border border-[#E2E8F0] dark:border-[#26364D] p-6 shadow-[0_4px_20px_rgba(15,23,42,0.06)] dark:shadow-card space-y-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
                Ulasan & Testimoni
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                {productReviews.length > 0
                  ? `${avgRating.toFixed(1)} dari 5 · ${productReviews.length} ulasan`
                  : 'Belum ada ulasan untuk produk ini.'}
              </p>
            </div>

            {productReviews.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} className={`w-5 h-5 ${n <= Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-[#CBD5E1] dark:text-[#334155]'}`} />
                  ))}
                </div>
                <span className="font-bold text-sm text-[#0F172A] dark:text-[#F8FAFC]">{avgRating.toFixed(1)}</span>
              </div>
            )}

            <div className="space-y-4">
              {productReviews.map(rv => (
                <div key={rv.id} className="flex gap-3 pb-4 border-b border-[#F1F5F9] dark:border-[#26364D] last:border-0 last:pb-0">
                  {rv.photo ? (
                    <img src={rv.photo} alt={rv.name} className="w-11 h-11 rounded-full object-cover border border-[#E2E8F0] dark:border-[#26364D] shrink-0" />
                  ) : (
                    <span className="w-11 h-11 rounded-full bg-[#EFF6FF] dark:bg-[#2583F7]/15 text-[#2583F7] dark:text-[#38BDF8] font-bold flex items-center justify-center text-sm shrink-0">
                      {rv.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] truncate">{rv.name}</span>
                      {rv.date && <span className="text-[11px] text-[#94A3B8] shrink-0">{rv.date}</span>}
                    </div>
                    <div className="flex items-center gap-0.5 my-0.5">
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star key={n} className={`w-3.5 h-3.5 ${n <= (rv.rating || 5) ? 'text-amber-400 fill-amber-400' : 'text-[#CBD5E1] dark:text-[#334155]'}`} />
                      ))}
                    </div>
                    {rv.text && <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed whitespace-pre-line break-words">{rv.text}</p>}
                  </div>
                </div>
              ))}
            </div>
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
                {displayName}
              </h1>
              {hasVariants && selectedVariant && (
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
                  Tipe akun {selectedVariant.account_type === 'private' ? 'Private' : 'Shared'} · Varian {selectedVariant.name} · {selectedVariant.duration}
                </p>
              )}

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

            {hasVariants && (
              <>
                {accountTypes.length > 1 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wide">{singleVariantGroup ? 'Pilih Variasi' : 'Tipe akun'}</span>
                  <div className="flex flex-wrap gap-2">
                    {accountTypes.map(at => (
                      <button
                        key={at}
                        type="button"
                        onClick={() => handleAccountType(at)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                          selAccountType === at
                            ? 'bg-[#2583F7] text-white border-[#2583F7] shadow-sm'
                            : 'bg-white dark:bg-[#080D18] text-[#0F172A] dark:text-[#F8FAFC] border-[#E2E8F0] dark:border-[#26364D] hover:border-[#2583F7] hover:text-[#2583F7]'
                        }`}
                      >
                        {at === 'private' ? 'Private' : 'Shared'}
                      </button>
                    ))}
                  </div>
                </div>
                )}
                {variantNames.length > 1 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wide">{singleVariantGroup ? 'Pilih Variasi' : 'Varian'}</span>
                  <div className="flex flex-wrap gap-2">
                    {variantNames.map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleVariantName(n)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                          selVariantName === n
                            ? 'bg-[#2583F7] text-white border-[#2583F7] shadow-sm'
                            : 'bg-white dark:bg-[#080D18] text-[#0F172A] dark:text-[#F8FAFC] border-[#E2E8F0] dark:border-[#26364D] hover:border-[#2583F7] hover:text-[#2583F7]'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                )}
                {durations.length > 1 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wide">{singleVariantGroup ? 'Pilih Variasi' : 'Pilih durasi'}</span>
                  <div className="flex flex-wrap gap-2">
                    {durations.map(d => {
                      const dv = activeVariants.find(v => v.account_type === selAccountType && v.name === selVariantName && v.duration === d)
                        || activeVariants.find(v => v.account_type === selAccountType && v.duration === d);
                      const dPrice = dv
                        ? Number(dv.selling_price || 0)
                        : Math.min(...activeVariants.filter(v => v.account_type === selAccountType).map(v => Number(v.selling_price || 0)));
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => handleDuration(d)}
                          className={`px-3.5 py-2 rounded-xl text-xs transition-all border text-left ${
                            selDuration === d
                              ? 'bg-[#2583F7] text-white border-[#2583F7] shadow-sm'
                              : 'bg-white dark:bg-[#080D18] text-[#0F172A] dark:text-[#F8FAFC] border-[#E2E8F0] dark:border-[#26364D] hover:border-[#2583F7] hover:text-[#2583F7]'
                          }`}
                        >
                          <span className="block font-bold">{d}</span>
                          <span className="block text-[11px] opacity-80">{d === 'Semua' ? `mulai ${formatPrice(dPrice)}` : formatPrice(dPrice)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                )}
              </>
            )}

            {!hasVariants && (
            <>
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
            </>
            )}

            {/* 8. Kotak Harga Grosir (Border Putus-Putus) */}
            {product.isWholesale && product.wholesalePrice ? (
              <div className="p-3.5 rounded-xl border-2 border-dashed border-[#10B981]/50 bg-[#ECFDF5]/60 dark:bg-[#10B981]/10 text-xs space-y-2">
                <p className="font-bold text-[#059669] dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="text-base">🏷️</span> Harga Grosir Tersedia
                </p>
                <div className="grid grid-cols-2 gap-2 text-[#334155] dark:text-[#CBD5E1]">
                  <div>
                    <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] block">Min. Pembelian</span>
                    <span className="font-bold">≥ {product.wholesaleMin || 5} unit</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] block">Harga Satuan</span>
                    <span className="font-bold">{formatPrice(product.wholesalePrice)}</span>
                  </div>
                </div>
                {isWholesaleApplied && (
                  <span className="inline-block bg-[#10B981] text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                    Hemat Grosir Diterapkan
                  </span>
                )}
              </div>
            ) : null}
            {isOutOfStock && (
              <p className="text-xs font-bold text-[#DC2626] dark:text-red-400">Stok telah habis.</p>
            )}

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
                    <p className="whitespace-pre-line">
                      {product.description || `Layanan ${product.name} bergaransi resmi dengan proses aktivasi instan & aman.`}
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
                    {product.terms ? (
                      <p className="whitespace-pre-line text-[#475569] dark:text-[#CBD5E1] leading-relaxed text-xs sm:text-sm">{product.terms}</p>
                    ) : (
                      <>
                        <p className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                          Ketentuan Pembelian Androidstore.web.id:
                        </p>
                        <ul className="list-disc pl-4 space-y-1 text-[#64748B] dark:text-[#94A3B8]">
                          <li>Pastikan data akun / email yang diberikan sudah benar sebelum menyelesaikan pesanan.</li>
                          <li>Klaim garansi wajib menyertakan nomor invoice atau ID pesanan WhatsApp.</li>
                          <li>Dilarang mengubah data akun atau melanggar TOS layanan penyedia.</li>
                          <li>Penyelesaian pesanan rata-rata berlangsung 5 - 15 menit sesuai antrean.</li>
                        </ul>
                      </>
                    )}
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

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {(() => {
              const sameCategory = allProducts.filter(p => p.id !== product.id && p.category === product.category);
              const fallback = allProducts.filter(p => p.id !== product.id);
              const list = sameCategory.length > 0 ? sameCategory : fallback;
              return list.slice(0, 5).map(p => (
                <div
                  key={p.id}
                  onClick={() => {
                    if (onSelectProduct) onSelectProduct(p);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-white dark:bg-[#111A2B] border border-[#E2E8F0] dark:border-[#26364D] rounded-xl overflow-hidden shadow-xs hover:shadow-lg hover:border-[#2583F7] dark:hover:border-[#38BDF8] hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="w-full aspect-square bg-[#F8FAFC] dark:bg-[#080D18] relative overflow-hidden flex items-center justify-center p-4">
                      <img
                        src={p.image || '/assets/default_produk.png'}
                        alt={p.name}
                        loading="lazy"
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
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
