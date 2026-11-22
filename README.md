# best-heist-game-20261122-0559

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/xavier015869/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/xavier015869/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

Midnight Vault — an original top-down stealth heist game. Plan the job on the blueprint, spend 6 prep points on tools, pick an entry point, then slip past 3 patrolling guards, 3 sweeping cameras and 4 timed laser beams, crack the vault's 3-tumbler timing dial, grab the diamond and 13 more loot items, and escape to the getaway van before the 45-second lockdown seals the bank.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network — the game is static files under game/ and all sound is synthesized with WebAudio.

## How it plays

- **Planning screen** — the bank blueprint with guard patrol loops, camera cones, lasers and loot. Spend 6 prep points on a lockpick kit, EMP charges, smoke pellets, soft soles and a duffel bag; pick one of 3 entries (front doors, office window, roof vent).
- **The bank** — offices, lobby, corridor, gallery, laser airlock, vault, counting room, staff room and the street with the getaway van.
- **Stealth systems** — one ALARM meter fed by guard vision cones, camera cones, running noise and laser trips. Shadow cover halves detection. At 100% the bank locks down: a 45-second escape countdown while every guard hunts you.
- **The vault** — a 3-tumbler timing-dial mini-game, cracked standing exposed by the lasers. Misses cost suspicion. No keycard? A slow, noisy lockpick opens the door instead.
- **Scoring** — loot × stealth multiplier (ghost ×1.5) + diamond bonus + speed bonus, with 8 ending titles from The Midnight Phantom to Caught Red-Handed.

## Controls

WASD / arrows move · Shift run (loud) · E pick up / interact · Space lock a vault tumbler · 1 lockpick · 2 EMP · 3 smoke · M mute · Esc step back from the dial.

## Files

- `game/` — the game (static, no build step): `index.html`, `css/style.css`, `src/` (one job per file: `config`, `level`, `guards`, `security`, `player`, `vault`, `render`, `audio`, `input`, `shots`, `game`, `main`).
- `screenshots/` — 4 captures of the game running (planning, the gallery crossing, the vault crack, the lockdown escape).
- `main.ts` — entrypoint: copies `game/` and `screenshots/` to `MAKEFUN_OUTPUT_DIR` and writes `dossier.json` via `vendor/makefun-game.ts`.
- `serve.ts` — serves `game/` locally for playtesting.

---

<sub>Entered on [make.fun](https://make.fun/?ref=9d3wsaqp&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
