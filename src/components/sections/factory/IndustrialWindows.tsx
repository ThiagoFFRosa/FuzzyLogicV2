import { useEffect, useMemo } from 'react';
import { canvasTexture } from './sceneTextures';
import { Surface } from './FactoryMaterials';

export const WINDOW_CENTERS = [-3, 5, 13];
export const WINDOW_WIDTH = 5.8;
const PANE_COLORS = ['#819e94', '#9caa9c', '#698987'];

function distantFactory() {
  return canvasTexture(
    (ctx) => {
      const haze = ctx.createLinearGradient(0, 0, 0, 512);
      haze.addColorStop(0, '#1c333d');
      haze.addColorStop(0.56, '#7e9694');
      haze.addColorStop(1, '#2c484e');
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, 2048, 512);
      for (let layer = 0; layer < 3; layer++) {
        ctx.save();
        ctx.translate(layer * -140, layer * 52);
        ctx.fillStyle = ['#668183', '#49646a', '#263e45'][layer];
        ctx.strokeStyle = ctx.fillStyle;
        const step = 270 - layer * 33;
        for (let i = 0; i < 12; i++) {
          const x = i * step;
          const top = 30 + ((i * 67 + layer * 31) % 150);
          ctx.fillRect(x, top, 12 + layer * 5, 480);
          ctx.fillRect(x + 28, top + 70, 65, 310);
          ctx.fillRect(x - 15, top + 58, 121, 9 + layer * 3);
          ctx.lineWidth = 5 + layer;
          ctx.beginPath();
          ctx.moveTo(x, top + 50);
          ctx.lineTo(x + step, top + 157);
          ctx.lineTo(x, top + 220);
          ctx.stroke();
        }
        ctx.fillRect(0, 268 + layer * 46, 2550, 8 + layer * 4);
        ctx.restore();
      }
      ctx.strokeStyle = '#243d44';
      ctx.lineWidth = 20;
      ctx.beginPath();
      ctx.moveTo(0, 130);
      ctx.bezierCurveTo(510, 132, 580, 100, 690, 182);
      ctx.lineTo(2048, 190);
      ctx.stroke();
      for (let i = 0; i < 38; i++) {
        const x = 28 + ((i * 167) % 1985),
          y = 205 + ((i * 37) % 254);
        ctx.fillStyle = i % 5 ? '#b4cec3' : '#e9c189';
        ctx.globalAlpha = 0.45 + (i % 3) * 0.18;
        ctx.fillRect(x, y, 9 + (i % 6), 3);
      }
      ctx.globalAlpha = 1;
    },
    2048,
    512,
  );
}

export function IndustrialWindows() {
  const panorama = useMemo(distantFactory, []);
  const glass = useMemo(
    () =>
      canvasTexture(
        (ctx) => {
          for (let i = 0; i < 160; i++) {
            const x = (i * 61) % 256,
              y = (i * 37) % 128;
            ctx.fillStyle = i % 3 ? '#b4b6a525' : '#2739392d';
            ctx.fillRect(x, y, 1 + (i % 8), 3 + (i % 19));
          }
          const grime = ctx.createLinearGradient(0, 0, 0, 128);
          grime.addColorStop(0, '#12242880');
          grime.addColorStop(0.45, '#18383800');
          grime.addColorStop(1, '#273b3882');
          ctx.fillStyle = grime;
          ctx.fillRect(0, 0, 256, 128);
        },
        256,
        128,
      ),
    [],
  );
  useEffect(
    () => () => {
      panorama.dispose();
      glass.dispose();
    },
    [panorama, glass],
  );
  return (
    <group>
      <mesh position={[5, 11, -9.65]}>
        <planeGeometry args={[35, 9]} />
        <meshBasicMaterial map={panorama} color="#d3ded2" fog={false} />
      </mesh>
      {WINDOW_CENTERS.map((x, index) => (
        <group key={x} position={[x, 11, -7.56]}>
          <mesh>
            <planeGeometry args={[WINDOW_WIDTH, 3]} />
            <Surface kind="glass" color={PANE_COLORS[index]} opacity={0.14 + index * 0.07} />
          </mesh>
          <mesh position={[0, 0, 0.025]}>
            <planeGeometry args={[WINDOW_WIDTH, 3]} />
            <meshBasicMaterial
              map={glass}
              transparent
              depthWrite={false}
              opacity={0.48 + index * 0.12}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
