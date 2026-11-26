import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readSupervisor } from './supervisor-state.mjs';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir: 'artifacts/factory/motion', size: { width: 1440, height: 1000 } },
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

async function waitForScene(check, message, movePointer) {
  const until = performance.now() + 22_000;
  while (performance.now() < until) {
    if (movePointer) await movePointer();
    const state = await readSupervisor(page);
    if (check(state)) return state;
    await page.waitForTimeout(140);
  }
  assert.fail(message);
}

try {
  await page.goto(process.argv[2] ?? 'http://127.0.0.1:5180');
  await page.locator('.supervisor-trigger').waitFor();
  const start = await readSupervisor(page);
  await waitForScene(
    (state) => state.crateX !== start.crateX && state.shaft !== start.shaft,
    'The production line must move',
  );
  const pause = page.locator('.factory-pause');
  await pause.click();
  const braking = await readSupervisor(page);
  const stopped = await waitForScene(
    (state) => state.fluidTravel > braking.fluidTravel + 0.95,
    'The secondary circuits must keep moving after a pause',
  );
  const paused = await waitForScene(
    (state) => state.fluidTravel > stopped.fluidTravel + 0.1,
    'The secondary circuits must advance during a pause',
  );
  assert.equal(paused.crateX, stopped.crateX);
  assert.equal(paused.shaft, stopped.shaft);

  await pause.click();
  const project = page.locator('.factory-project-controls button').filter({ hasText: 'Fuzz Deck' });
  await project.click();
  await page.locator('.factory-inspection h2').filter({ hasText: 'Fuzz Deck' }).waitFor();
  await page.locator('.factory-inspection[data-phase="inspecting"]').waitFor();
  await page.screenshot({ path: 'artifacts/factory/open-in-motion.png' });
  await page.keyboard.press('Escape');
  await project.blur();
  await page.locator('#home[data-inspection-present="false"]').waitFor();
  const closed = await readSupervisor(page);
  await waitForScene(
    (state) => state.crateX !== closed.crateX,
    'Production must resume after inspection',
  );
  let pointerY = 235;
  await waitForScene(
    (state) => state.yaw > 0.045,
    'The supervisor must look toward the cursor',
    () => {
      pointerY = pointerY === 235 ? 255 : 235;
      return page.mouse.move(1360, pointerY);
    },
  );
  await waitForScene(
    (state) => state.pitch > 0.04,
    'The idle supervisor must look toward the line',
  );
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      beltMoves: true,
      pausedLineStable: true,
      inspection: true,
      idleProductionGaze: true,
      pageErrors: errors,
    }),
  );
} finally {
  await context.close();
  await browser.close();
}
