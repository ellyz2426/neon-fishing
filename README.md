# Neon Fishing VR

A holodeck-style VR fishing simulator built with [IWSDK](https://iwsdk.dev) 0.4.1.

**[Play Now](https://ellyz2426.github.io/neon-fishing/)**

## Features

- **Cast → Wait → Bite → Hook → Fight → Catch** — Full fishing loop with physics-based tension
- **15 Fish Species** — Common to Legendary, with depth-based rarity system
- **6 Game Modes** — Free Fish, Time Attack, Trophy Hunt, Tournament, Daily Challenge, Zen
- **Weather System** — 6 dynamic conditions (Clear, Neon Rain, Data Fog, Ion Storm, Solar Wind, Neon Aurora) that affect gameplay
- **Tackle Box** — 6 bait types with strategic depth and rarity bonuses
- **5 Fishing Rods** — Level-gated equipment with unique stats
- **45 Achievements** — Weather, bait, session, weight, and combo milestones
- **Fish Codex** — Collect and catalog all 15 species
- **Career Stats** — Lifetime tracking of catches, records, and progress
- **Tutorial System** — 4-step guided intro for new players
- **XP/Level System** — 50 levels of progression
- **5 Themed Arenas** — Neon Lagoon, Crimson Depths, Toxic Swamp, Void Abyss, Solar Reef
- **Procedural Audio** — 20+ SFX, ambient drone, dynamic soundtrack
- **Visual Effects** — Rain particles, fish jump animation, cast trajectory arc, splash/ripple particles

## Controls

### VR (XR Controllers)
- **Trigger** — Cast (hold to charge) / Hook / Reel
- **B Button** — Pause

### Browser (Keyboard)
- **Space** — Cast (hold to charge) / Hook / Reel
- **Escape** — Pause
- **WASD** — Move

## Tech

- Built with [IWSDK](https://iwsdk.dev) 0.4.1 (dual-runtime: VR + browser)
- **20 PanelUI templates** (`.uikitml`) — zero HTML DOM overlays
- All UI renders spatially in XR via IWSDK's built-in PanelUI system
- Procedural Web Audio API (no audio file dependencies)
- localStorage persistence for all progress

## Development

```bash
npm install
npm run dev
```

## License

MIT
