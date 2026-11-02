import { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  Check,
  ShieldCheck,
  Tag,
  QrCode,
  Landmark,
  Wallet,
  MessageCircle,
  AlertCircle,
  Zap,
  ShoppingBag
} from 'lucide-react';
import { Product } from '../types/product';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, recipientEmail?: string, recipientId?: string) => void;
}

interface PaymentMethod {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  desc: string;
  icon: typeof QrCode;
  fee: number;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'qris',
    name: 'QRIS Instant (Semua E-Wallet & Bank)',
    badge: 'Otomatis',
    badgeColor: 'text-[#10B981] bg-[#10B981]/15 border-[#10B981]/30',
    desc: 'BCA Mobile, Mandiri, BRI, BNI, Dana, GoPay, OVO, ShopeePay',
    icon: QrCode,
    fee: 0
  },
  {
    id: 'bank',
    name: 'Transfer Bank (BCA / Mandiri / BRI)',
    badge: 'Verifikasi Cepat',
    badgeColor: 'text-[#38BDF8] bg-[#38BDF8]/15 border-[#38BDF8]/30',
    desc: 'Transfer manual ke rekening resmi Androidstore.web.id',
    icon: Landmark,
    fee: 0
  },
  {
    id: 'ewallet',
    name: 'E-Wallet (Dana / GoPay / OVO)',
    badge: 'Instan',
    badgeColor: 'text-[#38BDF8] bg-[#38BDF8]/15 border-[#38BDF8]/30',
    desc: 'Kirim langsung ke nomor E-Wallet resmi admin',
    icon: Wallet,
    fee: 0
  },
  {
    id: 'whatsapp',
    name: 'Order Langsung via CS WhatsApp',
    badge: 'Support 24/7',
    badgeColor: 'text-[#10B981] bg-[#10B981]/15 border-[#10B981]/30',
    desc: 'Transaksi langsung dipandu customer service kami',
    icon: MessageCircle,
    fee: 0
  }
];

// Valid demo coupon database
const COUPONS: Record<string, { type: 'percent' | 'flat'; value: number; minBuy: number }> = {
  ANDROIDHEMAT: { type: 'percent', value: 10, minBuy: 20000 },
  DISKON5RB: { type: 'flat', value: 5000, minBuy: 25000 },
  PROMOSTORE: { type: 'flat', value: 10000, minBuy: 50000 },
  PRS10: { type: 'percent', value: 10, minBuy: 10000 }
};

export function ProductDetailModal({
  product,
  isOpen,
  onClose,
  onAddToCart
}: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponMessage, setCouponMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string>('qris');
  const [isAddedToCart, setIsAddedToCart] = useState(false);

  // Reset state when product changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setRecipientEmail('');
      setRecipientId('');
      setCouponCode('');
      setAppliedCoupon(null);
      setCouponMessage(null);
      setSelectedPayment('qris');
      setIsAddedToCart(false);
    }
  }, [isOpen, product]);

  // Lock body scroll and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const maxStock = typeof product.stock === 'number' && product.stock > 0 ? product.stock : 25;
  const isUnconfigured = !product.price || product.price <= 0;
  const isOutOfStock = product.availability === 'out_of_stock' || (typeof product.stock === 'number' && product.stock <= 0) || isUnconfigured;

  // Dynamic unit price with wholesale calculation
  const isWholesaleApplied = !!(product.isWholesale && product.wholesaleMin && quantity >= product.wholesaleMin && product.wholesalePrice);
  const unitPrice = isWholesaleApplied ? (product.wholesalePrice || product.price) : product.price;
  const subtotal = unitPrice * quantity;

  // Calculate discount from coupon
  const discountAmount = appliedCoupon ? appliedCoupon.discount : 0;
  const selectedPaymentFee = PAYMENT_METHODS.find(p => p.id === selectedPayment)?.fee || 0;
  const finalTotal = Math.max(0, subtotal - discountAmount + selectedPaymentFee);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = couponCode.trim().toUpperCase();
    if (!cleanCode) {
      setCouponMessage({ type: 'error', text: 'Masukkan kode kupon terlebih dahulu.' });
      return;
    }

    const coupon = COUPONS[cleanCode];
    if (!coupon) {
      setCouponMessage({ type: 'error', text: `Kupon "${cleanCode}" tidak valid atau telah kadaluarsa.` });
      setAppliedCoupon(null);
      return;
    }

    if (subtotal < coupon.minBuy) {
      setCouponMessage({
        type: 'error',
        text: `Minimal pembelian untuk kupon ini adalah ${formatPrice(coupon.minBuy)}.`
      });
      setAppliedCoupon(null);
      return;
    }

    let discount = 0;
    if (coupon.type === 'percent') {
      discount = Math.round((subtotal * coupon.value) / 100);
    } else {
      discount = coupon.value;
    }

    setAppliedCoupon({ code: cleanCode, discount });
    setCouponMessage({
      type: 'success',
      text: `Kupon "${cleanCode}" berhasil diterapkan! Hemat ${formatPrice(discount)}.`
    });
  };

  const handleProcessOrder = () => {
    if (isOutOfStock) return;

    // Validate recipient fields if required
    if (product.requires_email && !recipientEmail.trim()) {
      alert('Mohon masukkan email penerima untuk aktivasi produk ini.');
      return;
    }

    const phoneNumber = '6285867336036';
    const paymentName = PAYMENT_METHODS.find(p => p.id === selectedPayment)?.name || 'QRIS';

    const lines = [
      `Halo Androidstore.web.id! Saya ingin memesan:`,
      `📦 Produk: ${product.name}`,
      `🏷️ Server: ${product.provider || 'Prs Digital'}`,
      `🔢 Jumlah: ${quantity} unit`,
      `💰 Harga Satuan: ${formatPrice(unitPrice)}`,
      recipientEmail ? `📧 Email Penerima: ${recipientEmail}` : '',
      recipientId ? `👤 ID / Akun: ${recipientId}` : '',
      appliedCoupon ? `🎟️ Kupon: ${appliedCoupon.code} (-${formatPrice(appliedCoupon.discount)})` : '',
      `💳 Pembayaran: ${paymentName}`,
      `💵 Total Akhir: ${formatPrice(finalTotal)}`,
      ``,
      `Mohon diproses, terima kasih!`
    ].filter(Boolean);

    const message = encodeURIComponent(lines.join('\n'));
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };

  const handleAddToCartClick = () => {
    onAddToCart(product, quantity, recipientEmail, recipientId);
    setIsAddedToCart(true);
    setTimeout(() => {
      setIsAddedToCart(false);
    }, 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Black backdrop with smooth blur */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Center Modal Container */}
      <div className="flex min-h-full items-center justify-center p-3 sm:p-5 text-center">
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-[#101827] border border-[#26364D] rounded-2xl shadow-modal text-left flex flex-col max-h-[90vh] overflow-hidden transform transition-all duration-300 ease-out animate-scaleUp relative"
        >
          {/* Header */}
          <div className="px-5 py-4 bg-[#0B1220] border-b border-[#26364D] flex items-center justify-between gap-3 sticky top-0 z-20">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#080D18] border border-[#26364D] flex-shrink-0">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#2583F7]/15 text-[#38BDF8] border border-[#2583F7]/30">
                    {product.category}
                  </span>
                  <span className="text-[10px] text-[#94A3B8]">
                    {product.provider === 'Abellab Reseller' ? 'Supplier Abellab Reseller' : 'Supplier Prs Digital'}
                  </span>
                </div>
                <h2 id="modal-title" className="text-sm sm:text-base font-bold text-[#F8FAFC] truncate">
                  {product.name}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup modal"
              className="w-9 h-9 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111A2B] border border-transparent hover:border-[#26364D] flex items-center justify-center transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-sm text-[#F8FAFC]">
            
            {/* Bagian 1 — Atur Jumlah dan Data Penerima */}
            <section className="bg-[#111A2B] border border-[#26364D] rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-[#26364D]/60 pb-3">
                <span className="font-bold text-xs uppercase tracking-wider text-[#38BDF8] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  Bagian 1 — Atur Jumlah & Data Penerima
                </span>

                <div className="text-right">
                  <span className="text-xs text-[#94A3B8] block">Harga Satuan</span>
                  {isUnconfigured ? (
                    <span className="text-xs text-amber-500 font-bold">Belum diatur</span>
                  ) : (
                    <span className="font-black text-[#38BDF8]">
                      {formatPrice(unitPrice)}
                    </span>
                  )}
                </div>
              </div>

              {/* Wholesale Promo Callout */}
              {product.isWholesale && product.wholesaleMin && product.wholesalePrice && (
                <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                  isWholesaleApplied
                    ? 'bg-[#10B981]/10 border-[#10B981]/40 text-[#10B981]'
                    : 'bg-[#2583F7]/10 border-[#2583F7]/30 text-[#38BDF8]'
                }`}>
                  <span className="font-semibold">
                    🔥 Promo Grosir Beli {product.wholesaleMin}+ : {formatPrice(product.wholesalePrice)} /unit
                  </span>
                  {isWholesaleApplied && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#10B981] text-white">
                      Aktif!
                    </span>
                  )}
                </div>
              )}

              {/* Quantity Stepper Row */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-[#F8FAFC] block">
                    Jumlah Pembelian
                  </label>
                  <span className="text-[11px] text-[#94A3B8]">
                    {isOutOfStock ? 'Stok Habis' : `Tersedia: ${maxStock} unit`}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 bg-[#080D18] p-1 rounded-xl border border-[#26364D]">
                  <button
                    type="button"
                    disabled={quantity <= 1 || isOutOfStock}
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-lg bg-[#111A2B] hover:bg-[#1A263D] text-[#F8FAFC] disabled:opacity-40 flex items-center justify-center transition-colors"
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
                    className="w-12 text-center bg-transparent font-bold text-sm text-[#F8FAFC] focus:outline-none"
                  />

                  <button
                    type="button"
                    disabled={quantity >= maxStock || isOutOfStock}
                    onClick={() => setQuantity(q => Math.min(maxStock, q + 1))}
                    className="w-8 h-8 rounded-lg bg-[#111A2B] hover:bg-[#1A263D] text-[#F8FAFC] disabled:opacity-40 flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Dynamic Recipient Fields */}
              <div className="pt-2 border-t border-[#26364D]/60 space-y-3">
                {product.requires_email && (
                  <div>
                    <label className="text-xs font-bold text-[#F8FAFC] block mb-1">
                      Email Akun Penerima / Aktivasi <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="contoh: namaanda@gmail.com"
                      className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-xs text-[#F8FAFC] placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#2583F7] focus:ring-1 focus:ring-[#2583F7]"
                      required
                    />
                    <span className="text-[10px] text-[#94A3B8] mt-0.5 block">
                      Akses atau link aktivasi akan dikirimkan ke email ini.
                    </span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-[#F8FAFC] block mb-1">
                    ID Telegram / Catatan Pesanan <span className="text-[10px] text-[#94A3B8] font-normal">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                    placeholder="@username_telegram atau pesan khusus..."
                    className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-xs text-[#F8FAFC] placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#2583F7] focus:ring-1 focus:ring-[#2583F7]"
                  />
                </div>
              </div>
            </section>

            {/* Bagian 2 — Kode Promo / Kupon */}
            <section className="bg-[#111A2B] border border-[#26364D] rounded-xl p-4 space-y-2.5">
              <span className="font-bold text-xs uppercase tracking-wider text-[#38BDF8] flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                Bagian 2 — Kode Promo / Kupon Diskon
              </span>

              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Contoh: ANDROIDHEMAT, PROMOSTORE..."
                  className="flex-1 px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-xs text-[#F8FAFC] uppercase placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#2583F7]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2583F7] hover:bg-[#1D4ED8] text-white rounded-xl font-bold text-xs transition-all shadow-xs"
                >
                  Gunakan
                </button>
              </form>

              {couponMessage && (
                <div className={`p-2 rounded-lg text-xs flex items-center gap-1.5 ${
                  couponMessage.type === 'success'
                    ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30'
                    : 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
                }`}>
                  {couponMessage.type === 'success' ? (
                    <Check className="w-3.5 h-3.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  )}
                  <span>{couponMessage.text}</span>
                </div>
              )}
            </section>

            {/* Bagian 3 — Pilih Metode Pembayaran */}
            <section className="bg-[#111A2B] border border-[#26364D] rounded-xl p-4 space-y-3">
              <span className="font-bold text-xs uppercase tracking-wider text-[#38BDF8] flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" />
                Bagian 3 — Pilih Metode Pembayaran
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PAYMENT_METHODS.map(method => {
                  const Icon = method.icon;
                  const isSelected = selectedPayment === method.id;
                  return (
                    <div
                      key={method.id}
                      onClick={() => setSelectedPayment(method.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#2583F7]/15 border-[#2583F7] shadow-[0_0_12px_rgba(37,131,247,0.3)]'
                          : 'bg-[#080D18] border-[#26364D] hover:border-[#2583F7]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            isSelected ? 'bg-[#2583F7] text-white' : 'bg-[#111A2B] text-[#38BDF8]'
                          }`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-bold text-xs text-[#F8FAFC]">
                            {method.name.split('(')[0].trim()}
                          </span>
                        </div>

                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${method.badgeColor}`}>
                          {method.badge}
                        </span>
                      </div>

                      <p className="text-[10px] text-[#94A3B8] line-clamp-1 leading-relaxed">
                        {method.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Bagian 4 — Ringkasan & Konfirmasi */}
            <section className="bg-[#111A2B] border border-[#26364D] rounded-xl p-4 space-y-2.5">
              <span className="font-bold text-xs uppercase tracking-wider text-[#38BDF8] block border-b border-[#26364D]/60 pb-2">
                Bagian 4 — Ringkasan & Rincian Pembayaran
              </span>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#94A3B8]">
                  <span>Produk</span>
                  <span className="text-[#F8FAFC] font-semibold text-right max-w-[200px] truncate">
                    {product.name}
                  </span>
                </div>

                <div className="flex justify-between text-[#94A3B8]">
                  <span>Jumlah</span>
                  <span className="text-[#F8FAFC] font-semibold">{quantity} unit</span>
                </div>

                <div className="flex justify-between text-[#94A3B8]">
                  <span>Subtotal</span>
                  <span className="text-[#F8FAFC] font-semibold tabular-nums">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-[#10B981]">
                    <span>Diskon Kupon ({appliedCoupon.code})</span>
                    <span className="font-bold tabular-nums">
                      -{formatPrice(appliedCoupon.discount)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-[#94A3B8]">
                  <span>Biaya Transaksi</span>
                  <span className="text-[#10B981] font-bold">Gratis</span>
                </div>

                <div className="pt-2 border-t border-[#26364D] flex justify-between items-center text-sm font-black">
                  <span className="text-[#F8FAFC]">Total Pembayaran</span>
                  <span className="text-[#38BDF8] text-base tabular-nums shadow-xs">
                    {formatPrice(finalTotal)}
                  </span>
                </div>
              </div>
            </section>

          </div>

          {/* Modal Sticky Footer Action Buttons */}
          <div className="p-4 bg-[#0B1220] border-t border-[#26364D] flex flex-col sm:flex-row items-center gap-2.5 sticky bottom-0 z-20">
            <button
              type="button"
              disabled={isOutOfStock}
              onClick={handleAddToCartClick}
              className={`w-full sm:w-auto px-4 py-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                isAddedToCart
                  ? 'bg-[#10B981]/20 border-[#10B981] text-[#10B981]'
                  : 'bg-[#111A2B] hover:bg-[#1A263D] border-[#26364D] hover:border-[#2583F7] text-[#38BDF8]'
              }`}
            >
              {isAddedToCart ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Tersimpan di Keranjang!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>Tambah ke Keranjang</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isOutOfStock}
              onClick={handleProcessOrder}
              className={`w-full sm:flex-1 py-3 px-5 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                isOutOfStock
                  ? 'bg-[#111A2B] text-[#94A3B8] border border-[#26364D] cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#2583F7] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#2583F7] text-white shadow-[0_0_20px_rgba(37,131,247,0.4)] hover:shadow-[0_0_25px_rgba(37,131,247,0.6)] active:scale-[0.99]'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Lanjutkan Pembayaran ({formatPrice(finalTotal)})</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
