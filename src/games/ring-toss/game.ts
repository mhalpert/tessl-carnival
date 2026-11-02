import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const RINGS_PER_ROUND = 10;
/** Seconds a ring spends in the air. */
export const FLIGHT_TIME = 0.6;
export const THROWER = { x: WIDTH / 2, y: HEIGHT - 40 } as const;
/** How far the aim sways from the pointer, in pixels. */
export const SWAY = 14;
/** Back row first. Bottles further back are smaller and score more. */
const ROWS = [
  { y: 140, neck: 9, points: 30 },
  { y: 210, neck: 12, points: 20 },
  { y: 280, neck: 15, points: 10 },
];
const BOTTLES_PER_ROW = 5;

export interface Bottle {
  x: number;
  y: number;
  /** How close to the neck a ring must land, in pixels. */
  neck: number;
  points: number;
  ringed: boolean;
}

export interface Ring {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Seconds since the ring was thrown. */
  age: number;
}

export interface Miss {
  x: number;
  y: number;
  age: number;
}

export interface RingTossState {
  bottles: Bottle[];
  rings: Ring[];
  misses: Miss[];
  ringsLeft: number;
  score: number;
  /** Seconds since the round started, which drives the sway. */
  time: number;
  phase: 'playing' | 'over';
}

export function createState(): RingTossState {
  const spacing = 90;
  const left = WIDTH / 2 - (spacing * (BOTTLES_PER_ROW - 1)) / 2;
  const bottles = ROWS.flatMap((row) =>
    Array.from({ length: BOTTLES_PER_ROW }, (_, i) => ({
      x: left + spacing * i,
      y: row.y,
      neck: row.neck,
      points: row.points,
      ringed: false,
    })),
  );
  return {
    bottles,
    rings: [],
    misses: [],
    ringsLeft: RINGS_PER_ROUND,
    score: 0,
    time: 0,
    phase: 'playing',
  };
}

/** The aim drifts in a slow loop around the pointer, so every throw takes timing. */
export function sway(time: number): { x: number; y: number } {
  return { x: Math.sin(time * 2.3) * SWAY, y: Math.sin(time * 3.1) * SWAY * 0.6 };
}

/** The bottle a ring landing at (x, y) goes over, if any. A ringed bottle takes no more rings. */
export function bottleAt(state: RingTossState, x: number, y: number): Bottle | undefined {
  return state.bottles.find((b) => !b.ringed && Math.hypot(x - b.x, y - b.y) <= b.neck);
}

/** Throws one ring towards the aim point, plus the sway. Returns false if nothing was thrown. */
export function toss(state: RingTossState, aimX: number, aimY: number): boolean {
  if (state.phase !== 'playing' || state.ringsLeft === 0) return false;
  const offset = sway(state.time);
  state.rings.push({
    fromX: THROWER.x,
    fromY: THROWER.y,
    toX: aimX + offset.x,
    toY: aimY + offset.y,
    age: 0,
  });
  state.ringsLeft -= 1;
  return true;
}

/** Where a ring is in its flight, with a little hop so it reads as a throw. */
export function ringPosition(ring: Ring): { x: number; y: number } {
  const t = Math.min(ring.age / FLIGHT_TIME, 1);
  return {
    x: ring.fromX + (ring.toX - ring.fromX) * t,
    y: ring.fromY + (ring.toY - ring.fromY) * t - Math.sin(t * Math.PI) * 80,
  };
}

/** Advances the game by `dt` seconds. */
export function step(state: RingTossState, dt: number): void {
  state.time += dt;

  for (const miss of state.misses) miss.age += dt;
  state.misses = state.misses.filter((m) => m.age < 0.5);

  const flying: Ring[] = [];
  for (const ring of state.rings) {
    ring.age += dt;
    if (ring.age < FLIGHT_TIME) {
      flying.push(ring);
      continue;
    }
    const bottle = bottleAt(state, ring.toX, ring.toY);
    if (bottle) {
      bottle.ringed = true;
      state.score += bottle.points;
    } else {
      state.misses.push({ x: ring.toX, y: ring.toY, age: 0 });
    }
  }
  state.rings = flying;

  if (state.ringsLeft === 0 && state.rings.length === 0) state.phase = 'over';
}

function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  ctx.beginPath();
  ctx.ellipse(x, y, radius, radius * 0.4, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function draw(ctx: CanvasRenderingContext2D, state: RingTossState, aim: { x: number; y: number }) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // Shelves under each row of bottles.
  for (const row of ROWS) {
    ctx.fillStyle = colors.wood;
    ctx.fillRect(160, row.y + 34, WIDTH - 320, 8);
  }

  for (const bottle of state.bottles) {
    const scale = bottle.neck / 15;
    ctx.fillStyle = colors.water;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(bottle.x - 14 * scale, bottle.y + 6, 28 * scale, 28);
    ctx.fillRect(bottle.x - 4 * scale, bottle.y - 10, 8 * scale, 18);
    ctx.globalAlpha = 1;
    ctx.fillStyle = colors.surface;
    ctx.fillRect(bottle.x - 5 * scale, bottle.y - 12, 10 * scale, 4);
    if (bottle.ringed) {
      ctx.strokeStyle = colors.stripeA;
      ctx.lineWidth = 4;
      drawRing(ctx, bottle.x, bottle.y + 4, bottle.neck + 4);
    }
  }

  ctx.strokeStyle = colors.danger;
  ctx.lineWidth = 3;
  for (const miss of state.misses) {
    ctx.globalAlpha = 1 - miss.age / 0.5;
    drawRing(ctx, miss.x, miss.y + miss.age * 40, 14);
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 4;
  for (const ring of state.rings) {
    const { x, y } = ringPosition(ring);
    drawRing(ctx, x, y, 18 - (ring.age / FLIGHT_TIME) * 4);
  }

  // Aim marker, swaying around the pointer.
  if (state.phase === 'playing' && state.ringsLeft > 0) {
    const offset = sway(state.time);
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(aim.x + offset.x, aim.y + offset.y, 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  // The thrower's hand, holding the next ring.
  ctx.fillStyle = colors.surface;
  ctx.beginPath();
  ctx.arc(THROWER.x, THROWER.y, 20, 0, Math.PI * 2);
  ctx.fill();
  if (state.ringsLeft > 0) {
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 4;
    drawRing(ctx, THROWER.x, THROWER.y - 6, 18);
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Rings ${state.ringsLeft}/${RINGS_PER_ROUND}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of rings! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const ringToss: CarnivalGame = {
  id: 'ring-toss',
  name: 'Ring Toss',
  description:
    'Land rings on the bottle necks before you run out. Bottles further back score more.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: HEIGHT / 2 };

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => Object.assign(aim, toCanvas(event));
    const onDown = (event: PointerEvent) => {
      Object.assign(aim, toCanvas(event));
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        toss(state, aim.x, aim.y);
      }
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(ringToss.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, aim);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default ringToss;
