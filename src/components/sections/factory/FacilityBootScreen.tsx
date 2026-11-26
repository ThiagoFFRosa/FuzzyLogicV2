import type { CSSProperties } from 'react';
import { ArrowDown } from 'lucide-react';
import { facilityBoot } from '../../../i18n/facilityBoot';
import { BOOT_REVEAL_MS } from '../../../lib/factoryBoot';
import type { BootFailure, BootMilestone, bootStatus } from '../../../lib/factoryBoot';
import { useCoreTheme } from '../../core/CoreThemeProvider';

interface BootScreenProps {
  stage: ReturnType<typeof bootStatus>['stage'];
  progress: number;
  done: Partial<Record<BootMilestone, true>>;
  failure: BootFailure | null;
  onRetry: () => void;
  onSkip: () => void;
}

export function FacilityBootScreen({
  stage,
  progress,
  done,
  failure,
  onRetry,
  onSkip,
}: BootScreenProps) {
  const { locale, t, theme } = useCoreTheme();
  const copy = facilityBoot[locale];
  const ready = stage === 'revealing';
  return (
    <div
      className="facility-boot"
      data-personality={theme}
      data-stage={stage}
      style={{ '--boot-reveal-duration': `${BOOT_REVEAL_MS}ms` } as CSSProperties}
    >
      <section className="facility-boot-panel" aria-label={copy.progress}>
        <div className="facility-boot-eye" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div className="facility-boot-console">
          <div className="facility-boot-id">
            <strong>FUZZS</strong>
            <span>CORE {theme.toUpperCase()}</span>
          </div>
          <h2>{failure ? copy.unavailable : ready ? copy.ready : copy.title}</h2>
          {failure ? (
            <p className="facility-boot-message" role="alert">
              {copy.failures[failure]}
            </p>
          ) : (
            <>
              <div className="facility-boot-readout">
                <span role="status">{ready ? copy.ready : copy.steps[stage as BootMilestone]}</span>
                <strong aria-hidden="true">{String(progress).padStart(2, '0')}%</strong>
              </div>
              <div
                className="facility-boot-meter"
                role="progressbar"
                aria-label={copy.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                style={{ '--boot-progress': progress / 100 } as CSSProperties}
              >
                <span />
              </div>
              <ul className="facility-boot-tasks" aria-hidden="true">
                {Object.entries(copy.steps).map(([id, name]) => (
                  <li
                    key={id}
                    data-task={id}
                    data-state={
                      done[id as BootMilestone] ? 'done' : stage === id ? 'working' : 'waiting'
                    }
                  >
                    <i />
                    {name}
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="facility-boot-actions">
            {failure && (
              <button type="button" className="factory-retry-3d" onClick={onRetry}>
                {t.factoryRetry3D}
              </button>
            )}
            <button type="button" onClick={onSkip}>
              {copy.mode2d}
            </button>
            <a href="#projects">
              {copy.projects}
              <ArrowDown size={13} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
