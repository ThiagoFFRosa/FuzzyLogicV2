import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { viewports } from './configuration';
import type { Viewport } from './configuration';
import {
  cameraMovement,
  cameraSession,
  cameraShortcut,
  liveCamera,
  previewParameter,
  useCameraSession,
} from './session';
import type { CameraSession, LiveCamera } from './session';
import type { CameraConfiguration } from '../../../../lib/factoryCamera';
import { ScenePresentation } from './CameraCompositionOverlay';

const studioShortcuts = {
  KeyM: 'minimize',
  KeyO: 'orbit',
  KeyH: 'hide',
  KeyP: 'pause',
} as const satisfies Record<string, string>;
export function studioAction(event: KeyboardEvent) {
  if (!event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
  return studioShortcuts[event.code as keyof typeof studioShortcuts];
}

type Action = NonNullable<ReturnType<typeof studioAction>> | 'close';
type PreviewMessage =
  | { type: 'fuzzs-camera-ready' }
  | { type: 'fuzzs-camera-view'; view: LiveCamera | null }
  | { type: 'fuzzs-camera-move'; camera: CameraConfiguration }
  | { type: 'fuzzs-camera-action'; action: Action };

export function PreviewRuntime() {
  const settings = useCameraSession();
  useLayoutEffect(() => {
    const send = (message: PreviewMessage) => window.parent.postMessage(message, location.origin);
    const receive = (event: MessageEvent) => {
      if (
        event.origin === location.origin &&
        event.source === window.parent &&
        event.data?.type === 'fuzzs-camera-settings'
      )
        cameraSession.set(event.data.settings);
    };
    const onKey = (event: KeyboardEvent) => {
      const action = cameraShortcut(event) ? 'close' : studioAction(event);
      if (!action) return;
      event.preventDefault();
      if (!event.repeat) send({ type: 'fuzzs-camera-action', action });
    };
    const unsubView = liveCamera.subscribe(() =>
      send({ type: 'fuzzs-camera-view', view: liveCamera.get() }),
    );
    const unsubMove = cameraMovement.subscribe(() => {
      const camera = cameraMovement.get();
      if (camera) send({ type: 'fuzzs-camera-move', camera });
    });
    window.addEventListener('message', receive);
    window.addEventListener('keydown', onKey);
    send({ type: 'fuzzs-camera-ready' });
    return () => {
      window.removeEventListener('message', receive);
      window.removeEventListener('keydown', onKey);
      unsubView();
      unsubMove();
      cameraSession.set(null);
    };
  }, []);
  return <ScenePresentation settings={settings} />;
}

export function SimulatedViewport({
  viewport,
  settings,
  onView,
  onMove,
  onAction,
}: {
  viewport: Viewport;
  settings: CameraSession;
  onView: (view: LiveCamera | null) => void;
  onMove: (camera: CameraConfiguration) => void;
  onAction: (action: Action) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const settingsRef = useRef(settings);
  const [available, setAvailable] = useState([0, 0]);
  const [width, height] = viewports[viewport];
  const source = new URL(location.pathname, location.origin);
  source.searchParams.set(previewParameter, '1');
  const scale = Math.min(1, available[0] / width, available[1] / height);
  useLayoutEffect(() => {
    const node = stage.current;
    if (!node) return;
    const measure = () => setAvailable([node.clientWidth, node.clientHeight]);
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    measure();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const handle = (event: MessageEvent<PreviewMessage>) => {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow) return;
      const message = event.data;
      switch (message?.type) {
        case 'fuzzs-camera-ready':
          frame.current?.contentWindow?.postMessage(
            { type: 'fuzzs-camera-settings', settings: settingsRef.current },
            location.origin,
          );
          break;
        case 'fuzzs-camera-view':
          onView(message.view);
          break;
        case 'fuzzs-camera-move':
          onMove(message.camera);
          break;
        case 'fuzzs-camera-action':
          onAction(message.action);
          break;
      }
    };
    window.addEventListener('message', handle);
    return () => window.removeEventListener('message', handle);
  }, [onView, onMove, onAction]);
  useLayoutEffect(() => {
    settingsRef.current = settings;
    frame.current?.contentWindow?.postMessage(
      { type: 'fuzzs-camera-settings', settings },
      location.origin,
    );
  }, [settings]);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('camera-studio-simulating');
    return () => root.classList.remove('camera-studio-simulating');
  }, []);
  return (
    <div className="camera-studio-simulation">
      <div className="camera-studio-stage" ref={stage}>
        <div
          className="camera-studio-frame"
          style={{ width: width * scale, height: height * scale }}
        >
          <iframe
            ref={frame}
            src={source.href}
            title={`Simulated viewport ${viewport}`}
            style={{ width, height, transform: `scale(${scale})` }}
          />
        </div>
      </div>
      <div className="camera-studio-viewport-size">
        {width} × {height} · {viewport}
      </div>
    </div>
  );
}
