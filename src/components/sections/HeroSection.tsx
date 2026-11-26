import { Suspense, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useInView } from 'motion/react';
import { ArrowDown, ArrowUpRight, Pause, Play, ScanLine, SlidersHorizontal } from 'lucide-react';
import { useCoreTheme } from '../core/CoreThemeProvider';
import { RoboticCore } from '../core/RoboticCore';
import { profile, projects } from '../../data/projects';
import { SUPERVISOR_REACTION_MS } from '../../lib/supervisor';
import type { SupervisorFeedback } from '../../lib/supervisor';
import { CharacterReaction } from '../../lib/characterReaction';
import { FactoryInspection } from './factory/FactoryInspection';
import { FactoryBoundary } from './factory/FactoryBoundary';
import { CLOSE_MS, OPEN_MS, crateOrigin, inspectionReducer } from '../../lib/inspection';
import type { InspectionOrigin, ProjectAnchor } from '../../lib/inspection';
import { browserPreference, persist } from '../../lib/behavior';
import { QUALITY_STORAGE_KEY, parseFactoryQuality } from '../../lib/factoryQuality';
import type { QualityPreference } from '../../lib/factoryQuality';
import { GRAPHICS_STORAGE_KEY, parseGraphicsProfiles } from '../../lib/factoryGraphics';
import type { GraphicsOverrides, RenderReport } from '../../lib/factoryGraphics';
import { FactoryGraphicsPanel, renderLimitations } from './factory/FactoryGraphicsPanel';
import { FacilityBootScreen } from './factory/FacilityBootScreen';
import { useFacilityBoot } from './factory/useFacilityBoot';
import { useCameraSession } from './factory/studio/session';

const defaultGraphics: GraphicsOverrides = {};

export function HeroSection() {
  const { t, locale, theme, switching, compact: mobile, reduced } = useCoreTheme();
  const studio = import.meta.env.DEV ? useCameraSession() : null;
  const navigating = !!studio?.camera && studio.orbit;
  const sceneRef = useRef<HTMLDivElement>(null),
    sectionRef = useRef<HTMLElement>(null),
    hoverIndicator = useRef<HTMLSpanElement>(null);
  const active = useInView(sceneRef, { amount: 0.05 });
  const [enteredScene, setEnteredScene] = useState(false);
  const [quality, setQuality] = useState(() =>
    parseFactoryQuality(browserPreference(QUALITY_STORAGE_KEY)),
  );
  const [graphics, setGraphics] = useState(() =>
    parseGraphicsProfiles(browserPreference(GRAPHICS_STORAGE_KEY)),
  );
  const [graphicsOpen, setGraphicsOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState(false);
  const [renderReport, setRenderReport] = useState<RenderReport | null>(null);
  const graphicsTrigger = useRef<HTMLButtonElement>(null);
  const overrides = quality === 'off' ? defaultGraphics : (graphics[quality] ?? defaultGraphics);
  const graphicsLabel = locale === 'pt' ? 'Ajustes gráficos' : 'Graphics settings';
  const limitation = quality === 'off' ? '' : renderLimitations(locale, renderReport);
  useEffect(() => persist(GRAPHICS_STORAGE_KEY, JSON.stringify(graphics)), [graphics]);
  const closeGraphics = () => {
    setGraphicsOpen(false);
    setDiagnostics(false);
    graphicsTrigger.current?.focus({ preventScroll: true });
  };
  function changeGraphics<Key extends keyof GraphicsOverrides>(
    field: Key,
    value: GraphicsOverrides[Key],
  ) {
    if (quality === 'off') return;
    const next = { ...overrides };
    if (value === undefined) delete next[field];
    else next[field] = value;
    setGraphics((previous) => ({ ...previous, [quality]: next }));
  }
  const travel = useRef(0);
  const supervisorRef = useRef<HTMLDivElement>(null);
  const [supervisorReaction] = useState(() => new CharacterReaction(SUPERVISOR_REACTION_MS, 1450));
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [feedback, setFeedback] = useState<SupervisorFeedback>('observing');
  const [awake, setAwake] = useState(!document.hidden),
    [hover, setHover] = useState<{ index: number; direct: boolean } | null>(null),
    [paused, setPaused] = useState(false);
  const [inspection, dispatch] = useReducer(inspectionReducer, null);
  useEffect(() => {
    if (!navigating) return;
    setHover(null);
    document.body.style.cursor = '';
  }, [navigating]);
  const boot = useFacilityBoot(enteredScene, quality === 'off', reduced);
  const supervisorReady = quality !== 'off' && boot.stage === 'running';
  const staticScene = !!boot.state.failure || quality === 'off';
  const Scene = boot.Scene;
  function changeQuality(preference: QualityPreference) {
    if (preference === 'off') {
      boot.reset();
      setHover(null);
      setGraphicsOpen(false);
      setDiagnostics(false);
      setRenderReport(null);
      document.body.style.cursor = '';
    }
    setQuality(preference);
    persist(QUALITY_STORAGE_KEY, preference);
  }
  useEffect(() => {
    if (!active || !awake || enteredScene || quality === 'off') return;
    let timer = 0;
    const frame = requestAnimationFrame(() => {
      timer = window.setTimeout(() => setEnteredScene(true), 0);
    });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [active, awake, enteredScene, quality]);
  const serial = useRef(0);
  const anchors = useRef<ProjectAnchor[]>([]),
    controls = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = inspection?.phase === 'closing' ? null : (inspection?.index ?? null);
  const hovered = hover?.index ?? null;
  useEffect(() => {
    setFeedback('observing');
    supervisorReaction.reset();
    return () => clearTimeout(reactionTimer.current);
  }, [theme, supervisorReady, supervisorReaction]);
  const reactToSupervisor = () => {
    if (inspection) return;
    const now = performance.now();
    const phase = supervisorReaction.press(now);
    if (!phase) return;
    setFeedback(phase === 'overload' ? 'annoyed' : phase === 'warning' ? 'curious' : 'delighted');
    clearTimeout(reactionTimer.current);
    reactionTimer.current = setTimeout(
      () => setFeedback('observing'),
      supervisorReaction.endsAt - now,
    );
  };
  useEffect(() => {
    const visibility = () => setAwake(!document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      document.body.style.cursor = '';
    };
  }, []);
  const readOrigin = useCallback(
    (index: number): InspectionOrigin | null => {
      const scene = sceneRef.current;
      if (supervisorReady && scene) {
        const origin = crateOrigin(anchors.current[index], scene.getBoundingClientRect());
        if (origin) return origin;
      }
      const control = controls.current[index];
      if (!control) return null;
      const box = control.getBoundingClientRect();
      return {
        kind: 'control',
        left: box.left + scrollX,
        top: box.top + scrollY,
        width: box.width,
        height: box.height,
      };
    },
    [supervisorReady],
  );
  const inspect = useCallback(
    (index: number) => {
      const origin = readOrigin(index);
      if (!origin) return;
      dispatch({
        type: 'select',
        session: {
          id: ++serial.current,
          index,
          startedAt: performance.now(),
          closingAt: null,
          phase: reduced ? 'inspecting' : 'opening',
          origin,
        },
      });
    },
    [readOrigin, reduced],
  );
  const close = useCallback(() => {
    if (!inspection || inspection.phase === 'closing') return;
    dispatch({ type: 'close', id: inspection.id, at: performance.now(), immediate: reduced });
    setHover(null);
    const trigger = controls.current[inspection.index];
    trigger?.focus({ preventScroll: true });
    if (mobile && trigger && trigger.getBoundingClientRect().top < 80) {
      trigger.scrollIntoView({ block: 'center', behavior: reduced ? 'instant' : 'smooth' });
    }
  }, [inspection, mobile, reduced]);
  useEffect(() => {
    if (inspection?.phase !== 'opening' && inspection?.phase !== 'closing') return;
    const finishing = inspection.phase === 'closing';
    const end = finishing ? inspection.closingAt! + CLOSE_MS : inspection.startedAt + OPEN_MS;
    const timer = setTimeout(
      () => dispatch({ type: finishing ? 'finish' : 'settle', id: inspection.id }),
      reduced ? 0 : Math.max(0, end - performance.now()),
    );
    return () => clearTimeout(timer);
  }, [inspection, reduced]);
  useEffect(() => {
    if (selected === null) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) close();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [close, selected]);
  const changeSceneHover = useCallback((index: number | null) => {
    setHover((current) =>
      index === null ? (current?.direct ? null : current) : { index, direct: true },
    );
  }, []);
  useEffect(() => {
    if (hovered === null || inspection || !active || !awake || !supervisorReady) return;
    let frame = 0;
    const draw = () => {
      const point = anchors.current[hovered];
      const badge = hoverIndicator.current;
      if (badge) {
        badge.hidden = !point?.visible;
        if (point?.visible)
          badge.style.transform = `translate3d(${point.left + point.width / 2}px,${point.top + (sceneRef.current?.offsetTop ?? 0)}px,0) translate(-50%,-115%)`;
      }
      if (!reduced) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [hovered, inspection, active, awake, reduced, supervisorReady]);
  const fallback = (
    <div className="factory-fallback">
      <div className="fallback-belt" />
      <p>{t.factoryFallback}</p>
    </div>
  );
  return (
    <section
      id="home"
      ref={sectionRef}
      className="hero factory-hero"
      data-inspecting={selected !== null}
      data-inspection-present={inspection !== null}
      data-inspection-phase={inspection?.phase ?? (hovered === null ? 'idle' : 'hover')}
      data-switching={switching}
      data-compact={mobile}
      data-boot={quality === 'off' ? 'off' : boot.stage}
    >
      <div className="factory-heading">
        <div className="factory-system">
          <span>
            <i className="status-dot" />
            {t.laboratory}
          </span>
          <span>FUZZS / FACILITY 02</span>
        </div>
        <h1>{t.factoryTitle}</h1>
        <p>{t.factorySubtitle}</p>
        <span className="factory-instruction">
          <ScanLine size={15} />
          {mobile ? t.factoryTouchHint : t.factoryHint}
        </span>
      </div>
      <div ref={sceneRef} className="factory-scene">
        {staticScene
          ? fallback
          : Scene && (
              <div
                className="factory-render"
                role="img"
                aria-hidden={!supervisorReady}
                aria-label={`${t.factoryLine}: ${projects.map((p) => p.name).join(', ')}`}
              >
                <FactoryBoundary key={boot.state.attempt} fallback={null} onFailure={boot.fail}>
                  <Suspense fallback={null}>
                    <Scene
                      active={active && awake && supervisorReady && !studio?.background}
                      compact={mobile}
                      booting={!supervisorReady}
                      quality={quality}
                      graphics={overrides}
                      diagnostics={graphicsOpen && diagnostics}
                      onRenderReport={setRenderReport}
                      travel={travel}
                      reduced={reduced}
                      paused={paused || !!studio?.paused}
                      {...(import.meta.env.DEV ? { studio } : {})}
                      inspection={inspection}
                      hovered={hovered}
                      slowOnHover={hover?.direct === true}
                      locale={locale}
                      amber={theme === 'amber'}
                      anchors={anchors}
                      supervisor={supervisorRef}
                      supervisorReaction={supervisorReaction}
                      supervisorFeedback={feedback}
                      onBootMilestone={boot.complete}
                      sceneElement={sceneRef}
                      onSelect={inspect}
                      onHover={changeSceneHover}
                      onUnavailable={boot.fail}
                    />
                  </Suspense>
                </FactoryBoundary>
              </div>
            )}
        {quality !== 'off' && !supervisorReady && (
          <FacilityBootScreen
            stage={boot.stage}
            progress={boot.progress}
            done={boot.state.done}
            failure={boot.state.failure}
            onRetry={boot.retry}
            onSkip={() => changeQuality('off')}
          />
        )}
      </div>
      <div className="factory-vignette" aria-hidden="true" />
      <div
        className={`factory-core${supervisorReady ? ' has-supervisor' : ''}`}
        ref={supervisorRef}
      >
        {supervisorReady ? (
          <div
            className="supervisor-control"
            data-testid="hero-eye"
            data-personality={theme}
            data-transitioning={switching}
            data-reaction={feedback}
          >
            <button
              type="button"
              className="supervisor-trigger"
              onClick={reactToSupervisor}
              aria-label={t.wakeCore}
            />
            <span className="supervisor-speech" aria-live="polite">
              {feedback === 'annoyed'
                ? t.coreAnnoyed
                : feedback === 'curious'
                  ? theme === 'blue'
                    ? t.coreCuriousBlue
                    : t.coreCuriousAmber
                  : feedback === 'delighted'
                    ? theme === 'blue'
                      ? t.coreHello
                      : t.coreAmber
                    : ''}
            </span>
          </div>
        ) : staticScene ? (
          <RoboticCore />
        ) : null}
        {(supervisorReady || quality === 'off') && <span>{t.factorySupervisor}</span>}
      </div>
      <div className="factory-run-state">
        <span className="status-dot" />
        {inspection || paused || studio?.paused || reduced || !supervisorReady
          ? t.factoryPaused
          : t.factoryOperating}
        <span className="run-arrow">→</span>
      </div>
      {hovered !== null && !inspection && supervisorReady && (
        <span ref={hoverIndicator} className="factory-hover-indicator" aria-hidden="true" hidden>
          <ScanLine size={12} />
          {t.factoryInspect}
        </span>
      )}
      {inspection && (
        <FactoryInspection
          key={inspection.id}
          session={inspection}
          readOrigin={readOrigin}
          onClose={close}
          mobile={mobile}
          reduced={reduced}
        />
      )}
      <div className="factory-foreground">
        <div className="factory-control-top" id="factory-settings" tabIndex={-1}>
          <span>
            {t.factoryLine} <span>/ 05</span>
          </span>
          <div className="factory-display-controls">
            <label className="factory-quality">
              <span>{t.factoryQuality}</span>
              <select
                value={quality}
                onChange={(event) => {
                  changeQuality(parseFactoryQuality(event.currentTarget.value));
                }}
              >
                <option value="auto">AUTO</option>
                <option value="low">LOW</option>
                <option value="medium">MEDIUM</option>
                <option value="high">HIGH</option>
                <option value="ultra">ULTRA</option>
                <option value="off">2D</option>
              </select>
            </label>
            <button
              type="button"
              className="factory-graphics-trigger"
              ref={graphicsTrigger}
              aria-label={graphicsLabel}
              aria-expanded={graphicsOpen}
              aria-controls={graphicsOpen ? 'factory-graphics-panel' : undefined}
              title={limitation || graphicsLabel}
              data-limited={!!limitation}
              disabled={quality === 'off'}
              onClick={() => (graphicsOpen ? closeGraphics() : setGraphicsOpen(true))}
            >
              <SlidersHorizontal size={15} aria-hidden="true" />
            </button>
            <button
              className="factory-pause"
              onClick={() => setPaused((v) => !v)}
              disabled={reduced || staticScene}
              aria-pressed={paused || reduced}
              aria-label={reduced ? t.factoryPaused : paused ? t.factoryResume : t.factoryPause}
            >
              {paused ? <Play size={13} /> : <Pause size={13} />}
              <span>{reduced ? t.factoryPaused : paused ? t.factoryResume : t.factoryPause}</span>
            </button>
          </div>
        </div>
        {graphicsOpen && quality !== 'off' && (
          <FactoryGraphicsPanel
            locale={locale}
            preset={quality}
            overrides={overrides}
            report={staticScene ? null : renderReport}
            diagnostics={diagnostics}
            setDiagnostics={setDiagnostics}
            onEdit={changeGraphics}
            onReset={() => setGraphics((previous) => ({ ...previous, [quality]: defaultGraphics }))}
            onClose={closeGraphics}
          />
        )}
        <nav className="factory-project-controls" aria-label={t.factoryProjects}>
          {projects.map((project, index) => (
            <button
              key={project.id}
              ref={(el) => {
                controls.current[index] = el;
              }}
              className={selected === index ? 'selected' : ''}
              onClick={() => inspect(index)}
              onFocus={() => setHover({ index, direct: false })}
              onBlur={() => setHover(null)}
              onPointerEnter={(event) => {
                if (event.pointerType !== 'touch') setHover({ index, direct: false });
              }}
              onPointerLeave={() => setHover(null)}
              aria-expanded={selected === index}
              aria-controls={selected === index ? 'factory-inspection-content' : undefined}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              {project.name}
              <ArrowUpRight size={14} />
            </button>
          ))}
        </nav>
      </div>
      <div className="factory-footer">
        <span>{profile.name.toUpperCase()}</span>
        <a href="#projects">
          {t.factoryScroll}
          <ArrowDown size={14} />
        </a>
      </div>
    </section>
  );
}
