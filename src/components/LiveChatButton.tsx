import { MessageCircle } from 'lucide-react';

export function LiveChatButton() {
  const whatsappUrl = 'https://wa.me/6285867336036?text=Halo%20Admin%20Androidstore.web.id!%20Saya%20butuh%20bantuan%20terkait%20produk%20digital.';

  return (
    <aside aria-label="Bantuan dan Konsultasi Langsung" className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 group">
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Hubungi Live Support WhatsApp Androidstore.web.id"
        className="relative flex items-center gap-2.5 px-3.5 py-3 sm:px-4 sm:py-3.5 rounded-full bg-gradient-to-r from-[#2583F7] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#2583F7] text-white shadow-[0_0_25px_rgba(37,131,247,0.5)] hover:shadow-[0_0_35px_rgba(37,131,247,0.8)] border border-[#38BDF8]/40 transition-all duration-300 hover:scale-105 active:scale-95"
      >
        {/* Pulse ring indicator */}
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#38BDF8] opacity-75" />
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#10B981]" />
        </span>

        <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 fill-white/20 stroke-white flex-shrink-0" />
        <span className="hidden sm:inline font-bold text-xs tracking-wide">
          Live Chat 24/7
        </span>
      </a>
    </aside>
  );
}
