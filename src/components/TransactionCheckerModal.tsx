import { useState, useEffect } from 'react';
import { X, Search, ReceiptText, CheckCircle2, Clock, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { getPrsApiKey } from '../services/productService';

interface TransactionCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TransactionResult {
  orderId: string | number;
  productName: string;
  quantity: number;
  totalPrice: number;
  status: 'delivered' | 'pending' | 'cancelled';
  date: string;
  deliveredKey?: string;
}

export function TransactionCheckerModal({ isOpen, onClose }: TransactionCheckerModalProps) {
  const [invoiceId, setInvoiceId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TransactionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setInvoiceId('');
      setResult(null);
      setErrorMessage(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = invoiceId.trim();
    if (!cleanId) {
      setErrorMessage('Masukkan ID Transaksi atau Invoice terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setResult(null);

    try {
      const apiKey = getPrsApiKey();
      const numericId = parseInt(cleanId.replace(/\D/g, ''), 10);

      if (numericId && apiKey) {
        // Attempt fetch from Prs API order check endpoint
        const res = await fetch(`https://api.prastyaaneki.biz.id/v1/order/${numericId}`, {
          headers: {
            'x-api-key': apiKey,
            'Accept': 'application/json'
          }
        });

        if (res.ok) {
          const data = await res.json();
          setResult({
            orderId: data.order_id || cleanId,
            productName: data.product_name || 'Produk Digital',
            quantity: data.quantity || 1,
            totalPrice: data.price_idr || 0,
            status: data.status === 'delivered' ? 'delivered' : (data.status === 'cancelled' ? 'cancelled' : 'pending'),
            date: data.created_at ? new Date(data.created_at).toLocaleString('id-ID') : 'Baru saja',
            deliveredKey: data.delivered_key
          });
          setIsLoading(false);
          return;
        }
      }

      // If not found in API directly or testing custom format:
      // Provide clean structured response
      setErrorMessage(`Transaksi dengan ID "${cleanId}" tidak ditemukan. Pastikan nomor ID atau Invoice yang Anda masukkan sudah benar.`);
    } catch {
      setErrorMessage('Terjadi kendala saat memeriksa transaksi. Silakan hubungi Customer Service WhatsApp kami.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-3 sm:p-5 text-center">
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-[#101827] border border-[#26364D] rounded-2xl shadow-modal text-left overflow-hidden transform transition-all duration-300 animate-scaleUp text-[#F8FAFC]"
        >
          {/* Header */}
          <div className="px-5 py-4 bg-[#0B1220] border-b border-[#26364D] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#2583F7]/15 text-[#38BDF8] flex items-center justify-center border border-[#2583F7]/30">
                <ReceiptText className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-[#F8FAFC]">
                Cek Status Transaksi
              </h2>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111A2B] border border-transparent hover:border-[#26364D] flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <div className="p-5 space-y-4">
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Lacak status pembayaran, detail pesanan, dan pengiriman akun digital Anda secara instan dengan memasukkan ID Transaksi.
            </p>

            <form onSubmit={handleSearch} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={invoiceId}
                  onChange={(e) => setInvoiceId(e.target.value)}
                  placeholder="Masukkan Nomor Invoice / Order ID (contoh: 12345)"
                  className="w-full px-3.5 py-2.5 bg-[#080D18] border border-[#26364D] rounded-xl text-xs text-[#F8FAFC] placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#2583F7] focus:ring-1 focus:ring-[#2583F7]"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-[#2583F7] hover:bg-[#1D4ED8] disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-[0_0_15px_rgba(37,131,247,0.3)] flex items-center justify-center gap-2 transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memeriksa Database...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Lacak Pesanan Sekarang</span>
                  </>
                )}
              </button>
            </form>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-red-950/30 border border-red-800/50 rounded-xl text-xs text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Result Found */}
            {result && (
              <div className="p-4 bg-[#111A2B] border border-[#26364D] rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-[#26364D] pb-2">
                  <span className="text-xs text-[#94A3B8]">ID Pesanan: #{result.orderId}</span>
                  {result.status === 'delivered' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#10B981] bg-[#10B981]/15 px-2 py-0.5 rounded-full border border-[#10B981]/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Berhasil Terkirim
                    </span>
                  ) : result.status === 'cancelled' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#EF4444] bg-[#EF4444]/15 px-2 py-0.5 rounded-full border border-[#EF4444]/30">
                      <XCircle className="w-3.5 h-3.5" />
                      Dibatalkan / Refund
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#38BDF8] bg-[#38BDF8]/15 px-2 py-0.5 rounded-full border border-[#38BDF8]/30">
                      <Clock className="w-3.5 h-3.5" />
                      Menunggu Proses
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#94A3B8]">Produk:</span>
                    <span className="font-semibold text-[#F8FAFC]">{result.productName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#94A3B8]">Jumlah:</span>
                    <span className="font-semibold">{result.quantity} unit</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#94A3B8]">Total Tagihan:</span>
                    <span className="font-bold text-[#38BDF8]">{formatPrice(result.totalPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#94A3B8]">Waktu:</span>
                    <span className="text-[#94A3B8]">{result.date}</span>
                  </div>
                </div>

                {result.deliveredKey && (
                  <div className="mt-3 p-2.5 bg-[#080D18] border border-[#26364D] rounded-lg">
                    <span className="text-[10px] font-bold text-[#38BDF8] block mb-1">
                      Data Akun / Lisensi Digital:
                    </span>
                    <code className="text-xs font-mono text-[#F8FAFC] break-all select-all">
                      {result.deliveredKey}
                    </code>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="px-5 py-3 bg-[#0B1220] border-t border-[#26364D] text-center text-[11px] text-[#94A3B8]">
            Butuh bantuan transaksi? Chat WhatsApp resmi:{' '}
            <a
              href="https://wa.me/6285867336036"
              target="_blank"
              rel="noreferrer"
              className="text-[#38BDF8] font-bold hover:underline"
            >
              +62 858-6733-6036
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
