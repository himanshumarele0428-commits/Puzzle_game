# 🧩 Puzzle Quest

**Infinite stages await your genius** — A single-page web application featuring 9 unique puzzle types, each generating fresh challenges at runtime with scaling difficulty.

![Status](https://img.shields.io/badge/status-complete-brightgreen)
![Tech](https://img.shields.io/badge/tech-Vanilla%20JS-blue)
![Puzzles](https://img.shields.io/badge/puzzles-9-orange)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [How to Run](#how-to-run)
- [Puzzle Types](#puzzle-types)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Progress & Star System](#progress--star-system)

---

## Overview

**Puzzle Quest** is a browser-based collection of brain teasers with infinite, procedurally generated stages. Each of the 9 puzzle types generates unique puzzles at runtime — difficulty scales with the stage number. Players earn up to 3 stars per stage based on moves and time, with all progress persisted to `localStorage`.

The app has no backend, no dependencies, and no build step. Just pure HTML, CSS, and JavaScript.

---

## Tech Stack

| Layer     | Technology     |
|-----------|---------------|
| Structure | HTML5          |
| Styling   | CSS3 (custom properties, animations, responsive) |
| Logic     | Vanilla JavaScript (ES6+) |
| Storage   | Browser `localStorage` |
| Canvas    | HTML5 Canvas (confetti effect) |

**Zero dependencies.** No frameworks, no build tools, no `package.json`.

---

## Project Structure

```
Project32_PuzzleGames/
├── index.html          # Main HTML — all 5 screen layouts
├── css/
│   └── style.css       # Full styling — dark theme, animations
└── js/
    ├── puzzles.js      # 9 puzzle type definitions + generators
    └── app.js          # Game controller, progress, UI, confetti
```

---

## How to Run

1. Clone or download this repository.
2. Open `index.html` in any modern browser.
3. Click **Start Adventure** and choose a puzzle.

> No server, no `npm install`, no build step required. It's a fully self-contained static site.

---

## Puzzle Types

| # | Puzzle | Icon | Description | Difficulty Scaling |
|---|--------|------|-------------|-------------------|
| 0 | **Sliding Puzzle** | 🧩 | Arrange numbered tiles in order by sliding into the empty space | Grid grows: 3×3 → 4×4 → 5×5 |
| 1 | **Memory Match** | 🃏 | Flip cards to find matching pairs of emojis | Pairs increase: 5 → up to 12 |
| 2 | **Word Scramble** | 🔤 | Rearrange scrambled letters to form the correct word | Word length: 6 → up to 12 |
| 3 | **Number Sequence** | 🔢 | Find the missing number in a pattern | Arithmetic → Geometric → Exponential |
| 4 | **Math Grid** | ➗ | Fill cells so all rows and columns sum to a target | 3×3 → 4×4 magic squares |
| 5 | **Water Jug** | 💧 | Measure an exact amount of water using two jugs | Jug sizes and targets increase |
| 6 | **Cipher Crack** | 🔐 | Decode a Caesar cipher message | Word length: 6 → 10+ characters |
| 7 | **Light Switch Grid** | 💡 | Turn all lights ON — each click toggles a cell and its neighbors | Grid: 3×3 → 4×4 → 5×5 |
| 8 | **Logic Lock** | 🔓 | Set dials to the correct combination using logical clues | Dials: 2 → 6; Range: 3 → 9 |

Each puzzle type generates stages **at runtime** — a stage is only created once and cached in the `STAGE_REGISTRY`. Replaying the game clears the registry so fresh puzzles are generated.

---

## Key Features

### 🎮 Gameplay
- **9 distinct puzzle types** with unique mechanics
- **Infinite stages** — stage N+1 is always available after completing stage N
- **Scaling difficulty** — grids grow, word lengths increase, puzzles get harder
- **3-star rating** per stage based on moves/time thresholds
- **Hints** for every puzzle (💡 button)
- **Reset** to replay the current stage
- **Failure feedback** — shake animation, red flash, and toast message

### 📊 Progress System
- All progress saved to `localStorage`
- Per-puzzle-type tracking: highest stage reached, stars per stage
- Level select shows all 9 puzzle types with their stage cards
- Completed stages show star count and can be replayed
- Current stage is highlighted; locked stages are dimmed
- **Play Again** resets all progress

### 🎨 Visual Polish
- Dark space-themed UI with gold/orange gradient accents
- Smooth screen transitions (fade in/out)
- Confetti celebration on victory (Canvas-based)
- Star score popup animation
- Bounce, shake, pop-in, pulse, and fade-in-up animations
- Mobile responsive — adapts to small screens
- No scrolling; the app fills the viewport

---

## Architecture

### Screens (State Machine)

The app uses a simple screen-based navigation system managed by `showScreen()`:

1. **Intro Screen** — Landing page with "Start Adventure" button
2. **Level Select Screen** — Shows all 9 puzzle types with stage cards
3. **Game Screen** — Active puzzle with board, stats, and action buttons
4. **Victory Screen** — Star rating, time/moves stats, confetti
5. **Completion Screen** — All 27 puzzles solved (kept for replay flow)

### Core Objects

| Object | Purpose |
|--------|---------|
| `PUZZLE_TYPES[]` | Registry of 9 puzzle type definitions, each with `generateFn(stage)` |
| `STAGE_REGISTRY` | Cache for generated puzzle instances: `{ typeIdx: { stageNum: puzzle } }` |
| `app` | Main controller — manages screens, timer, moves, stars, progress, confetti |
| `app.progress` | Persistent progress object loaded from/saved to `localStorage` |

### Puzzle Instance API

Each puzzle instance exposes:
- `init()` — Initialize/reset puzzle state
- `render(boardEl)` — Render puzzle into the DOM element
- `cleanup()` — Tear down (for cleanup between stages)
- `hint` — String hint for the 💡 button
- `solved` — Boolean tracking completion state

---

## Progress Collection

Progress is stored in `localStorage` under the key `puzzlequest_progress`:

```js
{
  "0": {                              // Sliding Puzzle (type index)
    "highestStage": 3,                // Furthest stage reached
    "stars": 7,                       // Total stars earned
    "stages": {
      "1": { "stars": 3, "time": 45, "moves": 12 },
      "2": { "stars": 2, "time": 78, "moves": 25 },
      "3": { "stars": 2, "time": 120, "moves": 30 }
    }
  },
  // ... one entry per puzzle type (0-8)
}
```
