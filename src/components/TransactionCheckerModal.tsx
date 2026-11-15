import { useState, useEffect } from 'react';
import { X, Search, ReceiptText, CheckCircle2, Clock, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { getPrsApiKey } from '../services/productService';

interface TransactionCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
  whatsappNumber?: string;
}

interface TransactionResult {
  orderId: string | number;
  productName: string;
  quantity: number;
  totalPrice: number;
  status: 'delivered' | 'pending' | 'cancelled';
  date: string;
  deliveredEmailMasked?: string;
  hasDeliveryPassword?: boolean;
}

// Logo WhatsApp resmi (Simple Icons, CC0) — diklik membuka chat ke nomor CS.
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

export function TransactionCheckerModal({ isOpen, onClose, isDarkMode = true, whatsappNumber = '6285867336036' }: TransactionCheckerModalProps) {
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

  // Nomor CS dari Pengaturan website: hanya digit, awalan 0 diubah ke 62.
  const waNumber = (whatsappNumber || '6285867336036').replace(/\D/g, '').replace(/^0/, '62');
  const whatsappUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent('Halo Admin Androidstore.web.id! Saya butuh bantuan terkait transaksi saya.')}`;

  // Palet modal mengikuti Mode Tampilan (dark = navy seperti sebelumnya, light = putih).
  const c = {
    panel: isDarkMode ? 'bg-[#101827] border-[#26364D] text-[#F8FAFC]' : 'bg-white border-[#E2E8F0] text-[#0F172A]',
    header: isDarkMode ? 'bg-[#0B1220] border-[#26364D]' : 'bg-white border-[#E2E8F0]',
    title: isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]',
    closeBtn: isDarkMode
      ? 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111A2B] hover:border-[#26364D]'
      : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] hover:border-[#E2E8F0]',
    muted: isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]',
    input: isDarkMode
      ? 'bg-[#080D18] border-[#26364D] text-[#F8FAFC] placeholder-[#94A3B8]/60'
      : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] placeholder-[#94A3B8]/60',
    errorBox: isDarkMode
      ? 'bg-red-950/30 border-red-800/50 text-red-300'
      : 'bg-red-50 border-red-200 text-red-600',
    errorIcon: isDarkMode ? 'text-red-400' : 'text-red-500',
    resultBox: isDarkMode ? 'bg-[#111A2B] border-[#26364D]' : 'bg-[#F0F7FF] border-[#DCE8F5]',
    resultValue: isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]',
    accountBox: isDarkMode ? 'bg-[#080D18] border-[#26364D]' : 'bg-white border-[#E2E8F0]',
    footer: isDarkMode ? 'bg-[#0B1220] border-[#26364D] text-[#94A3B8]' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]',
  };

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
      // 1. Cek dulu ke database toko sendiri (invoice / ID pesanan).
      const storeRes = await fetch(`/api/orders/${encodeURIComponent(cleanId)}`);
      if (storeRes.ok) {
        const json = await storeRes.json();
        const o = json.order;
        const qty = Array.isArray(o.products) && o.products.length
          ? o.products.reduce((s: number, p: { quantity?: number }) => s + Number(p.quantity || 1), 0)
          : 1;
        setResult({
          orderId: o.invoice_number || o.id,
          productName: o.product_name || 'Produk Digital',
          quantity: qty,
          totalPrice: o.total_amount || 0,
          status: o.order_status === 'delivered' ? 'delivered' : (o.order_status === 'cancelled' ? 'cancelled' : 'pending'),
          date: o.created_at ? new Date(o.created_at).toLocaleString('id-ID') : 'Baru saja',
          deliveredEmailMasked: o.delivery_email_masked || '',
          hasDeliveryPassword: !!o.has_delivery_password
        });
        setIsLoading(false);
        return;
      }

      // 2. Fallback: cek ke API supplier (Prs) untuk pesanan lama.
      const apiKey = getPrsApiKey();
      const numericId = parseInt(cleanId.replace(/\D/g, ''), 10);

      if (numericId && apiKey) {
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
          });
          setIsLoading(false);
          return;
        }
      }

      // Jika tidak ditemukan di database toko maupun supplier:
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
          className={`w-full max-w-lg ${c.panel} border rounded-2xl shadow-modal text-left overflow-hidden transform transition-all duration-300 animate-scaleUp`}
        >
          {/* Header */}
          <div className={`px-5 py-4 ${c.header} border-b flex items-center justify-between`}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#2583F7]/15 text-[#38BDF8] flex items-center justify-center border border-[#2583F7]/30">
                <ReceiptText className="w-4 h-4" />
              </div>
              <h2 className={`text-base font-bold ${c.title}`}>
                Cek Status Transaksi
              </h2>
            </div>

            <button
              onClick={onClose}
              className={`w-8 h-8 rounded-xl ${c.closeBtn} border border-transparent flex items-center justify-center transition-colors`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <div className="p-5 space-y-4">
            <p className={`text-xs ${c.muted} leading-relaxed`}>
              Lacak status pembayaran, detail pesanan, dan pengiriman akun digital Anda secara instan dengan memasukkan ID Transaksi.
            </p>

            <form onSubmit={handleSearch} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={invoiceId}
                  onChange={(e) => setInvoiceId(e.target.value)}
                  placeholder="Masukkan Nomor Invoice / Order ID (contoh: ORD-41983521)"
                  className={`w-full px-3.5 py-2.5 ${c.input} border rounded-xl text-xs focus:outline-none focus:border-[#2583F7] focus:ring-1 focus:ring-[#2583F7]`}
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
              <div className={`p-3 ${c.errorBox} border rounded-xl text-xs flex items-start gap-2`}>
                <AlertCircle className={`w-4 h-4 ${c.errorIcon} flex-shrink-0 mt-0.5`} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Result Found */}
            {result && (
              <div className={`p-4 ${c.resultBox} border rounded-xl space-y-3`}>
                <div className={`flex items-center justify-between border-b ${isDarkMode ? 'border-[#26364D]' : 'border-[#E2E8F0]'} pb-2`}>
                  <span className={`text-xs ${c.muted}`}>ID Pesanan: #{result.orderId}</span>
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
                    <span className={c.muted}>Produk:</span>
                    <span className={`font-semibold ${c.resultValue}`}>{result.productName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={c.muted}>Jumlah:</span>
                    <span className={`font-semibold ${c.resultValue}`}>{result.quantity} unit</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={c.muted}>Total Tagihan:</span>
                    <span className="font-bold text-[#38BDF8]">{formatPrice(result.totalPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={c.muted}>Waktu:</span>
                    <span className={c.muted}>{result.date}</span>
                  </div>
                </div>

                {(result.deliveredEmailMasked || result.hasDeliveryPassword) && (
                  <div className={`mt-3 p-2.5 ${c.accountBox} border rounded-lg space-y-1`}>
                    <span className="text-[10px] font-bold text-[#38BDF8] block">
                      Data Akun / Lisensi Digital:
                    </span>
                    {result.deliveredEmailMasked && (
                      <div className="flex justify-between gap-2 text-xs">
                        <span className={c.muted}>Email:</span>
                        <code className={`font-mono ${c.resultValue} break-all text-right`}>{result.deliveredEmailMasked}</code>
                      </div>
                    )}
                    {result.hasDeliveryPassword && (
                      <div className="flex justify-between gap-2 text-xs">
                        <span className={c.muted}>Password:</span>
                        <code className={`font-mono ${c.resultValue}`}>••••••••</code>
                      </div>
                    )}
                    <p className={`text-[10px] ${c.muted} pt-1`}>Data lengkap dikirim ke WhatsApp Anda.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className={`px-5 py-3 ${c.footer} border-t text-center text-[11px] flex items-center justify-center gap-2 flex-wrap`}>
            <span>Butuh bantuan transaksi? Chat WhatsApp resmi:</span>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Hubungi CS via WhatsApp"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#25D366] hover:bg-[#1DA851] text-white text-[11px] font-bold transition-colors"
            >
              <WhatsAppIcon className="w-3.5 h-3.5" />
              Hubungi CS
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
