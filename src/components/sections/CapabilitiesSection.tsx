import { Braces, Workflow, Bot, Network, Component, Terminal } from 'lucide-react';
import { useCoreTheme } from '../core/CoreThemeProvider';
import { projectAnchor, projects } from '../../data/projects';
const icons = [Braces, Workflow, Bot, Network, Terminal, Component];
const examples = ['fuzcontrol', 'seuvalet', 'fuzcontrol', 'neonatal', null, 'minewardrobe'];
export function CapabilitiesSection() {
  const { t } = useCoreTheme();
  return (
    <section className="section capabilities-section">
      <div className="section-heading">
        <h2>{t.capabilities}</h2>
        <p>{t.capabilityIntro}</p>
      </div>
      <div className="capabilities-grid">
        {t.cap.map(([name, description], i) => {
          const Icon = icons[i];
          const project = projects.find(({ id }) => id === examples[i]);
          return (
            <div className="capability" key={i}>
              <Icon size={25} strokeWidth={1.3} />
              <div>
                <h3>{name}</h3>
                <p>{description}</p>
                <a className="text-link" href={project ? `#${projectAnchor(project.id)}` : '#home'}>
                  {project?.name ?? 'FUZZS V2'}
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
