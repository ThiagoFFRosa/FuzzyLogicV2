export const SUPERVISOR_HEIGHT = 6.19;
export const SUPERVISOR_REACTION_MS = 1100;
export const SUPERVISOR_IDLE_MS = 2550;
export const ARM = {
  shoulderX: -0.42,
  shoulderY: 12.55,
  upper: 2.64,
  lower: 3.34,
  wristY: 7.51,
} as const;

export const SUPERVISOR_MODES = {
  blue: { tint: '#32bbf8', hot: '#def8ff', aperture: 0.32, pulse: 0.72, follow: 7.8, idle: 0.87 },
  amber: { tint: '#ff822c', hot: '#ffdeb0', aperture: 0.24, pulse: 1.0, follow: 4.8, idle: 0.53 },
} as const;

interface Observation {
  selected: boolean;
  hovered: boolean;
  reacting: boolean;
  recentPointer: boolean;
  scanning: boolean;
  environment?: boolean;
}

export function chooseSupervisorTarget(observation: Observation) {
  if (observation.selected) return 'project';
  if (observation.hovered) return 'hover';
  if (observation.reacting) return 'visitor';
  if (observation.recentPointer) return 'pointer';
  if (observation.scanning) return 'scanner';
  if (observation.environment) return 'environment';
  return 'belt';
}

export function limitSupervisorAim(yaw: number, pitch: number, maxYaw: number, maxPitch: number) {
  const radial = Math.max(1, Math.hypot(yaw / maxYaw, pitch / maxPitch));
  return { yaw: yaw / radial, pitch: pitch / radial };
}

export function solveSupervisorElbow(wristX: number, wristY: number) {
  const { shoulderX, shoulderY, upper, lower } = ARM;
  const dx = wristX - shoulderX;
  const dy = wristY - shoulderY;
  // A fixed-length triangle between the ceiling carriage, elbow and wrist.
  const distance = Math.min(
    upper + lower - 0.001,
    Math.max(Math.hypot(dx, dy), lower - upper + 0.001),
  );
  const along = (upper ** 2 - lower ** 2 + distance ** 2) / (2 * distance);
  const side = Math.sqrt(Math.max(0, upper ** 2 - along ** 2));
  return {
    x: shoulderX + (dx * along + dy * side) / distance,
    y: shoulderY + (dy * along - dx * side) / distance,
  };
}
