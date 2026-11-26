import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const phase = process.argv[2];
if (!['before', 'after'].includes(phase)) throw new Error('Choose before or after.');
const site = new URL(process.env.FUZZS_PREVIEW ?? 'http://127.0.0.1:5180/');
if (!['localhost', '127.0.0.1'].includes(site.hostname))
  throw new Error('Use a local Vite server.');
const folder = `artifacts/part-18-2/${phase}`;
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
const readings = [];
const shots = [
  ['desktop', 1280, 900, 1],
  ['ultrawide', 3440, 1440, 1],
  ['mobile', 390, 844, 2],
];
const boot = (page) => page.locator('#home[data-boot="running"]').waitFor({ timeout: 55_000 });
try {
  for (const [name, width, height, dpr] of shots) {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: dpr,
      reducedMotion: 'reduce',
      isMobile: name === 'mobile',
      hasTouch: name === 'mobile',
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('fuzzs-quality', 'high');
      localStorage.setItem('fuzzs-core', 'blue');
      localStorage.setItem('fuzzs-locale', 'pt');
    });
    await page.goto(site.href);
    await boot(page);
    await page.screenshot({ path: `${folder}/hero-${name}.png`, scale: 'css' });
    const metrics = await page.evaluate(async () => {
      const canvas = document.querySelector('.production-canvas canvas');
      const script = performance
        .getEntriesByType('resource')
        .find(({ name }) => name.includes('/@react-three_fiber.js'));
      const { _roots } = await import(script.name);
      const { gl, setFrameloop, advance } = _roots.get(canvas).store.getState();
      const context = gl.getContext();
      const extension = context.getExtension('WEBGL_debug_renderer_info');
      const timestamps = [];
      setFrameloop('never');
      for (let index = 0; index < 6; index++) {
        await new Promise(requestAnimationFrame);
        advance(index / 60, false);
        context.finish();
        timestamps.push(performance.now());
      }
      const deltas = timestamps.slice(1).map((time, index) => time - timestamps[index]);
      return {
        renderer: context.getParameter(extension?.UNMASKED_RENDERER_WEBGL ?? context.RENDERER),
        buffer: [context.drawingBufferWidth, context.drawingBufferHeight],
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries,
        frameIntervalMedianMs: deltas.sort((a, b) => a - b)[2],
      };
    });
    readings.push({ name, ...metrics });
    console.log(JSON.stringify(readings.at(-1)));
    if (name === 'desktop') {
      await page.goto(new URL('?camera=1', site).href);
      await boot(page);
      const panel = page.getByRole('complementary', { name: 'Camera Studio' });
      await panel.getByRole('button', { name: 'Free Camera', exact: true }).click();
      await panel.getByRole('spinbutton', { name: 'Zoom', exact: true }).fill('2');
      await panel.getByRole('spinbutton', { name: 'Zoom', exact: true }).press('Tab');
      await page.screenshot({ path: `${folder}/studio.png` });
      const png = await page.evaluate(async () => {
        const resources = performance.getEntriesByType('resource');
        const canvas = document.querySelector('.production-canvas canvas');
        const [{ _roots }, Three] = await Promise.all([
          import(resources.find(({ name }) => name.includes('/@react-three_fiber.js')).name),
          import(resources.find(({ name }) => name.includes('/three.js')).name),
        ]);
        const world = _roots.get(canvas).store.getState().scene;
        const views = [
          ['Frente', [0, 0, 1]],
          ['Lateral', [1, 0, 0]],
          ['Traseira', [0, 0, -1]],
          ['Perspectiva', [0.75, 0.32, 1]],
        ];
        const samples = [
          ['Turret operacional', 'factory-turret-active', [0, 1.02, 0], 2.35],
          ['Turret desligada', 'factory-turret-sleeping', [0, 0.73, 0], 2.05],
          ['Turret danificada', 'factory-turret-damaged', [0, 0.86, 0], 2.2],
          ['Sucata', 'salvage-turret', [0.3, 0.42, 0], 2.6],
          ['Supervisor', 'supervisor-head', [0, 0.03, 0], 3.05],
          ['Braço mecânico', 'supervisor-ceiling-arm', [0, 11.04, 0], 9.25],
        ];
        const atlas = document.createElement('canvas');
        atlas.width = 1280;
        atlas.height = 1608;
        const draw = atlas.getContext('2d');
        draw.fillStyle = '#10191c';
        draw.fillRect(0, 0, atlas.width, atlas.height);
        const renderer = new Three.WebGLRenderer({ antialias: true });
        renderer.setSize(310, 217);
        renderer.toneMapping = Three.ACESFilmicToneMapping;
        const scene = new Three.Scene();
        scene.background = new Three.Color('#25363a');
        scene.add(new Three.HemisphereLight('#e6e8d9', '#5d6865', 2));
        const lamp = new Three.DirectionalLight('#fff3db', 3);
        lamp.position.set(5, 9, 8);
        scene.add(lamp);
        const camera = new Three.PerspectiveCamera(31, 310 / 217, 0.1, 130);
        draw.font = '600 17px sans-serif';
        draw.fillStyle = '#ddede6';
        views.forEach(([label], col) => draw.fillText(label, col * 320 + 10, 23));
        for (const [row, [label, name, target, extent]] of samples.entries()) {
          const original = world.getObjectByName(name);
          if (!original) throw new Error(`Missing model: ${name}`);
          const model = original.clone(true);
          model.position.set(0, 0, 0);
          model.visible = true;
          if (name === 'supervisor-ceiling-arm')
            model.getObjectByName('supervisor-head-pivot')?.removeFromParent();
          const center = new Three.Vector3(...target);
          scene.add(model);
          for (const [col, [, vector]] of views.entries()) {
            camera.position
              .copy(center)
              .addScaledVector(new Three.Vector3(...vector).normalize(), extent / 0.52);
            camera.lookAt(center);
            renderer.render(scene, camera);
            draw.drawImage(renderer.domElement, col * 320 + 5, row * 262 + 40);
          }
          scene.remove(model);
          draw.fillText(label, 10, row * 262 + 278);
        }
        renderer.dispose();
        return atlas.toDataURL('image/png').split(',')[1];
      });
      await writeFile(`${folder}/modelos.png`, Buffer.from(png, 'base64'));

      const [x, y, z] = await page.evaluate(async () => {
        const canvas = document.querySelector('.production-canvas canvas');
        const resource = performance
          .getEntriesByType('resource')
          .find(({ name }) => name.includes('/@react-three_fiber.js'));
        const { _roots } = await import(resource.name);
        const { camera, scene } = _roots.get(canvas).store.getState();
        return scene
          .getObjectByName('supervisor-head')
          .getWorldPosition(camera.position.clone())
          .toArray();
      });
      for (const [label, value] of [
        ['Position X', x + 2],
        ['Position Y', y + 0.75],
        ['Position Z', z + 7],
        ['Target X', x],
        ['Target Y', y + 0.35],
        ['Target Z', z],
        ['Zoom', 1.1],
      ]) {
        const field = panel.getByRole('spinbutton', { name: label, exact: true });
        await field.fill(value.toFixed(3));
        await field.press('Tab');
      }
      await panel.getByRole('button', { name: 'Scene', exact: true }).click();
      await panel.getByRole('checkbox', { name: 'Hide HTML', exact: true }).check();
      await panel.getByRole('button', { name: 'Minimize panel', exact: true }).click();
      await page.screenshot({ path: `${folder}/studio-supervisor.png` });
    }
    if (errors.length) throw new Error(errors.join('\n'));
    await page.close();
  }
} finally {
  await browser.close();
  await writeFile(`${folder}/metrics.json`, JSON.stringify(readings, null, 2));
}
