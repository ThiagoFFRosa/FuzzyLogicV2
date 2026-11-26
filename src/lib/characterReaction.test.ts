import { expect, it } from 'vitest';
import { CharacterReaction } from './characterReaction';

it('acknowledges clicks, escalates within a burst and cools down after overload', () => {
  const reaction = new CharacterReaction(600, 1400);
  expect(reaction.press(0)).toBe('alerted');
  expect(reaction.press(100)).toBe('alerted');
  expect(reaction.press(200)).toBe('warning');
  expect(reaction.press(300)).toBe('warning');
  expect(reaction.press(400)).toBe('overload');
  expect(reaction.press(410)).toBeNull();
  expect(reaction.phase(1799)).toBe('overload');
  expect(reaction.phase(1800)).toBe('cooldown');
  expect(reaction.press(2000)).toBeNull();
  expect(reaction.press(5000)).toBe('alerted');
});

it('drops separated bursts and can hold a second turret at warning', () => {
  const reaction = new CharacterReaction(600, 1400);
  reaction.press(0);
  reaction.press(40);
  expect(reaction.press(3900)).toBe('alerted');
  for (let time = 4000; time <= 4500; time += 100) {
    expect(reaction.press(time, false)).not.toBe('overload');
  }
  expect(reaction.press(4600)).toBe('overload');
  reaction.reset();
  expect(reaction.phase(4601)).toBe('idle');
});
