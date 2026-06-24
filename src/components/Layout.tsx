import { useState } from 'react';

import { Outlet, NavLink, Link } from 'react-router-dom';
import { Menu, X, BookOpen, LogOut, User, Globe } from 'lucide-react';
import { AuthUser } from '../App';
import { useI18n } from '../lib/i18n';

interface Props {
  user: AuthUser;
  onLogout: () => void;
}

export function Layout({ user, onLogout }: Props) {
  const { t, language, setLanguage } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = [
  {
    to: '/assets',
    label: t('nav.register')
  },
  {
    to: '/assets/new',
    label: t('nav.newEntry')
  },
  {
    to: '/import',
    label: t('nav.import')
  }];

  return (
    <div className="min-h-screen bg-paper">
      {/* Top Banner */}
      <header className="border-b-2 border-ink bg-paper-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Title row */}
          <div className="flex items-center justify-between py-5 border-b border-rule">
            <Link to="/assets" className="flex items-center gap-3 group">
              <div className="w-10 h-10 border-2 border-ink flex items-center justify-center bg-ledger-green text-paper-light">
                <BookOpen className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-semibold leading-none text-ink">
                  Asset Register
                </h1>
                <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted mt-1">
                  Company Property Ledger
                </p>
              </div>
            </Link>
            <div className="hidden sm:flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs font-semibold text-ink">{user.name}</p>
                <p className="text-[10px] uppercase tracking-wider text-ink-muted">{user.role}</p>
              </div>
              <div className="w-8 h-8 border border-rule bg-paper-dark flex items-center justify-center">
                <User className="w-4 h-4 text-ink-soft" />
              </div>
              <button
                onClick={() => setLanguage(language === 'en' ? 'rw' : 'en')}
                className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ledger-green uppercase tracking-wider font-semibold border border-rule px-3 py-1.5 hover:border-ledger-green transition-colors"
                title={language === 'en' ? 'Kinyarwanda' : 'English'}
              >
                <Globe className="w-3.5 h-3.5" />
                {language === 'en' ? 'RW' : 'EN'}
              </button>
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ledger-red uppercase tracking-wider font-semibold border border-rule px-3 py-1.5 hover:border-ledger-red transition-colors"
                title={t('nav.signOut')}
              >
                <LogOut className="w-3.5 h-3.5" />
                {t('nav.signOut')}
              </button>
            </div>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-ink"
              aria-label="Menu">
              
              {mobileOpen ?
              <X className="w-5 h-5" /> :

              <Menu className="w-5 h-5" />
              }
            </button>
          </div>

          {/* Nav row */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) =>
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/assets'}
              className={({ isActive }) => `
                  px-5 py-3 text-xs font-semibold uppercase tracking-[0.15em] transition-colors border-b-2
                  ${isActive ? 'text-ledger-green border-ledger-green' : 'text-ink-soft border-transparent hover:text-ink hover:border-rule'}
                `}>
              
                {item.label}
              </NavLink>
            )}
          </nav>

          {/* Mobile nav */}
          {mobileOpen &&
          <nav className="md:hidden py-2 space-y-1 border-t border-rule">
              {navItems.map((item) =>
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/assets'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `
                    block px-3 py-3 text-xs font-semibold uppercase tracking-[0.15em] transition-colors
                    ${isActive ? 'text-ledger-green bg-paper-dark' : 'text-ink-soft hover:bg-paper-dark'}
                  `}>
              
                  {item.label}
                </NavLink>
            )}
            </nav>
          }
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-rule mt-16 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-[11px] uppercase tracking-wider text-ink-muted">
          <span>Asset Register · Internal Use</span>
          <span className="font-mono">v1.0</span>
        </div>
      </footer>
    </div>);

}