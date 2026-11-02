# Hook a Duck

Rubber ducks float round a stream. Lower your hook onto one as it passes.

## How to play

- Move the mouse to line up the rod, and click to lower the hook to that spot.
- The hook catches a duck if it lands on one, then comes back up. You can't cast
  again until it is back at the rod.
- You have 8 casts. The game ends when the last cast has come back up.
- Click again on the game over screen to play another round.

## Scoring

Each duck has a number on its base, and catching it scores that number. A caught
duck shows its number, then goes back in the stream. There are ten ducks:

| Number | Ducks |
| ------ | ----- |
| 5      | 5     |
| 10     | 3     |
| 25     | 1     |
| 50     | 1     |

A miss scores nothing. Your final score is saved to the carnival's score board
when the game ends.

## Files

- `game.ts`: the game logic (`createState`, `cast`, `step`, `isCaught`,
  `duckPosition`) and the `hookADuck` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
