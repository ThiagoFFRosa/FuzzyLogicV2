import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { MeshBasicMaterial, MeshStandardMaterial } from 'three';
import type { AmbientScheduler } from '../../../lib/ambientEvents';
import { BELT_SURFACE, DOCK_MOUTH } from '../../../lib/conveyor';
import type { Locale } from '../../../lib/behavior';
import { Structure } from './FactoryEnvironment';
import { canvasTexture } from './sceneTextures';
import { IndustrialCable, MechanicalPlates } from './MechanicalParts';
import type { Plate } from './MechanicalParts';

const DOCKS = [-1, 1].map((side) => {
  const x = side * (DOCK_MOUTH + 3.6);
  const plates: Plate[] = [
    { at: [x, 2.05, 3.1], size: [3.0, 2.45, 0.12], color: '#68736a' },
    { at: [x, 2.05, 3.18], size: [2.7, 2.13, 0.09], color: side < 0 ? '#596962' : '#4d5c59' },
    { at: [x + side * 0.98, 2.04, 3.28], size: [0.11, 0.45, 0.13], color: '#a0a28b' },
    ...[-1, 1].flatMap((offset): Plate[] => [
      {
        at: [x - side * 1.23, 2.03 + offset * 0.71, 3.29],
        size: [0.21, 0.29, 0.14],
        color: '#374949',
      },
      {
        at: [x + side * 0.68, 5.75 + offset * 0.3, 3.12],
        size: [2.8, 0.11, 0.14],
        color: '#233639',
      },
    ]),
    ...Array.from({ length: 5 }, (_, index): Plate => ({
      at: side < 0 ? [x + 0.68, 5.56 + index * 0.1, 3.18] : [x - 1 + index * 0.43, 5.75, 3.18],
      size: side < 0 ? [2.55, 0.042, 0.15] : [0.16, 0.59, 0.15],
      color: '#1d2b2d',
    })),
  ];
  const cable: [number, number, number][] = [
    [x + side * 1.2, 4, 3.26],
    [x + side * 1.8, 3.65, 3.26],
    [x + side * 2.1, 2.85, 3.25],
    [x + side * 2.1, -1.26, 3.25],
  ];
  return { side, plates, cable };
});

export function ProductionStations({
  supervisorX,
  locale,
  ambient,
}: {
  supervisorX: number;
  locale: Locale;
  ambient: AmbientScheduler;
}) {
  const signals = useRef<(MeshStandardMaterial | null)[]>([]);
  const transferSign = useRef<MeshBasicMaterial>(null);
  useFrame(() => {
    const pulse = ambient.strength('dock');
    const sector = ambient.current?.sector;
    signals.current.forEach((lamp, index) => {
      if (lamp) lamp.emissiveIntensity = 0.54 + (index === sector ? pulse : 0);
    });
    if (transferSign.current)
      transferSign.current.map = ambient.current?.id === 'log' ? plates[3] : plates[1];
  });
  const plates = useMemo(() => {
    const labels =
      locale === 'pt'
        ? [
            ['ALIMENTAÇÃO', 'PRODUÇÃO AUTOMATIZADA'],
            ['TRANSFERÊNCIA', 'SETOR EM OPERAÇÃO'],
            ['INSPEÇÃO', 'SETOR 02'],
            ['TRANSFERÊNCIA', 'TURNO EM ABERTO DESDE 02'],
          ]
        : [
            ['INFEED', 'AUTOMATED PRODUCTION'],
            ['TRANSFER', 'SECTOR OPERATIONAL'],
            ['INSPECTION', 'SECTOR 02'],
            ['TRANSFER', 'CLOCKED IN SINCE SHIFT 02'],
          ];
    return labels.map(([label, detail]) =>
      canvasTexture(
        (ctx) => {
          ctx.fillStyle = '#233230';
          ctx.fillRect(0, 0, 512, 128);
          ctx.fillStyle = '#d0d5bf';
          ctx.font = '600 49px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, 256, 47, 462);
          ctx.fillStyle = '#a7bca8';
          ctx.font = '500 23px monospace';
          ctx.fillText(detail, 256, 97, 460);
        },
        512,
        128,
      ),
    );
  }, [locale]);
  useEffect(() => () => plates.forEach((plate) => plate.dispose()), [plates]);
  return (
    <>
      {DOCKS.map(({ side, plates: dockPlates, cable }, index) => {
        const mouth = side * DOCK_MOUTH;
        const center = mouth + side * 3.3;
        return (
          <group key={side} name={side < 0 ? 'infeed-dock' : 'transfer-dock'}>
            <MechanicalPlates plates={dockPlates} kind="wornPaint" />
            <IndustrialCable points={cable} radius={0.085} />
            <mesh
              name={side < 0 ? 'infeed-signal' : 'transfer-signal'}
              position={[center + side * 0.8, 4.02, 3.17]}
            >
              <boxGeometry args={[0.54, 0.14, 0.045]} />
              <meshStandardMaterial
                ref={(lamp) => {
                  signals.current[index] = lamp;
                }}
                color="#68776a"
                emissive={side < 0 ? '#6eb598' : '#bc8c43'}
                emissiveIntensity={0.54}
              />
            </mesh>
            {/* The belt runs inside the housing, between the side walls. */}
            <Structure
              position={[center, 3.05, 2.75]}
              size={[6.6, 8.6, 0.65]}
              color="#394749"
              casts
            />
            <Structure
              position={[center, 3.05, -2.75]}
              size={[6.6, 8.6, 0.65]}
              color="#475554"
              casts
            />
            <Structure position={[center, 5.62, 0]} size={[6.6, 3.8, 5.1]} color="#394749" casts />
            <Structure position={[mouth, 4.42, 0]} size={[0.65, 1.2, 6.2]} color="#6d7b71" casts />
            {/* The inset shroud blocks sightlines into the wrap while leaving the full cargo envelope open. */}
            <Structure
              position={[center - side * 0.12, 3.9, 0]}
              size={[7.2, 0.45, 3.9]}
              color="#172025"
              kind="rubber"
              casts
            />
            {[-1.57, 1.57].map((z) => (
              <Structure
                key={z}
                position={[center - side * 0.12, 2.22, z]}
                size={[7.2, 3.4, 0.34]}
                color="#171f21"
                kind="rubber"
                casts
              />
            ))}
            <Structure
              position={[mouth + side * 5.9, 1.45, 0]}
              size={[0.5, 5.4, 5.25]}
              color="#0d1519"
              casts
            />
            {[-2.85, 2.85].map((z) => (
              <group key={z}>
                <Structure
                  position={[mouth, 1.45, z]}
                  size={[0.62, 5.4, 0.72]}
                  color="#66766e"
                  casts
                />
                <Structure position={[mouth, -1.08, z]} size={[1.3, 0.3, 1.28]} color="#53635d" />
              </group>
            ))}
            <Structure position={[center, 6.75, -4.95]} size={[1.1, 1.1, 5.6]} color="#596b62" />
            <mesh
              name={side < 0 ? 'infeed-nameplate' : 'transfer-nameplate'}
              position={[mouth + side * 1.85, 4.95, 3.09]}
            >
              <planeGeometry args={[3.1, 0.775]} />
              <meshBasicMaterial
                ref={side > 0 ? transferSign : undefined}
                map={plates[side < 0 ? 0 : 1]}
              />
            </mesh>
            <Structure
              position={[mouth - side * 0.35, 4.05, 0]}
              size={[0.1, 0.12, 3.3]}
              color={side < 0 ? '#8dc6af' : '#c9a363'}
            />
            {Array.from({ length: 4 }, (_, index) => (
              <Structure
                key={index}
                position={[mouth + side * (0.45 + index * 0.43), 2.1, 3.09]}
                size={[0.17, 0.62, 0.05]}
                rotation={[0, 0, -0.36]}
                color="#b29a60"
              />
            ))}
          </group>
        );
      })}
      {/* Inspection is a service bay beside the running surface. */}
      <Structure position={[1.4, -0.72, 2.85]} size={[6.4, 0.22, 1.3]} color="#606e66" />
      <Structure position={[1.4, -0.15, 3.48]} size={[6.3, 0.08, 0.09]} color="#839085" />
      {[-1.65, 1.4, 4.45].map((x) => (
        <group key={x}>
          <Structure position={[x, -0.44, 3.48]} size={[0.09, 0.62, 0.09]} color="#839085" />
          <Structure position={[x, -1.04, 3.0]} size={[0.26, 0.4, 0.5]} color="#4d5e56" />
        </group>
      ))}
      <Structure
        position={[1.4, BELT_SURFACE - 0.27, 2.18]}
        size={[4.5, 0.15, 0.09]}
        color="#92c4b3"
      />
      <mesh position={[1.4, -0.47, 3.53]}>
        <planeGeometry args={[1.8, 0.45]} />
        <meshBasicMaterial map={plates[2]} />
      </mesh>
      <Structure
        position={[supervisorX, 4.14, -4.6]}
        size={[4.5, 0.35, 2.6]}
        color="#66786e"
        casts
      />
      {[supervisorX - 1.65, supervisorX + 1.65].map((x) => (
        <group key={x}>
          <Structure position={[x, 1.25, -5.15]} size={[0.26, 5.1, 0.28]} color="#4c5c57" />
          <Structure
            position={[x, 3.0, -4.76]}
            size={[0.15, 2.62, 0.16]}
            rotation={[0.48, 0, 0]}
            color="#64756c"
          />
        </group>
      ))}
    </>
  );
}
