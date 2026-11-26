import { useEffect, useRef, useState } from 'react';
import { animate, useInView, useMotionValue, useSpring, useTransform } from 'motion/react';
import { GAZE_LIMIT, pointerOffset } from '../lib/behavior';
import { useCoreTheme } from '../components/core/CoreThemeProvider';

export function usePointerTracking() {
  const { theme, switching, reduced } = useCoreTheme();
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { amount: 0.15 });
  const [awake, setAwake] = useState(!document.hidden);
  const [reaction, setReaction] = useState('observing');
  const targetX = useMotionValue(0),
    targetY = useMotionValue(0);
  const pupilTarget = useMotionValue(1),
    lid = useMotionValue(1),
    rollTarget = useMotionValue(0);
  const curious = theme === 'blue';
  const spring = { stiffness: curious ? 95 : 48, damping: curious ? 15 : 19, mass: 1 };
  const x = useSpring(targetX, spring),
    y = useSpring(targetY, spring);
  const rotateY = useTransform(x, [-GAZE_LIMIT, GAZE_LIMIT], [-12, 12]);
  const rotateX = useTransform(y, [-GAZE_LIMIT, GAZE_LIMIT], [10, -10]);
  const rotate = useSpring(rollTarget, { stiffness: 90, damping: 12 });
  const pupilScale = useSpring(pupilTarget, { stiffness: 120, damping: 12 });
  const active = visible && awake && !reduced;
  const clickRef = useRef<() => void>(() => {});
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    setReaction('observing');
    return () => clearTimeout(feedbackTimer.current);
  }, [theme]);
  useEffect(() => {
    const onVisibility = () => setAwake(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
  useEffect(() => {
    if (!active) {
      targetX.jump(0);
      targetY.jump(0);
      lid.jump(1);
      rollTarget.jump(0);
      pupilTarget.jump(1);
      return;
    }
    let lastActivity = performance.now(),
      idleStep = 0;
    let reactionTimer: ReturnType<typeof setTimeout>;
    let blinking: ReturnType<typeof animate> | undefined;
    const fine = matchMedia('(pointer: fine)');
    const blink = (slow = false) => {
      blinking?.stop();
      blinking = animate(lid, [1, 0.03, 1], { duration: slow ? 0.42 : 0.21, times: [0, 0.4, 1] });
    };
    const lookAt = (clientX: number, clientY: number) => {
      const box = ref.current?.getBoundingClientRect();
      if (!box) return;
      const offset = pointerOffset(
        clientX - box.left - box.width / 2,
        clientY - box.top - box.height / 2,
      );
      targetX.set(offset.x);
      targetY.set(offset.y);
      rollTarget.set((offset.x / GAZE_LIMIT) * (curious ? 5.7 : 1.9));
    };
    const move = (event: PointerEvent) => {
      if (!fine.matches || event.pointerType === 'touch') return;
      lastActivity = performance.now();
      lookAt(event.clientX, event.clientY);
    };
    const restore = () => {
      pupilTarget.set(1);
      rollTarget.set(0);
    };
    const delight = () => {
      clearTimeout(reactionTimer);
      lastActivity = performance.now();
      pupilTarget.set(curious ? 1.3 : 0.75);
      rollTarget.set(curious ? -13 : 5);
      blink(!curious);
      reactionTimer = setTimeout(restore, 1100);
    };
    clickRef.current = delight;
    const attention = (event: Event) => {
      const target =
        event.target instanceof Element ? event.target.closest('a,button,input') : null;
      if (!target || ref.current?.contains(target)) return;
      lastActivity = performance.now();
      const box = target.getBoundingClientRect();
      lookAt(box.left + box.width / 2, box.top + box.height / 2);
      pupilTarget.set(curious ? 1.14 : 0.88);
      clearTimeout(reactionTimer);
      reactionTimer = setTimeout(() => pupilTarget.set(1), 600);
    };
    const scroll = () => {
      targetY.set(curious ? -9 : -4);
      lastActivity = performance.now();
    };
    const idle = setInterval(
      () => {
        if (performance.now() - lastActivity < 2400) return;
        idleStep++;
        const positions = curious
          ? [
              [-22, -10],
              [26, 5],
              [0, -18],
              [0, 0],
            ]
          : [
              [-12, 2],
              [14, -5],
              [0, 0],
            ];
        const [dx, dy] = positions[idleStep % positions.length];
        targetX.set(dx);
        targetY.set(dy);
        rollTarget.set(curious ? dx * 0.25 : dx * 0.08);
        pupilTarget.set(idleStep % 2 ? 1.08 : 0.95);
      },
      curious ? 1700 : 2600,
    );
    const blinkTimer = setInterval(() => blink(!curious), curious ? 4700 : 6300);
    const rest = () => {
      lastActivity = 0;
      targetX.set(0);
      targetY.set(0);
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('scroll', scroll, { passive: true });
    document.addEventListener('pointerover', attention, { passive: true });
    document.addEventListener('focusin', attention);
    document.addEventListener('pointerleave', rest);
    return () => {
      clearInterval(idle);
      clearInterval(blinkTimer);
      clearTimeout(reactionTimer);
      blinking?.stop();
      clickRef.current = () => {};
      window.removeEventListener('pointermove', move);
      window.removeEventListener('scroll', scroll);
      document.removeEventListener('pointerover', attention);
      document.removeEventListener('focusin', attention);
      document.removeEventListener('pointerleave', rest);
    };
  }, [active, curious, targetX, targetY, pupilTarget, lid, rollTarget]);
  useEffect(() => {
    if (!active || !switching) return;
    const sequence = animate(lid, [1, 0.02, 0.02, 1], { duration: 0.95, times: [0, 0.2, 0.58, 1] });
    const turn = animate(rollTarget, curious ? [0, -16, 5, 0] : [0, 8, -3, 0], { duration: 0.95 });
    return () => {
      sequence.stop();
      turn.stop();
    };
  }, [switching, curious, active, lid, rollTarget]);
  return {
    ref,
    x,
    y,
    pupilScale,
    lid,
    rotate,
    rotateX,
    rotateY,
    reduced,
    visible,
    active,
    reaction,
    react: () => {
      setReaction('delighted');
      clearTimeout(feedbackTimer.current);
      feedbackTimer.current = setTimeout(() => setReaction('observing'), 1100);
      clickRef.current();
    },
  };
}
