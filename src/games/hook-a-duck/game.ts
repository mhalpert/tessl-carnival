import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const CASTS = 8;
export const DUCK_RADIUS = 22;
/** Pixels per second the hook moves, down and back up. */
export const HOOK_SPEED = 600;
/** Where the hook hangs from the rod between casts. */
export const ROD_Y = 60;
/** The stream is an oval loop the ducks float round. */
export const STREAM = { x: WIDTH / 2, y: 290, rx: 300, ry: 130 } as const;
/** Radians per second; the whole stream turns at the same speed. */
export const DRIFT = 0.45;
/** The numbers on the ducks' bases, one per duck, round the loop. */
export const DUCK_VALUES = [5, 10, 5, 25, 5, 10, 5, 50, 5, 10] as const;

export interface Duck {
  /** Where the duck is round the loop, in radians. */
  angle: number;
  value: number;
  hooked: boolean;
}

export interface Hook {
  x: number;
  y: number;
  /** How far down this cast goes. */
  depth: number;
  phase: 'ready' | 'lowering' | 'raising';
}

export interface HookADuckState {
  ducks: Duck[];
  hook: Hook;
  casts: number;
  score: number;
  /** The last duck caught, for the label beside the score. */
  lastCatch: number | null;
  phase: 'playing' | 'over';
}

export function createState(): HookADuckState {
  const ducks = DUCK_VALUES.map((value, i) => ({
    angle: (Math.PI * 2 * i) / DUCK_VALUES.length,
    value,
    hooked: false,
  }));
  return {
    ducks,
    hook: { x: WIDTH / 2, y: ROD_Y, depth: ROD_Y, phase: 'ready' },
    casts: CASTS,
    score: 0,
    lastCatch: null,
    phase: 'playing',
  };
}

export function duckPosition(duck: Duck): { x: number; y: number } {
  return {
    x: STREAM.x + STREAM.rx * Math.cos(duck.angle),
    y: STREAM.y + STREAM.ry * Math.sin(duck.angle),
  };
}

export function isCaught(hook: { x: number; y: number }, duck: Duck): boolean {
  const { x, y } = duckPosition(duck);
  return Math.hypot(hook.x - x, hook.y - y) <= DUCK_RADIUS;
}

/** Lowers the hook towards the aim point. Returns false if the hook can't go. */
export function cast(state: HookADuckState, aimX: number, aimY: number): boolean {
  if (state.phase !== 'playing' || state.casts === 0 || state.hook.phase !== 'ready') return false;
  const bottom = STREAM.y + STREAM.ry + DUCK_RADIUS;
  state.hook.x = Math.min(Math.max(aimX, 0), WIDTH);
  state.hook.depth = Math.min(Math.max(aimY, ROD_Y), bottom);
  state.hook.phase = 'lowering';
  state.casts -= 1;
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: HookADuckState, dt: number): void {
  for (const duck of state.ducks) {
    if (!duck.hooked) duck.angle = (duck.angle + DRIFT * dt) % (Math.PI * 2);
  }

  const { hook } = state;
  if (hook.phase === 'lowering') {
    hook.y = Math.min(hook.y + HOOK_SPEED * dt, hook.depth);
    if (hook.y >= hook.depth) {
      const duck = state.ducks.find((d) => isCaught(hook, d));
      if (duck) {
        duck.hooked = true;
        state.score += duck.value;
        state.lastCatch = duck.value;
      }
      hook.phase = 'raising';
    }
  } else if (hook.phase === 'raising') {
    hook.y = Math.max(hook.y - HOOK_SPEED * dt, ROD_Y);
    if (hook.y <= ROD_Y) {
      hook.phase = 'ready';
      // The caught duck goes back in the stream where it was hooked.
      for (const duck of state.ducks) duck.hooked = false;
    }
  }

  if (state.casts === 0 && hook.phase === 'ready') state.phase = 'over';
}

function drawDuck(ctx: CanvasRenderingContext2D, x: number, y: number, value: number | null) {
  const { colors } = theme;
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.ellipse(x, y, DUCK_RADIUS, DUCK_RADIUS * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + DUCK_RADIUS * 0.55, y - DUCK_RADIUS * 0.7, DUCK_RADIUS * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.stripeA;
  ctx.beginPath();
  ctx.moveTo(x + DUCK_RADIUS * 0.95, y - DUCK_RADIUS * 0.8);
  ctx.lineTo(x + DUCK_RADIUS * 1.35, y - DUCK_RADIUS * 0.6);
  ctx.lineTo(x + DUCK_RADIUS * 0.95, y - DUCK_RADIUS * 0.5);
  ctx.fill();
  ctx.fillStyle = colors.background;
  ctx.beginPath();
  ctx.arc(x + DUCK_RADIUS * 0.65, y - DUCK_RADIUS * 0.85, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // A hooked duck shows the number on its base.
  if (value !== null) {
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body', 'bold');
    ctx.textAlign = 'center';
    ctx.fillText(String(value), x, y + DUCK_RADIUS + 20);
  }
}

function draw(ctx: CanvasRenderingContext2D, state: HookADuckState, aim: { x: number; y: number }) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // The stream, round a wooden island.
  ctx.strokeStyle = colors.wood;
  ctx.lineWidth = DUCK_RADIUS * 3 + 12;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx, STREAM.ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = colors.water;
  ctx.lineWidth = DUCK_RADIUS * 3;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx, STREAM.ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  const { hook } = state;
  const hookX = hook.phase === 'ready' ? Math.min(Math.max(aim.x, 0), WIDTH) : hook.x;

  for (const duck of state.ducks) {
    if (duck.hooked) continue;
    const { x, y } = duckPosition(duck);
    drawDuck(ctx, x, y, null);
  }

  // Rod along the top, line down to the hook.
  ctx.fillStyle = colors.wood;
  ctx.fillRect(0, ROD_Y - 14, hookX + 4, 8);
  ctx.strokeStyle = colors.muted;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hookX, ROD_Y - 6);
  ctx.lineTo(hookX, hook.y);
  ctx.stroke();
  ctx.strokeStyle = colors.text;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(hookX - 6, hook.y, 6, 0, Math.PI);
  ctx.stroke();

  const hooked = state.ducks.find((d) => d.hooked);
  if (hooked) drawDuck(ctx, hookX, hook.y + DUCK_RADIUS, hooked.value);

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Casts ${state.casts}/${CASTS}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of casts! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const hookADuck: CarnivalGame = {
  id: 'hook-a-duck',
  name: 'Hook a Duck',
  description: 'Lower your hook onto the passing ducks. The number on each duck is its score.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: STREAM.y };

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
        cast(state, aim.x, aim.y);
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
        recordScore(hookADuck.id, state.score);
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

export default hookADuck;
