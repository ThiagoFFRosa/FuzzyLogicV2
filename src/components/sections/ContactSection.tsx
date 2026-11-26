import { ArrowUpRight, Github } from 'lucide-react';
import { useCoreTheme } from '../core/CoreThemeProvider';
import { profile } from '../../data/projects';
import { Brand } from '../layout/Navbar';
export function ContactSection() {
  const { t, theme } = useCoreTheme();
  return (
    <>
      <section id="contact" className="section contact-section">
        <div className="contact-top">
          <span className="status-dot" />
          <span>{t.connection}</span>
        </div>
        <div className="contact-grid">
          <h2>{t.contactTitle}</h2>
          <div>
            <p>{t.contactBody}</p>
            <a className="button primary" href={`mailto:${profile.email}`}>
              {t.email}
              <ArrowUpRight size={20} />
            </a>
          </div>
        </div>
        <a className="contact-email" href={`mailto:${profile.email}`}>
          {profile.email}
          <ArrowUpRight />
        </a>
      </section>
      <footer className="footer">
        <a href="#home" aria-label={t.homeLabel}>
          <Brand />
        </a>
        <span>
          © {new Date().getFullYear()} FUZZS. {t.footer}
        </span>
        <div>
          <span className="status-dot" />
          CORE {theme.toUpperCase()}
          <a href={profile.github} aria-label="GitHub" target="_blank" rel="noreferrer">
            <Github size={18} />
          </a>
        </div>
      </footer>
    </>
  );
}
