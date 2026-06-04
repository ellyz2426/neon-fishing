# Neon Fishing VR

Holodeck VR fishing simulation built with IWSDK 0.4.1. Cast your energy rod into a neon holographic lake, detect bites, hook glowing wireframe fish, and reel them in with physics-based tension management. Collect species for your codex.

**[Play Now](https://ellyz2426.github.io/neon-fishing/)**

## Features

### Core Gameplay
- **Cast**: Hold trigger/spacebar to charge power, release to cast. Longer casts reach deeper waters with rarer fish
- **Wait**: Watch for shadow approaching your bobber — a fish is investigating
- **Hook**: React quickly when the bite happens — don't miss the window!
- **Fight**: Reel in while managing the tension bar. Too much tension snaps the line. Too little lets the fish escape. Release and re-reel to manage

### Fish Species (15 across 5 rarities)
- **Common** (4): Neon Minnow, Pulse Perch, Glow Guppy, Spark Bass — surface waters
- **Uncommon** (4): Prism Trout, Circuit Salmon, Volt Pike, Flux Carp — mid-depth
- **Rare** (3): Photon Marlin, Quantum Tuna, Plasma Eel — deep water
- **Epic** (2): Nebula Ray, Singularity Shark — the abyss
- **Legendary** (2): Cosmic Whale, Void Leviathan — max depth only

### Game Modes
1. **Free Fish** — Relaxed fishing, no time limit
2. **Time Attack** — Catch as many as possible in 60-120 seconds
3. **Trophy Hunt** — Hunt a specific rare+ species
4. **Tournament** — Best score in 5 catches
5. **Daily Challenge** — Same conditions for everyone each day
6. **Zen Mode** — No pressure, just vibes

### Fishing Rods (5)
- **Starter Rod** — Basic all-around rod
- **Speed Rod** — 50% faster reeling (Lv 5)
- **Power Rod** — Higher tension tolerance (Lv 10)
- **Lucky Rod** — +15% rare fish chance (Lv 15)
- **Master Rod** — Best balanced stats (Lv 25)

### Progression
- XP/Level system (50 levels)
- Rod unlocks at milestone levels
- Fish Codex collection (discover all 15 species)
- 29 achievements
- Personal best leaderboard

## Controls

### Browser
| Key | Action |
|-----|--------|
| Space (hold) | Charge cast power |
| Space (release) | Cast line |
| Space (tap) | Hook fish on bite |
| Space (hold) | Reel in during fight |
| ESC | Pause |
| R | Rematch (game over) |

### VR
| Input | Action |
|-------|--------|
| Right Trigger (hold/release) | Charge and cast |
| Right Trigger (tap) | Hook fish on bite |
| Right Trigger (hold) | Reel during fight |
| B Button | Pause |
| Laser Pointer | Menu interaction |

## Technical Details

- **Engine**: IWSDK 0.4.1
- **Runtime**: Dual VR + Browser (`xr: { offer: 'once' }`)
- **UI**: 16 PanelUI `.uikitml` templates (zero HTML DOM)
- **Audio**: 20+ procedural SFX + ambient synthwave drone
- **Environment**: Animated water surface, holodeck grid, neon dock, floating decorations
- **3 difficulty levels** affecting bite windows, fish behavior, and time limits
- **5 themes**: Neon Lagoon, Crimson Depths, Toxic Swamp, Void Abyss, Solar Reef

## Build & Deploy

```bash
npm install
npm run build        # Vite production build
npm run dev          # Development server
```

## Architecture

```
neon-fishing/
├── src/
│   └── index.ts         # Main game (1,535 lines)
├── ui/                  # 16 PanelUI templates
│   ├── title.uikitml
│   ├── modeselect.uikitml
│   ├── difficulty.uikitml
│   ├── hud.uikitml
│   ├── tension.uikitml
│   ├── catch.uikitml
│   ├── gameover.uikitml
│   ├── codex.uikitml
│   ├── leaderboard.uikitml
│   ├── achievements.uikitml
│   ├── settings.uikitml
│   ├── help.uikitml
│   ├── rods.uikitml
│   ├── pause.uikitml
│   ├── toast.uikitml
│   └── countdown.uikitml
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```
