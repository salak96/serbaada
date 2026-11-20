// QRIS dinamis — dibuat dari QRIS statis toko.
//
// Logika konversi di-vendor dari qris-dinamis (github.com/razisek/Qris-Dinamis,
// MIT): paketnya tidak bisa di-bundle Vite karena entry-nya ikut menarik
// makeFile yang butuh jimp + fs (Node-only, build gagal "Failed to resolve
// entry for package jimp"). makeString sendiri murni manipulasi string,
// jadi disalin ke sini tanpa dependensi eksternal.
//
// Payload statis di bawah di-decode dari src/assets/qris.jpeg:
// merchant ANDROIDSTORE WEB.ID, NMID ID1026588030365, DANA/QRIS,
// Kab. Klaten. String ini data publik merchant (tercetak di stand QRIS),
// bukan rahasia — aman disimpan di frontend.
//
// Alur: initiation method 11 (statis) -> 12 (dinamis), sisipkan tag 54
// (nominal) sebelum tag 58 (negara), lalu hitung ulang CRC16 (tag 63).
// Nominal 0 / gagal -> null, pemanggil memakai gambar QRIS statis
// sebagai fallback.
import QRCode from 'qrcode';

export const QRIS_STATIC_PAYLOAD =
  '00020101021126570011ID.DANA.WWW011893600915303486516302090348651630303UMI51440014ID.CO.QRIS.WWW0215ID10265880303650303UMI5204899953033605802ID5919ANDROIDSTORE WEB.ID6011Kab. Klaten6105574646304AC69';

// Panjang field 2 digit, sesuai format EMVCo/QRIS.
function pad(length: number): string {
  return length < 10 ? `0${length}` : String(length);
}

// CRC16-CCITT-FALSE (init 0xFFFF, poly 0x1021), hasil selalu 4 digit heks.
// (Versi asli di lib hanya menambah '0' bila panjangnya 3; di sini selalu
// 4 digit, supaya CRC tetap valid bila nilainya < 0x0100.)
function toCRC16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

// Port makeString(qris, { nominal, taxtype: '', fee: '' }) dari qris-dinamis:
// tanpa tag biaya (55/56/57), nominal murni.
function makeString(qris: string, nominal: string): string {
  const qrisModified = qris.slice(0, -4).replace('010211', '010212');
  const qrisParts = qrisModified.split('5802ID');
  const amount = '54' + pad(nominal.length) + nominal + '5802ID';
  const output = qrisParts[0].trim() + amount + qrisParts[1].trim();
  return output + toCRC16(output);
}

export function makeDynamicQrisPayload(nominal: number): string | null {
  const amount = Math.round(nominal);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  try {
    return makeString(QRIS_STATIC_PAYLOAD, String(amount));
  } catch {
    return null;
  }
}

export async function dynamicQrisDataUrl(nominal: number): Promise<string | null> {
  const payload = makeDynamicQrisPayload(nominal);
  if (!payload) return null;
  try {
    return await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 840,
    });
  } catch {
    return null;
  }
}
