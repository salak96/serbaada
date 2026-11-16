import type { Product } from '../types/product';

// ---- Bintang & terjual dummy untuk kartu produk ----
// Deterministik dari id produk: stabil tiap render, bervariasi antar produk.
// Rentang terjual 10–100 karena toko masih baru.
function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function dummyRating(p: Product): string {
  const revs = p.reviews || [];
  if (revs.length > 0) {
    const avg = revs.reduce((s, r) => s + (Number(r.rating) || 5), 0) / revs.length;
    return avg.toFixed(1);
  }
  return (4.6 + (hashSeed(String(p.id)) % 5) / 10).toFixed(1);
}

export function dummySold(p: Product): string {
  // Satu nilai untuk semua tempat (kartu beranda, kartu rekomendasi, header detail):
  // 10–136, maksimal 136.
  return String(10 + (hashSeed(String(p.id) + ':sold') % 127));
}
