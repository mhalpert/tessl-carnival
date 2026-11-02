# Whack-a-Mole

Moles pop up from a grid of nine holes. Whack as many as you can before the
clock runs out.

## How to play

- Click a mole while it's up to whack it.
- Each mole stays up for a short time, then drops back down.
- Moles pop up faster, and stay up for less time, as the round goes on: one
  every second for 1.2 seconds at the start, and one every 0.4 seconds for 0.6
  seconds by the end.
- The round lasts 30 seconds.
- Click again on the game over screen to play another round.

## Scoring

Each mole you whack scores 10 points. Misses cost nothing.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `step`, `popMole`, `whack`,
  `popInterval`, `upTime`) and the `whackAMole` entry, the default export the
  midway finds.
- `game.test.ts`: tests for the game logic.
