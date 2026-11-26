import { useEffect, useState, useSyncExternalStore } from 'react';
import type { CameraConfiguration } from '../../../../lib/factoryCamera';

export const overlays = {
  thirds: 'Rule of thirds',
  center: 'Center mark',
  safe: 'Safe area',
  hero: 'Hero boundary',
  navbar: 'Navbar',
  headline: 'Headline',
  projects: 'Project navigation',
  target: 'Target marker',
} as const;

export const diagnostics = {
  axes: 'XYZ axes',
  grid: 'Ground grid',
  lights: 'Light helpers',
  shadows: 'Shadow bounds',
  boxes: 'Bounding box',
  wireframe: 'Wireframe',
} as const;

export interface CameraSession {
  background?: boolean;
  camera: CameraConfiguration | null;
  orbit: boolean;
  paused: boolean;
  suspendAmbient: boolean;
  hideHtml: boolean;
  overlay: Partial<Record<keyof typeof overlays, boolean>>;
  debug: Partial<Record<keyof typeof diagnostics, boolean>>;
  object: string;
}
export const initialSession: CameraSession = {
  camera: null,
  orbit: true,
  paused: false,
  suspendAmbient: false,
  hideHtml: false,
  overlay: {},
  debug: {},
  object: 'project-crate-0',
};

export interface LiveCamera {
  camera: CameraConfiguration;
  width: number;
  height: number;
}

function createStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next: T) {
      if (Object.is(value, next)) return;
      value = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export const cameraSession = createStore<CameraSession | null>(null);
export const liveCamera = createStore<LiveCamera | null>(null);
export const cameraMovement = createStore<CameraConfiguration | null>(null);
export const previewParameter = 'camera-preview';

export function useCameraSession() {
  return useSyncExternalStore(cameraSession.subscribe, cameraSession.get);
}

export function cameraShortcut(event: KeyboardEvent) {
  return (event.ctrlKey || event.metaKey) && event.shiftKey && event.code === 'KeyK';
}

export function useCameraStudioActivation() {
  const [open, setOpen] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('camera') === '1' || params.get(previewParameter) === '1';
  });
  useEffect(() => {
    if (
      window.parent !== window &&
      new URLSearchParams(location.search).get(previewParameter) === '1'
    )
      return;
    const onKey = (event: KeyboardEvent) => {
      if (!cameraShortcut(event)) return;
      event.preventDefault();
      if (!event.repeat) setOpen((previous) => !previous);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return [open, setOpen] as const;
}
