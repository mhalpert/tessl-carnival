import { describe, expect, it } from 'vitest';
import {
  CASTS,
  DUCK_RADIUS,
  ROD_Y,
  cast,
  createState,
  duckPosition,
  isCaught,
  step,
  type Duck,
} from './game';

const duck: Duck = { angle: Math.PI / 2, value: 25, hooked: false };

/** Steps the game until the hook is back at the rod. */
function finishCast(state: ReturnType<typeof createState>) {
  for (let i = 0; i < 1000 && state.hook.phase !== 'ready'; i++) step(state, 0.01);
}

describe('hook a duck', () => {
  it('starts with every cast and no score', () => {
    const state = createState();
    expect(state.casts).toBe(CASTS);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.hook.phase).toBe('ready');
  });

  it('floats the ducks round the stream', () => {
    const state = createState();
    const before = duckPosition(state.ducks[0]);
    step(state, 0.5);
    expect(duckPosition(state.ducks[0])).not.toEqual(before);
  });

  it('uses one cast each time the hook goes down', () => {
    const state = createState();
    expect(cast(state, 400, 300)).toBe(true);
    expect(state.casts).toBe(CASTS - 1);
    expect(state.hook.phase).toBe('lowering');
  });

  it('cannot cast again while the hook is still out', () => {
    const state = createState();
    cast(state, 400, 300);
    expect(cast(state, 400, 300)).toBe(false);
    expect(state.casts).toBe(CASTS - 1);
  });

  it('scores the number on the duck it catches', () => {
    const state = createState();
    state.ducks = [{ ...duck }];
    const { x, y } = duckPosition(duck);
    cast(state, x, y);
    // Hold the duck still so the test is about the hook, not the drift.
    for (let i = 0; i < 1000 && state.hook.phase === 'lowering'; i++) {
      state.ducks[0].angle = duck.angle;
      step(state, 0.01);
    }
    expect(state.score).toBe(25);
    expect(state.lastCatch).toBe(25);
    expect(state.ducks[0].hooked).toBe(true);
    finishCast(state);
    expect(state.ducks[0].hooked).toBe(false);
  });

  it('scores nothing when the hook misses', () => {
    const state = createState();
    state.ducks = [{ ...duck }];
    cast(state, 400, ROD_Y + 10);
    finishCast(state);
    expect(state.score).toBe(0);
  });

  it('ends the round after the last cast comes back up', () => {
    const state = createState();
    state.casts = 1;
    cast(state, 400, 300);
    step(state, 0.01);
    expect(state.phase).toBe('playing');
    finishCast(state);
    expect(state.phase).toBe('over');
    expect(cast(state, 400, 300)).toBe(false);
  });

  it('catches a duck under the hook and misses one beside it', () => {
    const { x, y } = duckPosition(duck);
    expect(isCaught({ x: x + 5, y: y + 5 }, duck)).toBe(true);
    expect(isCaught({ x: x + DUCK_RADIUS * 2, y }, duck)).toBe(false);
  });
});
