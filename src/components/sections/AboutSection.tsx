import { ArrowUpRight } from 'lucide-react';
import { useCoreTheme } from '../core/CoreThemeProvider';
import { profile } from '../../data/projects';
export function AboutSection() {
  const { t, locale } = useCoreTheme();
  return (
    <section id="about" className="section about-section">
      <div className="about-object" aria-hidden="true">
        <span className="about-monogram">
          tfr<span>.</span>
        </span>
        <div className="about-object-bottom">
          <span>{t.human}</span>
          <span>FUZZS.DEV</span>
        </div>
      </div>
      <div className="about-copy">
        <h2>{profile.name}</h2>
        <p>{t.aboutBody}</p>
        <p>{t.aboutMore}</p>
        <div className="education">
          <span className="status-dot" />
          {profile.education[locale]}
        </div>
        <a href={profile.github} className="text-link" target="_blank" rel="noreferrer">
          GitHub / ThiagoFFRosa
          <ArrowUpRight size={16} />
        </a>
      </div>
    </section>
  );
}
