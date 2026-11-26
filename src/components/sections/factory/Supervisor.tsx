import { useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { AmbientScheduler } from '../../../lib/ambientEvents';
import type { CharacterReaction } from '../../../lib/characterReaction';
import type { SupervisorFeedback } from '../../../lib/supervisor';
import { Group, MathUtils, Vector2, Vector3 } from 'three';
import {
  DAMAGED_TURRET_SLOT,
  PROJECT_SLOTS,
  SCANNER_X,
  beltPosition,
  onExposedBelt,
} from '../../../lib/conveyor';
import {
  ARM,
  SUPERVISOR_HEIGHT,
  SUPERVISOR_IDLE_MS,
  SUPERVISOR_MODES,
  chooseSupervisorTarget,
  limitSupervisorAim,
} from '../../../lib/supervisor';
import { CeilingArm } from './CeilingArm';
import { SupervisorEye } from './SupervisorEye';
import { SupervisorShell } from './SupervisorShell';

const ANGLE_LIMIT = { yaw: 0.37, pitch: 0.3 };
const TEMPER = { yaw: 0.102, pitch: 0.055 };
const BLUE_ROUNDS = [null, [-8.7, 5.15, -5.25], null, [-15.5, 3, 0]] as const;
const AMBER_ROUNDS = [null, [SCANNER_X, 2.65, 0.55], null, [15.5, 3.1, 0]] as const;

interface SupervisorProps {
  x: number;
  z: number;
  active: boolean;
  reduced: boolean;
  amber: boolean;
  selected: number | null;
  inspectionPhysical: boolean;
  hovered: number | null;
  lowResolution: boolean;
  travel: RefObject<number>;
  scanUntil: RefObject<number>;
  reaction: CharacterReaction;
  feedback: SupervisorFeedback;
  ambient: AmbientScheduler;
}

export function Supervisor(props: SupervisorProps) {
  const head = useRef<Group>(null);
  const rig = useRef({ x: 0, y: ARM.wristY as number });
  const optic = useRef({ yaw: 0, pitch: 0, aperture: 0.32, blink: 1, energy: 1, irritation: 0 });
  const pointer = useRef({ at: -Infinity, nx: 0, ny: 0 });
  const hoverMemory = useRef({ index: null as number | null, until: 0 });
  const blinkAge = useRef(Infinity);
  const previousAmber = useRef(props.amber);
  const patrol = useRef({ amber: props.amber, index: 0, until: 0 });
  const { gl, invalidate } = useThree();
  const center = useMemo(() => new Vector3(), []);
  const target = useMemo(() => new Vector3(), []);
  const screen = useMemo(() => new Vector2(), []);
  const animate = props.active && !props.reduced;
  useEffect(() => invalidate(), [props.feedback, invalidate]);

  useEffect(() => {
    if (!animate) return;
    const update = (x: number, y: number) => {
      const rect = gl.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointer.current = {
        at: performance.now(),
        nx: ((x - rect.left) / rect.width) * 2 - 1,
        ny: 1 - ((y - rect.top) / rect.height) * 2,
      };
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') update(event.clientX, event.clientY);
    };
    const tap = (event: PointerEvent) => {
      if (event.pointerType === 'touch') update(event.clientX, event.clientY);
    };
    const focus = (event: FocusEvent) => {
      const control = event.target;
      if (
        !(control instanceof HTMLElement) ||
        !control.closest('button, a, input') ||
        control.closest('.supervisor-control')
      )
        return;
      const rect = control.getBoundingClientRect();
      update(rect.left + rect.width / 2, rect.top + rect.height / 2);
    };
    const forget = () => {
      pointer.current.at = -Infinity;
    };
    window.addEventListener('pointermove', move, { passive: true });
    gl.domElement.addEventListener('pointerdown', tap, { passive: true });
    document.addEventListener('focusin', focus);
    document.addEventListener('pointerleave', forget);
    return () => {
      window.removeEventListener('pointermove', move);
      gl.domElement.removeEventListener('pointerdown', tap);
      document.removeEventListener('focusin', focus);
      document.removeEventListener('pointerleave', forget);
      forget();
    };
  }, [animate, gl]);

  useFrame(({ camera, clock }, delta) => {
    if (!head.current) return;
    const now = performance.now();
    const time = clock.elapsedTime;
    const dt = Math.min(delta, 0.16);
    const mode = SUPERVISOR_MODES[props.amber ? 'amber' : 'blue'];
    const reaction = props.selected === null ? props.reaction.phase(now) : 'idle';
    const clicked = reaction === 'alerted' || reaction === 'warning' || reaction === 'overload';
    const curiosity = reaction === 'warning';
    const irritated = reaction === 'overload';
    const event = props.ambient.current;
    const damagedX =
      event?.id === 'turret' ? beltPosition(DAMAGED_TURRET_SLOT, props.travel.current) : null;
    const environment =
      event !== null &&
      event.id !== 'gel' &&
      event.id !== 'dock' &&
      (damagedX === null || onExposedBelt(damagedX)) &&
      (!props.amber || event.id === 'lamp' || event.id === 'turret');
    if (props.hovered !== null) hoverMemory.current = { index: props.hovered, until: now + 280 };
    const heldHover =
      props.hovered ?? (now < hoverMemory.current.until ? hoverMemory.current.index : null);
    const reading = chooseSupervisorTarget({
      reacting: clicked,
      selected: props.selected !== null,
      hovered: heldHover !== null && !clicked,
      recentPointer: now - pointer.current.at < SUPERVISOR_IDLE_MS,
      scanning: now < props.scanUntil.current,
      environment,
    });
    const origin = center
      .set(props.x + rig.current.x, SUPERVISOR_HEIGHT + rig.current.y - ARM.wristY, props.z)
      .project(camera);
    if (reading === 'pointer')
      screen.set(pointer.current.nx - origin.x, pointer.current.ny - origin.y);
    else if (reading === 'visitor') screen.set(0, 0.035);
    else if (reading === 'environment' && event) {
      const [x, y, z] = event.target;
      const point = target.set(damagedX ?? x, y, z).project(camera);
      screen.set(point.x - origin.x, point.y - origin.y);
    } else if (reading === 'project' && !props.inspectionPhysical && props.selected !== null) {
      screen.set((props.selected - 2) * 0.34 - origin.x, -0.76 - origin.y);
    } else {
      const focus = props.selected ?? heldHover;
      let x = SCANNER_X;
      let y = reading === 'scanner' ? 2.65 : 2.08;
      let z = 0.85;
      if (reading === 'belt') {
        const round = patrol.current;
        const rounds = props.amber ? AMBER_ROUNDS : BLUE_ROUNDS;
        const hold = props.amber ? 6.4 : 4.5;
        if (round.until === 0 || round.amber !== props.amber) {
          round.amber = props.amber;
          round.index = 0;
          round.until = props.ambient.time + hold;
        } else if (props.ambient.time > round.until) {
          round.index = (round.index + 1) % rounds.length;
          round.until = props.ambient.time + hold;
        }
        const checkpoint = rounds[round.index];
        if (checkpoint) [x, y, z] = checkpoint;
        else {
          const mark = props.x - 3.25 + Math.sin(time * 0.48) * (props.amber ? 0.45 : 1.3);
          let nearest = Infinity;
          for (const slot of PROJECT_SLOTS) {
            const position = beltPosition(slot, props.travel.current);
            if (onExposedBelt(position) && Math.abs(position - mark) < nearest) {
              x = position;
              nearest = Math.abs(position - mark);
            }
          }
        }
      } else if (focus !== null) x = beltPosition(PROJECT_SLOTS[focus], props.travel.current);
      const point = target.set(x, y, z).project(camera);
      screen.set(point.x - origin.x, point.y - origin.y);
    }

    const aim = limitSupervisorAim(
      screen.x * 0.72,
      -screen.y * 0.56,
      ANGLE_LIMIT.yaw,
      ANGLE_LIMIT.pitch,
    );
    const calm = reading === 'belt' || reading === 'scanner';
    const move = (current: number, next: number, response: number) =>
      animate ? MathUtils.damp(current, next, response, dt) : next;
    const restPitch = props.reduced ? 0.018 : 0;
    const pose = optic.current;
    pose.irritation = move(pose.irritation, irritated ? (props.reduced ? 0.7 : 1) : 0, 6);
    pose.yaw = move(pose.yaw, props.reduced ? 0 : aim.yaw, mode.follow);
    pose.pitch = move(pose.pitch, props.reduced ? restPitch : aim.pitch, mode.follow);
    const visitorAperture = curiosity ? 1.28 : props.amber ? 0.78 : 1.24;
    const aperture = irritated ? 0.69 : reading === 'visitor' ? visitorAperture : 1;
    pose.aperture = move(pose.aperture, mode.aperture * (animate ? aperture : 1), 8);
    if (previousAmber.current !== props.amber) {
      previousAmber.current = props.amber;
      blinkAge.current = 0;
    }
    blinkAge.current += Math.min(dt, 0.065);
    const lid = blinkAge.current < 0.5 ? 1 - 0.9 * Math.sin((Math.PI * blinkAge.current) / 0.5) : 1;
    const interval = props.amber ? 7.9 : 6.15;
    const phase = time % interval;
    const idleBlink =
      phase > interval - 0.29 ? 1 - 0.8 * Math.sin((Math.PI * (interval - phase)) / 0.29) : 1;
    const clickAge = props.reaction.age(now);
    const clickBlink =
      clicked && clickAge < 220 ? 1 - 0.75 * Math.sin((Math.PI * clickAge) / 220) : 1;
    pose.blink = animate ? Math.min(lid, idleBlink, clickBlink) : 1;
    pose.energy = animate
      ? 0.97 +
        mode.pulse * 0.08 * Math.sin(time * (props.amber ? 2.2 : 1.32)) +
        (reading === 'visitor' ? 0.12 : 0)
      : clicked
        ? 1.12
        : 1;

    const wristX = animate ? aim.yaw * 0.31 + (calm ? Math.sin(time * mode.idle) * 0.075 : 0) : 0;
    const wristY =
      ARM.wristY +
      (animate ? -aim.pitch * 0.12 + Math.sin(time * 0.78) * 0.034 + pose.irritation * 0.4 : 0);
    rig.current.x = move(rig.current.x, wristX, 2.35);
    rig.current.y = move(rig.current.y, wristY, 2.35);
    const facing = Math.atan2(camera.position.x - props.x, camera.position.z - props.z);
    const elevation = Math.atan2(
      camera.position.y - SUPERVISOR_HEIGHT,
      Math.hypot(camera.position.x - props.x, camera.position.z - props.z),
    );
    head.current.rotation.y = move(
      head.current.rotation.y,
      facing + (pose.yaw * TEMPER.yaw) / ANGLE_LIMIT.yaw,
      5,
    );
    head.current.rotation.x = move(
      head.current.rotation.x,
      -elevation + (pose.pitch * TEMPER.pitch) / ANGLE_LIMIT.pitch,
      5,
    );
    head.current.rotation.z = move(
      head.current.rotation.z,
      animate
        ? -pose.yaw * (props.amber ? 0.035 : 0.09) +
            (curiosity && reading === 'visitor' ? (props.amber ? 0.044 : 0.092) : 0) -
            0.1 * pose.irritation
        : 0,
      4,
    );
  }, -1);

  return (
    <group name="factory-supervisor" position={[props.x, 0, props.z]}>
      <CeilingArm pose={rig} shadows={!props.lowResolution}>
        <group
          ref={head}
          name="supervisor-head-pivot"
          position={[0, -0.45, -0.22]}
          rotation-order="YXZ"
        >
          <group position={[0, SUPERVISOR_HEIGHT - ARM.wristY + 0.45, 0.22]} name="supervisor-head">
            <SupervisorShell shadows={!props.lowResolution} />
            <SupervisorEye motion={optic} amber={props.amber} animate={animate} />
          </group>
        </group>
      </CeilingArm>
    </group>
  );
}
