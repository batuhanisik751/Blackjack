# Royal Blackjack

A casino-style blackjack game in a single HTML file — no dependencies, no build step, no server required.

## Play

Open `index.html` in any modern browser.

## Features

- Chip-based betting ($5 / $25 / $100 / $500) with animated chip flights and payouts
- Full table rules: double down, split (incl. double after split), late surrender, insurance with dealer peek
- Blackjack pays 3:2 · dealer stands on all 17s · six-deck shoe with reshuffle
- Flashy card dealing and 3D flip animations, win banners, confetti on blackjack
- Synthesized sound effects (Web Audio, no asset files) with mute toggle
- Basic-strategy hint button ("what would the book do?")
- Session stats: win rate, streaks, biggest win, net P/L — plus a live Hi-Lo running/true count for aspiring card counters
- Bankroll persists between sessions; the house extends you a $1,000 credit line when you bust out (it keeps count)

## Keyboard shortcuts

`H` hit · `S` stand · `D` double · `P` split · `U` surrender · `Enter` deal · `R` rebet · `C` clear bet · `1–4` chips · `B` hint · `M` sound

## License

[MIT](LICENSE)
