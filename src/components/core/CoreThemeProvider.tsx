import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { browserPreference, persist, resolveLocale } from '../../lib/behavior';
import type { CoreTheme, Locale } from '../../lib/behavior';
import { translations } from '../../i18n/translations';
import { site } from '../../data/site';
import { COMPACT_FACTORY_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
function usePreferences() {
  const [switching, setSwitching] = useState(false);
  const [theme, setTheme] = useState<CoreTheme>(() =>
    browserPreference('fuzzs-core') === 'amber' ? 'amber' : 'blue',
  );
  const [locale, setLocale] = useState<Locale>(() =>
    resolveLocale(browserPreference('fuzzs-locale'), navigator.language),
  );
  const compact = useMediaQuery(COMPACT_FACTORY_QUERY);
  const systemReduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [reducePreference, setReducePreference] = useState(
    () => browserPreference('fuzzs-motion') === 'reduced',
  );
  const reduced = systemReduced || reducePreference;
  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
    persist('fuzzs-motion', reducePreference ? 'reduced' : 'auto');
  }, [reducePreference, reduced]);
  useEffect(() => {
    document.documentElement.dataset.core = theme;
    persist('fuzzs-core', theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.dataset.switching = String(switching);
    if (!switching) return;
    const timeout = setTimeout(() => setSwitching(false), 1050);
    return () => clearTimeout(timeout);
  }, [switching, theme]);
  useEffect(() => {
    document.documentElement.lang = locale === 'pt' ? 'pt-BR' : 'en-US';
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', site.description[locale]);
    persist('fuzzs-locale', locale);
  }, [locale]);
  return {
    theme,
    switching,
    locale,
    t: translations[locale],
    compact,
    reduced,
    systemReduced,
    reducePreference,
    setReducePreference,
    toggleTheme: () => {
      setSwitching(true);
      setTheme((v) => (v === 'blue' ? 'amber' : 'blue'));
    },
    toggleLocale: () => setLocale((v) => (v === 'pt' ? 'en' : 'pt')),
  };
}
const Context = createContext<ReturnType<typeof usePreferences> | null>(null);
export function CoreThemeProvider({ children }: { children: ReactNode }) {
  const value = usePreferences();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCoreTheme() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('CoreThemeProvider is required');
  return ctx;
}
