import { useRef, useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { useCoreTheme } from '../core/CoreThemeProvider';
export function Brand() {
  return (
    <span className="brand">
      <svg viewBox="0 0 30 30" aria-hidden="true">
        <path d="M4 4h22v6H10v5h12v6H10v5H4z" fill="currentColor" />
        <path d="m20 21 6 5v-5z" fill="var(--accent)" />
      </svg>
      fuzz.s
    </span>
  );
}
export function Navbar() {
  const {
    t,
    locale,
    theme,
    toggleLocale,
    toggleTheme,
    compact,
    systemReduced,
    reducePreference,
    setReducePreference,
  } = useCoreTheme();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLButtonElement>(null);
  const languages = locale === 'pt' ? ['PT', 'EN'] : ['EN', 'PT'];
  const core = `CORE ${theme.toUpperCase()}`;
  return (
    <header
      className="site-header"
      data-compact={compact}
      onKeyDown={(event) => {
        if (!open || event.key !== 'Escape') return;
        setOpen(false);
        menu.current?.focus();
      }}
    >
      <div className="nav-shell">
        <a href="#home" aria-label={t.homeLabel} onClick={() => setOpen(false)}>
          <Brand />
        </a>
        <nav
          id="primary-navigation"
          aria-label={locale === 'pt' ? 'Navegação principal' : 'Main navigation'}
          className={open ? 'navigation open' : 'navigation'}
        >
          {['home', 'projects', 'about', 'contact'].map((id, i) => (
            <a key={id} href={`#${id}`} onClick={() => setOpen(false)}>
              {t.nav[i]}
              {i === 3 && <ArrowUpRight size={13} />}
            </a>
          ))}
          {compact && (
            <div className="mobile-settings">
              <a href="#factory-settings" onClick={() => setOpen(false)}>
                {t.factoryQuality}
              </a>
              <label className="mobile-motion">
                <span>{t.motionPreference}</span>
                <select
                  value={reducePreference ? 'reduced' : 'auto'}
                  onChange={(event) => setReducePreference(event.currentTarget.value === 'reduced')}
                >
                  <option value="auto">
                    {systemReduced ? t.motionSystemReduced : t.motionSystem}
                  </option>
                  <option value="reduced">{t.motionReduce}</option>
                </select>
              </label>
            </div>
          )}
        </nav>
        <div className="nav-controls">
          <button
            className="language-button"
            onClick={toggleLocale}
            aria-label={`${languages.join(' / ')} — ${t.language}`}
          >
            {languages[0]}
            <span> / {languages[1]}</span>
          </button>
          <button
            className="theme-button"
            onClick={toggleTheme}
            aria-label={`${core} — ${t.theme}`}
            aria-pressed={theme === 'amber'}
          >
            <span className="status-dot" />
            <span>{core}</span>
          </button>
          <button
            className="menu-button"
            ref={menu}
            onClick={() => setOpen(!open)}
            aria-label={open ? t.closeMenu : t.menu}
            aria-controls="primary-navigation"
            aria-expanded={open}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
