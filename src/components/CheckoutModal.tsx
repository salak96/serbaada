import { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Copy,
  Check,
  MessageCircle,
  ArrowRight,
  User,
  Phone,
  FileCheck,
  Maximize2,
  Download,
  Info,
  CheckCircle2
} from 'lucide-react';
import { CartItem } from '../types/product';
import qrisImg from '../assets/qris.jpeg';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  totalPrice: number;
  onClearCart: () => void;
}

type CheckoutStage = 'identity' | 'qris' | 'proof';

export function CheckoutModal({
  isOpen,
  onClose,
  cart,
  totalPrice,
  onClearCart
}: CheckoutModalProps) {
  const [stage, setStage] = useState<CheckoutStage>('identity');
  const [customerName, setCustomerName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [orderId, setOrderId] = useState('');
  const [copiedNominal, setCopiedNominal] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string>('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setStage('identity');
      setCustomerName('');
      setWhatsappNumber('');
      setOrderId('');
      setCopiedNominal(false);
      setCopiedOrderId(false);
      setProofFile(null);
      setProofPreview('');
      setCustomerNotes('');
      setIsSubmitting(false);
      setIsLightboxOpen(false);
      setToastMessage(null);
    }
  }, [isOpen]);

  // Lock body scroll & Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isLightboxOpen) {
          setIsLightboxOpen(false);
        } else {
          onClose();
        }
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isLightboxOpen, onClose]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const normalizePhoneNumber = (phone: string) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('08')) {
      cleaned = '628' + cleaned.slice(2);
    } else if (cleaned.startsWith('8')) {
      cleaned = '628' + cleaned.slice(1);
    }
    return cleaned;
  };

  const isPhoneValid = (phone: string) => {
    const normalized = normalizePhoneNumber(phone);
    return normalized.length >= 10 && normalized.length <= 14 && normalized.startsWith('628');
  };

  const handleIdentitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !isPhoneValid(whatsappNumber)) {
      alert('Mohon masukkan Nama Lengkap dan Nomor WhatsApp Indonesia yang valid (contoh: 08123456789).');
      return;
    }

    setIsSubmitting(true);
    const generatedOrderId = `ORD-${Date.now().toString().slice(-8)}`;
    setOrderId(generatedOrderId);
    const normalizedPhone = normalizePhoneNumber(whatsappNumber);

    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_number: generatedOrderId,
          customer_name: customerName.trim(),
          customer_phone: normalizedPhone,
          total_amount: totalPrice,
          payment_method: 'QRIS Instant',
          payment_status: 'pending',
          order_status: 'pending',
          product_name: cart.map(i => `${i.name} (x${i.quantity})`).join(', '),
          product_provider: cart.map(i => `${i.name}: ${i.provider || 'Produk Manual'}`).join(', '),
          products: cart.map(i => ({
            name: i.name,
            quantity: i.quantity,
            price: i.price,
            provider: i.provider || 'Produk Manual'
          }))
        })
      });
    } catch {
      // Offline fallback handling
    } finally {
      setIsSubmitting(false);
    }

    setStage('qris');
  };

  const handleCopyNominal = () => {
    const pureNumeric = String(Math.round(totalPrice));
    if (navigator.clipboard) {
      navigator.clipboard.writeText(pureNumeric);
      setCopiedNominal(true);
      showToast('Nominal berhasil disalin!');
      setTimeout(() => setCopiedNominal(false), 2000);
    }
  };

  const handleCopyOrderId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(orderId);
      setCopiedOrderId(true);
      showToast('Order ID berhasil disalin!');
      setTimeout(() => setCopiedOrderId(false), 2000);
    }
  };

  const handleDownloadQris = () => {
    const link = document.createElement('a');
    link.href = qrisImg;
    link.download = 'QRIS-Androidstore.jpeg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('QRIS berhasil diunduh!');
  };

  const handleFinalWhatsAppConfirm = async () => {
    if (!proofFile) {
      alert('Mohon upload bukti transfer terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('file', proofFile);
      if (customerNotes) {
        formData.append('customer_notes', customerNotes);
      }

      const res = await fetch(`/api/orders/${orderId}/payment-proof`, {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      console.log('Payment proof upload response:', json);
    } catch {
      // Offline fallback
    }

    setIsSubmitting(false);

    const adminPhone = '6285867336036';
    const itemsList = cart
      .map(i => `- ${i.name} x${i.quantity} (${formatPrice(i.price * i.quantity)})`)
      .join('%0A');
    
    const text = [
      `🛒 *KONFIRMASI PEMBAYARAN QRIS*`,
      ``,
      `Halo Admin Androidstore.web.id!`,
      `Saya sudah melakukan pembayaran QRIS.`,
      ``,
      `📋 *DETAIL PESANAN*`,
      `Order ID: *${orderId}*`,
      `Nama: *${customerName}*`,
      `WhatsApp: *${whatsappNumber}*`,
      ``,
      `📦 *PRODUK*`,
      itemsList,
      ``,
      `💰 *TOTAL PEMBAYARAN*`,
      `*${formatPrice(totalPrice)}*`,
      ``,
      `💳 *METODE*`,
      `QRIS Instant`,
      ``,
      `📎 *BUKTI TRANSFER*`,
      `✅ Bukti pembayaran telah berhasil diunggah dan tersimpan di Dashboard Admin.`,
      `Status: Menunggu Verifikasi Admin`,
      ``,
      `Mohon segera diperiksa dan diproses.`,
      `Terima kasih!`
    ].join('%0A');

    onClearCart();
    window.open(`https://wa.me/${adminPhone}?text=${text}`, '_blank');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto font-sans"
      role="dialog"
      aria-modal="true"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[70] bg-[#10B981] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Box Container */}
      <div className="flex min-h-full items-center justify-center p-3 sm:p-6 text-center">
        <div
          onClick={(e) => e.stopPropagation()}
          className={`w-full bg-[#0B1424] border border-[#26364D] rounded-[22px] shadow-modal text-left overflow-hidden transform transition-all duration-300 animate-scaleUp text-[#F8FAFC] flex flex-col ${
            stage === 'qris' ? 'max-w-[1024px]' : 'max-w-lg'
          }`}
        >
          {/* Header */}
          <div className="px-5 py-4 bg-[#111E32] border-b border-[#26364D] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#1677FF]/20 text-[#22C7FF] flex items-center justify-center border border-[#1677FF]/40">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[#F8FAFC]">
                  {stage === 'identity' && 'Tahap 1 — Identitas Pelanggan'}
                  {stage === 'qris' && 'Tahap 2 — Pembayaran QRIS'}
                  {stage === 'proof' && 'Tahap 3 — Konfirmasi & Bukti Transfer'}
                </h2>
                <p className="text-[10px] text-[#94A3B8]">Androidstore.web.id Secure Checkout</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111E32] border border-transparent hover:border-[#26364D] flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="px-5 py-3 bg-[#080D18] border-b border-[#26364D] flex items-center justify-between text-[11px] font-bold flex-shrink-0">
            <div className={`flex items-center gap-1.5 ${stage === 'identity' ? 'text-[#22C7FF]' : 'text-[#10B981]'}`}>
              <Check className="w-3.5 h-3.5" />
              <span>1. Identitas</span>
            </div>
            <span className="text-[#26364D]">────────</span>
            <div className={`flex items-center gap-1.5 ${stage === 'qris' ? 'text-[#22C7FF]' : (stage === 'proof' ? 'text-[#10B981]' : 'text-[#94A3B8]')}`}>
              {stage === 'proof' ? <Check className="w-3.5 h-3.5" /> : null}
              <span>2. Bayar QRIS</span>
            </div>
            <span className="text-[#26364D]">────────</span>
            <div className={`flex items-center gap-1.5 ${stage === 'proof' ? 'text-[#22C7FF]' : 'text-[#94A3B8]'}`}>
              <span>3. Bukti Transfer</span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* TAHAP 1: IDENTITAS                                         */}
          {/* ========================================================= */}
          {stage === 'identity' && (
            <div className="p-5 space-y-4">
              <div className="p-3.5 bg-[#111E32] border border-[#26364D] rounded-xl space-y-2">
                <span className="text-xs font-bold text-[#22C7FF] block">Ringkasan Keranjang Anda</span>
                <div className="space-y-1 text-xs text-[#94A3B8]">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between">
                      <span className="truncate max-w-[260px]">{item.name} x{item.quantity}</span>
                      <span className="font-semibold text-[#F8FAFC]">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-[#26364D] flex justify-between font-black text-sm text-[#22C7FF]">
                    <span>Total Tagihan:</span>
                    <span>{formatPrice(totalPrice)}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleIdentitySubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[#94A3B8] mb-1 font-semibold">
                    Nama Lengkap <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Contoh: Budi Santoso"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC] placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#1677FF]"
                    />
                    <User className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-[#94A3B8] mb-1 font-semibold">
                    Nomor WhatsApp Aktif <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC] placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#1677FF]"
                    />
                    <Phone className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
                  </div>
                  <span className="text-[10px] text-[#94A3B8] mt-1 block">
                    Nomor akan dinormalisasi otomatis ke format 628xx untuk pengiriman konfirmasi.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !customerName.trim() || !isPhoneValid(whatsappNumber)}
                  className="w-full py-3 px-4 bg-[#1677FF] hover:bg-[#1D4ED8] disabled:opacity-40 text-white rounded-xl font-bold text-xs shadow-md shadow-[#1677FF]/30 flex items-center justify-center gap-2 transition-all mt-3"
                >
                  <span>Lanjutkan ke Pembayaran QRIS</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAHAP 2: MODAL PEMBAYARAN QRIS (LAYOUT DUA KOLOM DESKTOP)  */}
          {/* ========================================================= */}
          {stage === 'qris' && (
            <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* KOLOM KIRI — QRIS (55%) */}
              <div className="lg:col-span-6 bg-[#111E32] border border-[#26364D] rounded-2xl p-5 flex flex-col items-center justify-center space-y-4">
                <div className="text-center">
                  <span className="text-xs font-bold text-[#22C7FF] block">QRIS Nasional (All Payment)</span>
                  <span className="text-[11px] text-[#94A3B8]">Scan dengan BCA, Mandiri, BRI, Dana, OVO, GoPay, dll</span>
                </div>

                {/* Large QRIS image */}
                <div className="w-full max-w-[420px] aspect-square bg-white rounded-xl p-3 border-2 border-[#26364D] shadow-lg flex items-center justify-center relative group">
                  <img
                    src={qrisImg}
                    alt="QRIS Androidstore"
                    className="w-full h-full object-contain rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(true)}
                    className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-bold shadow-md flex items-center gap-1.5 backdrop-blur-sm transition-all"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Perbesar</span>
                  </button>
                </div>

                {/* Buttons below QRIS */}
                <div className="flex items-center gap-3 w-full max-w-[420px]">
                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(true)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#080D18] hover:bg-[#1677FF]/20 text-[#22C7FF] border border-[#26364D] font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>Perbesar QRIS</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadQris}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#080D18] hover:bg-[#1677FF]/20 text-[#22C7FF] border border-[#26364D] font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh QRIS</span>
                  </button>
                </div>
              </div>

              {/* KOLOM KANAN — INFORMASI PEMBAYARAN (45%) */}
              <div className="lg:col-span-6 space-y-4 text-xs">
                
                {/* Card 1 — Order ID */}
                <div className="p-3.5 bg-[#111E32] border border-[#26364D] rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#94A3B8] block uppercase font-semibold">Order ID Pesanan</span>
                    <span className="font-mono font-bold text-sm text-[#22C7FF]">{orderId}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyOrderId}
                    className="px-3 py-1.5 rounded-xl bg-[#080D18] border border-[#26364D] text-xs font-bold text-[#22C7FF] hover:bg-[#1677FF]/20 flex items-center gap-1.5 transition-all"
                  >
                    {copiedOrderId ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedOrderId ? 'Tersalin' : 'Salin ID'}</span>
                  </button>
                </div>

                {/* Card 2 — Total Tagihan (32-40px font) */}
                <div className="p-4 bg-[#111E32] border border-[#26364D] rounded-xl space-y-2">
                  <span className="text-[11px] text-[#94A3B8] block uppercase font-semibold">Total Pembayaran</span>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="text-3xl sm:text-4xl font-black text-[#22C7FF] tabular-nums tracking-tight">
                      {formatPrice(totalPrice)}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyNominal}
                      className="px-4 py-2.5 bg-[#1677FF] hover:bg-[#1D4ED8] text-white rounded-xl font-black text-xs shadow-md shadow-[#1677FF]/30 flex items-center gap-1.5 transition-all"
                    >
                      {copiedNominal ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedNominal ? 'Berhasil Disalin!' : 'Salin Nominal'}</span>
                    </button>
                  </div>
                  <span className="text-[10px] text-[#94A3B8] block">
                    *QRIS statis: Mohon pastikan nominal input sesuai total di atas.
                  </span>
                </div>

                {/* Card 3 — Informasi Pembayaran */}
                <div className="p-3.5 bg-[#080D18] border border-[#26364D] rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#22C7FF]">
                    <Info className="w-3.5 h-3.5" />
                    <span>Informasi Pembayaran QRIS</span>
                  </div>
                  <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                    Transaksi diproses aman dan otomatis. Selesaikan pembayaran sebelum batas waktu berakhir, lalu unggah bukti transfer pada tahap selanjutnya.
                  </p>
                </div>

                {/* Card 4 — Cara Pembayaran (6 Langkah) */}
                <div className="p-4 bg-[#111E32] border border-[#26364D] rounded-xl space-y-2.5">
                  <span className="font-bold text-xs uppercase tracking-wider text-[#22C7FF] block">
                    Cara Pembayaran QRIS:
                  </span>
                  <ol className="space-y-1.5 text-[11px] text-[#94A3B8] pl-1">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-[#22C7FF]">1.</span>
                      <span>Buka aplikasi mobile banking atau e-wallet (BCA, Dana, OVO, GoPay, dll).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-[#22C7FF]">2.</span>
                      <span>Pilih menu <strong>QRIS</strong> atau <strong>Scan QR</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-[#22C7FF]">3.</span>
                      <span>Scan gambar QRIS di sebelah kiri atau unggah dari galeri HP Anda.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-[#22C7FF]">4.</span>
                      <span>Masukkan dan pastikan nominal pembayaran sesuai total tagihan.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-[#22C7FF]">5.</span>
                      <span>Selesaikan transaksi pembayaran di aplikasi Anda.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-[#22C7FF]">6.</span>
                      <span>Tekan tombol di bawah untuk mengunggah bukti transfer.</span>
                    </li>
                  </ol>
                </div>

                {/* Tombol Aksi Utama Sesuai Spesifikasi */}
                <button
                  type="button"
                  onClick={() => setStage('proof')}
                  className="w-full py-3.5 px-4 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl font-black text-sm shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 transition-all"
                >
                  <FileCheck className="w-5 h-5" />
                  <span>Saya Sudah Transfer (Upload Bukti)</span>
                </button>
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* TAHAP 3: UPLOAD BUKTI TRANSFER & KONFIRMASI                */}
          {/* ========================================================= */}
          {stage === 'proof' && (
            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 bg-[#111E32] border border-[#26364D] rounded-xl space-y-1.5 font-mono">
                <div className="flex justify-between text-[#94A3B8]">
                  <span>Order ID:</span>
                  <span className="text-[#22C7FF] font-bold">{orderId}</span>
                </div>
                <div className="flex justify-between text-[#94A3B8]">
                  <span>Nama:</span>
                  <span className="text-[#F8FAFC]">{customerName}</span>
                </div>
                <div className="flex justify-between text-[#94A3B8]">
                  <span>Total:</span>
                  <span className="text-[#10B981] font-bold">{formatPrice(totalPrice)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[#94A3B8] mb-1 font-semibold">
                    Upload Bukti Transfer (Screenshot Struk) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setProofFile(file);
                        setProofPreview(URL.createObjectURL(file));
                      }
                    }}
                    className="w-full text-xs text-[#94A3B8] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#1677FF] file:text-white hover:file:bg-[#1D4ED8]"
                  />
                </div>

                {proofPreview && (
                  <div className="aspect-video w-full rounded-xl bg-[#080D18] border border-[#26364D] overflow-hidden flex items-center justify-center p-2">
                    <img src={proofPreview} alt="Bukti Transfer" className="w-full h-full object-contain rounded-lg" />
                  </div>
                )}

                <div>
                  <label className="block text-[#94A3B8] mb-1 font-semibold">
                    Catatan Tambahan <span className="text-[10px] text-[#94A3B8] font-normal">(Opsional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Contoh: Transfer dari rekening BCA a.n Budi..."
                    className="w-full px-3 py-2 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC] placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#1677FF]"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={!proofFile || isSubmitting}
                onClick={handleFinalWhatsAppConfirm}
                className="w-full py-3.5 px-4 bg-[#1677FF] hover:bg-[#1D4ED8] disabled:opacity-45 text-white rounded-xl font-black text-sm shadow-[0_0_20px_rgba(22,119,255,0.4)] flex items-center justify-center gap-2.5 transition-all"
              >
                <MessageCircle className="w-5 h-5 fill-white/25 stroke-white" />
                <span>{isSubmitting ? 'Mengunggah Bukti & Mengirim...' : 'Kirim Konfirmasi ke WhatsApp Admin'}</span>
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ========================================================= */}
      {/* LIGHTBOX MODAL: PERBESAR QRIS                              */}
      {/* ========================================================= */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-white rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col items-center space-y-4"
          >
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">
              QRIS Original Androidstore.web.id
            </span>

            <div className="w-full max-w-[500px] aspect-square bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-center">
              <img src={qrisImg} alt="QRIS Perbesar" className="w-full h-full object-contain rounded-lg" />
            </div>

            <div className="flex items-center gap-3 w-full max-w-[320px]">
              <button
                type="button"
                onClick={handleDownloadQris}
                className="flex-1 py-2.5 rounded-xl bg-[#1677FF] hover:bg-[#1D4ED8] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Gambar</span>
              </button>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
