import { useEffect } from 'react';
import { X, Plus, Minus, Trash2, MessageCircle, ShoppingBag, ShieldCheck, ArrowRight } from 'lucide-react';
import { CartItem } from '../types/product';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (id: string | number, quantity: number) => void;
  onRemove: (id: string | number) => void;
  onOrderWhatsApp: () => void;
  totalPrice: number;
}

export function CartModal({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemove,
  onOrderWhatsApp,
  totalPrice
}: CartModalProps) {
  // Lock body scroll and handle Escape key when drawer is open
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

  if (!isOpen) return null;

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Keranjang Belanja"
    >
      {/* Backdrop overlay with blur */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm transition-opacity duration-300 animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Drawer Container */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10 pointer-events-none">
        <aside className="w-screen max-w-[440px] bg-[#101827] shadow-drawer flex flex-col pointer-events-auto border-l border-[#26364D] transition-all duration-300 ease-out transform animate-slideIn text-[#F8FAFC]">
          {/* Sticky Header */}
          <header className="sticky top-0 z-10 bg-[#0B1220] px-5 py-4 border-b border-[#26364D] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#2583F7]/15 flex items-center justify-center text-[#38BDF8] border border-[#2583F7]/30 shadow-[0_0_10px_rgba(37,131,247,0.3)]">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                  Keranjang Belanja
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#2583F7]/20 text-[#38BDF8] border border-[#2583F7]/30">
                    {totalItems} item
                  </span>
                </h2>
                <p className="text-xs text-[#94A3B8]">Androidstore.web.id Checkout</p>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Tutup keranjang"
              className="w-9 h-9 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111A2B] border border-transparent hover:border-[#26364D] flex items-center justify-center transition-colors focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </header>

          {/* Scrollable Cart Item List */}
          <div className="flex-1 overflow-y-auto px-5 py-4 divide-y divide-[#26364D]/60">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4">
                <div className="w-20 h-20 rounded-2xl bg-[#111A2B] border border-[#26364D] text-[#38BDF8] flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                  <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
                </div>
                <h3 className="text-base font-bold text-[#F8FAFC] mb-1">
                  Keranjang Anda Masih Kosong
                </h3>
                <p className="text-xs md:text-sm text-[#94A3B8] max-w-xs mb-6">
                  Jelajahi berbagai paket langganan dan produk digital premium dengan harga hemat.
                </p>
                <button
                  onClick={onClose}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2583F7] hover:bg-[#1D4ED8] text-white font-semibold text-sm shadow-[0_0_15px_rgba(37,131,247,0.3)] transition-colors"
                >
                  Mulai Belanja
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-3.5 py-1">
                {cart.map(item => (
                  <article
                    key={item.id}
                    className="p-3.5 bg-[#111A2B] rounded-2xl border border-[#26364D] hover:border-[#2583F7]/60 shadow-card transition-all flex gap-3.5 group"
                  >
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-[#080D18] flex-shrink-0 border border-[#26364D]">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {item.discount > 0 && (
                        <span className="absolute top-1 left-1 bg-[#EF4444] text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm">
                          -{item.discount}%
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h3 className="font-semibold text-sm text-[#F8FAFC] line-clamp-2 leading-tight">
                            {item.name}
                          </h3>
                          <button
                            onClick={() => onRemove(item.id)}
                            aria-label={`Hapus ${item.name}`}
                            className="text-[#94A3B8] hover:text-[#EF4444] hover:bg-red-950/40 p-1 rounded-lg transition-colors -mt-0.5 -mr-1"
                            title="Hapus produk"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-medium text-[#94A3B8]">
                            {item.category}
                          </span>
                          <span className="text-[#94A3B8]/40 text-[10px]">•</span>
                          {item.provider === 'Abellab Reseller' ? (
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/80">
                              Supplier Abellab Reseller
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-[#38BDF8] bg-[#2583F7]/15 px-1.5 py-0.5 rounded border border-[#2583F7]/30">
                              Supplier Prs Digital
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-end justify-between gap-2 mt-2 pt-1 border-t border-[#26364D]/60">
                        <div>
                          {item.oldPrice > item.price && (
                            <span className="block text-[11px] text-[#94A3B8] line-through leading-none">
                              {formatPrice(item.oldPrice)}
                            </span>
                          )}
                          <span className="font-bold text-sm md:text-base text-[#38BDF8]">
                            {formatPrice(item.price)}
                          </span>
                        </div>

                        {/* Quantity Stepper */}
                        <div className="flex items-center bg-[#080D18] rounded-xl p-0.5 border border-[#26364D]">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                            aria-label="Kurangi jumlah"
                            className="w-7 h-7 rounded-lg bg-[#111A2B] text-[#F8FAFC] hover:bg-[#1A263D] flex items-center justify-center transition-colors shadow-xs active:scale-95"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <span className="w-8 text-center font-bold text-xs text-[#F8FAFC] tabular-nums">
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            aria-label="Tambah jumlah"
                            className="w-7 h-7 rounded-lg bg-[#111A2B] text-[#F8FAFC] hover:bg-[#1A263D] flex items-center justify-center transition-colors shadow-xs active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* Sticky Checkout Footer */}
          {cart.length > 0 && (
            <footer className="sticky bottom-0 z-10 bg-[#0B1220] border-t border-[#26364D] p-5 space-y-3.5 shadow-[0_-6px_25px_rgba(0,0,0,0.6)]">
              {/* Guarantee trust label */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] text-xs">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">
                  Garansi akun aktif & panduan instalasi langsung via WhatsApp.
                </span>
              </div>

              {/* Total Row */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#94A3B8] block">Total Tagihan</span>
                  <span className="text-xs font-semibold text-[#F8FAFC]">
                    {totalItems} item dipilih
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl md:text-2xl font-black text-[#38BDF8] tabular-nums">
                    {formatPrice(totalPrice)}
                  </span>
                </div>
              </div>

              {/* WhatsApp Checkout Button */}
              <button
                type="button"
                onClick={onOrderWhatsApp}
                className="w-full bg-gradient-to-r from-[#2583F7] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#2583F7] text-white py-3.5 px-4 rounded-xl font-black text-sm md:text-base flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(37,131,247,0.4)] hover:shadow-[0_0_25px_rgba(37,131,247,0.6)] active:scale-[0.99] transition-all"
              >
                <MessageCircle className="w-5 h-5 fill-white/20 stroke-white" />
                Pesan Sekarang via WhatsApp
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full text-center text-xs text-[#94A3B8] hover:text-[#F8FAFC] font-medium py-1 transition-colors"
              >
                ← Lanjut Pilih Produk Lain
              </button>
            </footer>
          )}
        </aside>
      </div>
    </div>
  );
}
