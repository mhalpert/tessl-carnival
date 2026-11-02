import { describe, expect, it } from 'vitest';
import {
  FLIGHT_TIME,
  RINGS_PER_ROUND,
  SWAY,
  bottleAt,
  createState,
  ringPosition,
  step,
  sway,
  toss,
  type RingTossState,
} from './game';

/** Throws a ring that lands exactly on (x, y), whatever the sway. */
function tossAt(state: RingTossState, x: number, y: number) {
  const offset = sway(state.time);
  toss(state, x - offset.x, y - offset.y);
}

function land(state: RingTossState) {
  step(state, FLIGHT_TIME);
}

describe('ring toss', () => {
  it('starts with a full set of rings, a grid of bottles and no score', () => {
    const state = createState();
    expect(state.ringsLeft).toBe(RINGS_PER_ROUND);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.bottles).toHaveLength(15);
    expect(state.bottles.every((b) => !b.ringed)).toBe(true);
  });

  it('uses one ring per throw', () => {
    const state = createState();
    expect(toss(state, 400, 200)).toBe(true);
    expect(state.ringsLeft).toBe(RINGS_PER_ROUND - 1);
    expect(state.rings).toHaveLength(1);
  });

  it('cannot throw once the rings run out', () => {
    const state = createState();
    state.ringsLeft = 0;
    expect(toss(state, 400, 200)).toBe(false);
    expect(state.rings).toHaveLength(0);
  });

  it('scores a ring that lands on a bottle neck', () => {
    const state = createState();
    const bottle = state.bottles[0];
    tossAt(state, bottle.x, bottle.y);
    land(state);
    expect(state.score).toBe(bottle.points);
    expect(bottle.ringed).toBe(true);
    expect(state.rings).toHaveLength(0);
  });

  it('scores nothing until the ring lands', () => {
    const state = createState();
    const bottle = state.bottles[0];
    tossAt(state, bottle.x, bottle.y);
    step(state, FLIGHT_TIME / 2);
    expect(state.score).toBe(0);
    expect(state.rings).toHaveLength(1);
  });

  it('scores nothing for a ring that misses every neck', () => {
    const state = createState();
    tossAt(state, 20, 450);
    land(state);
    expect(state.score).toBe(0);
    expect(state.misses).toHaveLength(1);
  });

  it('scores more for bottles further back', () => {
    const state = createState();
    const rows = [...new Set(state.bottles.map((b) => b.y))].sort((a, b) => a - b);
    const points = rows.map((y) => state.bottles.find((b) => b.y === y)!.points);
    expect(points).toEqual([30, 20, 10]);
  });

  it('lets each bottle take only one ring', () => {
    const state = createState();
    const bottle = state.bottles[5];
    tossAt(state, bottle.x, bottle.y);
    land(state);
    tossAt(state, bottle.x, bottle.y);
    land(state);
    expect(state.score).toBe(bottle.points);
    expect(bottleAt(state, bottle.x, bottle.y)).toBeUndefined();
  });

  it('keeps the sway within its limit', () => {
    for (let t = 0; t < 10; t += 0.1) {
      const { x, y } = sway(t);
      expect(Math.abs(x)).toBeLessThanOrEqual(SWAY);
      expect(Math.abs(y)).toBeLessThanOrEqual(SWAY);
    }
  });

  it('flies a ring from the thrower to where it lands', () => {
    const state = createState();
    tossAt(state, 300, 150);
    const ring = state.rings[0];
    expect(ringPosition(ring)).toEqual({ x: ring.fromX, y: ring.fromY });
    ring.age = FLIGHT_TIME;
    const end = ringPosition(ring);
    expect(end.x).toBeCloseTo(300);
    expect(end.y).toBeCloseTo(150);
  });

  it('ends the round once the last ring lands', () => {
    const state = createState();
    for (let i = 0; i < RINGS_PER_ROUND; i++) toss(state, 20, 450);
    expect(state.phase).toBe('playing');
    land(state);
    expect(state.phase).toBe('over');
    expect(toss(state, 400, 200)).toBe(false);
  });
});
