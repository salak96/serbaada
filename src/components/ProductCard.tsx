import { ShoppingCart, Check, Trash2, ArrowRight } from 'lucide-react';
import { Product } from '../types/product';

interface ProductCardProps {
  product: Product;
  isInCart: boolean;
  onAddToCart: (product: Product) => void;
  onRemove: (productId: string | number) => void;
  onOpenDetail?: (product: Product) => void;
}

export function ProductCard({
  product,
  isInCart,
  onAddToCart,
  onRemove,
  onOpenDetail
}: ProductCardProps) {
  const isUnconfigured = !product.price || product.price <= 0;
  const isOutOfStock = product.availability === 'out_of_stock' || (typeof product.stock === 'number' && product.stock <= 0) || isUnconfigured;
  const stockCount = typeof product.stock === 'number' ? product.stock : (isOutOfStock ? 0 : 25);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const handleCardClick = () => {
    if (onOpenDetail) {
      onOpenDetail(product);
    }
  };

  return (
    <article className={`bg-white dark:bg-[#111A2B] rounded-2xl border border-[#E2E8F0] dark:border-[#26364D] hover:border-[#2583F7] dark:hover:border-[#2583F7] shadow-sm dark:shadow-card hover:shadow-md dark:hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between overflow-hidden group hover:-translate-y-1 relative ${isOutOfStock ? 'opacity-85' : ''}`}>
      {/* Product Image & Floating Badges */}
      <div
        onClick={handleCardClick}
        className="relative aspect-[4/3] overflow-hidden bg-[#F8FAFC] dark:bg-[#080D18] cursor-pointer flex items-center justify-center p-3 sm:p-4"
      >
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-contain rounded-xl group-hover:scale-105 transition-transform duration-300 ease-out"
          loading="lazy"
        />

        {/* Gradient Shadow Overlay */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

        {/* Top Badges Row: Stock Status & Wholesale */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1.5 z-10">
          {/* Stock Badge */}
          {isOutOfStock ? (
            <span className="bg-[#EF4444] text-white text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-md shadow-sm">
              Stok Habis
            </span>
          ) : (
            <span className="bg-[#10B981] text-white text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-md shadow-[0_0_8px_rgba(16,185,129,0.5)]">
              Ready {stockCount > 0 ? stockCount : ''}
            </span>
          )}

          {/* Wholesale Badge */}
          {product.isWholesale && (
            <span className="bg-[#2583F7] text-white text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-md shadow-[0_0_8px_rgba(37,131,247,0.5)]">
              Grosir
            </span>
          )}
        </div>

        {/* Category Pill Tag */}
        <div className="absolute top-2.5 right-2.5 bg-[#0B1220]/80 backdrop-blur-md text-[#38BDF8] text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md border border-white/10 dark:border-[#26364D] shadow-sm">
          {product.category}
        </div>
      </div>

      {/* Product Content Details */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Metadata Row: Activation Type */}
          <div className="flex items-center justify-end gap-1 mb-2">
            <span className="text-[10px] font-medium text-[#64748B] dark:text-[#94A3B8]">
              {product.requires_email ? 'Aktivasi Email' : 'Akun Instant'}
            </span>
          </div>

          {/* Product Name */}
          <h3
            onClick={handleCardClick}
            className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-xs sm:text-sm group-hover:text-[#2583F7] dark:group-hover:text-[#38BDF8] transition-colors line-clamp-2 min-h-[34px] sm:min-h-[40px] leading-snug cursor-pointer"
            title={product.name}
          >
            {product.name}
          </h3>

          {/* Short Description */}
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] line-clamp-1 mt-1 leading-normal">
            {product.description ? product.description.replace(/[\r\n]+/g, ' ') : 'Garansi penuh & proses otomatis langsung aktif.'}
          </p>
        </div>

        {/* Pricing & CTA Actions */}
        <div className="mt-3 pt-3 border-t border-[#E2E8F0] dark:border-[#26364D]">
          {/* Old Price Strikethrough if exists */}
          <div className="min-h-[16px]">
            {product.oldPrice > product.price ? (
              <span className="text-[11px] text-[#94A3B8] line-through block tabular-nums">
                {formatPrice(product.oldPrice)}
              </span>
            ) : (
              <span className="text-[11px] text-transparent select-none block">-</span>
            )}
          </div>

          {/* Primary Highlight Price */}
          <div className="text-[#2583F7] dark:text-[#38BDF8] text-base sm:text-lg font-extrabold tabular-nums tracking-tight mb-3">
            {isUnconfigured ? (
              <span className="text-xs text-amber-500 font-bold block truncate">Produk belum diatur</span>
            ) : (
              formatPrice(product.price)
            )}
          </div>

          {/* Action CTA Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {/* Detail / Beli Button (triggers modal/detail) */}
            <button
              type="button"
              onClick={handleCardClick}
              disabled={isOutOfStock}
              className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                isOutOfStock
                  ? 'bg-[#F1F5F9] dark:bg-[#101827] text-[#94A3B8] border border-[#E2E8F0] dark:border-[#26364D] cursor-not-allowed'
                  : 'bg-[#2583F7] hover:bg-[#1D4ED8] text-white shadow-sm shadow-[#2583F7]/30 dark:shadow-[0_0_12px_rgba(37,131,247,0.3)] active:scale-95'
              }`}
            >
              <span>{isUnconfigured ? 'Belum Diatur' : isOutOfStock ? 'Habis' : 'Beli'}</span>
              {!isOutOfStock && <ArrowRight className="w-3.5 h-3.5" />}
            </button>

            {/* Quick Add to Cart button */}
            {isOutOfStock ? (
              <button
                type="button"
                disabled
                className="py-2 px-2 rounded-xl font-semibold text-xs bg-[#F1F5F9] dark:bg-[#101827] text-[#94A3B8]/60 border border-[#E2E8F0] dark:border-[#26364D] cursor-not-allowed flex items-center justify-center"
              >
                Kosong
              </button>
            ) : isInCart ? (
              <button
                type="button"
                onClick={() => onRemove(product.id)}
                className="py-2 px-2 rounded-xl font-bold text-xs bg-red-50 dark:bg-red-950/40 hover:bg-red-600 text-red-600 dark:text-red-400 hover:text-white border border-red-200 dark:border-red-800/60 hover:border-red-600 flex items-center justify-center gap-1 transition-all group/btn"
                title="Hapus dari keranjang"
              >
                <Check className="w-3.5 h-3.5 text-emerald-500 group-hover/btn:hidden" />
                <Trash2 className="w-3.5 h-3.5 hidden group-hover/btn:block" />
                <span className="group-hover/btn:hidden">Ada</span>
                <span className="hidden group-hover/btn:inline">Hapus</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onAddToCart(product)}
                aria-label={`Tambah ${product.name} ke keranjang`}
                className="py-2 px-2 rounded-xl font-bold text-xs bg-white dark:bg-[#101827] hover:bg-[#EFF6FF] dark:hover:bg-[#1A263D] text-[#2583F7] dark:text-[#38BDF8] border border-[#CBD5E1] dark:border-[#26364D] hover:border-[#2583F7] flex items-center justify-center gap-1 transition-all active:scale-95"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-[#2583F7] dark:text-[#38BDF8]" />
                <span>+Keranjang</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
