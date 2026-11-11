// Membersihkan karakter ikon (emoji & simbol dekoratif) dari nama maupun
// deskripsi produk yang diambil dari API supplier
// (mis. "🔥 Netflix Premium ⭐" -> "Netflix Premium").
// Huruf, angka, spasi, dan tanda baca umum (& - + / . , ( ) dll) dipertahankan.
export function cleanProductName(name: string | undefined | null): string {
  if (!name) return '';
  return name
    // Emoji & pictograph (surrogate pair range), simbol & dingbat, panah,
    // simbol teknis, huruf/angka dalam lingkaran, dan flag (regional indicator).
    .replace(
      /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2460}-\u{24FF}\u{1F100}-\u{1F1FF}\u{2B00}-\u{2BFF}]/gu,
      ''
    )
    // Sisa variation selector & zero-width joiner dari rangkaian emoji.
    .replace(/[\uFE00-\uFE0F\u200D]/g, '')
    // Rapikan spasi ganda dan spasi di ujung yang tersisa setelah penghapusan.
    .replace(/\s{2,}/g, ' ')
    .trim();
}
