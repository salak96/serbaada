import { useEffect, useState } from 'react';
import {
  X,
  ChevronDown,
  ChevronUp,
  Home,
  Layers,
  Sparkles,
  ShieldCheck,
  ReceiptText,
  Sun,
  Moon
} from 'lucide-react';

interface MenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategorySelect: (category: string | null) => void;
  onOpenCheckTransaction?: () => void;
  onOpenTopSultan?: () => void;
  onOpenAdminLogin?: () => void;
  onLogoClick?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  whatsappNumber?: string;
}

const CATEGORIES = [
  'Editing & Desain',
  'AI & Edukasi',
  'Streaming & Hiburan',
  'Voucher & Digital'
];

// Logo WhatsApp resmi (Simple Icons, CC0) — diklik membuka chat ke nomor CS.
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

export function MenuModal({
  isOpen,
  onClose,
  onCategorySelect,
  onOpenCheckTransaction,
  onOpenTopSultan,
  onOpenAdminLogin,
  onLogoClick,
  isDarkMode = false,
  onToggleDarkMode,
  whatsappNumber = '6285867336036'
}: MenuModalProps) {
  const [isKategoriExpanded, setIsKategoriExpanded] = useState(true);

  // Keyboard navigation & body scroll lock
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

  const handleCategoryClick = (category: string | null) => {
    onCategorySelect(category);
    onClose();
  };

  const handleHomeClick = () => {
    if (onLogoClick) onLogoClick();
    onClose();
  };

  // Nomor CS dari Pengaturan website: hanya digit, awalan 0 diubah ke 62.
  const waNumber = (whatsappNumber || '6285867336036').replace(/\D/g, '').replace(/^0/, '62');
  const whatsappUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent('Halo Admin Androidstore.web.id! Saya butuh bantuan terkait produk digital.')}`;

  // Palet sidebar mengikuti Mode Tampilan (dark = navy seperti sebelumnya, light = putih).
  const c = {
    panel: isDarkMode ? 'bg-[#0B1220] border-[#26364D] text-[#F8FAFC]' : 'bg-white border-[#E2E8F0] text-[#0F172A]',
    header: isDarkMode ? 'bg-[#0B1220] border-[#26364D]' : 'bg-white border-[#E2E8F0]',
    closeBtn: isDarkMode
      ? 'text-[#64748B] hover:text-[#F8FAFC] hover:bg-[#111A2B] hover:border-[#26364D]'
      : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] hover:border-[#E2E8F0]',
    navPrimary: isDarkMode
      ? 'text-[#F8FAFC] hover:bg-[#111A2B]'
      : 'text-[#0F172A] hover:bg-[#F1F5F9]',
    navSecondary: isDarkMode
      ? 'text-[#64748B] hover:text-[#F8FAFC] hover:bg-[#111A2B]'
      : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]',
    modePill: isDarkMode
      ? 'bg-[#080D18] text-[#38BDF8] border-[#26364D]'
      : 'bg-[#F0F7FF] text-[#1D4ED8] border-[#DCE8F5]',
    catItem: isDarkMode
      ? 'text-[#64748B] hover:text-[#38BDF8] hover:bg-[#111A2B]'
      : 'text-[#64748B] hover:text-[#1D4ED8] hover:bg-[#F1F5F9]',
    catBorder: isDarkMode ? 'border-[#26364D]' : 'border-[#E2E8F0]',
    chevron: isDarkMode ? 'text-[#64748B]' : 'text-[#64748B]',
    divider: isDarkMode ? 'border-[#26364D]' : 'border-[#E2E8F0]',
    csCard: isDarkMode ? 'bg-[#111A2B] border-[#26364D]' : 'bg-[#F0F7FF] border-[#DCE8F5]',
    csTitle: isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]',
    csDesc: isDarkMode ? 'text-[#64748B]' : 'text-[#64748B]',
    footer: isDarkMode ? 'bg-[#080D18] border-[#26364D] text-[#64748B]' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]',
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Menu Navigasi"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 flex max-w-full pr-10 pointer-events-none">
        <aside className={`w-screen max-w-xs ${c.panel} shadow-drawer flex flex-col pointer-events-auto border-r transform transition-all duration-300 ease-out animate-slideInLeft`}>

          {/* Header with Logo Click */}
          <div className={`px-5 py-4 ${c.header} border-b flex items-center justify-between`}>
            <button
              type="button"
              onClick={handleHomeClick}
              className="flex items-center gap-2 text-left group"
              title="Ke Halaman Awal"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#1D4ED8] to-[#38BDF8] text-white flex items-center justify-center font-black text-xs shadow-[0_0_10px_rgba(37,131,247,0.4)] group-hover:scale-105 transition-transform">
                AS
              </div>
              <span className="font-extrabold text-base tracking-tight group-hover:text-[#1D4ED8] transition-colors">
                ANDROIDSTORE<span className="text-[#38BDF8]">.ID</span>
              </span>
            </button>

            <button
              onClick={onClose}
              aria-label="Tutup menu"
              className={`w-8 h-8 rounded-xl ${c.closeBtn} border border-transparent flex items-center justify-center transition-colors focus:outline-none`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
            <button
              type="button"
              onClick={handleHomeClick}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl ${c.navPrimary} hover:text-[#38BDF8] font-semibold text-sm transition-colors text-left`}
            >
              <Home className="w-4 h-4 text-[#38BDF8]" />
              <span>Halaman Awal (Katalog)</span>
            </button>

            {/* Dark Mode & Light Mode row */}
            {onToggleDarkMode && (
              <button
                type="button"
                onClick={onToggleDarkMode}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl ${c.navPrimary} font-semibold text-sm transition-colors`}
              >
                <div className="flex items-center gap-3">
                  {isDarkMode ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-[#38BDF8]" />
                  )}
                  <span>Mode Tampilan</span>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-lg ${c.modePill} border font-bold`}>
                  {isDarkMode ? '🌙 Mode Gelap' : '☀️ Mode Terang'}
                </span>
              </button>
            )}

            {onOpenCheckTransaction && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCheckTransaction();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl ${c.navSecondary} font-semibold text-sm transition-colors text-left`}
              >
                <ReceiptText className="w-4 h-4 text-[#38BDF8]" />
                <span>Cek Transaksi</span>
              </button>
            )}

            {onOpenTopSultan && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTopSultan();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl ${c.navSecondary} font-semibold text-sm transition-colors text-left`}
              >
                <span className="text-base">👑</span>
                <span>Top Sultan (Leaderboard)</span>
              </button>
            )}

            {onOpenAdminLogin && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAdminLogin();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl ${c.navSecondary} font-semibold text-sm transition-colors text-left`}
              >
                <ShieldCheck className="w-4 h-4 text-[#38BDF8]" />
                <span>Login Administrator</span>
              </button>
            )}

            {/* Categories Accordion */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsKategoriExpanded(!isKategoriExpanded)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl ${c.navPrimary} font-bold text-sm transition-colors border border-transparent ${isDarkMode ? 'hover:border-[#26364D]' : 'hover:border-[#E2E8F0]'}`}
              >
                <div className="flex items-center gap-3">
                  <Layers className="w-4 h-4 text-[#1D4ED8]" />
                  <span>Kategori Produk</span>
                </div>
                {isKategoriExpanded ? (
                  <ChevronUp className={`w-4 h-4 ${c.chevron}`} />
                ) : (
                  <ChevronDown className={`w-4 h-4 ${c.chevron}`} />
                )}
              </button>

              {isKategoriExpanded && (
                <div className={`mt-1 ml-4 pl-3 border-l-2 ${c.catBorder} space-y-1 py-1`}>
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryClick(cat)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs md:text-sm font-medium ${c.catItem} transition-colors flex items-center justify-between`}
                    >
                      <span>{cat}</span>
                      <Sparkles className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Support Info */}
            <div className={`pt-6 mt-4 border-t ${c.divider}`}>
              <div className={`p-3.5 rounded-2xl ${c.csCard} border space-y-2`}>
                <div className={`flex items-center gap-2 text-xs font-bold ${c.csTitle}`}>
                  <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                  <span>Jaminan Transaksi</span>
                </div>
                <p className={`text-[11px] ${c.csDesc} leading-relaxed`}>
                  Layanan live support resmi Androidstore.web.id siap melayani 24/7.
                </p>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Hubungi CS via WhatsApp"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1DA851] text-white text-xs font-bold transition-colors"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  Hubungi CS
                </a>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={`border-t ${c.footer} p-4 text-center text-xs`}>
            © 2026 Androidstore.web.id — All Rights Reserved
          </div>
        </aside>
      </div>
    </div>
  );
}
