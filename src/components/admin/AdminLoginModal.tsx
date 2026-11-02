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
  const [email, setEmail] = useState('androidstore279@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (window.turnstile) {
        try {
          window.turnstile.render('#turnstile-widget', {
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
      }
    }, 200);

    return () => clearTimeout(timer);
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#101827] border border-[#26364D] rounded-2xl shadow-modal overflow-hidden text-xs text-[#F8FAFC]">
        <div className="px-5 py-4 bg-[#0B1220] border-b border-[#26364D] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2583F7]/15 text-[#38BDF8] flex items-center justify-center border border-[#2583F7]/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#F8FAFC]">Masuk Administrator</h3>
              <p className="text-[10px] text-[#94A3B8]">Masuk untuk mengelola dashboard administrator.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-[#94A3B8] hover:text-white" aria-label="Tutup login admin">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-800 text-red-400 flex items-center gap-2 text-[11px]">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-[#94A3B8] font-semibold" htmlFor="admin-email">Email Admin</label>
            <div className="relative">
              <input
                id="admin-email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="androidstore279@gmail.com"
                className="w-full pl-9 pr-3 py-2.5 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC] focus:outline-none focus:border-[#2583F7]"
              />
              <Mail className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-3" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[#94A3B8] font-semibold" htmlFor="admin-password">Password</label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Ketik password admin..."
                className="w-full pl-9 pr-10 py-2.5 bg-[#080D18] border border-[#26364D] rounded-xl text-[#F8FAFC] focus:outline-none focus:border-[#2583F7]"
              />
              <Lock className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-3" />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-3 top-2.5 p-0.5 text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
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
