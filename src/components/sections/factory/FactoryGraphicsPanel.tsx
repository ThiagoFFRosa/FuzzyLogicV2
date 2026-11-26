import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { Locale } from '../../../lib/behavior';
import {
  FRAME_LIMITS,
  POST_MODES,
  RENDER_SCALES,
  graphicsSettings,
} from '../../../lib/factoryGraphics';
import type { GraphicsOverrides, GraphicsPreset, RenderReport } from '../../../lib/factoryGraphics';

const copy = {
  pt: {
    title: 'Renderização',
    close: 'Fechar configurações gráficas',
    scale: 'Escala de renderização',
    aa: 'Antialiasing',
    shadows: 'Sombras',
    textures: 'Texturas',
    post: 'Pós-processamento',
    fps: 'Limite de FPS',
    dynamic: 'Resolução dinâmica',
    diagnostics: 'Exibir diagnóstico',
    defaults: 'Restaurar padrões',
    preset: 'Preset',
    adaptive: 'Automática',
    unlimited: 'Sem limite',
    off: 'Desligado',
    on: 'Ligado',
    standard: 'Padrão',
    waiting: 'Aguardando o renderer 3D.',
    canvas: 'Área CSS',
    physical: 'Área física estimada',
    buffer: 'Buffer real',
    active: 'Nível ativo',
    frame: 'Tempo por quadro',
    cpu: 'CPU · envio ao renderer',
    gpu: 'Tempo GPU',
    calls: 'Chamadas de desenho',
    triangles: 'Triângulos',
    geometry: 'Geometrias',
    maps: 'Texturas alocadas',
    lights: 'Luzes',
    limitations: {
      resolution: 'O limite de dimensões do dispositivo reduziu a resolução efetiva.',
      msaa: 'O contexto não disponibilizou MSAA. Confira o método efetivo abaixo.',
      post: 'O efeito solicitado ficou indisponível nas dimensões atuais.',
      textures: 'A filtragem anisotrópica está limitada pelo dispositivo.',
      shadows: 'Os mapas de sombra estão limitados pelo dispositivo.',
    },
  },
  en: {
    title: 'Rendering',
    close: 'Close graphics settings',
    scale: 'Render scale',
    aa: 'Antialiasing',
    shadows: 'Shadows',
    textures: 'Textures',
    post: 'Post-processing',
    fps: 'FPS limit',
    dynamic: 'Dynamic resolution',
    diagnostics: 'Show diagnostics',
    defaults: 'Restore defaults',
    preset: 'Preset',
    adaptive: 'Automatic',
    unlimited: 'Unlimited',
    off: 'Off',
    on: 'On',
    standard: 'Standard',
    waiting: 'Waiting for the 3D renderer.',
    canvas: 'CSS area',
    physical: 'Estimated physical area',
    buffer: 'Actual buffer',
    active: 'Active tier',
    frame: 'Frame time',
    cpu: 'CPU · renderer submission',
    gpu: 'GPU time',
    calls: 'Draw calls',
    triangles: 'Triangles',
    geometry: 'Geometries',
    maps: 'Allocated textures',
    lights: 'Lights',
    limitations: {
      resolution: 'The device dimensions limit lowered the effective resolution.',
      msaa: 'The context did not provide MSAA. Check the effective method below.',
      post: 'The requested effect is unavailable at the current dimensions.',
      textures: 'Anisotropic filtering is limited by this device.',
      shadows: 'Shadow maps are limited by this device.',
    },
  },
};

export function renderLimitations(locale: Locale, report: RenderReport | null) {
  return report?.limitations.map((key) => copy[locale].limitations[key]).join(' ') ?? '';
}

function Field<T extends string | number | boolean>({
  label,
  selected,
  values,
  defaultLabel,
  format,
  change,
}: {
  label: string;
  selected: T | null | undefined;
  values: readonly T[];
  defaultLabel: string;
  format: (value: T) => string;
  change: (value: T | undefined) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <select
        value={selected == null ? '' : String(selected)}
        onChange={(event) => {
          change(values.find((value) => String(value) === event.target.value));
        }}
      >
        <option value="">{defaultLabel}</option>
        {values.map((value) => (
          <option key={String(value)} value={String(value)}>
            {format(value)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FactoryGraphicsPanel({
  locale,
  preset,
  overrides,
  report,
  diagnostics,
  setDiagnostics,
  onEdit,
  onReset,
  onClose,
}: {
  locale: Locale;
  preset: GraphicsPreset;
  overrides: GraphicsOverrides;
  report: RenderReport | null;
  diagnostics: boolean;
  setDiagnostics: (value: boolean) => void;
  onEdit: <Key extends keyof GraphicsOverrides>(field: Key, value: GraphicsOverrides[Key]) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const text = copy[locale];
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => close.current?.focus({ preventScroll: true }), []);
  const defaults = graphicsSettings(preset, {});
  const optionLabel = (value: string) => (value === 'off' ? text.off : value.toUpperCase());
  const enabled = (value: boolean) => (value ? text.on : text.off);
  const formatFps = (value: number) => (value ? `${value} FPS` : text.unlimited);
  const fromPreset = (value: string) => `${text.preset} · ${value}`;
  const dimensions = (value: [number, number]) => value.join(' × ');
  const ms = (value: number | null) => (value === null ? '—' : `${value.toFixed(1)} ms`);
  const custom = Object.keys(overrides).length > 0;
  const actualAA =
    report?.effectiveAA === 'msaa'
      ? `MSAA ${report.samples}×`
      : optionLabel(report?.effectiveAA ?? 'off');
  const limitation = renderLimitations(locale, report);

  return createPortal(
    <section
      className="factory-graphics-panel"
      id="factory-graphics-panel"
      aria-labelledby="factory-graphics-title"
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    >
      <header>
        <div>
          <h2 id="factory-graphics-title">{text.title}</h2>
          <span>
            {preset.toUpperCase()}
            {custom ? ' · CUSTOM' : ''}
          </span>
        </div>
        <button ref={close} type="button" onClick={onClose} aria-label={text.close}>
          <X size={17} />
        </button>
      </header>
      <div className="factory-graphics-fields">
        <Field
          label={text.scale}
          selected={overrides.scale}
          values={RENDER_SCALES}
          defaultLabel={fromPreset(defaults.scale === null ? text.adaptive : `${defaults.scale}%`)}
          format={(value) => `${value}%`}
          change={(value) => onEdit('scale', value)}
        />
        <Field
          label={text.post}
          selected={overrides.post}
          values={POST_MODES}
          defaultLabel={fromPreset(text.off)}
          format={(value) => (value === 'bloom' ? 'Bloom' : text.off)}
          change={(value) => onEdit('post', value)}
        />
        <Field
          label={text.fps}
          selected={overrides.fps}
          values={FRAME_LIMITS}
          defaultLabel={fromPreset(formatFps(defaults.fps))}
          format={formatFps}
          change={(value) => onEdit('fps', value)}
        />
      </div>
      <p className="factory-graphics-buffer">
        {report
          ? `${text.buffer} · ${dimensions(report.buffer)} · ${report.scale.toFixed(1)}% · ${actualAA}`
          : text.waiting}
      </p>
      {limitation && (
        <p className="factory-graphics-limit" role="status">
          {limitation}
        </p>
      )}
      <div className="factory-graphics-actions">
        <label>
          <input
            type="checkbox"
            checked={diagnostics}
            onChange={(event) => setDiagnostics(event.target.checked)}
          />
          {text.diagnostics}
        </label>
        <button type="button" onClick={onReset} disabled={!custom}>
          {text.defaults}
        </button>
      </div>
      {diagnostics && report && (
        <dl className="factory-graphics-metrics">
          <dt>{text.canvas}</dt>
          <dd>{dimensions(report.css)}</dd>
          <dt>{text.physical}</dt>
          <dd>{dimensions(report.physical)}</dd>
          <dt>DPR</dt>
          <dd>{report.dpr.toFixed(2)}</dd>
          <dt>{text.active}</dt>
          <dd>{report.tier.toUpperCase()}</dd>
          <dt>{text.aa}</dt>
          <dd>
            {actualAA} · max {report.maxSamples}×
          </dd>
          <dt>{text.shadows}</dt>
          <dd>HIGH</dd>
          <dt>{text.textures}</dt>
          <dd>{text.standard}</dd>
          <dt>Anisotropy</dt>
          <dd>
            {report.anisotropy}× / {report.maxAnisotropy}×
          </dd>
          <dt>{text.post}</dt>
          <dd>{report.post === 'bloom' ? 'Bloom' : text.off}</dd>
          <dt>{text.dynamic}</dt>
          <dd>{enabled(report.dynamic)}</dd>
          {report.timing && (
            <>
              <dt>FPS</dt>
              <dd>{report.timing.fps?.toFixed(1) ?? '—'}</dd>
              <dt>{text.frame}</dt>
              <dd>{ms(report.timing.frameMs)}</dd>
              <dt>{text.cpu}</dt>
              <dd>{ms(report.timing.cpuMs)}</dd>
              <dt>{text.gpu}</dt>
              <dd>{ms(report.timing.gpuMs)}</dd>
            </>
          )}
          {report.draw && (
            <>
              <dt>{text.calls}</dt>
              <dd>{report.draw.calls}</dd>
              <dt>{text.triangles}</dt>
              <dd>{report.draw.triangles}</dd>
              <dt>{text.geometry}</dt>
              <dd>{report.draw.geometries}</dd>
              <dt>{text.maps}</dt>
              <dd>{report.draw.textures}</dd>
              <dt>{text.lights}</dt>
              <dd>{report.draw.lights}</dd>
            </>
          )}
        </dl>
      )}
    </section>,
    document.body,
  );
}
