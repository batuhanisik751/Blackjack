# Royal Casino

Two full casino games in plain HTML/CSS/JavaScript — no dependencies, no build step, no server required — sharing **one bankroll**. Win money at the blackjack table and bet it on pool, or hustle the pool shark to bankroll your card counting.

## Play

Open `index.html` for the casino lobby and pick a table, or jump straight into `blackjack/` or `pool/`. Installable as an app (PWA, works offline).

## ♠ Royal Blackjack

Play it, learn perfect strategy from it, practice card counting on it, or take on the roguelike run mode.

### The game

- Full table rules: double down, split (double after split), late surrender, insurance with dealer peek
- **Side bets** with real casino paytables: Perfect Pairs (to 25:1), 21+3 (to 100:1), Lucky Lucky (to 200:1), Buster (to 250:1)
- **Configurable table**: 1–8 decks, dealer hits/stands soft 17, 3:2 vs 6:5 blackjack, double-after-split, surrender, US peek vs European no-hole-card — with a live house-edge estimate
- Animated chip flights, 3D card flips, win streak "heater", hit-stop on blackjack, confetti, synthesized sound (Web Audio, zero asset files)
- Unlockable card backs and table felts earned through 26 achievements
- Bankroll persists between sessions; the house extends credit when you bust (it keeps count)

### Modes

- **Daily challenge** — one attempt per day, everyone worldwide plays the *same shuffle* (date-seeded). 15 hands, $1,000, final bankroll is your score; share an emoji result card
- **Run mode** — roguelike: start with $300, survive 8 escalating bankroll targets, pick a table-bending perk after each round (blackjack pays 2:1, free doubles, five-card Charlie…)
- **Free play** — the classic table, with your career stats, streaks, and bankroll graph

### The trainer

- **Coach mode** — every move graded live against basic strategy for the *current* rules, with corrections
- **Strategy chart** — generated from the engine for your exact rule set, your current hand highlighted
- **Accuracy heatmap** — see exactly which chart cells leak money
- **Card counting** — live Hi-Lo running/true count, pop-up count quizzes, 20-card speed drills, and Illustrious-18 count deviations integrated into the coach
- **Simulator** — a headless engine replays up to 500k rounds of perfect basic strategy to measure the real house edge for your rules

### Provably fair

Every shoe is shuffled from a random seed whose SHA-256 hash is committed while the shoe is live; the seed is revealed when the shoe retires, so any shuffle can be independently re-derived and verified (Menu → Fairness).

### Keyboard

`H` hit · `S` stand · `D` double · `P` split · `U` surrender · `Enter` deal · `R` rebet · `C` clear · `1–4` chips · `B` hint · `K` coach · `M` sound · `Esc` close panels


## 🎱 Royal Eight-Ball

Full-physics 8-ball pool against the house, with your shared wallet on the line.

- **Real physics**: elastic ball collisions, cushion rebounds, rolling friction, six-pocket capture with jaw shots — tuned substep simulation that keeps running even in background tabs
- **Real 8-ball rules**: break from the kitchen, open table, group assignment, wrong-ball and scratch fouls with ball-in-hand, and proper 8-ball win/loss conditions (early 8 or scratching on the 8 loses; potting it on a foul shot loses)
- **Three opponents**: Lounge Larry (pays 1:1), Pro Patricia (3:2) and The Shark (2:1) — ghost-ball aiming AI with path-clearance checks, cut-angle shot selection, safeties, and smart ball-in-hand placement
- **Betting**: stake $25–$500 a rack; winner takes the pot
- Aim with the mouse, hold to charge, release to shoot — with aim guide, ghost ball, target/deflection lines and a charging cue stick

## One wallet

Both games read and write the same persistent wallet (effective-balance convention: money in flight is refunded if you leave mid-hand or mid-rack). Pool winnings appear instantly at the blackjack table and vice versa. Best enjoyed one table at a time — simultaneous tabs sync on a best-effort basis.

## Project structure

```
index.html             casino lobby (game chooser, shared wallet)
manifest.json · sw.js · icon.svg   PWA for the whole casino
blackjack/             the card table (see structure below)
pool/
  index.html           table, HUD, overlays
  css/pool.css         styling
  js/wallet.js         shared-bankroll bridge
  js/physics.js        ball/cushion/pocket simulation
  js/ai.js             shot planning and difficulty tiers
  js/game.js           8-ball rules, rendering, input, betting
```

### Blackjack structure

```
blackjack/index.html   markup shell
css/styles.css     all styling
js/utils.js        helpers, seeded RNG (xmur3 + mulberry32)
js/dom.js          element references
js/audio.js        synthesized sound effects
js/cards.js        deck constants, card DOM builder
js/state.js        game state, shoe, hand math, persistence
js/sidebets.js     side-bet paytables and resolution
js/render.js       DOM rendering, buttons, charts
js/fx.js           card/chip animations, confetti, hit-stop
js/strategy.js     rules-aware basic-strategy engine + house edge
js/coach.js        decision grading and feedback
js/game.js         round flow: deal → actions → dealer → settle
js/daily.js        seeded daily challenge + share cards
js/achieve.js      achievements and cosmetic unlocks
js/trainer.js      strategy chart, heatmap, count quizzes, drills
js/sim.js          headless Monte Carlo simulator
js/fair.js         provably-fair commit/reveal
js/run.js          roguelike run mode and perks
js/main.js         event wiring and init
```

## License

[MIT](LICENSE)
