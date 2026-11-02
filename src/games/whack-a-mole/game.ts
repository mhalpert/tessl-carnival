import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const ROUND_SECONDS = 30;
export const POINTS_PER_MOLE = 10;
export const COLUMNS = 3;
export const ROWS = 3;
export const HOLE_RADIUS = 46;
/** How long a whacked mole shows its bonk before it drops. */
const BONK_SECONDS = 0.3;
const GRID = { left: 200, top: 120, columnGap: 200, rowGap: 120 } as const;

export interface Hole {
  x: number;
  y: number;
  /** Seconds the mole stays up; 0 when the hole is empty. */
  up: number;
  /** Seconds left on the bonk after a whack; 0 when not whacked. */
  bonk: number;
}

export interface WhackAMoleState {
  holes: Hole[];
  /** Seconds since the round started. */
  elapsed: number;
  /** Seconds until the next mole pops up. */
  nextPop: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): WhackAMoleState {
  const holes = Array.from({ length: ROWS * COLUMNS }, (_, i) => ({
    x: GRID.left + (i % COLUMNS) * GRID.columnGap,
    y: GRID.top + Math.floor(i / COLUMNS) * GRID.rowGap,
    up: 0,
    bonk: 0,
  }));
  return { holes, elapsed: 0, nextPop: popInterval(0), score: 0, phase: 'playing' };
}

/** How far through the round we are, from 0 at the start to 1 at the end. */
function progress(elapsed: number): number {
  return Math.min(Math.max(elapsed / ROUND_SECONDS, 0), 1);
}

/** Seconds between moles: 1 at the start of the round, 0.4 at the end. */
export function popInterval(elapsed: number): number {
  return 1 - 0.6 * progress(elapsed);
}

/** Seconds a mole stays up: 1.2 at the start of the round, 0.6 at the end. */
export function upTime(elapsed: number): number {
  return 1.2 - 0.6 * progress(elapsed);
}

export function timeLeft(state: WhackAMoleState): number {
  return Math.max(ROUND_SECONDS - state.elapsed, 0);
}

export function isMoleUp(hole: Hole): boolean {
  return hole.up > 0 && hole.bonk === 0;
}

/** Pops a mole up from a random empty hole. Returns false if every hole is busy. */
export function popMole(state: WhackAMoleState, random: () => number = Math.random): boolean {
  const empty = state.holes.filter((h) => h.up === 0 && h.bonk === 0);
  if (empty.length === 0) return false;
  const hole = empty[Math.min(Math.floor(random() * empty.length), empty.length - 1)];
  hole.up = upTime(state.elapsed);
  return true;
}

/** Whacks at a point on the canvas. Returns true if it hit a mole that was up. */
export function whack(state: WhackAMoleState, x: number, y: number): boolean {
  if (state.phase !== 'playing') return false;
  const hole = state.holes.find((h) => isMoleUp(h) && Math.hypot(x - h.x, y - h.y) <= HOLE_RADIUS);
  if (!hole) return false;
  hole.bonk = BONK_SECONDS;
  state.score += POINTS_PER_MOLE;
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: WhackAMoleState, dt: number, random: () => number = Math.random): void {
  if (state.phase !== 'playing') return;
  state.elapsed += dt;

  for (const hole of state.holes) {
    if (hole.bonk > 0) {
      hole.bonk = Math.max(hole.bonk - dt, 0);
      if (hole.bonk === 0) hole.up = 0;
    } else if (hole.up > 0) {
      hole.up = Math.max(hole.up - dt, 0);
    }
  }

  if (state.elapsed >= ROUND_SECONDS) {
    state.phase = 'over';
    for (const hole of state.holes) {
      hole.up = 0;
      hole.bonk = 0;
    }
    return;
  }

  state.nextPop -= dt;
  while (state.nextPop <= 0) {
    popMole(state, random);
    state.nextPop += popInterval(state.elapsed);
  }
}

function draw(ctx: CanvasRenderingContext2D, state: WhackAMoleState) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  for (const hole of state.holes) {
    // The hole.
    ctx.fillStyle = colors.surface;
    ctx.beginPath();
    ctx.ellipse(hole.x, hole.y + 20, HOLE_RADIUS, HOLE_RADIUS * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (hole.up > 0) {
      // The mole, with a squashed head once it's been whacked.
      const squash = hole.bonk > 0 ? 0.6 : 1;
      ctx.fillStyle = colors.wood;
      ctx.beginPath();
      ctx.ellipse(hole.x, hole.y, 30, 34 * squash, 0, Math.PI, 0);
      ctx.fillRect(hole.x - 30, hole.y, 60, 20);
      ctx.fill();
      ctx.fillStyle = hole.bonk > 0 ? colors.danger : colors.text;
      ctx.beginPath();
      ctx.arc(hole.x - 10, hole.y - 12 * squash, 4, 0, Math.PI * 2);
      ctx.arc(hole.x + 10, hole.y - 12 * squash, 4, 0, Math.PI * 2);
      ctx.fill();
      if (hole.bonk > 0) {
        ctx.strokeStyle = colors.accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(hole.x, hole.y - 20, 40, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
      }
    }

    // The front lip of the hole, so the mole looks like it rises out of it.
    ctx.fillStyle = colors.wood;
    ctx.fillRect(hole.x - HOLE_RADIUS - 6, hole.y + 20, HOLE_RADIUS * 2 + 12, 10);
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Time ${Math.ceil(timeLeft(state))}s`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Time's up! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const whackAMole: CarnivalGame = {
  id: 'whack-a-mole',
  name: 'Whack-a-Mole',
  description: 'Whack the moles before they duck back down. They get quicker as the clock runs.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;

    const onDown = (event: PointerEvent) => {
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
        return;
      }
      const rect = canvas.getBoundingClientRect();
      whack(
        state,
        ((event.clientX - rect.left) / rect.width) * WIDTH,
        ((event.clientY - rect.top) / rect.height) * HEIGHT,
      );
    };
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't skip the round.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(whackAMole.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default whackAMole;
