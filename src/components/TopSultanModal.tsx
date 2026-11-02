import { useEffect, useState } from 'react';
import { X, Trophy, Medal, Sparkles, Crown } from 'lucide-react';

interface TopSultanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SultanUser {
  rank: number;
  name: string;
  totalSpent: number;
  totalOrders: number;
  tier: string;
}

const DEFAULT_REAL_SULTANS: SultanUser[] = [
  { rank: 1, name: 'Arinu', totalSpent: 1519500, totalOrders: 2, tier: 'Sultan Mythic' },
  { rank: 2, name: 'tes', totalSpent: 76000, totalOrders: 2, tier: 'Sultan Diamond' },
  { rank: 3, name: 'Budi Santoso', totalSpent: 75000, totalOrders: 1, tier: 'Sultan Diamond' },
  { rank: 4, name: 'Dyan', totalSpent: 74500, totalOrders: 1, tier: 'Sultan Platinum' },
  { rank: 5, name: 'arul', totalSpent: 59100, totalOrders: 1, tier: 'Sultan Platinum' }
];

export function TopSultanModal({ isOpen, onClose }: TopSultanModalProps) {
  const [sultans, setSultans] = useState<SultanUser[]>(DEFAULT_REAL_SULTANS);

  useEffect(() => {
    if (!isOpen) return;

    const fetchLeaderboard = async () => {
      try {
        const res = await fetch('/api/leaderboard/top-sultan');
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setSultans(json.data);
        }
      } catch {
        // Keep default real sultans
      }
    };

    fetchLeaderboard();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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
              <div className="w-8 h-8 rounded-xl bg-[#2583F7]/15 text-[#38BDF8] flex items-center justify-center border border-[#26364D]">
                <Trophy className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#F8FAFC] flex items-center gap-1.5">
                  Top Sultan Leaderboard
                  <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
                </h2>
                <p className="text-[11px] text-[#94A3B8]">Pelanggan dengan transaksi tertinggi dari Pesanan Pelanggan</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111A2B] border border-transparent hover:border-[#26364D] flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List */}
          <div className="p-4 sm:p-5 space-y-2.5 max-h-[60vh] overflow-y-auto">
            {sultans.map((sultan) => {
              const isTop1 = sultan.rank === 1;
              const isTop2 = sultan.rank === 2;
              const isTop3 = sultan.rank === 3;

              return (
                <div
                  key={sultan.rank}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                    isTop1
                      ? 'bg-[#2583F7]/15 border-[#2583F7] shadow-[0_0_15px_rgba(37,131,247,0.25)]'
                      : isTop2 || isTop3
                      ? 'bg-[#111A2B] border-[#26364D] hover:border-[#2583F7]/50'
                      : 'bg-[#080D18] border-[#26364D]/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs">
                      {isTop1 ? (
                        <Crown className="w-5 h-5 text-[#38BDF8] fill-[#38BDF8]/20 animate-pulse" />
                      ) : isTop2 ? (
                        <Medal className="w-5 h-5 text-blue-300" />
                      ) : isTop3 ? (
                        <Medal className="w-5 h-5 text-blue-400" />
                      ) : (
                        <span className="text-[#94A3B8]">#{sultan.rank}</span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#F8FAFC]">
                          {sultan.name}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[#0B1220] text-[#38BDF8] border border-[#26364D]">
                          {sultan.tier}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#94A3B8]">
                        {sultan.totalOrders}x transaksi sukses
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-black text-[#38BDF8] tabular-nums block">
                      {formatPrice(sultan.totalSpent)}
                    </span>
                    <span className="text-[10px] text-[#94A3B8]">Total Belanja</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="px-5 py-3 bg-[#0B1220] border-t border-[#26364D] text-center text-[11px] text-[#94A3B8]">
            Tingkatkan transaksi digital Anda dan dapatkan cashback serta promo khusus VIP Sultan!
          </div>
        </div>
      </div>
    </div>
  );
}
