import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CameraSession } from './session';

const landmarks = {
  hero: ['.factory-hero', 'Hero'],
  navbar: ['.site-header', 'Navbar'],
  headline: ['.factory-heading', 'Headline'],
  projects: ['.factory-project-controls', 'Project navigation'],
} as const;

export function ScenePresentation({ settings }: { settings: CameraSession | null }) {
  const flags = settings?.overlay;
  const hide = !!settings?.hideHtml;
  const [boxes, setBoxes] = useState<{ label: string; rect: DOMRect }[]>([]);
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('camera-studio-clean', hide);
    return () => document.documentElement.classList.remove('camera-studio-clean');
  }, [hide]);
  useLayoutEffect(() => {
    const entries = Object.entries(landmarks).flatMap(([key, [selector, label]]) => {
      const node = flags?.[key as keyof typeof landmarks] ? document.querySelector(selector) : null;
      return node ? [{ node, label }] : [];
    });
    if (!entries.length) {
      setBoxes([]);
      return;
    }
    const measure = () =>
      setBoxes(entries.map(({ node, label }) => ({ label, rect: node.getBoundingClientRect() })));
    const observer = new ResizeObserver(measure);
    for (const { node } of entries) observer.observe(node);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
    };
  }, [flags]);
  const scene = document.querySelector('.factory-scene');
  return (
    <>
      {scene &&
        (flags?.thirds || flags?.center || flags?.safe) &&
        createPortal(
          <div className="camera-studio-guides" aria-hidden="true">
            {flags.thirds && <i className="camera-studio-thirds" />}
            {flags.center && <i className="camera-studio-center" />}
            {flags.safe && <i className="camera-studio-safe" />}
          </div>,
          scene,
        )}
      {boxes.length > 0 &&
        createPortal(
          <div className="camera-studio-landmarks" aria-hidden="true">
            {boxes.map(({ label, rect }) => (
              <div
                key={label}
                style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
              >
                <span>{label}</span>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
