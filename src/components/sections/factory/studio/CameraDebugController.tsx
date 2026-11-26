import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  BoxHelper,
  CameraHelper,
  Mesh,
  PointLight,
  PointLightHelper,
  PerspectiveCamera,
  SpotLight,
  SpotLightHelper,
} from 'three';
import type { Material, Object3D } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CameraConfiguration } from '../../../../lib/factoryCamera';
import { coordinateLimit } from './configuration';
import { cameraMovement } from './session';
import type { CameraSession } from './session';

function OrbitCamera({ config }: { config: CameraConfiguration }) {
  const { gl, invalidate, setEvents, get } = useThree();
  // OrbitControls owns the pose of this camera. The render camera separately applies roll.
  const orbitCamera = useMemo(() => new PerspectiveCamera(), []);
  const controls = useRef<OrbitControls | null>(null);
  const latest = useRef(config);
  const syncing = useRef(false);

  useLayoutEffect(() => {
    const orbit = new OrbitControls(orbitCamera, gl.domElement);
    orbit.minDistance = 0.05;
    orbit.maxDistance = 1000;
    orbit.zoomToCursor = false;
    controls.current = orbit;
    const enabled = get().events.enabled;
    setEvents({ enabled: false });
    const change = () => {
      if (syncing.current) return;
      const position = orbitCamera.position.toArray();
      const target = orbit.target.toArray();
      if ([...position, ...target].some((value) => Math.abs(value) > coordinateLimit)) {
        syncing.current = true;
        orbitCamera.position.set(...latest.current.position);
        orbit.target.set(...latest.current.target);
        orbit.update();
        syncing.current = false;
        return;
      }
      latest.current = { ...latest.current, position, target };
      cameraMovement.set(latest.current);
      invalidate();
    };
    orbit.addEventListener('change', change);
    return () => {
      orbit.removeEventListener('change', change);
      controls.current = null;
      orbit.dispose();
      setEvents({ enabled });
    };
  }, [gl, orbitCamera, invalidate, setEvents, get]);

  useLayoutEffect(() => {
    const orbit = controls.current;
    latest.current = config;
    if (!orbit) return;
    syncing.current = true;
    orbitCamera.position.set(...config.position);
    orbitCamera.fov = config.fov;
    orbitCamera.zoom = config.zoom;
    orbitCamera.updateProjectionMatrix();
    orbit.target.set(...config.target);
    orbit.update();
    orbitCamera.updateMatrixWorld();
    syncing.current = false;
  }, [config, orbitCamera]);
  return null;
}

type Helper = BoxHelper | CameraHelper | SpotLightHelper | PointLightHelper;

function ObjectHelpers({
  lights,
  shadows,
  name,
}: {
  lights: boolean;
  shadows: boolean;
  name: string | null;
}) {
  const { scene, invalidate } = useThree();
  const helpers = useRef<Helper[]>([]);
  useLayoutEffect(() => {
    const list: Helper[] = [];
    const add = (helper: Helper) => {
      list.push(helper);
    };
    const seen = new Set<Object3D>();
    const collect = () => {
      scene.traverse((object) => {
        if (seen.has(object)) return;
        seen.add(object);
        if (object.name === name) add(new BoxHelper(object, 0xffca72));
        if (object instanceof SpotLight) {
          if (lights) add(new SpotLightHelper(object, 0x61dcff));
          if (shadows && object.castShadow) add(new CameraHelper(object.shadow.camera));
        }
        if (lights && object instanceof PointLight)
          add(new PointLightHelper(object, 0.2, 0x61dcff));
      });
      for (const helper of list) if (!helper.parent) scene.add(helper);
    };
    collect();
    helpers.current = list;
    // Some fixtures and the maintenance bay are mounted after the first frame.
    const timer = window.setTimeout(collect, 500);
    invalidate();
    return () => {
      window.clearTimeout(timer);
      for (const helper of list) {
        scene.remove(helper);
        helper.dispose();
      }
      helpers.current = [];
      invalidate();
    };
  }, [scene, invalidate, lights, shadows, name]);
  useFrame(() => helpers.current.forEach((helper) => helper.update()));
  return null;
}

type WireMaterial = Material & { wireframe: boolean };
function Wireframe() {
  const { scene, invalidate } = useThree();
  useLayoutEffect(() => {
    const originals = new Map<WireMaterial, boolean>();
    const apply = () => {
      scene.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        const materials: Material[] = Array.isArray(object.material)
          ? object.material
          : [object.material];
        for (const material of materials) {
          if (!('wireframe' in material) || typeof material.wireframe !== 'boolean') continue;
          const candidate = material as WireMaterial;
          if (originals.has(candidate)) continue;
          originals.set(candidate, candidate.wireframe);
          candidate.wireframe = true;
        }
      });
      invalidate();
    };
    apply();
    const timer = window.setInterval(apply, 500);
    return () => {
      window.clearInterval(timer);
      for (const [material, original] of originals) material.wireframe = original;
      invalidate();
    };
  }, [scene, invalidate]);
  return null;
}

export default function CameraDebugController({
  settings,
  camera,
}: {
  settings: CameraSession;
  camera: CameraConfiguration;
}) {
  const { debug, overlay } = settings;
  return (
    <>
      {settings.camera && settings.orbit && <OrbitCamera config={settings.camera} />}
      {debug.axes && <axesHelper args={[5]} />}
      {debug.grid && <gridHelper position={[0, 0.02, 0]} args={[80, 80, 0x79c5e0, 0x486878]} />}
      {overlay.target && (
        <group position={camera.target}>
          <axesHelper args={[0.6]} />
          <mesh>
            <sphereGeometry args={[0.16, 12, 8]} />
            <meshBasicMaterial color={0xffcc73} depthTest={false} wireframe />
          </mesh>
        </group>
      )}
      {(debug.lights || debug.shadows || debug.boxes) && (
        <ObjectHelpers
          lights={!!debug.lights}
          shadows={!!debug.shadows}
          name={debug.boxes ? settings.object : null}
        />
      )}
      {debug.wireframe && <Wireframe />}
    </>
  );
}
