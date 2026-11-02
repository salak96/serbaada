import { useEffect, useState } from 'react';
import {
  X,
  ChevronDown,
  ChevronUp,
  Home,
  Layers,
  Sparkles,
  MessageSquare,
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
}

const CATEGORIES = [
  'Editing & Desain',
  'AI & Edukasi',
  'Streaming & Hiburan',
  'Voucher & Digital'
];

export function MenuModal({
  isOpen,
  onClose,
  onCategorySelect,
  onOpenCheckTransaction,
  onOpenTopSultan,
  onOpenAdminLogin,
  onLogoClick,
  isDarkMode = false,
  onToggleDarkMode
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
        <aside className="w-screen max-w-xs bg-[#0B1220] shadow-drawer flex flex-col pointer-events-auto border-r border-[#26364D] transform transition-all duration-300 ease-out animate-slideInLeft text-[#F8FAFC]">
          
          {/* Header with Logo Click */}
          <div className="px-5 py-4 bg-[#0B1220] border-b border-[#26364D] flex items-center justify-between">
            <button
              type="button"
              onClick={handleHomeClick}
              className="flex items-center gap-2 text-left group"
              title="Ke Halaman Awal"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#2583F7] to-[#38BDF8] text-white flex items-center justify-center font-black text-xs shadow-[0_0_10px_rgba(37,131,247,0.4)] group-hover:scale-105 transition-transform">
                AS
              </div>
              <span className="font-extrabold text-base tracking-tight group-hover:text-[#2583F7] transition-colors">
                ANDROIDSTORE<span className="text-[#38BDF8]">.ID</span>
              </span>
            </button>

            <button
              onClick={onClose}
              aria-label="Tutup menu"
              className="w-8 h-8 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111A2B] border border-transparent hover:border-[#26364D] flex items-center justify-center transition-colors focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
            <button
              type="button"
              onClick={handleHomeClick}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[#F8FAFC] hover:text-[#38BDF8] hover:bg-[#111A2B] font-semibold text-sm transition-colors text-left"
            >
              <Home className="w-4 h-4 text-[#38BDF8]" />
              <span>Halaman Awal (Katalog)</span>
            </button>

            {/* Dark Mode & Light Mode row */}
            {onToggleDarkMode && (
              <button
                type="button"
                onClick={onToggleDarkMode}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[#F8FAFC] hover:bg-[#111A2B] font-semibold text-sm transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isDarkMode ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-[#38BDF8]" />
                  )}
                  <span>Mode Tampilan</span>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-[#080D18] text-[#38BDF8] border border-[#26364D] font-bold">
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
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111A2B] font-semibold text-sm transition-colors text-left"
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
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111A2B] font-semibold text-sm transition-colors text-left"
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
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111A2B] font-semibold text-sm transition-colors text-left"
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
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[#F8FAFC] hover:bg-[#111A2B] font-bold text-sm transition-colors border border-transparent hover:border-[#26364D]"
              >
                <div className="flex items-center gap-3">
                  <Layers className="w-4 h-4 text-[#2583F7]" />
                  <span>Kategori Produk</span>
                </div>
                {isKategoriExpanded ? (
                  <ChevronUp className="w-4 h-4 text-[#94A3B8]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#94A3B8]" />
                )}
              </button>

              {isKategoriExpanded && (
                <div className="mt-1 ml-4 pl-3 border-l-2 border-[#26364D] space-y-1 py-1">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryClick(cat)}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs md:text-sm font-medium text-[#94A3B8] hover:text-[#38BDF8] hover:bg-[#111A2B] transition-colors flex items-center justify-between"
                    >
                      <span>{cat}</span>
                      <Sparkles className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Support Info */}
            <div className="pt-6 mt-4 border-t border-[#26364D]">
              <div className="p-3.5 rounded-2xl bg-[#111A2B] border border-[#26364D] space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#F8FAFC]">
                  <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                  <span>Jaminan Transaksi</span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  Layanan live support resmi Androidstore.web.id siap melayani 24/7.
                </p>
                <a
                  href="https://wa.me/6285867336036"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#38BDF8] hover:underline pt-1"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Hubungi CS (+62 858-6733-6036)
                </a>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-[#26364D] p-4 text-center text-xs text-[#94A3B8] bg-[#080D18]">
            © 2026 Androidstore.web.id — All Rights Reserved
          </div>
        </aside>
      </div>
    </div>
  );
}
