import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import type { Locale } from '../../../lib/behavior';
import {
  DAMAGED_TURRET_SLOT,
  PROJECT_SLOTS,
  advanceBelt,
  approachBeltSpeed,
  beltPosition,
} from '../../../lib/conveyor';
import { FactoryEnvironment } from './FactoryEnvironment';
import { Conveyor } from './Conveyor';
import { ConveyorDrive } from './ConveyorDrive';
import { ProjectCrate } from './ProjectCrate';
import type { InspectionSession, ProjectAnchor } from '../../../lib/inspection';
import { FactoryTurret } from './FactoryTurret';
import { ProductionStations } from './ProductionStations';
import { FactoryMaterials } from './FactoryMaterials';
import { IndustrialLighting } from './IndustrialLighting';
import { ConveyorScanner } from './ConveyorScanner';
import { Supervisor } from './Supervisor';
import { useAmbientEvents } from './useAmbientEvents';
import { SUPERVISOR_HEIGHT } from '../../../lib/supervisor';
import { AdaptiveQuality, initialFactoryQuality } from '../../../lib/factoryQuality';
import type { FactoryQuality, QualityPreference } from '../../../lib/factoryQuality';
import {
  graphicsSettings,
  resolveResolution,
  SHADOW_INTERVALS,
} from '../../../lib/factoryGraphics';
import type {
  GraphicsOverrides,
  GraphicsSettings,
  RenderReport,
} from '../../../lib/factoryGraphics';
import { FactoryRenderer } from './FactoryRenderer';
import { FactoryAssetError } from '../../../lib/factoryBoot';
import type { BootMilestone } from '../../../lib/factoryBoot';
import { cameraProfile, productionCamera } from '../../../lib/factoryCamera';
import { liveCamera } from './studio/session';
import type { CameraSession } from './studio/session';

const assetFailure = (error: unknown): never => {
  throw new FactoryAssetError(error);
};
const BackgroundInfrastructure = lazy(() =>
  import('./BackgroundInfrastructure').then(
    (module) => ({ default: module.BackgroundInfrastructure }),
    assetFailure,
  ),
);
const MaintenanceBay = lazy(() =>
  import('./MaintenanceBay').then((module) => ({ default: module.MaintenanceBay }), assetFailure),
);
const CameraDebugController = import.meta.env.DEV
  ? lazy(() => import('./studio/CameraDebugController'))
  : null;
const { position, fov, near, far } = productionCamera(16 / 9, false).camera;
const INITIAL_CAMERA = { position, fov, near, far };
export interface FactorySceneProps {
  active: boolean;
  compact: boolean;
  reduced: boolean;
  paused: boolean;
  inspection: InspectionSession | null;
  hovered: number | null;
  locale: Locale;
  amber: boolean;
  slowOnHover: boolean;
  anchors: MutableRefObject<ProjectAnchor[]>;
  supervisor: MutableRefObject<HTMLDivElement | null>;
  reactionAt: MutableRefObject<number>;
  curiosityAt: MutableRefObject<number>;
  booting: boolean;
  onBootMilestone: (milestone: BootMilestone) => void;
  sceneElement: MutableRefObject<HTMLDivElement | null>;
  onSelect: (index: number) => void;
  onHover: (index: number | null) => void;
  quality: Exclude<QualityPreference, 'off'>;
  graphics: GraphicsOverrides;
  diagnostics: boolean;
  onRenderReport: (report: RenderReport) => void;
  travel: MutableRefObject<number>;
  onUnavailable: (error?: unknown) => void;
  studio?: CameraSession | null;
}

function RenderBudget({
  level,
  preference,
  running,
  settings,
  sceneryReady,
  inspectionId,
  onLevel,
  onUnavailable,
  booting,
  compact: mobile,
}: {
  level: FactoryQuality;
  preference: FactorySceneProps['quality'];
  running: boolean;
  settings: GraphicsSettings;
  sceneryReady: boolean;
  inspectionId: number | undefined;
  onLevel: (level: FactoryQuality) => void;
  onUnavailable: (error?: unknown) => void;
  booting: boolean;
  compact: boolean;
}) {
  const { gl, invalidate } = useThree();
  const limited = gl.capabilities.maxTextureSize <= 4096;
  const adaptive = useMemo(
    () =>
      new AdaptiveQuality(
        preference === 'auto' ? (mobile || limited ? 'low' : 'medium') : 'high',
        preference === 'auto' && (mobile || limited) ? 'medium' : 'high',
      ),
    [mobile, limited, preference],
  );
  const timing = useRef({ warmup: 0, shadow: 0, shadowFrames: 0 });

  useLayoutEffect(() => {
    if (preference === 'auto' || settings.dynamic) onLevel(adaptive.level);
  }, [adaptive, onLevel, preference, settings.dynamic]);
  useLayoutEffect(() => {
    adaptive.resetWindow();
    timing.current.warmup = 1.25;
  }, [adaptive, preference, running, sceneryReady]);
  useLayoutEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = settings.shadows !== 'off';
    timing.current.shadow = 0;
    timing.current.shadowFrames = 0;
    invalidate();
  }, [gl, level, settings.shadows, running, sceneryReady, inspectionId, invalidate]);
  useLayoutEffect(() => {
    const canvas = gl.domElement;
    const loseContext = (event: Event) => {
      event.preventDefault();
      onUnavailable();
    };
    canvas.addEventListener('webglcontextlost', loseContext);
    return () => canvas.removeEventListener('webglcontextlost', loseContext);
  }, [gl, onUnavailable]);
  useLayoutEffect(() => {
    if (!booting) return;
    const previous = gl.debug.onShaderError;
    gl.debug.onShaderError = () => onUnavailable();
    return () => {
      gl.debug.onShaderError = previous;
    };
  }, [booting, gl, onUnavailable]);
  useFrame((_, delta) => {
    if (!running) return;
    const clock = timing.current;
    const interval = SHADOW_INTERVALS[settings.shadows];
    if (interval) {
      clock.shadow += delta;
      clock.shadowFrames++;
      if (
        settings.shadows === 'ultra' ||
        (clock.shadow >= interval && clock.shadowFrames >= (settings.shadows === 'medium' ? 3 : 2))
      ) {
        gl.shadowMap.needsUpdate = true;
        clock.shadow %= interval;
        clock.shadowFrames = 0;
      }
    }
    if ((preference !== 'auto' && !settings.dynamic) || !sceneryReady || inspectionId !== undefined)
      return;
    if (clock.warmup > 0) {
      clock.warmup -= Math.min(delta, 0.5);
      return;
    }
    const previous = adaptive.level;
    const next = adaptive.sample(delta * Math.min(1, (settings.fps || 60) / 60));
    if (next !== previous) onLevel(next);
  }, -4);
  return null;
}

function SceneryReady({ onReady }: { onReady: () => void }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    onReady();
    invalidate();
  }, [invalidate, onReady]);
  return null;
}

function FirstFactoryFrame({
  ready,
  onMilestone,
}: {
  ready: boolean;
  onMilestone: FactorySceneProps['onBootMilestone'];
}) {
  const { scene, gl, invalidate } = useThree();
  useLayoutEffect(() => {
    if (!ready) return;
    onMilestone('scene');
    const previous = scene.onAfterRender;
    let frame = 0;
    const afterRender: typeof previous = (...args) => {
      previous.apply(scene, args);
      if (!gl.info.render.calls || gl.getContext().isContextLost()) return;
      scene.onAfterRender = previous;
      frame = requestAnimationFrame(() => {
        if (!gl.getContext().isContextLost()) onMilestone('frame');
      });
    };
    scene.onAfterRender = afterRender;
    invalidate();
    return () => {
      if (scene.onAfterRender === afterRender) scene.onAfterRender = previous;
      cancelAnimationFrame(frame);
    };
  }, [ready, gl, scene, invalidate, onMilestone]);
  return null;
}

function Production(
  props: FactorySceneProps & {
    level: FactoryQuality;
    settings: GraphicsSettings;
    onCameraReady: () => void;
    onSceneryReady: () => void;
  },
) {
  const { travel, level, settings, onCameraReady, onSceneryReady } = props;
  const speed = useRef(props.paused || props.inspection ? 0 : 1),
    turretAttention = useRef<number | null>(null),
    scanUntil = useRef(0);
  const { camera, size, invalidate } = useThree();
  const mobile = props.compact;
  const aspect = size.width / Math.max(size.height, 1);
  const device = cameraProfile(window.innerWidth, window.innerHeight, mobile);
  const framing = useMemo(() => productionCamera(aspect, mobile, device), [mobile, aspect, device]);
  const studio = import.meta.env.DEV ? props.studio : null;
  const configuration = studio?.camera ?? framing.camera;
  const projectionRevision = useRef(0);
  const ambient = useAmbientEvents({
    enabled: props.active && !props.reduced && !studio?.suspendAmbient,
    mobile,
    compact: mobile || level !== 'high',
    economy: level === 'low',
  });
  const { supervisorX, supervisorZ } = framing;
  useLayoutEffect(() => {
    camera.position.set(...configuration.position);
    if (camera instanceof PerspectiveCamera) {
      camera.fov = configuration.fov;
      camera.zoom = configuration.zoom;
      camera.near = configuration.near;
      camera.far = configuration.far;
    }
    camera.lookAt(...configuration.target);
    if (configuration.roll) camera.rotateZ(MathUtils.degToRad(configuration.roll));
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    projectionRevision.current++;
    const core = props.supervisor.current;
    if (core) {
      const center = new Vector3(supervisorX, SUPERVISOR_HEIGHT, supervisorZ).project(camera);
      const edge = new Vector3(supervisorX + 1.38, SUPERVISOR_HEIGHT, supervisorZ).project(camera);
      core.style.left = `${(props.sceneElement.current?.offsetLeft ?? 0) + ((center.x + 1) * size.width) / 2}px`;
      core.style.top = `${(props.sceneElement.current?.offsetTop ?? 0) + ((1 - center.y) * size.height) / 2}px`;
      core.style.width = `${Math.abs(edge.x - center.x) * size.width}px`;
      core.style.visibility = center.z < -1 || center.z > 1 ? 'hidden' : '';
    }
    onCameraReady();
    invalidate();
  }, [
    camera,
    size.width,
    size.height,
    configuration,
    supervisorX,
    supervisorZ,
    props.supervisor,
    props.sceneElement,
    onCameraReady,
    invalidate,
  ]);
  useLayoutEffect(() => {
    if (import.meta.env.DEV && studio && size.width > 0 && size.height > 0) {
      liveCamera.set({ camera: framing.camera, width: size.width, height: size.height });
    }
  }, [studio !== null, framing, size.width, size.height]);
  useFrame((_, delta) => {
    if (!props.active || props.reduced) return;
    const operating = !props.paused && !props.inspection;
    speed.current = studio?.paused
      ? 0
      : approachBeltSpeed(speed.current, operating ? (props.slowOnHover ? 0.22 : 1) : 0, delta);
    travel.current = advanceBelt(
      travel.current,
      delta,
      props.active && !props.reduced,
      speed.current,
    );
    const inspection = props.inspection;
    turretAttention.current =
      inspection?.origin.kind === 'crate' && performance.now() - inspection.startedAt < 1250
        ? beltPosition(PROJECT_SLOTS[inspection.index], travel.current)
        : null;
  }, -2);
  return (
    <>
      {CameraDebugController && studio && !studio.background && (
        <Suspense fallback={null}>
          <CameraDebugController settings={studio} camera={configuration} />
        </Suspense>
      )}
      <FactoryEnvironment quality={level} compact={mobile} />
      <Suspense fallback={null}>
        {!mobile && (
          <MaintenanceBay
            ambient={ambient}
            locale={props.locale}
            mobile={mobile}
            lowResolution={level !== 'high'}
            shadows={settings.shadows}
          />
        )}
        <BackgroundInfrastructure
          ambient={ambient}
          animate={props.active && !props.reduced}
          mobile={mobile}
          lowResolution={level === 'low'}
        />
        <SceneryReady onReady={onSceneryReady} />
      </Suspense>
      <IndustrialLighting
        compact={mobile}
        ambient={ambient}
        animate={props.active && !props.reduced}
        amber={props.amber}
        supervisorX={supervisorX}
        supervisorZ={supervisorZ}
        quality={level}
        shadows={settings.shadows}
      />
      <Conveyor travel={travel} />
      <ConveyorDrive travel={travel} />
      <ConveyorScanner
        travel={travel}
        scanUntil={scanUntil}
        animate={props.active && !props.reduced}
        amber={props.amber}
      />
      <ProductionStations supervisorX={supervisorX} locale={props.locale} ambient={ambient} />
      <Supervisor
        ambient={ambient}
        x={supervisorX}
        z={supervisorZ}
        active={props.active}
        reduced={props.reduced}
        amber={props.amber}
        selected={props.inspection?.index ?? null}
        inspectionPhysical={props.inspection?.origin.kind === 'crate'}
        hovered={props.hovered}
        travel={travel}
        scanUntil={scanUntil}
        reactionAt={props.reactionAt}
        curiosityAt={props.curiosityAt}
        lowResolution={level !== 'high'}
      />
      {PROJECT_SLOTS.map((_, index) => (
        <ProjectCrate
          key={index}
          {...props}
          index={index}
          travel={travel}
          contactShadow={level === 'low' && settings.shadows === 'off'}
          projectionRevision={projectionRevision}
        />
      ))}
      <FactoryTurret
        variant="active"
        station={[-8.7, 4.225, -5.25]}
        attention={turretAttention}
        travel={travel}
        reduced={!props.active || props.reduced}
      />
      {(!mobile || level !== 'low') && (
        <FactoryTurret
          variant="sleeping"
          station={[6.6, -1.25, 3.9]}
          travel={travel}
          reduced={props.reduced}
        />
      )}
      <FactoryTurret
        variant="damaged"
        ambient={ambient}
        slot={DAMAGED_TURRET_SLOT}
        travel={travel}
        reduced={!props.active || props.reduced}
      />
    </>
  );
}
export default function FactoryScene(props: FactorySceneProps) {
  const [automatic, setAutomatic] = useState(() =>
    props.compact ? 'low' : initialFactoryQuality(window.innerWidth),
  );
  const level =
    props.quality === 'auto' ? automatic : props.quality === 'ultra' ? 'high' : props.quality;
  const settings = useMemo(
    () => graphicsSettings(props.quality, level, props.graphics),
    [props.quality, level, props.graphics],
  );
  return (
    <FactoryCanvas
      key={settings.aa === 'msaa' ? 'msaa' : 'standard'}
      {...props}
      level={level}
      settings={settings}
      resolutionTier={
        settings.dynamic
          ? automatic
          : props.quality === 'auto'
            ? props.compact
              ? 'low'
              : 'medium'
            : level
      }
      onLevel={setAutomatic}
    />
  );
}

function FactoryCanvas(
  props: FactorySceneProps & {
    level: FactoryQuality;
    settings: GraphicsSettings;
    resolutionTier: FactoryQuality;
    onLevel: (level: FactoryQuality) => void;
  },
) {
  const [cameraReady, setCameraReady] = useState(false);
  const [sceneryReady, setSceneryReady] = useState(false);
  const markCameraReady = useMemo(() => () => setCameraReady(true), []);
  const markSceneryReady = useMemo(() => () => setSceneryReady(true), []);
  const { level, settings, resolutionTier } = props;
  const running = props.active && !props.reduced;
  const [pixelRatio, setPixelRatio] = useState(
    () =>
      resolveResolution(
        {
          width: window.innerWidth,
          height: window.innerHeight,
          device: window.devicePixelRatio || 1,
          compact: props.compact,
          tier: resolutionTier,
        },
        settings,
        [Infinity, Infinity],
      ).dpr,
  );
  return (
    <Canvas
      className="production-canvas"
      data-quality={props.quality === 'ultra' ? 'ultra' : level}
      data-scenery-ready={sceneryReady}
      camera={INITIAL_CAMERA}
      shadows={settings.shadows === 'off' ? false : 'percentage'}
      dpr={pixelRatio}
      frameloop={running && !settings.fps ? 'always' : 'demand'}
      gl={{ antialias: settings.aa === 'msaa', powerPreference: 'high-performance' }}
      fallback={<div className="factory-no-webgl" />}
      onCreated={({ gl }) => {
        gl.domElement.setAttribute('aria-hidden', 'true');
        props.onBootMilestone('renderer');
      }}
    >
      <color attach="background" args={['#101b21']} />
      <fog attach="fog" args={props.compact ? ['#101b21', 25, 55] : ['#101b21', 34, 69]} />
      <FactoryMaterials quality={level}>
        <Production
          {...props}
          level={level}
          onCameraReady={markCameraReady}
          onSceneryReady={markSceneryReady}
        />
      </FactoryMaterials>
      <RenderBudget
        compact={props.compact}
        level={level}
        preference={props.quality}
        running={running}
        settings={settings}
        sceneryReady={sceneryReady}
        inspectionId={props.inspection?.id}
        onLevel={props.onLevel}
        onUnavailable={props.onUnavailable}
        booting={props.booting}
      />
      <FactoryRenderer
        settings={settings}
        tier={level}
        resolutionTier={resolutionTier}
        compact={props.compact}
        running={running}
        sceneryReady={sceneryReady}
        textureRevision={props.locale}
        diagnostics={props.diagnostics}
        onPixelRatio={setPixelRatio}
        onReport={props.onRenderReport}
        onUnavailable={props.onUnavailable}
      />
      <FirstFactoryFrame
        ready={props.booting && cameraReady && sceneryReady}
        onMilestone={props.onBootMilestone}
      />
    </Canvas>
  );
}
