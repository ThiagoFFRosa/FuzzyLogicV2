export type CameraVector = [number, number, number];

export const CAMERA_PROFILES = [
  'desktop',
  'ultrawide',
  'mobile-portrait',
  'mobile-landscape',
  'tablet',
] as const;
export type CameraProfile = (typeof CAMERA_PROFILES)[number];

export interface CameraConfiguration {
  profile: CameraProfile;
  position: CameraVector;
  target: CameraVector;
  fov: number;
  zoom: number;
  near: number;
  far: number;
  roll: number;
}

export const FACTORY_LENS = { zoom: 1, near: 0.1, far: 100, roll: 0 };

const desktop: CameraVector = [12, 9, 29];
const desktopTarget: CameraVector = [0, 2, 0];
const compactPortrait = {
  position: [6.5, 5.9, 17.2] as CameraVector,
  target: [0.7, 3, 0] as CameraVector,
  fov: 44,
  supervisorX: 2.5,
  supervisorZ: -4.5,
};
const compactLandscape = {
  position: [7.8, 6.6, 18.8] as CameraVector,
  target: [0.5, 2.9, 0] as CameraVector,
  fov: 38,
  supervisorX: 3.2,
  supervisorZ: -4.3,
};

// Copy a calibrated configuration here to make it official for its profile.
// The exported FOV is already effective and is applied verbatim.
export const OFFICIAL_CAMERA_PROFILES: Partial<Record<CameraProfile, CameraConfiguration>> = {
  desktop: {
    profile: 'desktop',
    position: [10.5, 6.1, 16],
    target: [-3.6, -4.8, -30],
    fov: 41.2,
    zoom: 1,
    near: 0.1,
    far: 100,
    roll: 0,
  },
  ultrawide: {
    profile: 'ultrawide',
    position: [11.399453069945876, 4.231953819787016, 14.192093502556908],
    target: [-5.4, -2, -30],
    fov: 42,
    zoom: 0.95,
    near: 3.301,
    far: 35.002,
    roll: 0,
  },
};

export function productionCamera(aspect: number, compact: boolean, profile?: CameraProfile) {
  const framing = compact ? (aspect >= 1.45 ? compactLandscape : compactPortrait) : null;
  const baseFov = framing?.fov ?? (aspect < 1.4 ? 48 : 42);
  const halfAngle = Math.tan((baseFov / 2) * (Math.PI / 180));
  const fov = 2 * Math.atan(halfAngle * Math.min(1, 2.65 / aspect)) * (180 / Math.PI);
  const camera: CameraConfiguration = {
    ...FACTORY_LENS,
    profile:
      profile ?? (compact ? (aspect >= 1.45 ? 'mobile-landscape' : 'mobile-portrait') : 'desktop'),
    position: framing?.position ?? desktop,
    target: framing?.target ?? desktopTarget,
    fov,
  };
  return {
    supervisorX: framing?.supervisorX ?? 8.2,
    supervisorZ: framing?.supervisorZ ?? -2.98,
    camera: OFFICIAL_CAMERA_PROFILES[camera.profile] ?? camera,
  };
}

export function cameraProfile(width: number, height: number, compact: boolean): CameraProfile {
  if (compact) {
    if (width >= 600 && height >= 600) return 'tablet';
    return width > height ? 'mobile-landscape' : 'mobile-portrait';
  }
  if (width / height >= 2.1) return 'ultrawide';
  return width >= 700 && width <= 1100 && height >= 600 && width / height <= 1.5
    ? 'tablet'
    : 'desktop';
}
