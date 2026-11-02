import { describe, expect, it } from 'vitest';
import {
  COLUMNS,
  POINTS_PER_MOLE,
  ROUND_SECONDS,
  ROWS,
  createState,
  isMoleUp,
  popInterval,
  popMole,
  step,
  timeLeft,
  upTime,
  whack,
} from './game';

const first = () => 0;

describe('whack-a-mole', () => {
  it('starts with empty holes, no score and the full clock', () => {
    const state = createState();
    expect(state.holes).toHaveLength(ROWS * COLUMNS);
    expect(state.holes.some(isMoleUp)).toBe(false);
    expect(state.score).toBe(0);
    expect(timeLeft(state)).toBe(ROUND_SECONDS);
    expect(state.phase).toBe('playing');
  });

  it('pops a mole up once the first interval passes', () => {
    const state = createState();
    step(state, popInterval(0), first);
    expect(state.holes.filter(isMoleUp)).toHaveLength(1);
  });

  it('drops a mole back down when its time is up', () => {
    const state = createState();
    popMole(state, first);
    step(state, upTime(0) + 0.01, () => 0.99);
    expect(isMoleUp(state.holes[0])).toBe(false);
  });

  it('scores a whack on a mole that is up', () => {
    const state = createState();
    popMole(state, first);
    const hole = state.holes[0];
    expect(whack(state, hole.x + 5, hole.y - 5)).toBe(true);
    expect(state.score).toBe(POINTS_PER_MOLE);
  });

  it('scores nothing for a miss, an empty hole or a mole already whacked', () => {
    const state = createState();
    expect(whack(state, state.holes[0].x, state.holes[0].y)).toBe(false);
    popMole(state, first);
    const hole = state.holes[0];
    expect(whack(state, hole.x + 150, hole.y)).toBe(false);
    whack(state, hole.x, hole.y);
    expect(whack(state, hole.x, hole.y)).toBe(false);
    expect(state.score).toBe(POINTS_PER_MOLE);
  });

  it('never pops a second mole from a busy hole', () => {
    const state = createState();
    for (let i = 0; i < state.holes.length; i++) expect(popMole(state, first)).toBe(true);
    expect(popMole(state, first)).toBe(false);
  });

  it('pops moles faster and for less time as the round goes on', () => {
    expect(popInterval(ROUND_SECONDS)).toBeLessThan(popInterval(0));
    expect(upTime(ROUND_SECONDS)).toBeLessThan(upTime(0));
  });

  it('ends the round when the clock runs out, and ignores whacks after', () => {
    const state = createState();
    popMole(state, first);
    let guard = 0;
    while (state.phase === 'playing' && guard++ < 10_000) step(state, 0.05);
    expect(state.phase).toBe('over');
    expect(timeLeft(state)).toBe(0);
    expect(state.holes.some(isMoleUp)).toBe(false);
    const score = state.score;
    expect(whack(state, state.holes[0].x, state.holes[0].y)).toBe(false);
    expect(state.score).toBe(score);
  });
});
