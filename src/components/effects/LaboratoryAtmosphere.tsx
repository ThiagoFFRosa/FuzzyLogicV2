import { useEffect, useRef } from 'react';
import { useCoreTheme } from '../core/CoreThemeProvider';
export function LaboratoryAtmosphere() {
  const ref = useRef<HTMLDivElement>(null);
  const { theme, reduced } = useCoreTheme();
  useEffect(() => {
    if (reduced || !matchMedia('(pointer:fine)').matches) return;
    const hero = document.getElementById('home');
    let frame = 0;
    const target = { x: 0, y: 0, scroll: 0 };
    const current = { x: 0, y: 0, scroll: 0 };
    let heroHeight = hero?.offsetHeight || window.innerHeight;
    // A single settling loop smooths the existing light and scene layers without React renders.
    const settle = () => {
      frame = 0;
      let distance = 0;
      for (const key of ['x', 'y', 'scroll'] as const) {
        current[key] += (target[key] - current[key]) * 0.085;
        distance += Math.abs(target[key] - current[key]);
      }
      ref.current?.style.setProperty('--light-x', `${50 + current.x * 20}%`);
      ref.current?.style.setProperty('--light-y', `${35 + current.y * 14}%`);
      hero?.style.setProperty('--scene-light-x', `${50 + current.x * 12}%`);
      hero?.style.setProperty('--scene-light-y', `${44 + current.y * 8}%`);
      hero?.style.setProperty('--scene-x', `${current.x * 10}px`);
      hero?.style.setProperty('--scene-y', `${current.y * 7}px`);
      hero?.style.setProperty('--scene-scroll', `${current.scroll * 20}px`);
      if (distance > 0.002 && !document.hidden) frame = requestAnimationFrame(settle);
    };
    const schedule = () => {
      if (!frame && !document.hidden) frame = requestAnimationFrame(settle);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      target.x = Math.max(-1, Math.min(1, (e.clientX / window.innerWidth - 0.5) * 2));
      target.y = Math.max(-1, Math.min(1, (e.clientY / window.innerHeight - 0.5) * 2));
      schedule();
    };
    const scroll = () => {
      target.scroll = Math.min(1, window.scrollY / heroHeight);
      schedule();
    };
    const resize = () => {
      heroHeight = hero?.offsetHeight || window.innerHeight;
      scroll();
    };
    const rest = () => {
      target.x = 0;
      target.y = 0;
      schedule();
    };
    const visibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else schedule();
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', resize);
    document.addEventListener('pointerleave', rest);
    document.addEventListener('visibilitychange', visibility);
    scroll();
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', resize);
      document.removeEventListener('pointerleave', rest);
      document.removeEventListener('visibilitychange', visibility);
      cancelAnimationFrame(frame);
      for (const key of [
        '--scene-x',
        '--scene-y',
        '--scene-scroll',
        '--scene-light-x',
        '--scene-light-y',
      ])
        hero?.style.removeProperty(key);
      ref.current?.style.removeProperty('--light-x');
      ref.current?.style.removeProperty('--light-y');
    };
  }, [reduced]);
  return (
    <div className="laboratory-atmosphere" aria-hidden="true" ref={ref}>
      <div className="atmosphere-light" />
      <div key={theme} className="mode-flash" />
      <span className="atmosphere-line line-one" />
      <span className="atmosphere-line line-two" />
    </div>
  );
}
