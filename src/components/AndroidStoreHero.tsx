import { ArrowRight, Search, FileText, Cpu, Zap, Tag, Send } from 'lucide-react';

interface AndroidStoreHeroProps {
  onExploreClick: () => void;
  onTrackOrderClick: () => void;
  isDarkMode?: boolean;
}

export function AndroidStoreHero({
  onExploreClick,
  onTrackOrderClick,
  isDarkMode = true
}: AndroidStoreHeroProps) {
  return (
    <section className={`relative overflow-hidden rounded-3xl border transition-colors duration-200 p-6 sm:p-10 md:p-12 mb-10 ${
      isDarkMode
        ? 'bg-[#080F1E] border-[#253752] text-[#F8FAFC] shadow-[0_10px_30px_rgba(0,0,0,0.5)]'
        : 'bg-[#FFFFFF] border-[#DCE8F5] text-[#071B3D] shadow-[0_10px_30px_rgba(8,124,255,0.06)]'
    }`}>
      {/* Decorative Glow Orbs */}
      <div className="absolute top-0 right-0 -mt-16 -mr-16 w-96 h-96 bg-[#087CFF]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-[#38BDF8]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* Kolom Kiri (55%) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Badge */}
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold shadow-xs ${
            isDarkMode
              ? 'bg-[#101D33] border-[#253752] text-[#38BDF8]'
              : 'bg-[#F0F7FF] border-[#DCE8F5] text-[#087CFF]'
          }`}>
            <span className="w-2 h-2 rounded-full bg-[#087CFF] animate-pulse" />
            <span>PUSAT PRODUK DIGITAL &amp; AKUN PREMIUM</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight sm:leading-tight">
            Solusi Produk Digital untuk Semua Kebutuhan
          </h1>

          {/* Description */}
          <p className={`text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl ${
            isDarkMode ? 'text-[#A7BEDA]' : 'text-[#475569]'
          }`}>
            Temukan file, template, tools digital, dan berbagai produk digital untuk mendukung pekerjaan, bisnis, belajar, serta aktivitas sehari-hari dengan proses instan dan bergaransi penuh.
          </p>

          {/* Actions CTA */}
          <div className="flex flex-wrap items-center gap-3.5 pt-2">
            <button
              type="button"
              onClick={onExploreClick}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#087CFF] hover:bg-[#0664D8] text-white font-black text-sm shadow-[0_0_20px_rgba(8,124,255,0.4)] active:scale-95 transition-all"
            >
              <span>Jelajahi Produk</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onTrackOrderClick}
              className={`inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm border transition-all ${
                isDarkMode
                  ? 'bg-[#101D33] hover:bg-[#182B4A] text-[#38BDF8] border-[#253752]'
                  : 'bg-[#F0F7FF] hover:bg-[#E2F0FF] text-[#087CFF] border-[#DCE8F5]'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Lacak Pesanan</span>
            </button>
          </div>

          {/* 5 Keunggulan Utama (Feature Grid) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-6 border-t border-current/10">
            
            <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
              isDarkMode ? 'bg-[#101D33]/60 border-[#253752]' : 'bg-[#F0F7FF]/60 border-[#DCE8F5]'
            }`}>
              <div className="w-8 h-8 rounded-lg bg-[#087CFF]/20 text-[#087CFF] flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold block">File &amp; Template</span>
                <span className="text-[10px] opacity-75">Siap pakai</span>
              </div>
            </div>

            <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
              isDarkMode ? 'bg-[#101D33]/60 border-[#253752]' : 'bg-[#F0F7FF]/60 border-[#DCE8F5]'
            }`}>
              <div className="w-8 h-8 rounded-lg bg-[#38BDF8]/20 text-[#38BDF8] flex items-center justify-center flex-shrink-0">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold block">Tools Digital</span>
                <span className="text-[10px] opacity-75">Produktivitas AI</span>
              </div>
            </div>

            <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
              isDarkMode ? 'bg-[#101D33]/60 border-[#253752]' : 'bg-[#F0F7FF]/60 border-[#DCE8F5]'
            }`}>
              <div className="w-8 h-8 rounded-lg bg-[#10B981]/20 text-[#10B981] flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold block">Proses Cepat</span>
                <span className="text-[10px] opacity-75">Praktis &amp; mudah</span>
              </div>
            </div>

            <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
              isDarkMode ? 'bg-[#101D33]/60 border-[#253752]' : 'bg-[#F0F7FF]/60 border-[#DCE8F5]'
            }`}>
              <div className="w-8 h-8 rounded-lg bg-[#F97316]/20 text-[#F97316] flex items-center justify-center flex-shrink-0">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold block">Harga Terbaik</span>
                <span className="text-[10px] opacity-75">Hemat &amp; terjangkau</span>
              </div>
            </div>

            <div className={`p-3 rounded-xl border flex items-center gap-2.5 col-span-2 sm:col-span-1 ${
              isDarkMode ? 'bg-[#101D33]/60 border-[#253752]' : 'bg-[#F0F7FF]/60 border-[#DCE8F5]'
            }`}>
              <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/20 text-[#7C3AED] flex items-center justify-center flex-shrink-0">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold block">Kirim Digital</span>
                <span className="text-[10px] opacity-75">Otomatis &amp; aman</span>
              </div>
            </div>

          </div>

        </div>

        {/* Kolom Kanan (45%) — Ilustrasi Modern */}
        <div className="lg:col-span-5 flex justify-center">
          <div className={`relative w-full max-w-md aspect-[4/3] rounded-2xl border p-6 flex flex-col justify-between overflow-hidden shadow-2xl ${
            isDarkMode
              ? 'bg-[#101D33] border-[#253752] shadow-[0_20px_50px_rgba(8,124,255,0.15)]'
              : 'bg-[#F0F7FF] border-[#DCE8F5] shadow-[0_20px_50px_rgba(8,124,255,0.1)]'
          }`}>
            {/* Background Accent Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-[10px] font-mono opacity-60">androidstore.web.id</span>
            </div>

            <div className="relative z-10 my-auto py-6 text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#087CFF] text-white flex items-center justify-center font-black text-xl shadow-[0_0_25px_rgba(8,124,255,0.6)]">
                AS
              </div>
              <h3 className="font-extrabold text-base tracking-tight">
                AndroidStore Digital Hub
              </h3>
              <p className="text-xs opacity-75 max-w-xs mx-auto">
                Platform langganan akun premium &amp; software digital terpercaya dengan sistem API otomatis.
              </p>
            </div>

            <div className="relative z-10 pt-3 border-t border-current/10 flex items-center justify-between text-[11px] font-bold">
              <span className="text-[#087CFF] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
                Live API Engine Active
              </span>
              <span className="opacity-75">Instant Delivery</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
