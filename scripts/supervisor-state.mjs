export async function readSupervisor(page, watchBlink = false) {
  await page.locator('.production-canvas[data-scenery-ready="true"]').waitFor();
  return page.evaluate(async (watchBlink) => {
    const canvas = document.querySelector('canvas[aria-hidden="true"]');
    const entry = performance
      .getEntriesByType('resource')
      .find(({ name }) => name.includes('/@react-three_fiber.js'));
    if (!canvas || !entry) throw new Error('The Three.js scene did not load.');
    const fiber = await import(entry.name);
    const scene = fiber._roots.get(canvas)?.store.getState().scene;
    const object = (name) => {
      const model = scene?.getObjectByName(name);
      if (!model) throw new Error(`Missing supervisor part: ${name}`);
      return model;
    };
    const eye = object('supervisor-eye');
    const wrist = object('supervisor-wrist');
    const lens = object('supervisor-lens').material.uniforms;
    if (watchBlink) {
      const deadline = performance.now() + 18_000;
      while (
        (lens.shutter.value > 0.49 || lens.amber.value < 0.1) &&
        performance.now() < deadline
      ) {
        await new Promise(requestAnimationFrame);
      }
    }
    return {
      yaw: eye.rotation.y,
      pitch: eye.rotation.x,
      wrist: wrist.position.toArray(),
      tint: lens.tint.value.getHexString(),
      aperture: lens.aperture.value,
      shutter: lens.shutter.value,
      ceiling: Boolean(object('supervisor-ceiling-rail')),
      crateX: object('project-crate-2').position.x,
      shaft: object('drive-output-shaft').rotation.z,
      fluidTravel: object('GEL-B').children.find((part) => part.material?.uniforms?.travel).material
        .uniforms.travel.value,
    };
  }, watchBlink);
}
