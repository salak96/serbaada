import { useState, useEffect } from 'react';
import { X, ShieldCheck, AlertCircle, Mail, Lock, Eye, EyeOff } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement | string, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string;
    };
  }
}

export function AdminLoginModal({ isOpen, onClose, onSuccess }: AdminLoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Tema light/dark mengikuti preferensi tersimpan (sama seperti dashboard).
  // Modal ini dirender di luar AdminDashboard, jadi baca langsung dari storage.
  // Dibaca ulang setiap kali modal dibuka (bukan sekali saat mount) supaya
  // tidak ketinggalan bila tema admin diubah selama sesi berjalan.
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  useEffect(() => {
    if (!isOpen) return;
    try {
      const adminTheme = localStorage.getItem('serbadigital_admin_theme');
      if (adminTheme === 'light' || adminTheme === 'dark') {
        setTheme(adminTheme);
        return;
      }
      // Tema admin belum pernah diatur: ikuti tema toko (light = default toko).
      const storeTheme = localStorage.getItem('androidstore_theme') || localStorage.getItem('klikLanggananTheme');
      setTheme(storeTheme === 'dark' ? 'dark' : 'light');
    } catch {
      setTheme('light');
    }
  }, [isOpen]);

  // Turnstile dimuat dinamis hanya saat modal login admin dibuka
  // (sebelumnya script dimuat di semua halaman lewat index.html).
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const loadTurnstile = () => {
      if (window.turnstile) return Promise.resolve();
      return new Promise<void>((resolve, reject) => {
        const existing = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]');
        if (existing) {
          existing.addEventListener('load', () => resolve());
          existing.addEventListener('error', () => reject(new Error('Turnstile gagal dimuat')));
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Turnstile gagal dimuat'));
        document.body.appendChild(script);
      });
    };

    loadTurnstile()
      .then(() => {
        if (cancelled) return;
        try {
          window.turnstile?.render('#turnstile-widget', {
            sitekey: '0x4AAAAAAFv_iV4_W-eYIsXr',
            callback: (token: string) => {
              setTurnstileToken(token);
            },
            'error-callback': () => {
              setTurnstileToken('');
            }
          });
        } catch {
          // Already rendered
        }
      })
      .catch(() => {
        // Turnstile gagal dimuat — login tetap bisa dicoba tanpa token
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, turnstileToken })
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || 'Email atau password admin salah.');
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError('Tidak dapat menghubungi server autentikasi. Silakan coba kembali.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div data-theme={theme} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[var(--bg-panel)] border border-[var(--border)] rounded-2xl shadow-modal overflow-hidden text-xs text-[var(--text)]">
        <div className="px-5 py-4 bg-[var(--bg-panel)] border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--info-bg)] text-[var(--accent-soft)] flex items-center justify-center border border-[#2583F7]/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--text)]">Masuk Administrator</h3>
              <p className="text-[10px] text-[var(--text-muted)]">Masuk untuk mengelola dashboard administrator.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text)]" aria-label="Tutup login admin">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger-border)] text-[var(--danger)] flex items-center gap-2 text-[11px]">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-[var(--text-muted)] font-semibold" htmlFor="admin-email">Email Admin</label>
            <div className="relative">
              <input
                id="admin-email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Masukkan email admin"
                className="w-full pl-9 pr-3 py-2.5 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[#2583F7]"
              />
              <Mail className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-3" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[var(--text-muted)] font-semibold" htmlFor="admin-password">Password</label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Ketik password admin..."
                className="w-full pl-9 pr-10 py-2.5 bg-[var(--bg-nested)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[#2583F7]"
              />
              <Lock className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-3" />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-3 top-2.5 p-0.5 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Cloudflare Turnstile Widget */}
          <div className="flex justify-center my-1">
            <div id="turnstile-widget" className="cf-turnstile" data-sitekey="0x4AAAAAAFv_iV4_W-eYIsXr" />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#2583F7] hover:bg-[#1D4ED8] text-white rounded-xl font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {isLoading ? 'Memverifikasi...' : 'Masuk Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
