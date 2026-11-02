# Ring Toss

Land rings on the bottle necks before you run out of rings.

## How to play

- Fifteen bottles stand on three shelves at the back of the booth.
- Move the mouse to aim, and click to throw a ring. The aim marker sways around
  the pointer, so time your throw for when it sits on a neck.
- A ring flies for a moment, then lands where the marker was when you threw it.
- You have 10 rings. The round ends when the last ring lands.
- Click again on the game over screen to play another round.

## Scoring

A ring scores when it lands on a bottle's neck. Bottles further back have
narrower necks and score more:

| Shelf  | Points |
| ------ | ------ |
| Back   | 30     |
| Middle | 20     |
| Front  | 10     |

Each bottle takes one ring. A ring that lands on a bottle that already has one
scores nothing.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `toss`, `step`, `bottleAt`, `sway`,
  `ringPosition`) and the `ringToss` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
