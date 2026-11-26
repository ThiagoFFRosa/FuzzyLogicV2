import { CanvasTexture, SRGBColorSpace } from 'three';

export function canvasTexture(
  draw: (ctx: CanvasRenderingContext2D) => void,
  width = 1024,
  height = 768,
) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw Error('Canvas unavailable');
  draw(ctx);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
export function crateLabel(name: string, code: number, paper: string, pigment: string) {
  return canvasTexture(
    (ctx) => {
      const ink = '#252a22';
      ctx.fillStyle = '#716e57';
      ctx.fillRect(0, 0, 512, 192);
      ctx.fillStyle = paper;
      ctx.fillRect(5, 5, 502, 182);
      ctx.fillStyle = pigment;
      ctx.fillRect(5, 5, 502, 13);
      ctx.save();
      ctx.globalAlpha = 0.11;
      ctx.fillStyle = '#544126';
      for (let i = 0; i < 260; i++) {
        ctx.fillRect(8 + ((i * 71) % 496), 20 + ((i * 47) % 162), 1 + (i % 4), 1 + (i % 2));
      }
      ctx.restore();
      ctx.fillStyle = ink;
      ctx.font = 'bold 74px Arial, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, 21, 90, 470);
      ctx.fillStyle = pigment;
      ctx.fillRect(23, 143, 58, 5);
      ctx.fillStyle = ink;
      ctx.font = 'bold 27px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(String(code).padStart(2, '0'), 480, 155);
    },
    512,
    192,
  );
}
export function wallTexture() {
  return canvasTexture(
    (ctx) => {
      ctx.clearRect(0, 0, 1024, 512);
      ctx.fillStyle = '#c2caba';
      ctx.font = '700 225px "Space Grotesk Variable",sans-serif';
      ctx.fillText('FUZZS', 35, 260);
      ctx.fillStyle = '#8a9c94';
      ctx.font = '25px "Inter Variable",sans-serif';
      ctx.fillText('INDEPENDENT DIGITAL PRODUCT FACILITY', 45, 328);
      ctx.strokeStyle = '#7e938a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(45, 370);
      ctx.lineTo(820, 370);
      ctx.stroke();
      ctx.fillStyle = '#7f958c';
      ctx.font = '22px monospace';
      ctx.fillText('PRODUCTION / RESEARCH / AUTOMATION', 45, 415);
      ctx.font = '24px monospace';
      ctx.fillText('FAB / 02', 855, 326);
      ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 760; i++) {
        ctx.globalAlpha = 0.12 + (i % 6) * 0.08;
        ctx.fillRect((i * 137) % 1024, (i * 83) % 465, 1 + (i % 9), 1 + (i % 3));
      }
    },
    1024,
    512,
  );
}
