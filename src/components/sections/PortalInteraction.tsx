import { useState, useRef } from 'react';
import { useInView } from 'motion/react';
import type { CSSProperties } from 'react';
import { ArrowLeftRight, MousePointer2, ShieldCheck } from 'lucide-react';
import { useCoreTheme } from '../core/CoreThemeProvider';
export function PortalInteraction() {
  const { t } = useCoreTheme();
  const sectionRef = useRef<HTMLElement>(null);
  const active = useInView(sectionRef);
  const [position, setPosition] = useState(50);
  return (
    <section
      ref={sectionRef}
      className={`section portal-section ${active ? 'ambient-active' : ''}`}
      id="portal"
    >
      <div className="section-heading">
        <h2>{t.portalTitle}</h2>
        <p>{t.portalIntro}</p>
      </div>
      <div className="portal-experiment" style={{ '--boundary': `${position}%` } as CSSProperties}>
        <div className="portal-perspectives">
          <article className="perspective-blue">
            <span>BLUE / {t.portalBlue}</span>
            <MousePointer2 size={28} />
            <h3>{t.ux}</h3>
            <p>{t.uxBody}</p>
          </article>
          <article className="perspective-amber">
            <span>AMBER / {t.portalAmber}</span>
            <ShieldCheck size={28} />
            <h3>{t.reliability}</h3>
            <p>{t.reliabilityBody}</p>
          </article>
        </div>
        <div className="portal-canvas energy-field">
          <div className="portal-world world-blue" aria-hidden="true">
            <div className="portal-grid" />
            <div className="energy-gate">
              <i />
              <i />
              <i />
            </div>
          </div>
          <div
            className="portal-world world-amber"
            style={{ clipPath: `inset(0 0 0 ${position}%)` }}
            aria-hidden="true"
          >
            <div className="portal-grid" />
            <div className="energy-gate">
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="energy-particles" aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => (
              <i
                key={i}
                style={{
                  left: `${7 + i * 7.7}%`,
                  top: `${15 + ((i * 23) % 65)}%`,
                  animationDelay: `${i * -0.6}s`,
                }}
              />
            ))}
          </div>
          <div className="portal-divider">
            <span>
              <ArrowLeftRight size={21} />
            </span>
          </div>
          <input
            className="portal-range"
            type="range"
            min="0"
            max="100"
            step="1"
            value={position}
            onChange={(e) => setPosition(Number(e.target.value))}
            aria-label={t.portalLabel}
          />
          <div className="portal-field-label">
            {t.portalField}
            <span>{t.drag}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
