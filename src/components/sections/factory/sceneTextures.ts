import { CanvasTexture, SRGBColorSpace } from 'three';
import type { Project } from '../../../data/projects';
import type { Locale } from '../../../lib/behavior';

export const productLooks = [
  { shell: '#bccac4', ink: '#122e38', accent: '#61d7ec', dimensions: [3.2, 2.4, 2.3] },
  { shell: '#c3cbb8', ink: '#243c32', accent: '#c7db9a', dimensions: [2.9, 2.25, 2.15] },
  { shell: '#313943', ink: '#121d28', accent: '#f5ad5d', dimensions: [3, 2.15, 2.2] },
  { shell: '#78876b', ink: '#23342a', accent: '#c2e59a', dimensions: [2.65, 2.65, 2.4] },
  { shell: '#a5afa9', ink: '#253638', accent: '#a6d4d2', dimensions: [3.05, 2.3, 2.1] },
] as const;

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
export function projectTexture(project: Project, index: number, locale: Locale) {
  const look = productLooks[index];
  return canvasTexture((ctx) => {
    ctx.fillStyle = look.ink;
    ctx.fillRect(0, 0, 1024, 768);
    ctx.strokeStyle = look.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(35, 35, 954, 698);
    ctx.fillStyle = look.accent;
    if (index === 0) {
      for (let i = 0; i < 7; i++)
        ctx.fillRect(
          75 + i * 19,
          95 - Math.abs(Math.sin(i * 1.9)) * 35,
          9,
          30 + Math.abs(Math.sin(i * 1.9)) * 70,
        );
    }
    if (index === 1) {
      ctx.lineWidth = 6;
      ctx.strokeRect(75, 65, 125, 90);
      ctx.font = 'bold 70px sans-serif';
      ctx.fillText('V', 112, 137);
    }
    if (index === 2) {
      for (let i = 0; i < 6; i++)
        ctx.fillRect(75 + (i % 3) * 43, 65 + Math.floor(i / 3) * 43, 30, 30);
    }
    if (index === 3) {
      for (let i = 0; i < 16; i++) {
        ctx.globalAlpha = ((i % 3) + 1) / 3;
        ctx.fillRect(75 + (i % 4) * 25, 65 + Math.floor(i / 4) * 25, 20, 20);
      }
      ctx.globalAlpha = 1;
    }
    if (index === 4) {
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(140, 65);
      ctx.lineTo(140, 105);
      ctx.lineTo(90, 150);
      ctx.moveTo(140, 105);
      ctx.lineTo(190, 150);
      ctx.stroke();
      for (const [x, y] of [
        [140, 65],
        [90, 150],
        [190, 150],
      ]) {
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.font = '500 24px "Inter Variable", sans-serif';
    ctx.fillText(`FUZZS / EXP. ${String(index + 1).padStart(2, '0')}`, 650, 100);
    ctx.fillStyle = '#f1f2e7';
    ctx.font = '700 108px "Space Grotesk Variable", sans-serif';
    if (ctx.measureText(project.name).width > 870)
      ctx.font = '700 87px "Space Grotesk Variable", sans-serif';
    ctx.fillText(project.name, 72, 310);
    ctx.fillStyle = look.accent;
    ctx.font = '600 29px "Inter Variable", sans-serif';
    ctx.fillText(project.category[locale], 75, 380);
    ctx.fillStyle = '#c2d0cc';
    ctx.font = '36px "Inter Variable", sans-serif';
    const words = project.description[locale].split(' ');
    let line = '',
      row = 470;
    for (const word of words) {
      const next = `${line}${word} `;
      if (ctx.measureText(next).width > 830) {
        ctx.fillText(line, 75, row);
        row += 49;
        line = `${word} `;
      } else line = next;
    }
    ctx.fillText(line, 75, row);
    ctx.fillStyle = look.accent;
    ctx.fillRect(72, 630, 880, 3);
    ctx.font = '600 32px "Inter Variable", sans-serif';
    ctx.fillText(locale === 'pt' ? 'INSPECIONAR PROJETO' : 'INSPECT PROJECT', 75, 695);
    ctx.font = '48px sans-serif';
    ctx.fillText('↗', 890, 700);
    ctx.fillStyle = '#a9bbb1';
    for (let i = 0; i < 21; i++) ctx.fillRect(750 + i * 7, 160, i % 3 === 0 ? 4 : 2, 38);
  });
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
