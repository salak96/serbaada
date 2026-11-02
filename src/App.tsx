import { useState, useMemo, useEffect } from 'react';
import {
  SearchX,
  MessageCircle,
  X,
  CheckCircle2,
  Loader2,
  RefreshCw,
  AlertCircle,
  Search
} from 'lucide-react';
import { Header } from './components/Header';
import { CategorySection } from './components/CategorySection';
import { CartModal } from './components/CartModal';
import { MenuModal } from './components/MenuModal';
import { ProductDetailPage } from './components/ProductDetailPage';
import { CheckoutModal } from './components/CheckoutModal';
import { TransactionCheckerModal } from './components/TransactionCheckerModal';
import { TopSultanModal } from './components/TopSultanModal';
import { AndroidStoreHero } from './components/AndroidStoreHero';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminLoginModal } from './components/admin/AdminLoginModal';
import { useCart } from './hooks/useCart';
import { useTheme } from './hooks/useTheme';
import { fetchProductsFromApi } from './services/productService';
import { Product } from './types/product';

const CANONICAL_CATEGORIES = [
  'Semua',
  'Akun & Langganan',
  'API & Token AI',
  'Akun Game',
  'Item & Currency Game',
  'Voucher & Gift Card',
  'Lisensi Software',
  'VPN & Keamanan',
  'Email & Hosting',
  'Desain & Aset Digital',
  'Template & Source Code',
  'E-book & Kursus',
  'Layanan Sosial Media',
  'Produktifitas & Office',
  'Musik, Film & Streaming',
  'Jasa & Boosting',
  'Jasa Digital Lainnya'
] as const;

function App() {
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCheckTransactionOpen, setIsCheckTransactionOpen] = useState(false);
  const [isTopSultanOpen, setIsTopSultanOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<Product | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { isDarkMode, toggleDarkMode } = useTheme();

  // Dedicated Admin routing check on load and hash/search change
  useEffect(() => {
    const checkAdminRoute = () => {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      if (
        params.has('admin') ||
        params.has('dashboard') ||
        hash === '#admin' ||
        hash === '#dashboard' ||
        window.location.pathname.includes('/admin')
      ) {
        setIsAdminLoginOpen(true);
      }
    };

    checkAdminRoute();
    window.addEventListener('popstate', checkAdminRoute);
    return () => window.removeEventListener('popstate', checkAdminRoute);
  }, []);

  const handleOpenProductDetail = (product: Product) => {
    setSelectedDetailProduct(product);
    window.history.pushState({ productId: product.id }, '', `?p=${encodeURIComponent(product.id)}`);
  };

  const handleBackToCatalog = () => {
    setSelectedDetailProduct(null);
    window.history.pushState({}, '', window.location.pathname);
  };

  const handleGoHome = () => {
    handleBackToCatalog();
    setSelectedCategory('Semua');
    setSelectedProvider(null);
    setSearch('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const pid = params.get('p');
      if (pid && productsList.length > 0) {
        const found = productsList.find(p => String(p.id) === pid);
        if (found) {
          setSelectedDetailProduct(found);
          return;
        }
      }
      setSelectedDetailProduct(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [productsList]);

  // Initial deep link check on load
  useEffect(() => {
    if (productsList.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const pid = params.get('p');
      if (pid) {
        const found = productsList.find(p => String(p.id) === pid);
        if (found) {
          setSelectedDetailProduct(found);
        }
      }
    }
  }, [productsList]);

  const loadProducts = () => {
    setIsLoading(true);
    setErrorMessage(null);
    fetchProductsFromApi()
      .then(items => {
        setProductsList(items);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load products from API:', err);
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Gagal memuat produk dari server API. Periksa koneksi atau API Key Anda.'
        );
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalItems,
    getTotalPrice
  } = useCart();

  const handleAddWithDetails = (
    product: Product,
    quantity = 1,
    recipientEmail?: string,
    recipientId?: string
  ) => {
    for (let i = 0; i < quantity; i++) {
      addToCart({
        ...product,
        recipientEmail,
        recipientId
      });
    }
  };

  const cartProductIds = useMemo(() => {
    return new Set(cart.map(item => item.id));
  }, [cart]);

  const prsCount = useMemo(() => {
    return productsList.filter(p => p.provider === 'Prs Digital').length;
  }, [productsList]);

  const abellabCount = useMemo(() => {
    return productsList.filter(p => p.provider === 'Abellab Reseller').length;
  }, [productsList]);

  const filteredProducts = useMemo(() => {
    let result = productsList;

    if (selectedProvider) {
      result = result.filter(product => product.provider === selectedProvider);
    }

    if (selectedCategory && selectedCategory !== 'Semua') {
      result = result.filter(product => product.category === selectedCategory);
    }

    if (search.trim() !== '') {
      result = result.filter(product =>
        product.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    return result;
  }, [productsList, selectedProvider, selectedCategory, search]);

  const categorizedProducts = useMemo(() => {
    const categories = new Map<string, Product[]>();
    filteredProducts.forEach(product => {
      const categoryProducts = categories.get(product.category) || [];
      categoryProducts.push(product);
      categories.set(product.category, categoryProducts);
    });
    return categories;
  }, [filteredProducts]);

  const handleOrderWhatsApp = () => {
    if (cart.length === 0) return;
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category || 'Semua');
  };

  const handleResetFilters = () => {
    setSelectedCategory('Semua');
    setSelectedProvider(null);
    setSearch('');
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isDarkMode
          ? 'bg-[#080D18] text-[#F8FAFC] selection:bg-[#2583F7]/30 selection:text-[#38BDF8]'
          : 'bg-[#F1F5F9] text-[#0F172A] selection:bg-[#2583F7]/20 selection:text-[#2583F7]'
      }`}
    >
      {/* Top Navbar */}
      <Header
        cartCount={getTotalItems()}
        onCartClick={() => setIsCartOpen(true)}
        onMenuClick={() => setIsMenuOpen(true)}
        searchValue={search}
        onSearchChange={setSearch}
        onOpenCheckTransaction={() => setIsCheckTransactionOpen(true)}
        onOpenTopSultan={() => setIsTopSultanOpen(true)}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
        onLogoClick={handleGoHome}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        variant={isDarkMode ? 'dark' : 'light'}
      />

      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8">
        {selectedDetailProduct ? (
          <ProductDetailPage
            product={selectedDetailProduct}
            allProducts={productsList}
            onBack={handleBackToCatalog}
            onCategorySelect={(cat) => setSelectedCategory(cat)}
            onAddToCart={handleAddWithDetails}
            onInstantBuy={(prod, qty, email, id) => {
              handleAddWithDetails(prod, qty, email, id);
              setIsCartOpen(true);
            }}
            onSelectProduct={(p) => handleOpenProductDetail(p)}
            isDarkMode={isDarkMode}
          />
        ) : (
          <>
            {/* New AndroidStore Hero Section */}
            <AndroidStoreHero
              onExploreClick={() => {
                const el = document.getElementById('katalog');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              onTrackOrderClick={() => setIsCheckTransactionOpen(true)}
              isDarkMode={isDarkMode}
            />

            {/* Section 4: Hero dan Header Katalog */}
            <div id="katalog" className="scroll-mt-24 mb-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
                    Katalog Produk Digital
                  </h2>
                  <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-1">
                    Temukan produk digital premium dengan harga terbaik, proses mudah, dan layanan terpercaya.
                  </p>
                </div>

                {/* Kolom pencarian produk di sisi kanan untuk desktop */}
                <div className="w-full md:w-80">
                  <div className="relative">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Cari produk di katalog..."
                      className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-[#111A2B] border border-[#E2E8F0] dark:border-[#26364D] rounded-xl text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#94A3B8] dark:placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#2583F7] focus:ring-1 focus:ring-[#2583F7]"
                    />
                    <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3 pointer-events-none" />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="absolute right-2.5 top-2.5 text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Filter Kategori Berbentuk Pill/Tab Sesuai Referensi MoraxStore */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mb-4">
                {CANONICAL_CATEGORIES.map(categoryName => {
                  const isActive = selectedCategory === categoryName;
                  return (
                    <button
                      key={categoryName}
                      type="button"
                      onClick={() => setSelectedCategory(categoryName)}
                      className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                        isActive
                          ? 'bg-[#2583F7] text-white border border-[#2583F7] shadow-sm'
                          : 'bg-white dark:bg-[#111A2B] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#26364D] hover:border-[#2583F7]/50'
                      }`}
                    >
                      {categoryName}
                    </button>
                  );
                })}
              </div>

              {/* Provider Clue Filter Bar */}
              {!isLoading && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 pb-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-[#64748B] dark:text-[#94A3B8] font-semibold text-[11px]">
                      Filter Server:
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedProvider(null)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedProvider === null
                          ? 'bg-[#2583F7] text-white shadow-xs'
                          : 'bg-white dark:bg-[#111A2B] text-[#64748B] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#26364D] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
                      }`}
                    >
                      Semua Server ({productsList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedProvider(selectedProvider === 'Prs Digital' ? null : 'Prs Digital')}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedProvider === 'Prs Digital'
                          ? 'bg-[#2583F7] text-white shadow-xs'
                          : 'bg-white dark:bg-[#111A2B] text-[#2583F7] dark:text-[#38BDF8] border border-[#BFDBFE] dark:border-[#2583F7]/40'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2583F7]" />
                      Server Prs Digital ({prsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedProvider(selectedProvider === 'Abellab' ? null : 'Abellab')}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedProvider === 'Abellab'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white dark:bg-[#111A2B] text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/40'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Server Abellab ({abellabCount})
                    </button>
                  </div>

                  {/* Active Filter Indicator Reset Button */}
                  {(selectedCategory !== 'Semua' || selectedProvider || search.trim() !== '') && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2583F7] hover:text-[#1D4ED8] bg-white dark:bg-[#111A2B] px-3 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#26364D] transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reset Filter</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Loading Skeleton State */}
            {isLoading && (
              <div className="py-12 text-center">
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white dark:bg-[#111A2B] border border-[#E2E8F0] dark:border-[#26364D] text-[#0F172A] dark:text-[#F8FAFC] shadow-soft mb-8">
                  <Loader2 className="w-5 h-5 text-[#2583F7] animate-spin" />
                  <span className="text-sm font-semibold">Menghubungkan ke API server & memuat katalog produk...</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3.5 sm:gap-4 lg:gap-5">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-[#111A2B] rounded-2xl border border-[#E2E8F0] dark:border-[#26364D] p-3.5 space-y-3 animate-pulse">
                      <div className="aspect-[16/10] bg-[#F1F5F9] dark:bg-[#080D18] rounded-xl" />
                      <div className="h-4 bg-[#F1F5F9] dark:bg-[#080D18] rounded w-3/4" />
                      <div className="h-3 bg-[#F1F5F9] dark:bg-[#080D18] rounded w-1/2" />
                      <div className="h-7 bg-[#F1F5F9] dark:bg-[#080D18] rounded-xl mt-3" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error State */}
            {!isLoading && errorMessage && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-3xl p-8 sm:p-10 text-center max-w-lg mx-auto my-8">
                <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/40 text-red-500 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-red-800 dark:text-red-300 mb-2">
                  Gagal Memuat Produk
                </h3>
                <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 mb-6">
                  {errorMessage}
                </p>
                <button
                  type="button"
                  onClick={loadProducts}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2583F7] hover:bg-[#1D4ED8] text-white font-semibold text-sm shadow-sm transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Coba Muat Ulang</span>
                </button>
              </div>
            )}

            {/* Empty State When No Products Match Filter / Search */}
            {!isLoading && !errorMessage && categorizedProducts.size === 0 && (
              <div className="bg-white dark:bg-[#111A2B] border border-[#E2E8F0] dark:border-[#26364D] rounded-3xl p-10 sm:p-14 text-center max-w-lg mx-auto my-8 shadow-soft">
                <div className="w-16 h-16 rounded-2xl bg-[#F8FAFC] dark:bg-[#080D18] text-[#94A3B8] flex items-center justify-center mx-auto mb-4 border border-[#E2E8F0] dark:border-[#26364D]">
                  <SearchX className="w-8 h-8 stroke-[1.5]" />
                </div>
                <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2">
                  Tidak Ada Produk yang Ditemukan
                </h3>
                <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mb-6">
                  Maaf, tidak ada produk yang cocok dengan pencarian "{search || selectedCategory}".
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2583F7] text-white font-semibold text-sm hover:bg-[#1D4ED8] shadow-sm transition-colors"
                >
                  <span>Tampilkan Semua Produk</span>
                </button>
              </div>
            )}

            {/* Product Catalog Grouped by Category */}
            {!isLoading && !errorMessage && categorizedProducts.size > 0 && (
              Array.from(categorizedProducts.entries()).map(([category, categoryProducts]) => (
                <CategorySection
                  key={category}
                  category={category}
                  products={categoryProducts}
                  cartProductIds={cartProductIds}
                  onAddToCart={addToCart}
                  onRemove={removeFromCart}
                  onOpenDetail={(product) => handleOpenProductDetail(product)}
                />
              ))
            )}
          </>
        )}
      </main>

      {/* Footer (Dark on Dark Mode, Clean White on Light Mode) */}
      <footer
        className={`border-t mt-16 transition-colors ${
          isDarkMode
            ? 'bg-[#0B1220] border-[#26364D] text-[#F8FAFC]'
            : 'bg-white border-[#E2E8F0] text-[#0F172A]'
        }`}
      >
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Brand column */}
            <div className="md:col-span-2 space-y-3">
              <span
                className={`text-xl font-black tracking-tight ${
                  isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'
                }`}
              >
                ANDROIDSTORE<span className="text-[#2583F7]">.WEB.ID</span>
              </span>
              <p
                className={`text-sm max-w-md leading-relaxed ${
                  isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'
                }`}
              >
                Marketplace produk digital, akun premium, lisensi software, dan voucher game terpercaya di Indonesia. Transaksi otomatis dengan harga modal termurah dan garansi aktif.
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-[#10B981]">
                <CheckCircle2 className="w-4 h-4" />
                <span>Transaksi Terenkripsi &amp; Layanan Resmi 24 Jam</span>
              </div>
            </div>

            {/* Quick links */}
            <div>
              <h4
                className={`font-bold text-sm mb-3 ${
                  isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'
                }`}
              >
                Kategori Produk
              </h4>
              <ul
                className={`space-y-2 text-xs sm:text-sm ${
                  isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'
                }`}
              >
                {CANONICAL_CATEGORIES.slice(1).map(cat => (
                  <li key={cat}>
                    <button
                      type="button"
                      onClick={() => {
                        handleBackToCatalog();
                        setSelectedCategory(cat);
                      }}
                      className="hover:text-[#2583F7] transition-colors text-left"
                    >
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact & Hours */}
            <div>
              <h4
                className={`font-bold text-sm mb-3 ${
                  isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'
                }`}
              >
                Layanan Konsumen
              </h4>
              <p
                className={`text-xs sm:text-sm mb-3 leading-relaxed ${
                  isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'
                }`}
              >
                Butuh bantuan, kendala akun, atau pertanyaan produk?
              </p>
              <a
                href="https://wa.me/6285867336036"
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all border ${
                  isDarkMode
                    ? 'bg-[#111A2B] text-[#38BDF8] hover:bg-[#2583F7] hover:text-white border-[#26364D] hover:border-[#2583F7]'
                    : 'bg-[#F1F5F9] text-[#2583F7] hover:bg-[#2583F7] hover:text-white border-[#E2E8F0] hover:border-[#2583F7]'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat Customer Service</span>
              </a>
              <span
                className={`block text-[11px] mt-2 ${
                  isDarkMode ? 'text-[#94A3B8]/70' : 'text-[#94A3B8]'
                }`}
              >
                *Proses pesanan otomatis langsung aktif setelah verifikasi.
              </span>
            </div>
          </div>

          <div
            className={`pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${
              isDarkMode
                ? 'border-[#26364D] text-[#94A3B8]'
                : 'border-[#E2E8F0] text-[#64748B]'
            }`}
          >
            <p>© 2026 Androidstore.web.id. Seluruh hak cipta dilindungi.</p>
            <p className="flex items-center gap-1.5">
              <span>Platform Marketplace Produk Digital Modern</span>
            </p>
          </div>
        </div>
      </footer>

      {/* Mobile Menu Modal */}
      <MenuModal
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onCategorySelect={(cat) => {
          handleBackToCatalog();
          handleCategorySelect(cat);
        }}
        onOpenCheckTransaction={() => setIsCheckTransactionOpen(true)}
        onOpenTopSultan={() => setIsTopSultanOpen(true)}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
        onLogoClick={handleGoHome}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      {/* Shopping Cart Drawer */}
      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
        onOrderWhatsApp={handleOrderWhatsApp}
        totalPrice={getTotalPrice()}
      />

      {/* Check Transaction Modal */}
      <TransactionCheckerModal
        isOpen={isCheckTransactionOpen}
        onClose={() => setIsCheckTransactionOpen(false)}
      />

      {/* Top Sultan Modal */}
      <TopSultanModal
        isOpen={isTopSultanOpen}
        onClose={() => setIsTopSultanOpen(false)}
      />

      {/* 3-Stage Checkout & QRIS Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        totalPrice={getTotalPrice()}
        onClearCart={clearCart}
      />

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onSuccess={() => {
          setIsAdminOpen(true);
          window.history.pushState({}, '', '?admin');
        }}
      />

      {/* Admin Dashboard Console (Full Multi-Seller System) */}
      {isAdminOpen && (
        <AdminDashboard
          onClose={() => {
            setIsAdminOpen(false);
            window.history.pushState({}, '', window.location.pathname);
            loadProducts();
          }}
          onRefreshPublicProducts={loadProducts}
        />
      )}
    </div>
  );
}

export default App;
