import { createContext, useContext, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { RepeatWrapping } from 'three';
import type { WebGLProgramParametersWithUniforms } from 'three';
import { canvasTexture } from './sceneTextures';
import type { FactoryQuality } from '../../../lib/factoryQuality';

const profiles = {
  concrete: [0.95, 0, 0.08],
  steel: [0.66, 0.48, 0.04],
  paint: [0.72, 0.16, 0.035],
  wornPaint: [0.8, 0.18, 0.055],
  rubber: [0.95, 0, 0.027],
  plastic: [0.64, 0, 0.018],
  ceramic: [0.52, 0, 0.012],
  glass: [0.34, 0, 0.012],
  emissive: [0.42, 0, 0],
  earth: [1, 0, 0.06],
  foliage: [0.95, 0, 0],
} as const;
export type FactorySurface = keyof typeof profiles;

function randomSequence(seed: number) {
  return () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
}

function surfaceTexture(surface: FactorySurface) {
  const concrete = surface === 'concrete';
  const worn = surface === 'wornPaint';
  const random = randomSequence(concrete ? 203 : surface.length * 81);
  const texture = canvasTexture(
    (ctx) => {
      ctx.fillStyle = concrete ? '#dedbd0' : '#e4e4de';
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 5000; i++) {
        ctx.fillStyle = i % 3 ? 'rgba(28,33,29,.095)' : 'rgba(255,252,224,.21)';
        ctx.fillRect(random() * 256, random() * 256, 1 + random() * (concrete ? 4 : 12), 1);
      }
      if (concrete || worn) {
        for (let i = 0; i < 18; i++) {
          const x = random() * 256,
            y = random() * 256,
            radius = 4 + random() * 24;
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
          gradient.addColorStop(0, concrete ? '#45483d36' : '#82543347');
          gradient.addColorStop(1, '#524c3900');
          ctx.fillStyle = gradient;
          ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }
        ctx.strokeStyle = concrete ? '#343a374e' : '#fff3c46a';
        ctx.lineWidth = 0.85;
        for (let i = 0; i < 5; i++) {
          const x = 25 + random() * 150,
            y = 25 + random() * 170;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 7, y - 5);
          ctx.lineTo(x + 15, y - 3);
          ctx.lineTo(x + 25, y - 12);
          ctx.stroke();
        }
      }
      if (concrete) {
        ctx.fillStyle = '#53564d54';
        ctx.fillRect(0, 0, 256, 3);
        ctx.fillRect(0, 0, 3, 256);
        ctx.fillStyle = '#fff7da73';
        ctx.fillRect(4, 4, 252, 1);
      }
    },
    256,
    256,
  );
  texture.wrapS = texture.wrapT = RepeatWrapping;
  return texture;
}

function createLibrary() {
  const maps = {
    concrete: surfaceTexture('concrete'),
    steel: surfaceTexture('steel'),
    wornPaint: surfaceTexture('wornPaint'),
    rubber: surfaceTexture('rubber'),
    halo: canvasTexture(
      (ctx) => {
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255,255,255,0.85)');
        gradient.addColorStop(0.38, 'rgba(255,255,255,0.38)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
      },
      64,
      64,
    ),
  };
  return maps;
}
const MaterialContext = createContext<{
  maps: ReturnType<typeof createLibrary>;
  quality: FactoryQuality;
} | null>(null);
export function useEmissionTexture() {
  return useContext(MaterialContext)?.maps.halo;
}

export function FactoryMaterials({
  children,
  quality,
}: {
  children: ReactNode;
  quality: FactoryQuality;
}) {
  const maps = useMemo(createLibrary, []);
  const value = useMemo(() => ({ maps, quality }), [maps, quality]);
  useEffect(() => () => Object.values(maps).forEach((map) => map.dispose()), [maps]);
  return <MaterialContext.Provider value={value}>{children}</MaterialContext.Provider>;
}

export function Surface({
  kind,
  color,
  emissive,
  intensity,
  opacity,
  decorate,
  vertexColors = false,
}: {
  kind: FactorySurface;
  color: string;
  emissive?: string;
  intensity?: number;
  opacity?: number;
  decorate?: (shader: WebGLProgramParametersWithUniforms) => void;
  vertexColors?: boolean;
}) {
  const context = useContext(MaterialContext);
  const maps = context?.maps;
  const map =
    maps && (kind === 'concrete' || kind === 'steel' || kind === 'wornPaint' || kind === 'rubber')
      ? maps[kind]
      : null;
  const [roughness, metalness, bumpScale] = profiles[kind];
  if (context?.quality === 'low' && !decorate && kind !== 'ceramic') {
    return (
      <meshLambertMaterial
        vertexColors={vertexColors}
        color={color}
        map={map}
        emissive={emissive}
        emissiveIntensity={intensity}
        transparent={opacity !== undefined}
        opacity={opacity}
        depthWrite={opacity === undefined}
      />
    );
  }
  return (
    <meshStandardMaterial
      {...(decorate ? { onBeforeCompile: decorate } : {})}
      vertexColors={vertexColors}
      color={color}
      map={map}
      bumpMap={
        context?.quality === 'high' || (context?.quality === 'medium' && kind === 'concrete')
          ? map
          : null
      }
      bumpScale={bumpScale}
      roughness={roughness}
      metalness={metalness}
      emissive={emissive}
      emissiveIntensity={intensity}
      transparent={opacity !== undefined}
      opacity={opacity}
      depthWrite={opacity === undefined}
    />
  );
}
