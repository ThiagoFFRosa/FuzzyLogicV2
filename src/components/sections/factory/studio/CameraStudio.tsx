import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { Grip, Minus, Plus, X } from 'lucide-react';
import { CAMERA_PROFILES } from '../../../../lib/factoryCamera';
import type {
  CameraConfiguration,
  CameraProfile,
  CameraVector,
} from '../../../../lib/factoryCamera';
import { browserPreference, persist } from '../../../../lib/behavior';
import { projects } from '../../../../data/projects';
import {
  coordinateLimit,
  defaultProfile,
  importConfigurations,
  opticalFields,
  profileLabels,
  readConfiguration,
  serializeConfiguration,
  viewports,
} from './configuration';
import type { Viewport } from './configuration';
import {
  cameraMovement,
  cameraSession,
  diagnostics,
  initialSession,
  liveCamera,
  overlays,
  previewParameter,
} from './session';
import type { LiveCamera } from './session';
import { PreviewRuntime, SimulatedViewport, studioAction } from './CameraPreview';
import { ScenePresentation } from './CameraCompositionOverlay';
import './camera-studio.css';

type Preset = { id: string; name: string; camera: CameraConfiguration };
type Drafts = Partial<Record<CameraProfile, CameraConfiguration>>;
const storageKey = 'fuzzs.camera-studio.presets.v1';
const backgroundSession = { ...initialSession, background: true };
type Optic = keyof typeof opticalFields;
type Tab = 'camera' | 'scene' | 'presets';

function loadPresets(): Preset[] {
  try {
    const data: unknown = JSON.parse(browserPreference(storageKey) ?? '[]');
    if (!Array.isArray(data)) return [];
    return data.flatMap((item: Partial<Preset> | null) => {
      if (
        !item ||
        typeof item.id !== 'string' ||
        typeof item.name !== 'string' ||
        !item.name.trim()
      )
        return [];
      try {
        return [{ id: item.id, name: item.name, camera: readConfiguration(item.camera) }];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}

function CameraNumber({
  label,
  value,
  min,
  max,
  step,
  onChange,
  range,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  range?: [number, number];
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const lower = Math.min(range?.[0] ?? min, value);
  const upper = Math.max(range?.[1] ?? max, value);
  return (
    <div className="camera-studio-number">
      <label>
        <span>{label}</span>
        <input
          type="number"
          aria-label={label}
          min={min}
          max={max}
          step="any"
          value={draft ?? Number(value.toFixed(6))}
          onChange={(event) => {
            setDraft(event.target.value);
            if (Number.isFinite(event.target.valueAsNumber)) onChange(event.target.valueAsNumber);
          }}
          onBlur={() => setDraft(null)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === 'Escape') setDraft(null);
          }}
        />
      </label>
      <input
        type="range"
        aria-label={`${label} slider`}
        min={lower}
        max={upper}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.valueAsNumber)}
      />
    </div>
  );
}

function CameraPanel({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState(initialSession);
  const [viewport, setViewport] = useState<Viewport | ''>('');
  const [simulatedView, setSimulatedView] = useState<LiveCamera | null>(null);
  const nativeView = useSyncExternalStore(liveCamera.subscribe, liveCamera.get);
  const view = viewport ? simulatedView : nativeView;
  const [drafts, setDrafts] = useState<Drafts>({});
  const measured = useRef<Drafts>({});
  const [tab, setTab] = useState<Tab>('camera');
  const [minimized, setMinimized] = useState(false);
  const [presets, setPresets] = useState(loadPresets);
  const [presetId, setPresetId] = useState('');
  const [name, setName] = useState('');
  const [format, setFormat] = useState<'json' | 'ts'>('json');
  const [transfer, setTransfer] = useState('');
  const [status, setStatus] = useState<{ message: string; error?: boolean } | null>(null);
  const panel = useRef<HTMLElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const profile = settings.camera?.profile ?? view?.camera.profile ?? 'desktop';
  const current = settings.camera ?? view?.camera ?? defaultProfile(profile);

  useEffect(() => {
    cameraSession.set(viewport ? backgroundSession : settings);
  }, [viewport, settings]);
  useEffect(
    () => () => {
      cameraSession.set(null);
      liveCamera.set(null);
    },
    [],
  );
  useEffect(() => {
    if (view) measured.current[view.camera.profile] = view.camera;
  }, [view]);

  const defaultFor = (device: CameraProfile) =>
    (view?.camera.profile === device ? view.camera : measured.current[device]) ??
    defaultProfile(device);
  function apply(config: CameraConfiguration) {
    setDrafts((previous) => ({ ...previous, [config.profile]: config }));
    setSettings((previous) => ({ ...previous, camera: config }));
  }
  function change(config: CameraConfiguration) {
    try {
      apply(readConfiguration(config));
      setStatus(null);
    } catch (error) {
      setStatus({ message: (error as Error).message, error: true });
    }
  }
  const receiveMovement = useCallback(
    (camera: CameraConfiguration) => {
      const active = settings.camera;
      if (!active || !settings.orbit || camera.profile !== active.profile) return;
      const next = { ...active, position: camera.position, target: camera.target };
      setSettings((previous) =>
        previous.orbit && previous.camera?.profile === next.profile
          ? {
              ...previous,
              camera: { ...previous.camera, position: next.position, target: next.target },
            }
          : previous,
      );
      setDrafts((previous) => ({ ...previous, [next.profile]: next }));
    },
    [settings.camera, settings.orbit],
  );
  useEffect(() => {
    if (viewport) return;
    return cameraMovement.subscribe(() => {
      const camera = cameraMovement.get();
      if (camera) receiveMovement(camera);
    });
  }, [receiveMovement, viewport]);

  const perform = useCallback(
    (action: 'minimize' | 'orbit' | 'hide' | 'pause' | 'close') => {
      switch (action) {
        case 'minimize':
          setMinimized((value) => !value);
          break;
        case 'close':
          onClose();
          break;
        case 'orbit':
          setSettings((value) => (value.camera ? { ...value, orbit: !value.orbit } : value));
          break;
        case 'hide':
          setSettings((value) => ({ ...value, hideHtml: !value.hideHtml }));
          break;
        case 'pause':
          setSettings((value) => ({ ...value, paused: !value.paused }));
          break;
      }
    },
    [onClose],
  );
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const action = studioAction(event);
      if (!action) return;
      event.preventDefault();
      perform(action);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [perform]);

  function movePanel(x: number, y: number) {
    const node = panel.current;
    if (!node) return;
    node.style.left = `${Math.max(0, Math.min(x, innerWidth - node.offsetWidth))}px`;
    const top = `${Math.max(0, Math.min(y, innerHeight - 44))}px`;
    node.style.top = top;
    node.style.setProperty('--studio-top', top);
  }
  useLayoutEffect(() => {
    const fit = () => {
      const node = panel.current;
      if (node?.style.left) movePanel(node.offsetLeft, node.offsetTop);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [minimized]);
  function startDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || !panel.current) return;
    const box = panel.current.getBoundingClientRect();
    drag.current = { x: event.clientX - box.left, y: event.clientY - box.top };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function replacePresets(next: Preset[]) {
    setPresets(next);
    persist(storageKey, JSON.stringify(next));
  }
  function savePreset(duplicate: boolean) {
    const selected = presets.find((preset) => preset.id === presetId);
    const title = (duplicate ? `${selected?.name ?? ''} copy` : name).trim();
    if (!title || (duplicate && !selected)) {
      setStatus({ message: 'Enter a name before saving the preset.', error: true });
      return;
    }
    const preset = {
      id: crypto.randomUUID(),
      name: title,
      camera: duplicate && selected ? selected.camera : current,
    };
    replacePresets([...presets, preset]);
    setPresetId(preset.id);
    setName(preset.name);
    if (duplicate) apply(preset.camera);
    setStatus({ message: `Saved ${preset.name} locally.` });
  }

  async function copy(all: boolean) {
    const map = Object.fromEntries(
      CAMERA_PROFILES.map((device) => [
        device,
        device === profile ? current : (drafts[device] ?? defaultFor(device)),
      ]),
    ) as Record<CameraProfile, CameraConfiguration>;
    const value = serializeConfiguration(all ? map : current, format);
    setTransfer(value);
    try {
      await navigator.clipboard.writeText(value);
      setStatus({ message: all ? 'All profiles copied.' : 'Camera configuration copied.' });
    } catch {
      document.getElementById('camera-studio-transfer')?.focus();
      (document.getElementById('camera-studio-transfer') as HTMLTextAreaElement | null)?.select();
      setStatus({ message: 'Clipboard unavailable. Copy the selected text below.', error: true });
    }
  }

  function importCamera() {
    try {
      const configs = importConfigurations(transfer);
      const next = configs.find((config) => config.profile === profile) ?? configs[0];
      setDrafts((previous) => ({
        ...previous,
        ...Object.fromEntries(configs.map((config) => [config.profile, config])),
      }));
      setSettings((previous) => ({ ...previous, camera: next }));
      setStatus({
        message: `Imported ${configs.length === 1 ? profileLabels[next.profile] : 'all supplied profiles'}.`,
      });
    } catch (error) {
      setStatus({ message: (error as Error).message, error: true });
    }
  }

  const free = settings.camera !== null;
  const checkbox = (label: string, checked: boolean, onToggle: () => void, disabled = false) => (
    <label key={label} className="camera-studio-check">
      <input type="checkbox" checked={checked} onChange={onToggle} disabled={disabled} />
      {label}
    </label>
  );
  return createPortal(
    <>
      {viewport ? (
        <SimulatedViewport
          viewport={viewport}
          settings={settings}
          onView={setSimulatedView}
          onMove={receiveMovement}
          onAction={perform}
        />
      ) : (
        <ScenePresentation settings={settings} />
      )}
      <aside
        ref={panel}
        className="camera-studio"
        aria-label="Camera Studio"
        data-minimized={minimized}
      >
        <header>
          <button
            type="button"
            className="camera-studio-grip"
            aria-label="Move panel"
            title="Drag or use arrow keys"
            onPointerDown={startDrag}
            onPointerMove={(event) => {
              if (drag.current)
                movePanel(event.clientX - drag.current.x, event.clientY - drag.current.y);
            }}
            onLostPointerCapture={() => {
              drag.current = null;
            }}
            onKeyDown={(event) => {
              const shifts: Record<string, [number, number]> = {
                ArrowLeft: [-16, 0],
                ArrowRight: [16, 0],
                ArrowUp: [0, -16],
                ArrowDown: [0, 16],
              };
              const shift = shifts[event.key];
              if (!shift || !panel.current) return;
              event.preventDefault();
              movePanel(panel.current.offsetLeft + shift[0], panel.current.offsetTop + shift[1]);
            }}
          >
            <Grip size={15} aria-hidden />
          </button>
          <h2>Camera Studio</h2>
          <button
            type="button"
            aria-label={minimized ? 'Expand panel' : 'Minimize panel'}
            aria-expanded={!minimized}
            title="Alt + M"
            onClick={() => perform('minimize')}
          >
            {minimized ? <Plus size={15} aria-hidden /> : <Minus size={15} aria-hidden />}
          </button>
          <button
            type="button"
            aria-label="Close Camera Studio"
            title="Ctrl + Shift + K"
            onClick={onClose}
          >
            <X size={15} aria-hidden />
          </button>
        </header>
        {!minimized && (
          <div className="camera-studio-scroll">
            <div className="camera-studio-segment" aria-label="Camera mode" role="group">
              <button
                type="button"
                aria-pressed={!free}
                onClick={() => {
                  setSettings((previous) => ({ ...previous, camera: null }));
                  setStatus(null);
                }}
              >
                Production Camera
              </button>
              <button
                type="button"
                aria-pressed={free}
                disabled={!view && !free}
                onClick={() => {
                  if (!free && view) {
                    apply(view.camera);
                    setStatus(null);
                  }
                }}
              >
                Free Camera
              </button>
            </div>
            <div className="camera-studio-columns">
              <label>
                Device profile
                <select
                  aria-label="Device profile"
                  value={profile}
                  onChange={(event) => {
                    const device = event.target.value as CameraProfile;
                    apply(drafts[device] ?? defaultFor(device));
                    setStatus(null);
                  }}
                >
                  {CAMERA_PROFILES.map((device) => (
                    <option key={device} value={device}>
                      {profileLabels[device]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Viewport
                <select
                  aria-label="Viewport"
                  value={viewport}
                  onChange={(event) => {
                    if (!viewport) setSimulatedView(null);
                    setViewport(event.target.value as Viewport | '');
                  }}
                >
                  <option value="">Live browser</option>
                  {Object.keys(viewports).map((ratio) => (
                    <option key={ratio}>{ratio}</option>
                  ))}
                </select>
              </label>
            </div>
            <div
              className="camera-studio-segment camera-studio-tabs"
              aria-label="Studio sections"
              role="group"
            >
              {(['camera', 'scene', 'presets'] as const).map((item) => (
                <button
                  type="button"
                  key={item}
                  aria-pressed={tab === item}
                  onClick={() => {
                    setTab(item);
                    setStatus(null);
                  }}
                >
                  {{ camera: 'Camera', scene: 'Scene', presets: 'Presets & I/O' }[item]}
                </button>
              ))}
            </div>
            {tab === 'camera' && (
              <>
                {checkbox('Orbit controls', free && settings.orbit, () => perform('orbit'), !free)}
                {free && settings.orbit && (
                  <p className="camera-studio-hint">
                    Drag to orbit · Right-drag to pan · Scroll to dolly
                  </p>
                )}
                {!free && (
                  <p className="camera-studio-hint">
                    {view
                      ? 'Switch to Free Camera to edit these values.'
                      : 'Waiting for the 3D scene. Enable graphics if the scene is off.'}
                  </p>
                )}
                <fieldset disabled={!free} key={profile}>
                  {(['position', 'target'] as const).map((field) => (
                    <fieldset key={field}>
                      <legend>{field === 'position' ? 'Position' : 'Target'}</legend>
                      {(['X', 'Y', 'Z'] as const).map((axis, index) => (
                        <CameraNumber
                          key={axis}
                          label={`${field === 'position' ? 'Position' : 'Target'} ${axis}`}
                          min={-coordinateLimit}
                          max={coordinateLimit}
                          range={field === 'position' ? [-50, 60] : [-30, 30]}
                          step={0.01}
                          value={current[field][index]}
                          onChange={(value) => {
                            const vector = [...current[field]] as CameraVector;
                            vector[index] = value;
                            change({ ...current, [field]: vector });
                          }}
                        />
                      ))}
                    </fieldset>
                  ))}
                  <fieldset>
                    <legend>Optics</legend>
                    {(Object.keys(opticalFields) as Optic[]).map((field) => (
                      <CameraNumber
                        key={field}
                        {...opticalFields[field]}
                        value={current[field]}
                        range={
                          field === 'near'
                            ? [0.001, 10]
                            : field === 'far'
                              ? [0.002, 500]
                              : undefined
                        }
                        onChange={(value) => change({ ...current, [field]: value })}
                      />
                    ))}
                  </fieldset>
                  <div className="camera-studio-buttons">
                    <button
                      type="button"
                      onClick={() => {
                        const { fov, zoom, near, far, roll } = defaultFor(profile);
                        change({ ...current, fov, zoom, near, far, roll });
                      }}
                    >
                      Reset optics
                    </button>
                    <button type="button" onClick={() => change(defaultFor(profile))}>
                      Restore default
                    </button>
                  </div>
                </fieldset>
              </>
            )}
            {tab === 'scene' && (
              <>
                <fieldset>
                  <legend>Production</legend>
                  <div className="camera-studio-options">
                    {checkbox('Pause conveyor', settings.paused, () => perform('pause'))}
                    {checkbox('Suspend ambient events', settings.suspendAmbient, () =>
                      setSettings({ ...settings, suspendAmbient: !settings.suspendAmbient }),
                    )}
                    {checkbox('Hide HTML', settings.hideHtml, () => perform('hide'))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend>Composition</legend>
                  <div className="camera-studio-options">
                    {(Object.keys(overlays) as (keyof typeof overlays)[]).map((key) =>
                      checkbox(overlays[key], !!settings.overlay[key], () =>
                        setSettings({
                          ...settings,
                          overlay: { ...settings.overlay, [key]: !settings.overlay[key] },
                        }),
                      ),
                    )}
                  </div>
                </fieldset>
                <fieldset>
                  <legend>3D diagnostics</legend>
                  <div className="camera-studio-options">
                    {(Object.keys(diagnostics) as (keyof typeof diagnostics)[]).map((key) =>
                      checkbox(diagnostics[key], !!settings.debug[key], () =>
                        setSettings({
                          ...settings,
                          debug: { ...settings.debug, [key]: !settings.debug[key] },
                        }),
                      ),
                    )}
                  </div>
                  {settings.debug.boxes && (
                    <label>
                      Object
                      <select
                        aria-label="Object"
                        value={settings.object}
                        onChange={(event) =>
                          setSettings({ ...settings, object: event.target.value })
                        }
                      >
                        {projects.map((project, index) => (
                          <option key={project.name} value={`project-crate-${index}`}>
                            {project.name}
                          </option>
                        ))}
                        <option value="factory-turret-active">Active turret</option>
                        <option value="supervisor-ceiling-arm">Supervisor arm</option>
                        <option value="conveyor-drive">Conveyor drive</option>
                      </select>
                    </label>
                  )}
                </fieldset>
                <p className="camera-studio-hint">
                  Alt + O orbit · Alt + P pause · Alt + H HTML · Alt + M minimize
                </p>
              </>
            )}
            {tab === 'presets' && (
              <>
                <fieldset>
                  <legend>Local presets</legend>
                  <label>
                    Saved preset
                    <select
                      value={presetId}
                      onChange={(event) => {
                        const id = event.target.value;
                        const preset = presets.find((item) => item.id === id);
                        setPresetId(id);
                        setName(preset?.name ?? '');
                        if (preset) apply(preset.camera);
                        setStatus(null);
                      }}
                    >
                      <option value="">Select a preset</option>
                      {presets.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.name} · {profileLabels[preset.camera.profile]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Preset name
                    <input
                      type="text"
                      maxLength={80}
                      placeholder="e.g. Supervisor Focus"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </label>
                  <div className="camera-studio-buttons">
                    <button type="button" onClick={() => savePreset(false)}>
                      Save as new
                    </button>
                    <button
                      type="button"
                      disabled={!presetId || !name.trim()}
                      onClick={() => {
                        replacePresets(
                          presets.map((preset) =>
                            preset.id === presetId ? { ...preset, name: name.trim() } : preset,
                          ),
                        );
                        setStatus({ message: 'Preset renamed.' });
                      }}
                    >
                      Rename
                    </button>
                    <button type="button" disabled={!presetId} onClick={() => savePreset(true)}>
                      Duplicate
                    </button>
                    <button
                      type="button"
                      disabled={!presetId}
                      onClick={() => {
                        replacePresets(presets.filter((preset) => preset.id !== presetId));
                        setPresetId('');
                        setName('');
                        setStatus({ message: 'Preset deleted.' });
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </fieldset>
                <fieldset>
                  <legend>Import / export</legend>
                  <label>
                    Export format
                    <select
                      value={format}
                      onChange={(event) => setFormat(event.target.value as 'json' | 'ts')}
                    >
                      <option value="json">JSON</option>
                      <option value="ts">TypeScript object</option>
                    </select>
                  </label>
                  <div className="camera-studio-buttons">
                    <button type="button" onClick={() => void copy(false)}>
                      Copy Camera Configuration
                    </button>
                    <button type="button" onClick={() => void copy(true)}>
                      Copy all profiles
                    </button>
                  </div>
                  <label>
                    Configuration
                    <textarea
                      id="camera-studio-transfer"
                      spellCheck={false}
                      placeholder="Paste an exported JSON configuration"
                      value={transfer}
                      onChange={(event) => setTransfer(event.target.value)}
                    />
                  </label>
                  <button type="button" onClick={importCamera} disabled={!transfer.trim()}>
                    Import JSON
                  </button>
                </fieldset>
              </>
            )}
            {status && (
              <p
                className="camera-studio-status"
                data-error={status.error || undefined}
                role="status"
              >
                {status.message}
              </p>
            )}
          </div>
        )}
      </aside>
    </>,
    document.body,
  );
}

export default function CameraStudio({ onClose }: { onClose: () => void }) {
  return window.parent !== window &&
    new URLSearchParams(location.search).get(previewParameter) === '1' ? (
    <PreviewRuntime />
  ) : (
    <CameraPanel onClose={onClose} />
  );
}
