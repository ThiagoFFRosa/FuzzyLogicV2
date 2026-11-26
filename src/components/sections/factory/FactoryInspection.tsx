import { useLayoutEffect, useRef } from 'react';
import { ArrowUpRight, CornerDownLeft, X } from 'lucide-react';
import { projects } from '../../../data/projects';
import { CLOSE_MS, INSPECTION_EASE, OPEN_MS, PANEL_RELEASE_MS } from '../../../lib/inspection';
import type { InspectionOrigin, InspectionSession } from '../../../lib/inspection';
import { projectIcons } from '../ProjectMark';
import { ProjectScreenshot } from '../ProjectScreenshot';
import { useCoreTheme } from '../../core/CoreThemeProvider';

function foldedTransform(origin: InspectionOrigin, panel: DOMRect) {
  const x = origin.left - scrollX - panel.left;
  const y = origin.top - scrollY - panel.top;
  const width = Math.min(0.85, Math.max(0.08, origin.width / panel.width));
  const height = Math.min(0.8, Math.max(0.065, origin.height / panel.height));
  return `translate(${x}px,${y}px) scale(${width},${height})`;
}

export function FactoryInspection({
  session,
  onClose,
  readOrigin,
  mobile,
  reduced,
}: {
  session: InspectionSession;
  onClose: () => void;
  readOrigin: (index: number) => InspectionOrigin | null;
  mobile: boolean;
  reduced: boolean;
}) {
  const { locale, t } = useCoreTheme();
  const { index, phase, origin, startedAt, closingAt } = session;
  const project = projects[index];
  const Icon = projectIcons[index];
  const panel = useRef<HTMLElement>(null);
  const tether = useRef<SVGPathElement>(null);
  const animation = useRef<Animation | null>(null);
  const dock = useRef(
    origin.left + origin.width / 2 - scrollX >= innerWidth * 0.45 ? 'left' : 'right',
  );
  const returning = phase === 'closing';

  useLayoutEffect(() => {
    const article = panel.current;
    if (!article) return;
    article.focus({ preventScroll: true });
    return () => animation.current?.cancel();
  }, []);
  useLayoutEffect(() => {
    const article = panel.current;
    if (!article || !mobile || returning) return;
    const scroll = () =>
      article.scrollIntoView({
        block: 'start',
        behavior: reduced ? 'instant' : 'smooth',
      });
    if (reduced) {
      scroll();
      return;
    }
    const delay = setTimeout(scroll, Math.max(0, OPEN_MS - (performance.now() - startedAt)));
    return () => clearTimeout(delay);
  }, [mobile, reduced, returning, startedAt]);

  useLayoutEffect(() => {
    const article = panel.current;
    if (!article) return;
    if (reduced) {
      animation.current?.cancel();
      return;
    }
    if (phase === 'inspecting') return;
    const computed = getComputedStyle(article);
    const current = { transform: computed.transform, opacity: computed.opacity };
    animation.current?.cancel();
    const bounds = article.getBoundingClientRect();
    const refreshed = returning ? readOrigin(index) : null;
    const anchor = refreshed?.kind === origin.kind ? refreshed : origin;
    const folded = foldedTransform(anchor, bounds);
    const frames: Keyframe[] = returning
      ? [
          { ...current, offset: 0 },
          { transform: folded, opacity: 0.06, offset: 0.86 },
          { transform: folded, opacity: 0, offset: 1 },
        ]
      : [
          { transform: folded, opacity: 0, offset: 0 },
          {
            transform: folded,
            opacity: 0,
            offset: (origin.kind === 'crate' ? PANEL_RELEASE_MS : 32) / OPEN_MS,
            easing: INSPECTION_EASE,
          },
          { transform: 'none', opacity: 1, offset: 1 },
        ];
    const next = article.animate(frames, {
      duration: returning ? CLOSE_MS : OPEN_MS,
      fill: 'both',
      easing: returning ? INSPECTION_EASE : 'linear',
    });
    animation.current = next;
    next.currentTime = Math.max(0, performance.now() - (closingAt ?? startedAt));
    next.finished
      .then(() => {
        if (animation.current === next && !returning) next.cancel();
      })
      .catch(() => {});
  }, [index, phase, origin, startedAt, closingAt, reduced, returning, readOrigin]);

  useLayoutEffect(() => {
    const article = panel.current;
    const hero = article?.closest('.factory-hero');
    if (!article || !hero || !tether.current || origin.kind !== 'crate') return;
    const draw = (anchor: InspectionOrigin | null) => {
      const line = tether.current;
      if (!line) return;
      if (anchor?.kind !== 'crate') {
        line.removeAttribute('d');
        return;
      }
      const frame = hero.getBoundingClientRect();
      const x = anchor.left + anchor.width * 0.5 - scrollX - frame.left;
      const y = anchor.top + anchor.height * 0.3 - scrollY - frame.top;
      const panelLeft = article.offsetLeft;
      const targetX =
        x >= panelLeft + article.offsetWidth / 2 ? panelLeft + article.offsetWidth : panelLeft;
      const targetY = article.offsetTop + 47;
      const leadX = x + Math.min(50, Math.max(-50, (targetX - x) * 0.35));
      const approach = targetX < x ? 13 : -13;
      line.setAttribute(
        'd',
        `M ${x} ${y} L ${leadX} ${y - 29} L ${targetX + approach} ${targetY} H ${targetX}`,
      );
    };
    draw(readOrigin(index));
    let frame = 0;
    const resize = () => {
      cancelAnimationFrame(frame);
      animation.current?.cancel();
      frame = requestAnimationFrame(() => draw(readOrigin(index)));
    };
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, [index, origin, readOrigin, mobile]);

  return (
    <>
      {origin.kind === 'crate' && (
        <svg className="factory-tether" data-phase={phase} aria-hidden="true">
          <path ref={tether} />
        </svg>
      )}
      <article
        id="factory-inspection-content"
        tabIndex={-1}
        ref={panel}
        className="factory-inspection"
        aria-labelledby="factory-inspection-title"
        aria-hidden={returning || undefined}
        inert={returning}
        data-origin={origin.kind}
        data-dock={dock.current}
        data-phase={phase}
      >
        <header className="inspection-rail">
          <span>
            <i className="status-dot" />
            {t.factoryStation} / {String(index + 1).padStart(2, '0')}
          </span>
          <button type="button" onClick={onClose} aria-label={t.factoryClose}>
            <X size={19} />
          </button>
        </header>
        <div className="inspection-heading">
          <div className={`inspection-project-mark mark-${project.id}`} aria-hidden="true">
            <Icon size={23} />
          </div>
          <div>
            <p className="inspection-category">{project.category[locale]}</p>
            <h2 id="factory-inspection-title">{project.name}</h2>
          </div>
        </div>
        <p className="inspection-description">{project.description[locale]}</p>
        <div className="inspection-purpose">
          <h3>{t.factoryPurpose}</h3>
          <p>{project.purpose[locale]}</p>
        </div>
        {project.screenshots?.[0] && (
          <ProjectScreenshot
            className="inspection-preview"
            image={project.screenshots[0]}
            locale={locale}
            sizes={mobile ? '(max-width: 800px) 90vw, 720px' : '420px'}
          />
        )}
        {project.note && <p className="inspection-note">{project.note[locale]}</p>}
        <ul className="inspection-features">
          {project.features[locale].map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
        <div className="inspection-tags" role="group" aria-label={t.factoryTechnologies}>
          {project.tags[locale].map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        {project.status && (
          <p className="inspection-status">
            <strong>{t.factoryStatus}</strong> {project.status[locale]}
          </p>
        )}
        <div className="inspection-actions">
          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noreferrer"
              aria-label={`${t.visit} — ${project.name}`}
            >
              {t.visit}
              <ArrowUpRight size={17} />
            </a>
          )}
          <button type="button" onClick={onClose}>
            {t.factoryBack}
            <CornerDownLeft size={15} />
          </button>
        </div>
      </article>
    </>
  );
}
