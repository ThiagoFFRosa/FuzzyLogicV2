import { canvasTexture } from './sceneTextures';
import { FLOOR_BREAKS, SERVICE_BAY, brokenEdge } from './groundLayout';

export const WEAR_AREA = { x: -32, z: -8, width: 62, depth: 28 };
const PIXELS = 1536;

export function floorWear() {
  return canvasTexture(
    (ctx) => {
      const scale = PIXELS / WEAR_AREA.width;
      ctx.scale(scale, scale);
      ctx.translate(-WEAR_AREA.x, -WEAR_AREA.z);
      let seed = 197;
      const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;

      const stain = (
        x: number,
        z: number,
        width: number,
        depth: number,
        turn: number,
        color: string,
      ) => {
        ctx.save();
        ctx.translate(x, z);
        ctx.rotate(turn);
        ctx.scale(width, depth);
        const ink = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        ink.addColorStop(0, color);
        ink.addColorStop(1, '#27261e00');
        ctx.fillStyle = ink;
        ctx.fillRect(-1, -1, 2, 2);
        ctx.restore();
      };

      for (let i = 0; i < 90; i++) {
        const x = -28 + random() * 54;
        const z = i < 40 ? -6.7 + random() * 2.5 : 3.8 + random() * 10;
        stain(
          x,
          z,
          0.9 + random() * 4.3,
          0.32 + random() * 1.3,
          (random() - 0.5) * 0.5,
          i < 40 ? '#5b52324d' : i % 3 ? '#21292360' : '#a29b763f',
        );
      }

      for (const [x, z, length] of [
        [-16, 5.3, 7.1],
        [-3.6, 4.45, 6.5],
        [7.5, 6.1, 5.8],
        [15, 5.6, 4.3],
      ]) {
        for (let i = 0; i < 8; i++) {
          stain(
            x + (random() - 0.5) * 2,
            z + i * 0.085,
            length * (0.28 + random() * 0.55),
            0.038 + random() * 0.046,
            -0.025,
            i % 2 ? '#292b2780' : '#9e9a7051',
          );
        }
      }

      const { pallet, scrap, barrels } = SERVICE_BAY;
      stain(pallet.x, pallet.z, 3.0, 1.85, 0.17, '#443e2c9c');
      stain(scrap.x, scrap.z, 2.15, 1.08, 0.14, '#262421aa');
      const tipped = barrels[2];
      stain(tipped.x + 1.3, tipped.z + 0.28, 1.3, 0.75, -0.28, '#74502f96');
      for (let i = 0; i < 9; i++) {
        stain(
          tipped.x + random() * 1.8,
          tipped.z + random() * 0.9,
          0.08 + random() * 0.32,
          0.06 + random() * 0.15,
          -0.35,
          '#6f522c92',
        );
      }

      ctx.save();
      ctx.translate(pallet.x, pallet.z);
      ctx.setLineDash([0.52, 0.17, 0.26, 0.1]);
      ctx.strokeStyle = '#9d885d70';
      ctx.lineWidth = 0.073;
      ctx.strokeRect(-2.14, -1.13, 4.22, 2.65);
      ctx.restore();

      for (const patch of FLOOR_BREAKS) {
        const edge = brokenEdge(patch);
        stain(...patch.center, patch.size[0] * 1.6, patch.size[1] * 1.7, patch.turn, '#504f328f');
        edge.forEach(([x, z], index) => {
          if (index % 3 !== 0) return;
          const dx = x - patch.center[0];
          const dz = z - patch.center[1];
          ctx.beginPath();
          ctx.moveTo(x, z);
          ctx.lineTo(x + dx * 0.22 - dz * 0.13, z + dz * 0.2 + dx * 0.16);
          ctx.lineTo(x + dx * 0.4, z + dz * 0.54);
          ctx.lineTo(x + dx * 0.57 + dz * 0.24, z + dz * 0.78);
          ctx.lineWidth = 0.038;
          ctx.strokeStyle = '#252820cc';
          ctx.stroke();
        });
      }
    },
    PIXELS,
    Math.round((PIXELS * WEAR_AREA.depth) / WEAR_AREA.width),
  );
}
