import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { AmbientScheduler } from '../../../lib/ambientEvents';
import { IndustrialPipe } from './IndustrialPipe';
import { SecondaryConveyor } from './SecondaryConveyor';
import { CONVEYOR_ROUTES, FLUID_CIRCUITS } from './infrastructureLayout';

export function BackgroundInfrastructure({
  animate,
  ambient,
  mobile,
  lowResolution,
}: {
  animate: boolean;
  ambient: AmbientScheduler;
  mobile: boolean;
  lowResolution: boolean;
}) {
  const fluidClock = useRef(0);
  useFrame((_, delta) => {
    if (animate) fluidClock.current += Math.min(delta, 0.15);
  }, -1);

  return (
    <group name="background-infrastructure">
      {CONVEYOR_ROUTES.map(
        (route) =>
          (!mobile || route.id === 'maintenance-return') && (
            <SecondaryConveyor
              key={route.id}
              route={route}
              animate={animate}
              compact={mobile || lowResolution}
            />
          ),
      )}
      {FLUID_CIRCUITS.map((circuit, sector) => (
        <IndustrialPipe
          key={circuit.id}
          circuit={circuit}
          clock={fluidClock}
          ambient={ambient}
          sector={sector}
          compact={mobile || lowResolution}
        />
      ))}
    </group>
  );
}
