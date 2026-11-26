import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Camera, Scene, Texture } from 'three';
import type { FactoryQuality } from '../../../lib/factoryQuality';
import type { GraphicsSettings, RenderReport } from '../../../lib/factoryGraphics';
import { resolveResolution } from '../../../lib/factoryGraphics';
import { createFactoryPost } from './factoryPost';

type TimerQuery = { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number };

function filterTextures(scene: Scene, anisotropy: number) {
  const visited = new Set<Texture>();
  scene.traverse((object) => {
    if (!('material' in object)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!material) continue;
      for (const value of Object.values(material)) {
        const map = value as Texture | null;
        if (!map?.isTexture || !map.generateMipmaps || visited.has(map)) continue;
        visited.add(map);
        if (map.anisotropy !== anisotropy) {
          map.anisotropy = anisotropy;
          map.needsUpdate = true;
        }
      }
    }
  });
}

export function FactoryRenderer({
  settings,
  tier,
  resolutionTier,
  compact,
  running,
  sceneryReady,
  textureRevision,
  diagnostics,
  onPixelRatio,
  onReport,
  onUnavailable,
}: {
  settings: GraphicsSettings;
  tier: FactoryQuality;
  resolutionTier: FactoryQuality;
  compact: boolean;
  running: boolean;
  sceneryReady: boolean;
  textureRevision: string;
  diagnostics: boolean;
  onPixelRatio: (dpr: number) => void;
  onReport: (report: RenderReport) => void;
  onUnavailable: (error?: unknown) => void;
}) {
  const { gl, size, invalidate, advance } = useThree();
  const rendererDpr = useThree((state) => state.viewport.dpr);
  const context = gl.getContext() as WebGL2RenderingContext;
  const hardware = useMemo(() => {
    const [maxWidth, maxHeight] = context.getParameter(context.MAX_VIEWPORT_DIMS) as Int32Array;
    const renderbuffer = context.getParameter(context.MAX_RENDERBUFFER_SIZE) as number;
    return {
      samples: context.getParameter(context.SAMPLES) as number,
      maxSamples: context.getParameter(context.MAX_SAMPLES) as number,
      anisotropy: gl.capabilities.getMaxAnisotropy(),
      width: Math.min(maxWidth, renderbuffer),
      height: Math.min(maxHeight, renderbuffer),
    };
  }, [context, gl]);

  const post = useRef<ReturnType<typeof createFactoryPost> | null>(null);
  const last = useRef({
    frame: -Infinity,
    report: -Infinity,
    textures: -Infinity,
    count: 0,
    sum: 0,
  });
  const deadline = useRef(-Infinity);
  const dirty = useRef(true);
  const needsTextures = useRef(true);
  const resolution = useRef({ requestedDpr: 1, limited: false });
  const extension = useMemo(
    () =>
      diagnostics
        ? (context.getExtension('EXT_disjoint_timer_query_webgl2') as TimerQuery | null)
        : null,
    [context, diagnostics],
  );
  const gpu = useRef<{ query: WebGLQuery | null; ms: number | null; next: number }>({
    query: null,
    ms: null,
    next: 0,
  });
  const supportsMSAA = settings.aa === 'msaa' && hardware.samples > 1;
  const wantsFXAA = settings.aa === 'fxaa' || (settings.aa === 'msaa' && !supportsMSAA);
  const wantsPost = wantsFXAA || settings.post !== 'off';
  const maxDimension = wantsPost ? gl.capabilities.maxTextureSize : Infinity;
  const anisotropy = Math.min(hardware.anisotropy, settings.textures === 'high' ? 16 : 4);

  useLayoutEffect(() => {
    let density: MediaQueryList | undefined;
    const update = () => {
      density?.removeEventListener('change', update);
      const device = window.devicePixelRatio || 1;
      density = matchMedia(`(resolution: ${device}dppx)`);
      density.addEventListener('change', update);
      const resolved = resolveResolution(
        { width: size.width, height: size.height, device, tier: resolutionTier, compact },
        settings,
        [Math.min(hardware.width, maxDimension), Math.min(hardware.height, maxDimension)],
      );
      resolution.current = resolved;
      dirty.current = true;
      onPixelRatio(resolved.dpr);
      invalidate();
    };
    update();
    window.addEventListener('resize', update);
    return () => {
      density?.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, [
    size.width,
    size.height,
    compact,
    resolutionTier,
    settings,
    hardware,
    maxDimension,
    onPixelRatio,
    invalidate,
  ]);

  useLayoutEffect(() => {
    dirty.current = true;
    invalidate();
  }, [rendererDpr, diagnostics, invalidate, tier, sceneryReady, running]);

  useLayoutEffect(() => {
    needsTextures.current = true;
    invalidate();
  }, [anisotropy, sceneryReady, textureRevision, invalidate]);

  useEffect(() => {
    const clock = last.current;
    clock.frame = -Infinity;
    deadline.current = -Infinity;
    clock.count = 0;
    clock.sum = 0;
    if (!running || !settings.fps) return;
    let handle = 0;
    const tick = (now: number) => {
      if (performance.now() >= deadline.current - 0.75) advance(now, false);
      handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [running, settings.fps, advance]);

  useEffect(
    () => () => {
      if (gpu.current.query) context.deleteQuery(gpu.current.query);
      gpu.current = { query: null, ms: null, next: 0 };
    },
    [context, extension],
  );

  useEffect(
    () => () => {
      post.current?.dispose();
      post.current = null;
    },
    [gl],
  );

  function draw(scene: Scene, camera: Camera, now: number, width: number, height: number) {
    const filter = wantsFXAA && width <= maxDimension && height <= maxDimension;
    const bloom = settings.post === 'bloom' && width <= maxDimension && height <= maxDimension;
    let pipeline = post.current;
    if (
      pipeline &&
      ((!filter && !bloom) ||
        pipeline.width !== width ||
        pipeline.height !== height ||
        pipeline.fxaa !== filter ||
        pipeline.bloom !== bloom)
    ) {
      pipeline.dispose();
      post.current = pipeline = null;
    }
    if (!pipeline && (filter || bloom)) {
      post.current = pipeline = createFactoryPost(width, height, filter, bloom);
    }
    const timer = gpu.current;
    if (
      extension &&
      timer.query &&
      context.getQueryParameter(timer.query, context.QUERY_RESULT_AVAILABLE)
    ) {
      timer.ms = context.getParameter(extension.GPU_DISJOINT_EXT)
        ? null
        : (context.getQueryParameter(timer.query, context.QUERY_RESULT) as number) / 1e6;
      context.deleteQuery(timer.query);
      timer.query = null;
    }
    const query = extension && !timer.query && now >= timer.next ? context.createQuery() : null;
    if (query && extension) {
      context.beginQuery(extension.TIME_ELAPSED_EXT, query);
      timer.query = query;
      timer.next = now + 500;
    }
    const autoReset = gl.info.autoReset;
    gl.info.autoReset = false;
    gl.info.reset();
    const start = diagnostics ? performance.now() : 0;
    try {
      gl.setRenderTarget(null);
      gl.render(scene, camera);
      pipeline?.render(gl);
    } finally {
      if (query && extension) context.endQuery(extension.TIME_ELAPSED_EXT);
      gl.info.autoReset = autoReset;
      gl.setRenderTarget(null);
    }
    return { filter, bloom, cpuMs: diagnostics ? performance.now() - start : 0 };
  }

  useFrame(({ scene, camera }) => {
    const now = performance.now();
    const clock = last.current;
    const elapsed = now - clock.frame;
    if (running && settings.fps) {
      if (now < deadline.current - 0.75) return;
      const interval = 1000 / settings.fps;
      deadline.current = Math.max(deadline.current + interval, now);
      if (deadline.current === now) deadline.current += interval;
    }
    if (context.isContextLost()) return;
    const width = context.drawingBufferWidth;
    const height = context.drawingBufferHeight;
    if (!width || !height) return;
    clock.frame = now;
    if (running && Number.isFinite(elapsed)) {
      clock.count++;
      clock.sum += elapsed;
    }
    if (needsTextures.current || (settings.textures === 'high' && now - clock.textures >= 1250)) {
      filterTextures(scene, anisotropy);
      needsTextures.current = false;
      clock.textures = now;
    }
    try {
      const { filter, bloom, cpuMs } = draw(scene, camera, now, width, height);
      if (!dirty.current && (!diagnostics || now - clock.report < 500)) return;
      clock.report = now;
      dirty.current = false;
      const dpr = window.devicePixelRatio || 1;
      const physical: [number, number] = [
        Math.round(size.width * dpr),
        Math.round(size.height * dpr),
      ];
      const { requestedDpr, limited } = resolution.current;
      const limitations: RenderReport['limitations'] = [];
      if (
        limited ||
        width + 1 < size.width * Math.min(requestedDpr, rendererDpr) ||
        height + 1 < size.height * Math.min(requestedDpr, rendererDpr)
      )
        limitations.push('resolution');
      if (settings.aa === 'msaa' && !supportsMSAA) limitations.push('msaa');
      if ((wantsFXAA && !filter) || (settings.post === 'bloom' && !bloom)) limitations.push('post');
      if (settings.textures === 'high' && anisotropy < 16) limitations.push('textures');
      if (settings.shadows === 'ultra' && gl.capabilities.maxTextureSize < 2048)
        limitations.push('shadows');
      const report: RenderReport = {
        css: [Math.round(size.width), Math.round(size.height)],
        physical,
        buffer: [width, height],
        dpr,
        scale: physical[0] > 0 ? (width / physical[0]) * 100 : 0,
        effectiveAA: filter ? 'fxaa' : supportsMSAA ? 'msaa' : 'off',
        samples: supportsMSAA ? hardware.samples : 0,
        maxSamples: hardware.maxSamples,
        anisotropy,
        maxAnisotropy: hardware.anisotropy,
        post: bloom ? 'bloom' : 'off',
        dynamic: settings.dynamic,
        tier,
        limitations,
      };
      if (diagnostics) {
        let lights = 0;
        scene.traverse((object) => {
          if ('isLight' in object && object.isLight) lights++;
        });
        report.timing = {
          fps: clock.count && clock.sum ? (clock.count * 1000) / clock.sum : null,
          frameMs: clock.count ? clock.sum / clock.count : null,
          cpuMs,
          gpuMs: gpu.current.ms,
        };
        report.draw = {
          calls: gl.info.render.calls,
          triangles: gl.info.render.triangles,
          ...gl.info.memory,
          lights,
        };
      }
      clock.count = 0;
      clock.sum = 0;
      const element = gl.domElement.closest<HTMLElement>('.production-canvas');
      if (element) {
        element.dataset.antialias = report.effectiveAA;
        element.dataset.samples = String(report.samples);
        element.dataset.postprocessing = report.post;
        element.dataset.renderScale = report.scale.toFixed(1);
        element.dataset.dynamicResolution = String(report.dynamic);
      }
      onReport(report);
    } catch (error) {
      onUnavailable(error);
    }
  }, 1);
  return null;
}
