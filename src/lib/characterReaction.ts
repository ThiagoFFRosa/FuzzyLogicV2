type ActiveReaction = 'alerted' | 'warning' | 'overload';
const BURST_MS = 3800;
const COOLDOWN_MS = 1800;

export class CharacterReaction {
  private started = -Infinity;
  private count = 0;
  private blockedUntil = -Infinity;
  private active: ActiveReaction = 'alerted';
  private changedAt = -Infinity;
  endsAt = -Infinity;

  constructor(
    private readonly noticeMs: number,
    private readonly overloadMs: number,
  ) {}

  press(now: number, canOverload = true): ActiveReaction | null {
    if (now < this.blockedUntil) return null;
    if (now - this.started >= BURST_MS) {
      this.started = now;
      this.count = 0;
    }
    this.count = Math.min(5, this.count + 1);
    this.active =
      this.count === 5 && canOverload ? 'overload' : this.count >= 3 ? 'warning' : 'alerted';
    this.changedAt = now;
    this.endsAt = now + (this.active === 'overload' ? this.overloadMs : this.noticeMs);
    if (this.active === 'overload') {
      this.count = 0;
      this.blockedUntil = this.endsAt + COOLDOWN_MS;
    }
    return this.active;
  }

  phase(now: number) {
    return now < this.endsAt ? this.active : now < this.blockedUntil ? 'cooldown' : 'idle';
  }

  age(now: number) {
    return now - this.changedAt;
  }

  reset() {
    this.started = this.changedAt = this.endsAt = this.blockedUntil = -Infinity;
    this.count = 0;
  }
}
