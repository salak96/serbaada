import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { ShoppingCart, Menu, Search, X, ReceiptText, ShieldCheck, ChevronDown, Sun, Moon } from 'lucide-react';
import ImgLogo from '../assets/logo.png';
import { Product } from '../types/product';

interface HeaderProps {
  cartCount: number;
  onCartClick: () => void;
  onMenuClick: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  suggestions?: Product[];
  onSelectSuggestion?: (product: Product) => void;
  onViewAllResults?: () => void;
  onOpenCheckTransaction?: () => void;
  onOpenTopSultan?: () => void;
  onOpenAdminLogin?: () => void;
  onLogoClick?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  variant?: 'dark' | 'light';
}

// Kotak pencarian + dropdown saran live (dipakai desktop & mobile).
// Ketik huruf pertama langsung menampilkan produk yang cocok (maks 8);
// klik saran membuka halaman detail produk itu.
function SearchBox({
  value,
  onChange,
  suggestions,
  onSelectSuggestion,
  onViewAllResults,
  isLight,
  placeholder
}: {
  value: string;
  onChange: (value: string) => void;
  suggestions: Product[];
  onSelectSuggestion: (product: Product) => void;
  onViewAllResults: () => void;
  isLight: boolean;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  // Tutup dropdown saat klik di luar kotak pencarian.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const showDropdown = open && value.trim() !== '' && suggestions.length > 0;

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      setHighlight(h => Math.min(h + 1, suggestions.length - 1));
      setOpen(true);
    } else if (e.key === 'ArrowUp' && suggestions.length > 0) {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (suggestions.length > 0) {
        e.preventDefault();
        onSelectSuggestion(suggestions[highlight] ?? suggestions[0]);
        setOpen(false);
      } else if (value.trim() !== '') {
        onViewAllResults();
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="relative w-full">
      <div
        className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${
          isLight ? 'text-[#64748B]' : 'text-[#94A3B8]'
        }`}
      >
        <Search className="w-4 h-4" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setHighlight(0); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className={`w-full pl-10 pr-9 py-2 rounded-xl text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#2583F7]/25 focus:border-[#2583F7] ${
          isLight
            ? 'bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A] placeholder-[#94A3B8] focus:bg-white'
            : 'bg-[#111A2B] border border-[#26364D] text-[#F8FAFC] placeholder-[#94A3B8]/70 focus:bg-[#101827]'
        }`}
      />
      {value && (
        <button
          type="button"
          onClick={() => { onChange(''); setOpen(false); }}
          aria-label="Bersihkan pencarian"
          className={`absolute inset-y-0 right-0 pr-3 flex items-center ${
            isLight ? 'text-[#64748B] hover:text-[#0F172A]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {showDropdown && (
        <div
          className={`absolute left-0 right-0 top-full mt-2 z-50 overflow-hidden rounded-xl border shadow-xl max-h-80 overflow-y-auto ${
            isLight ? 'bg-white border-[#E2E8F0]' : 'bg-[#111A2B] border-[#26364D]'
          }`}
        >
          {suggestions.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onSelectSuggestion(p); setOpen(false); }}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                i === highlight ? (isLight ? 'bg-[#F1F5F9]' : 'bg-[#1A263D]') : ''
              }`}
            >
              <img
                src={p.image}
                alt=""
                className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-[#F1F5F9] dark:bg-[#0B1220]"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <span className="flex-1 min-w-0">
                <span className={`block truncate text-xs font-bold ${isLight ? 'text-[#0F172A]' : 'text-[#F8FAFC]'}`}>
                  {p.name}
                </span>
                <span className={`block text-[11px] ${isLight ? 'text-[#64748B]' : 'text-[#94A3B8]'}`}>
                  {p.category}
                </span>
              </span>
              <span className="text-xs font-black text-[#2583F7] flex-shrink-0">
                Rp{p.price.toLocaleString('id-ID')}
              </span>
            </button>
          ))}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onViewAllResults(); setOpen(false); }}
            className={`w-full px-3 py-2.5 text-center text-xs font-bold border-t ${
              isLight
                ? 'text-[#2583F7] border-[#E2E8F0] hover:bg-[#F1F5F9]'
                : 'text-[#38BDF8] border-[#26364D] hover:bg-[#1A263D]'
            }`}
          >
            Lihat semua hasil untuk &ldquo;{value.trim()}&rdquo;
          </button>
        </div>
      )}
    </div>
  );
}

export function Header({
  cartCount,
  onCartClick,
  onMenuClick,
  searchValue,
  onSearchChange,
  suggestions = [],
  onSelectSuggestion,
  onViewAllResults,
  onOpenCheckTransaction,
  onOpenTopSultan,
  onOpenAdminLogin,
  onLogoClick,
  isDarkMode = false,
  onToggleDarkMode,
  variant = 'light'
}: HeaderProps) {
  const isLight = variant === 'light';

  // Saran wajib ada callback-nya; kalau tidak dikirim, jadikan no-op agar aman.
  const handleSelectSuggestion = onSelectSuggestion ?? (() => {});
  const handleViewAllResults = onViewAllResults ?? (() => {});

  return (
    <header
      className={`sticky top-0 z-40 transition-all ${
        isLight
          ? 'bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-[0_2px_12px_rgba(15,23,42,0.04)] text-[#0F172A]'
          : 'bg-[#0B1220]/95 backdrop-blur-md border-b border-[#26364D] shadow-[0_4px_20px_rgba(0,0,0,0.5)] text-[#F8FAFC]'
      }`}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3 lg:gap-5">
          
          {/* Left: Mobile Menu Toggle & Androidstore Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onMenuClick}
              aria-label="Buka menu navigasi"
              className={`lg:hidden p-2 -ml-1 rounded-xl border transition-colors ${
                isLight
                  ? 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] border-transparent hover:border-[#E2E8F0]'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111A2B] border-transparent hover:border-[#26364D]'
              }`}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Brand Logo & Title with click to home */}
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                if (onLogoClick) onLogoClick();
              }}
              className="flex items-center gap-2.5 group select-none cursor-pointer"
              title="Ke Halaman Awal — Androidstore.web.id"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#2583F7] to-[#38BDF8] p-1.5 flex items-center justify-center shadow-[0_0_15px_rgba(37,131,247,0.35)] group-hover:scale-105 transition-transform flex-shrink-0">
                <img
                  src={ImgLogo}
                  alt="Logo Androidstore"
                  className="w-full h-full object-contain filter brightness-0 invert"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>

              <div className="flex flex-col">
                <span
                  className={`text-base sm:text-lg lg:text-xl font-black tracking-tight flex items-center gap-0.5 group-hover:text-[#2583F7] transition-colors ${
                    isLight ? 'text-[#0F172A]' : 'text-[#F8FAFC]'
                  }`}
                >
                  ANDROIDSTORE<span className="text-[#2583F7]">.WEB.ID</span>
                </span>
                <span
                  className={`text-[10px] tracking-wider font-semibold uppercase hidden sm:block ${
                    isLight ? 'text-[#64748B]' : 'text-[#94A3B8]'
                  }`}
                >
                  Digital Market &amp; Game Topup
                </span>
              </div>
            </a>
          </div>

          {/* Center: Search Bar on Desktop */}
          <div className="flex-1 hidden md:flex items-center justify-center max-w-md mx-2">
            <SearchBox
              value={searchValue}
              onChange={onSearchChange}
              suggestions={suggestions}
              onSelectSuggestion={handleSelectSuggestion}
              onViewAllResults={handleViewAllResults}
              isLight={isLight}
              placeholder="Cari produk digital, akun premium, lisensi..."
            />
          </div>

          {/* Right: Menus & Action Items */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Desktop Navigation Menus */}
            <nav className="hidden lg:flex items-center gap-1 mr-1">
              <button
                type="button"
                onClick={() => onLogoClick && onLogoClick()}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  isLight
                    ? 'text-[#0F172A] hover:text-[#2583F7] hover:bg-[#F1F5F9] border-transparent'
                    : 'text-[#F8FAFC] hover:text-[#38BDF8] hover:bg-[#111A2B] border-transparent hover:border-[#26364D]'
                }`}
              >
                Katalog
              </button>

              <button
                type="button"
                onClick={onOpenCheckTransaction}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  isLight
                    ? 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] border-transparent'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111A2B] border-transparent hover:border-[#26364D]'
                }`}
              >
                <ReceiptText className="w-3.5 h-3.5 text-[#2583F7]" />
                <span>Cek Transaksi</span>
              </button>

              <button
                type="button"
                onClick={onOpenTopSultan}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  isLight
                    ? 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] border-transparent'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111A2B] border-transparent hover:border-[#26364D]'
                }`}
              >
                <span className="text-sm">👑</span>
                <span>Top Sultan</span>
              </button>

              {onOpenAdminLogin && (
                <button
                  type="button"
                  onClick={onOpenAdminLogin}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                    isLight
                      ? 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] border-transparent'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111A2B] border-transparent hover:border-[#26364D]'
                  }`}
                  title="Login Administrator"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2583F7]" />
                  <span>Admin</span>
                </button>
              )}
            </nav>

            {/* Currency Indicator (IDR) */}
            <div
              className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold select-none ${
                isLight
                  ? 'bg-[#F1F5F9] border-[#E2E8F0] text-[#2583F7]'
                  : 'bg-[#111A2B] border-[#26364D] text-[#38BDF8]'
              }`}
            >
              <span>🇮🇩 IDR</span>
              <ChevronDown className="w-3 h-3 text-[#64748B]" />
            </div>

            {/* Dark Mode & Light Mode Switcher Button */}
            {onToggleDarkMode && (
              <button
                type="button"
                onClick={onToggleDarkMode}
                aria-label={isDarkMode ? 'Ganti ke Mode Terang (Light Mode)' : 'Ganti ke Mode Gelap (Dark Mode)'}
                title={isDarkMode ? 'Beralih ke Light Mode' : 'Beralih ke Dark Mode'}
                className={`p-2 rounded-xl border transition-all active:scale-95 flex items-center justify-center ${
                  isLight
                    ? 'bg-[#F1F5F9] hover:bg-[#E2E8F0] border-[#E2E8F0] text-[#0F172A]'
                    : 'bg-[#111A2B] hover:bg-[#1A263D] border-[#26364D] text-[#38BDF8]'
                }`}
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-[#2583F7]" />
                )}
              </button>
            )}

            {/* Cart Button */}
            <button
              type="button"
              onClick={onCartClick}
              aria-label={`Keranjang belanja, ${cartCount} produk`}
              className={`relative flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200 active:scale-95 ${
                isLight
                  ? 'bg-white border-[#E2E8F0] hover:border-[#2583F7] text-[#0F172A] hover:text-[#2583F7] shadow-xs'
                  : 'bg-[#111A2B] border-[#26364D] hover:border-[#2583F7] text-[#F8FAFC] hover:text-[#38BDF8] shadow-soft'
              }`}
            >
              <ShoppingCart className="w-4 h-4 text-[#2583F7]" />
              <span className="hidden sm:inline font-bold text-xs">
                Keranjang
              </span>
              {cartCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-black bg-[#2583F7] text-white rounded-full shadow-[0_0_8px_rgba(37,131,247,0.4)]">
                  {cartCount}
                </span>
              )}
            </button>
          </div>

        </div>

        {/* Mobile Search Bar Row */}
        <div
          className={`md:hidden mt-2.5 pt-2 border-t ${
            isLight ? 'border-[#E2E8F0]' : 'border-[#26364D]/50'
          }`}
        >
          <SearchBox
            value={searchValue}
            onChange={onSearchChange}
            suggestions={suggestions}
            onSelectSuggestion={handleSelectSuggestion}
            onViewAllResults={handleViewAllResults}
            isLight={isLight}
            placeholder="Cari produk digital atau akun..."
          />
        </div>

      </div>
    </header>
  );
}
