import React, { useState } from 'react';
import { BookOpen, Lock, User, Eye, EyeOff } from 'lucide-react';

interface Props {
  onLogin: (user: { name: string; role: string }) => void;
}

// Simple hardcoded credentials — replace with Supabase Auth when ready
const USERS = [
  { username: 'asset', password: 'asset123', name: 'Administrator', role: 'Admin' },
];

export function Login({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTimeout(() => {
      const user = USERS.find(
        u => u.username === username.trim().toLowerCase() && u.password === password
      );
      if (user) {
        onLogin({ name: user.name, role: user.role });
      } else {
        setError('Invalid username or password.');
      }
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-paper-dark flex flex-col">
      {/* Top bar */}
      <div className="border-b-2 border-ink bg-paper-light px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 border-2 border-ink flex items-center justify-center bg-ledger-green text-paper-light">
            <BookOpen className="w-4 h-4" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-serif text-xl font-semibold leading-none text-ink">Asset Register</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mt-0.5">IUCN Rwanda Country Office</p>
          </div>
        </div>
        <p className="text-[11px] uppercase tracking-wider text-ink-muted font-mono hidden sm:block">
          {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
      </div>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-8">

          {/* Hero text */}
          <div className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 border-2 border-ink bg-paper-light flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-ink" strokeWidth={1.5} />
            </div>
            <h2 className="font-serif text-4xl text-ink">Fixed Asset Register</h2>
            <p className="text-sm text-ink-soft max-w-xs mx-auto leading-relaxed">
              IUCN Rwanda Country Office · Property Management System
            </p>
            <div className="flex items-center gap-3 justify-center pt-1">
              <span className="h-px w-12 bg-rule" />
              <span className="text-[10px] uppercase tracking-[0.25em] text-ink-muted">Secure Access</span>
              <span className="h-px w-12 bg-rule" />
            </div>
          </div>

          {/* Login card */}
          <div className="bg-paper-light border border-rule">
            <div className="px-6 py-4 border-b border-rule bg-paper-dark/40">
              <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">Sign in to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Username */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => { setUsername(e.target.value); setError(''); }}
                    placeholder="Enter your username"
                    className="w-full pl-9 pr-3 py-2.5 text-sm text-ink bg-paper-light border border-rule focus:outline-none focus:border-ink"
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-10 py-2.5 text-sm text-ink bg-paper-light border border-rule focus:outline-none focus:border-ink"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <p className="text-xs text-ledger-red font-semibold">{error}</p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full py-2.5 text-sm font-semibold uppercase tracking-wider bg-ink text-paper-light hover:bg-ink/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </div>

          {/* Footer note */}
          <p className="text-center text-[11px] text-ink-muted uppercase tracking-wider">
            Authorised personnel only · IUCN Rwanda
          </p>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-rule py-4 px-8 flex items-center justify-between text-[11px] uppercase tracking-wider text-ink-muted">
        <span>Asset Register · Internal Use</span>
        <span className="font-mono">v1.0</span>
      </div>
    </div>
  );
}
