import { useState } from 'react';
import { ArrowUpRight, AudioLines, CarFront, ChevronDown, Cpu, Layers3 } from 'lucide-react';
import { projectAnchor, projects } from '../../data/projects';
import type { Project } from '../../data/projects';
import { useCoreTheme } from '../core/CoreThemeProvider';
import { projectIcons } from './ProjectMark';
import { ProjectScreenshot } from './ProjectScreenshot';
function ProjectVisual({ project, index }: { project: Project; index: number }) {
  const { t, locale } = useCoreTheme();
  const Icon = projectIcons[index];
  const screenshot = project.screenshots?.[0];
  if (screenshot)
    return (
      <div className="project-art">
        <ProjectScreenshot
          image={screenshot}
          locale={locale}
          sizes="(max-width: 700px) 90vw, (max-width: 1400px) 55vw, 780px"
        />
      </div>
    );
  return (
    <div className={`project-art art-${project.id}`}>
      <div className="art-top" aria-hidden="true">
        <span>{project.name.toUpperCase()} / CONCEPT</span>
        <Icon size={17} />
      </div>
      {index === 0 ? (
        <div className="sound-art" aria-hidden="true">
          <div className="sound-orbit">
            <AudioLines size={65} strokeWidth={1} />
          </div>
          <div className="waveform">
            {Array.from({ length: 45 }, (_, i) => (
              <i
                key={i}
                style={{ height: `${15 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.45)) * 65}%` }}
              />
            ))}
          </div>
          <span className="art-wordmark">
            fuz<span>control</span>
            <sup>↗</sup>
          </span>
        </div>
      ) : index === 1 ? (
        <div className="valet-art" aria-hidden="true">
          <div className="parking-lines" />
          <div className="car-plate">
            <CarFront size={80} strokeWidth={1} />
            <span>SEU VALET</span>
          </div>
          <span className="valet-route">
            <i />
            QR → REQUEST → RETRIEVE
          </span>
        </div>
      ) : index === 2 ? (
        <div className="deck-art" aria-hidden="true">
          {[AudioLines, Cpu, Layers3, AudioLines, Layers3, Cpu].map((Item, i) => (
            <div key={i}>
              <Item size={26} strokeWidth={1} />
            </div>
          ))}
        </div>
      ) : index === 3 ? (
        <div className="pixel-art" aria-hidden="true">
          {Array.from({ length: 64 }, (_, i) => (
            <i key={i} style={{ opacity: [1, 0.3, 0.65, 0.12][(i * 7 + Math.floor(i / 8)) % 4] }} />
          ))}
        </div>
      ) : (
        <div className="data-art" aria-hidden="true">
          <svg viewBox="0 0 360 160">
            <path
              d="M180 12v30M55 80V42h250v38M55 80 20 135m35-55 35 55m215-55-35 55m35-55 35 55"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {[
              [180, 12],
              [55, 80],
              [305, 80],
              [20, 135],
              [90, 135],
              [270, 135],
              [340, 135],
            ].map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r="9" fill="#151a1a" stroke="currentColor" />
            ))}
          </svg>
          <span>INPUT → RANDOM FOREST → INSIGHT</span>
        </div>
      )}
      <span className="concept-note">{t.concept}</span>
    </div>
  );
}
export function ProjectShowcase({ project, index }: { project: Project; index: number }) {
  const { t, locale } = useCoreTheme();
  const [open, setOpen] = useState(false);
  return (
    <article className={`project-showcase project-${index}`} id={projectAnchor(project.id)}>
      <div className="experiment-index" aria-hidden="true">
        <span>
          {t.experiment} / {String(index + 1).padStart(2, '0')}
        </span>
        <span>{project.name.toUpperCase()}</span>
      </div>
      <ProjectVisual project={project} index={index} />
      <div className="project-info">
        <div className="project-category">
          {project.category[locale]}
          <span>↗</span>
        </div>
        <h3>{project.name}</h3>
        <p>{project.description[locale]}</p>
        <p className="project-status">{project.status[locale]}</p>
        <div className="project-tags">
          {project.tags[locale].map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <button
          className="project-details"
          type="button"
          onClick={() => setOpen(!open)}
          aria-label={`${open ? t.close : t.details} — ${project.name}`}
          aria-expanded={open}
          aria-controls={`details-${project.id}`}
        >
          {open ? t.close : t.details}
          <ChevronDown size={16} className={open ? 'rotated' : ''} />
        </button>
        <div id={`details-${project.id}`} hidden={!open} className="project-expanded">
          <p>{project.solution[locale]}</p>
          {project.note && <p className="project-note">{project.note[locale]}</p>}
          <ul>
            {project.features[locale].map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          {project.screenshots?.slice(1).map((image) => (
            <ProjectScreenshot
              key={image.src}
              className="project-detail-image"
              image={image}
              locale={locale}
              sizes="(max-width: 700px) 90vw, 460px"
            />
          ))}
        </div>
        {project.url && (
          <a
            className="project-visit"
            href={project.url}
            target="_blank"
            rel="noreferrer"
            aria-label={`${t.visit} — ${project.name}`}
          >
            {t.visit}
            <ArrowUpRight size={17} />
          </a>
        )}
      </div>
    </article>
  );
}
export function ProjectsSection() {
  const { t } = useCoreTheme();
  return (
    <section id="projects" className="section projects-section">
      <div className="section-heading">
        <h2>{t.selected}</h2>
        <div className="experiments-caption">
          <span>{t.experiments}</span>
          <p>{t.selectedIntro}</p>
        </div>
      </div>
      <nav className="project-index" aria-label={t.projects}>
        {projects.map((project) => (
          <a key={project.id} href={`#${projectAnchor(project.id)}`}>
            {project.name}
          </a>
        ))}
      </nav>
      <div className="projects-grid">
        {projects.map((project, index) => (
          <ProjectShowcase key={project.id} project={project} index={index} />
        ))}
      </div>
    </section>
  );
}
