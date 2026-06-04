import {
  World, PanelUI, PanelDocument, UIKitDocument, Follower, FollowBehavior, ScreenSpace,
  Mesh, Group, BoxGeometry, SphereGeometry, CylinderGeometry, PlaneGeometry,
  ConeGeometry, TorusGeometry, RingGeometry, CircleGeometry,
  MeshStandardMaterial, MeshBasicMaterial, LineBasicMaterial,
  Color, Vector3, Quaternion, Euler,
  Fog, AmbientLight, PointLight, DirectionalLight, SpotLight,
  BufferGeometry, Float32BufferAttribute,
  EdgesGeometry, LineSegments, Line,
  AdditiveBlending, DoubleSide, FrontSide,
  InputComponent,
} from '@iwsdk/core';

// ─── Types & Constants ───────────────────────────────────────────

type GameState = 'title' | 'modeselect' | 'difficulty' | 'rods' | 'bait' | 'countdown' |
  'casting' | 'waiting' | 'biting' | 'fighting' | 'caught' | 'gameover' |
  'codex' | 'leaderboard' | 'achievements' | 'settings' | 'help' | 'pause' |
  'stats' | 'tutorial';

type GameMode = 'free' | 'timeattack' | 'trophy' | 'tournament' | 'daily' | 'zen';
type Difficulty = 'easy' | 'medium' | 'hard';
type WeatherType = 'clear' | 'rain' | 'fog' | 'storm' | 'wind' | 'aurora';

interface FishSpecies {
  name: string; rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  color: string; emissive: string; minWeight: number; maxWeight: number;
  points: number; fightStrength: number; fightDuration: number;
  biteWindow: number; depth: 'surface' | 'mid' | 'deep' | 'abyss';
}

interface Rod {
  name: string; reelSpeed: number; tensionMax: number; luckBonus: number;
  color: string; unlockLevel: number; cost: number;
}

interface CaughtFish {
  species: string; weight: number; points: number; timestamp: number;
}

interface Theme {
  name: string; water: string; grid: string; accent: string; fog: string;
  sky: string; glow: string; fish: string;
}

interface Achievement {
  id: string; name: string; desc: string; check: () => boolean;
}

// ─── Weather Data ────────────────────────────────────────────────

interface WeatherCondition {
  type: WeatherType; name: string; icon: string;
  effect: string; castMod: number; biteMod: number; rarityMod: number;
}

const WEATHER_CONDITIONS: WeatherCondition[] = [
  { type: 'clear', name: 'Clear Skies', icon: '*', effect: 'Standard conditions', castMod: 1.0, biteMod: 1.0, rarityMod: 0 },
  { type: 'rain', name: 'Neon Rain', icon: '~', effect: 'Fish more active (+bite speed)', castMod: 0.95, biteMod: 1.3, rarityMod: 0.05 },
  { type: 'fog', name: 'Data Fog', icon: '#', effect: 'Rare fish appear more often', castMod: 0.9, biteMod: 0.85, rarityMod: 0.15 },
  { type: 'storm', name: 'Ion Storm', icon: '!', effect: 'Legendary chances up, tension higher', castMod: 0.8, biteMod: 1.5, rarityMod: 0.25 },
  { type: 'wind', name: 'Solar Wind', icon: '>', effect: 'Cast distance varies wildly', castMod: 1.4, biteMod: 1.0, rarityMod: 0 },
  { type: 'aurora', name: 'Neon Aurora', icon: '~', effect: 'XP bonus +50%, peaceful', castMod: 1.0, biteMod: 0.9, rarityMod: 0.1 },
];

// ─── Bait Data ───────────────────────────────────────────────────

interface Bait {
  name: string; desc: string; depthBonus: string; rarityBonus: number;
  biteSpeedMod: number; color: string; unlockLevel: number; cost: number;
}

const BAITS: Bait[] = [
  { name: 'Standard Lure', desc: 'Basic all-purpose bait', depthBonus: 'none', rarityBonus: 0, biteSpeedMod: 1.0, color: '#aaaaaa', unlockLevel: 0, cost: 0 },
  { name: 'Glow Worm', desc: 'Attracts mid-depth fish faster', depthBonus: 'mid', rarityBonus: 0.05, biteSpeedMod: 1.2, color: '#44ff44', unlockLevel: 3, cost: 200 },
  { name: 'Pulse Shrimp', desc: 'Deep dwellers find it irresistible', depthBonus: 'deep', rarityBonus: 0.1, biteSpeedMod: 1.0, color: '#ff44aa', unlockLevel: 8, cost: 500 },
  { name: 'Void Squid', desc: 'Lures abyss creatures to the surface', depthBonus: 'abyss', rarityBonus: 0.15, biteSpeedMod: 0.8, color: '#aa44ff', unlockLevel: 12, cost: 1000 },
  { name: 'Chrome Minnow', desc: 'Rare species can\'t resist the shine', depthBonus: 'none', rarityBonus: 0.2, biteSpeedMod: 0.9, color: '#ffffff', unlockLevel: 18, cost: 2000 },
  { name: 'Quantum Bait', desc: 'Warps rarity tables in your favor', depthBonus: 'all', rarityBonus: 0.3, biteSpeedMod: 1.1, color: '#ffaa00', unlockLevel: 30, cost: 5000 },
];

// ─── Tutorial Steps ──────────────────────────────────────────────

interface TutorialStep {
  num: number; title: string; desc: string; input: string; triggerState: GameState;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  { num: 1, title: 'CAST YOUR LINE', desc: 'Hold to charge power, release to cast into the water', input: 'SPACE / TRIGGER', triggerState: 'casting' },
  { num: 2, title: 'WAIT FOR A BITE', desc: 'Watch the bobber - when it dips, a fish is nibbling!', input: 'PATIENCE...', triggerState: 'waiting' },
  { num: 3, title: 'HOOK THE FISH', desc: 'Press quickly when you see the bite indicator!', input: 'SPACE / TRIGGER', triggerState: 'biting' },
  { num: 4, title: 'REEL IT IN', desc: 'Hold to reel. Watch the tension bar - if it maxes out, the line snaps!', input: 'HOLD SPACE / TRIGGER', triggerState: 'fighting' },
];

// ─── Fish Species Data ───────────────────────────────────────────

const FISH_SPECIES: FishSpecies[] = [
  // Common
  { name: 'Neon Minnow', rarity: 'common', color: '#00ffff', emissive: '#004444', minWeight: 0.1, maxWeight: 0.5, points: 50, fightStrength: 0.2, fightDuration: 5, biteWindow: 2.0, depth: 'surface' },
  { name: 'Pulse Perch', rarity: 'common', color: '#44ff44', emissive: '#004400', minWeight: 0.3, maxWeight: 1.2, points: 75, fightStrength: 0.3, fightDuration: 7, biteWindow: 1.8, depth: 'surface' },
  { name: 'Glow Guppy', rarity: 'common', color: '#ffff00', emissive: '#444400', minWeight: 0.05, maxWeight: 0.3, points: 40, fightStrength: 0.1, fightDuration: 4, biteWindow: 2.2, depth: 'surface' },
  { name: 'Spark Bass', rarity: 'common', color: '#ff8800', emissive: '#442200', minWeight: 0.5, maxWeight: 2.0, points: 100, fightStrength: 0.4, fightDuration: 8, biteWindow: 1.6, depth: 'surface' },
  // Uncommon
  { name: 'Prism Trout', rarity: 'uncommon', color: '#ff00ff', emissive: '#440044', minWeight: 1.0, maxWeight: 3.0, points: 200, fightStrength: 0.5, fightDuration: 10, biteWindow: 1.4, depth: 'mid' },
  { name: 'Circuit Salmon', rarity: 'uncommon', color: '#ff4488', emissive: '#441122', minWeight: 1.5, maxWeight: 4.0, points: 250, fightStrength: 0.6, fightDuration: 12, biteWindow: 1.3, depth: 'mid' },
  { name: 'Volt Pike', rarity: 'uncommon', color: '#88ffff', emissive: '#224444', minWeight: 2.0, maxWeight: 5.0, points: 300, fightStrength: 0.7, fightDuration: 14, biteWindow: 1.2, depth: 'mid' },
  { name: 'Flux Carp', rarity: 'uncommon', color: '#aabb44', emissive: '#334411', minWeight: 1.0, maxWeight: 6.0, points: 200, fightStrength: 0.4, fightDuration: 10, biteWindow: 1.5, depth: 'mid' },
  // Rare
  { name: 'Photon Marlin', rarity: 'rare', color: '#4488ff', emissive: '#112244', minWeight: 5.0, maxWeight: 15.0, points: 500, fightStrength: 0.8, fightDuration: 18, biteWindow: 1.0, depth: 'deep' },
  { name: 'Quantum Tuna', rarity: 'rare', color: '#ff4444', emissive: '#441111', minWeight: 4.0, maxWeight: 12.0, points: 600, fightStrength: 0.85, fightDuration: 20, biteWindow: 0.9, depth: 'deep' },
  { name: 'Plasma Eel', rarity: 'rare', color: '#44ffaa', emissive: '#114422', minWeight: 2.0, maxWeight: 8.0, points: 550, fightStrength: 0.9, fightDuration: 15, biteWindow: 0.8, depth: 'deep' },
  // Epic
  { name: 'Nebula Ray', rarity: 'epic', color: '#aa44ff', emissive: '#220044', minWeight: 10.0, maxWeight: 25.0, points: 1000, fightStrength: 0.95, fightDuration: 25, biteWindow: 0.7, depth: 'abyss' },
  { name: 'Singularity Shark', rarity: 'epic', color: '#ff0044', emissive: '#440011', minWeight: 15.0, maxWeight: 40.0, points: 1500, fightStrength: 1.0, fightDuration: 30, biteWindow: 0.6, depth: 'abyss' },
  // Legendary
  { name: 'Cosmic Whale', rarity: 'legendary', color: '#ffaa00', emissive: '#443300', minWeight: 50.0, maxWeight: 100.0, points: 3000, fightStrength: 1.0, fightDuration: 40, biteWindow: 0.5, depth: 'abyss' },
  { name: 'Void Leviathan', rarity: 'legendary', color: '#ff00aa', emissive: '#440033', minWeight: 80.0, maxWeight: 150.0, points: 5000, fightStrength: 1.0, fightDuration: 50, biteWindow: 0.4, depth: 'abyss' },
];

const RODS: Rod[] = [
  { name: 'Starter Rod', reelSpeed: 1.0, tensionMax: 100, luckBonus: 0, color: '#00ffff', unlockLevel: 0, cost: 0 },
  { name: 'Speed Rod', reelSpeed: 1.5, tensionMax: 95, luckBonus: 0, color: '#44ff44', unlockLevel: 5, cost: 500 },
  { name: 'Power Rod', reelSpeed: 0.9, tensionMax: 130, luckBonus: 0, color: '#ff4444', unlockLevel: 10, cost: 1000 },
  { name: 'Lucky Rod', reelSpeed: 1.0, tensionMax: 100, luckBonus: 0.15, color: '#ffaa00', unlockLevel: 15, cost: 2000 },
  { name: 'Master Rod', reelSpeed: 1.3, tensionMax: 120, luckBonus: 0.1, color: '#ff00ff', unlockLevel: 25, cost: 5000 },
];

const THEMES: Theme[] = [
  { name: 'Neon Lagoon', water: '#001a33', grid: '#003355', accent: '#00ffff', fog: '#000a15', sky: '#000510', glow: '#00aaff', fish: '#00ffff' },
  { name: 'Crimson Depths', water: '#1a0000', grid: '#330000', accent: '#ff4444', fog: '#0a0000', sky: '#050000', glow: '#ff2222', fish: '#ff4444' },
  { name: 'Toxic Swamp', water: '#001a00', grid: '#003300', accent: '#44ff44', fog: '#000a00', sky: '#000500', glow: '#22ff22', fish: '#44ff44' },
  { name: 'Void Abyss', water: '#0a001a', grid: '#1a0033', accent: '#aa44ff', fog: '#050010', sky: '#020008', glow: '#8822ff', fish: '#aa44ff' },
  { name: 'Solar Reef', water: '#1a0a00', grid: '#331a00', accent: '#ffaa00', fog: '#0a0500', sky: '#050200', glow: '#ff8800', fish: '#ffaa00' },
];

const RARITY_COLORS: Record<string, string> = {
  common: '#aaaaaa', uncommon: '#44ff44', rare: '#4488ff', epic: '#aa44ff', legendary: '#ffaa00',
};

// ─── State Manager ───────────────────────────────────────────────

class GameStateManager {
  state: GameState = 'title';
  prevState: GameState = 'title';
  mode: GameMode = 'free';
  difficulty: Difficulty = 'medium';
  currentRod: number = 0;
  currentTheme: number = 0;
  score: number = 0;
  fishCaught: CaughtFish[] = [];
  sessionCaught: CaughtFish[] = [];
  castPower: number = 0;
  castCharging: boolean = false;
  lineDistance: number = 0;
  tension: number = 0;
  fishOnLine: FishSpecies | null = null;
  fishWeight: number = 0;
  fishDistance: number = 0;
  fishStamina: number = 100;
  fishFightTimer: number = 0;
  reeling: boolean = false;
  waitTimer: number = 0;
  biteTimer: number = 0;
  gameTimer: number = 0;
  gameTimeLimit: number = 0;
  combo: number = 0;
  bestCombo: number = 0;
  totalCasts: number = 0;
  lineSnaps: number = 0;
  escapes: number = 0;
  missedBites: number = 0;
  trophyTarget: string = '';
  trophyCaught: boolean = false;
  tournamentRound: number = 0;
  tournamentScores: number[] = [];
  countdownValue: number = 3;
  countdownTimer: number = 0;
  level: number = 1;
  xp: number = 0;
  totalPoints: number = 0;

  // Weather
  weather: WeatherType = 'clear';
  weatherTimer: number = 0;
  weatherCycleTime: number = 120; // seconds between changes

  // Bait
  currentBait: number = 0;

  // Tutorial
  tutorialComplete: boolean = false;
  tutorialStep: number = 0;

  // Persistence
  codex: Set<string> = new Set();
  bestScores: { score: number; mode: string; date: string }[] = [];
  achievements: Set<string> = new Set();
  stats = {
    gamesPlayed: 0, totalCaught: 0, totalWeight: 0, bestScore: 0,
    totalCasts: 0, totalLineSnaps: 0, totalEscapes: 0, bestCombo: 0,
    rarestCatch: '', heaviestCatch: 0, heaviestName: '', legendsCaught: 0,
    totalXP: 0, totalPlayTime: 0, dailyStreak: 0, lastDailyDate: '',
    totalFights: 0, perfectCatches: 0, weatherFished: new Set<string>() as any,
    baitUsed: new Set<string>() as any,
  };
  volumes = { master: 0.7, sfx: 0.8, music: 0.5 };

  constructor() { this.load(); }

  load() {
    try {
      const d = localStorage.getItem('neon-fishing-save');
      if (d) {
        const s = JSON.parse(d);
        if (s.codex) this.codex = new Set(s.codex);
        if (s.bestScores) this.bestScores = s.bestScores;
        if (s.achievements) this.achievements = new Set(s.achievements);
        if (s.stats) {
          Object.assign(this.stats, s.stats);
          if (s.stats.weatherFished) this.stats.weatherFished = new Set(s.stats.weatherFished);
          else this.stats.weatherFished = new Set();
          if (s.stats.baitUsed) this.stats.baitUsed = new Set(s.stats.baitUsed);
          else this.stats.baitUsed = new Set();
        }
        if (s.volumes) Object.assign(this.volumes, s.volumes);
        if (s.currentRod !== undefined) this.currentRod = s.currentRod;
        if (s.currentBait !== undefined) this.currentBait = s.currentBait;
        if (s.currentTheme !== undefined) this.currentTheme = s.currentTheme;
        if (s.level !== undefined) this.level = s.level;
        if (s.xp !== undefined) this.xp = s.xp;
        if (s.totalPoints !== undefined) this.totalPoints = s.totalPoints;
        if (s.tutorialComplete !== undefined) this.tutorialComplete = s.tutorialComplete;
      }
    } catch {}
  }

  save() {
    try {
      localStorage.setItem('neon-fishing-save', JSON.stringify({
        codex: [...this.codex], bestScores: this.bestScores.slice(0, 20),
        achievements: [...this.achievements], stats: {
          ...this.stats,
          weatherFished: [...(this.stats.weatherFished || [])],
          baitUsed: [...(this.stats.baitUsed || [])],
        },
        volumes: this.volumes, currentRod: this.currentRod,
        currentBait: this.currentBait,
        currentTheme: this.currentTheme, level: this.level,
        xp: this.xp, totalPoints: this.totalPoints,
        tutorialComplete: this.tutorialComplete,
      }));
    } catch {}
  }

  xpForLevel(lv: number): number { return 100 + lv * 50; }

  addXP(amount: number) {
    this.xp += amount;
    this.stats.totalXP += amount;
    while (this.xp >= this.xpForLevel(this.level) && this.level < 50) {
      this.xp -= this.xpForLevel(this.level);
      this.level++;
    }
  }

  resetSession() {
    this.score = 0; this.sessionCaught = []; this.combo = 0; this.bestCombo = 0;
    this.totalCasts = 0; this.lineSnaps = 0; this.escapes = 0; this.missedBites = 0;
    this.trophyCaught = false; this.tournamentRound = 0; this.tournamentScores = [];
  }
}

// ─── Audio Manager ───────────────────────────────────────────────

class AudioManager {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  sfxGain: GainNode | null = null;
  musicGain: GainNode | null = null;
  droneOscs: OscillatorNode[] = [];
  volumes = { master: 0.7, sfx: 0.8, music: 0.5 };

  init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volumes.master;
    this.masterGain.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.volumes.sfx;
    this.sfxGain.connect(this.masterGain);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.volumes.music;
    this.musicGain.connect(this.masterGain);
  }

  setVolumes(v: { master: number; sfx: number; music: number }) {
    this.volumes = v;
    if (this.masterGain) this.masterGain.gain.value = v.master;
    if (this.sfxGain) this.sfxGain.gain.value = v.sfx;
    if (this.musicGain) this.musicGain.gain.value = v.music;
  }

  private osc(type: OscillatorType, freq: number, dur: number, gain: number, dest?: AudioNode) {
    if (!this.ctx || !this.sfxGain) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq * (0.95 + Math.random() * 0.1);
    g.gain.setValueAtTime(gain, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g); g.connect(dest || this.sfxGain);
    o.start(); o.stop(this.ctx.currentTime + dur);
  }

  private noise(dur: number, gain: number, freq?: number) {
    if (!this.ctx || !this.sfxGain) return;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    if (freq) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 2;
      src.connect(f); f.connect(g);
    } else { src.connect(g); }
    g.connect(this.sfxGain);
    src.start(); src.stop(this.ctx.currentTime + dur);
  }

  castSwoosh() { this.noise(0.3, 0.15, 2000); this.osc('sawtooth', 300, 0.2, 0.08); }
  splash() { this.noise(0.5, 0.2, 800); this.osc('sine', 200, 0.3, 0.06); }
  bobberDip() { this.osc('sine', 400, 0.15, 0.1); this.osc('triangle', 300, 0.1, 0.06); }
  bite() { this.osc('square', 600, 0.1, 0.12); this.osc('sawtooth', 500, 0.15, 0.08); this.noise(0.1, 0.1, 1200); }
  hookSet() { this.osc('triangle', 800, 0.2, 0.15); this.osc('sine', 1000, 0.15, 0.1); }
  reelClick() { this.osc('square', 1200, 0.03, 0.04); }
  lineSnap() { this.noise(0.4, 0.2, 3000); this.osc('sawtooth', 150, 0.3, 0.1); }
  fishEscape() { this.osc('sawtooth', 300, 0.3, 0.08); this.osc('triangle', 200, 0.4, 0.06); }
  fishCaught() {
    [660, 880, 1100, 1320].forEach((f, i) =>
      setTimeout(() => this.osc('sine', f, 0.3, 0.12), i * 80));
  }
  rareCatch() {
    [440, 550, 660, 880, 1100].forEach((f, i) =>
      setTimeout(() => this.osc('triangle', f, 0.4, 0.15), i * 100));
  }
  tensionWarning() { this.osc('square', 180, 0.15, 0.08); }
  fishTug() { this.osc('sawtooth', 120, 0.2, 0.06); this.noise(0.15, 0.05, 400); }
  buttonClick() { this.osc('sine', 800, 0.05, 0.06); this.osc('sine', 1200, 0.04, 0.04); }
  countdownTick() { this.osc('sine', 880, 0.1, 0.1); }
  countdownGo() { this.osc('sine', 1320, 0.3, 0.15); this.osc('triangle', 1320, 0.2, 0.1); }
  gameStart() { [440, 550, 660, 880].forEach((f, i) => setTimeout(() => this.osc('triangle', f, 0.2, 0.1), i * 100)); }
  gameOver() { [660, 550, 440, 330].forEach((f, i) => setTimeout(() => this.osc('triangle', f, 0.3, 0.08), i * 120)); }
  achievement() { [660, 880, 1100, 1320, 1540].forEach((f, i) => setTimeout(() => this.osc('sine', f, 0.25, 0.1), i * 80)); }
  comboUp() { if (!this.ctx) return; this.osc('triangle', 660, 0.15, 0.08); this.osc('sine', 990, 0.12, 0.06); }
  chargeHum(power: number) { this.osc('sine', 100 + power * 3, 0.05, 0.03 + power * 0.001); }
  waterAmbient() { this.noise(0.8, 0.02, 300); }

  startDrone() {
    if (!this.ctx || !this.musicGain) return;
    const freqs = [55, 82.5, 110];
    const types: OscillatorType[] = ['sine', 'triangle', 'sine'];
    freqs.forEach((f, i) => {
      const o = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      const lp = this.ctx!.createBiquadFilter();
      o.type = types[i]; o.frequency.value = f;
      lp.type = 'lowpass'; lp.frequency.value = 300 + i * 100;
      g.gain.value = 0.08 - i * 0.02;
      o.connect(lp); lp.connect(g); g.connect(this.musicGain!);
      o.start(); this.droneOscs.push(o);
    });
    // LFO for shimmer
    const lfo = this.ctx.createOscillator();
    const lfoG = this.ctx.createGain();
    lfo.frequency.value = 0.15; lfoG.gain.value = 0.02;
    lfo.connect(lfoG);
    if (this.droneOscs[0]) lfoG.connect(this.droneOscs[0].frequency);
    lfo.start(); this.droneOscs.push(lfo);
  }

  stopDrone() {
    this.droneOscs.forEach(o => { try { o.stop(); } catch {} });
    this.droneOscs = [];
  }
}

// ─── Particle System ─────────────────────────────────────────────

interface Particle {
  mesh: Mesh; vx: number; vy: number; vz: number; life: number; maxLife: number;
}

class ParticleSystem {
  particles: Particle[] = [];
  pool: Particle[] = [];
  scene: any;
  maxParticles = 150;

  constructor(scene: any) { this.scene = scene; }

  private getParticle(color: string): Particle {
    let p = this.pool.pop();
    if (!p) {
      if (this.particles.length >= this.maxParticles) {
        p = this.particles.shift()!;
        p.mesh.visible = false;
      } else {
        const geo = new SphereGeometry(0.015, 4, 4);
        const mat = new MeshBasicMaterial({ color: new Color(color), transparent: true, blending: AdditiveBlending });
        const mesh = new Mesh(geo, mat);
        p = { mesh, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1 };
        this.scene.add(mesh);
      }
    }
    (p.mesh.material as MeshBasicMaterial).color.set(color);
    p.mesh.visible = true;
    return p;
  }

  burst(pos: Vector3, color: string, count: number, speed = 2) {
    for (let i = 0; i < count; i++) {
      const p = this.getParticle(color);
      p.mesh.position.copy(pos);
      const a = Math.random() * Math.PI * 2;
      const e = Math.random() * Math.PI - Math.PI / 2;
      const s = speed * (0.5 + Math.random() * 0.5);
      p.vx = Math.cos(a) * Math.cos(e) * s;
      p.vy = Math.sin(e) * s + 1;
      p.vz = Math.sin(a) * Math.cos(e) * s;
      p.life = 0.6 + Math.random() * 0.4;
      p.maxLife = p.life;
      this.particles.push(p);
    }
  }

  ripple(pos: Vector3, color: string) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const p = this.getParticle(color);
      p.mesh.position.copy(pos);
      p.vx = Math.cos(a) * 1.5;
      p.vy = 0.2;
      p.vz = Math.sin(a) * 1.5;
      p.life = 0.5;
      p.maxLife = 0.5;
      this.particles.push(p);
    }
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        this.pool.push(p);
        this.particles.splice(i, 1);
        continue;
      }
      p.vy -= 3 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      const t = p.life / p.maxLife;
      (p.mesh.material as MeshBasicMaterial).opacity = t;
      p.mesh.scale.setScalar(t);
    }
  }
}

// ─── Main Game ───────────────────────────────────────────────────

async function main() {
  const container = document.getElementById('app') as HTMLDivElement;
  const world = await World.create(container, {
    xr: { offer: 'once' },
    features: { grabbing: true, locomotion: { browserControls: true } as any, physics: false, spatialUI: true },
    render: { near: 0.01, far: 200 },
  } as any);

  const gsm = new GameStateManager();
  const audio = new AudioManager();
  const particles = new ParticleSystem(world.scene);
  const theme = () => THEMES[gsm.currentTheme];
  const rod = () => RODS[gsm.currentRod];

  // ─── Environment ─────────────────────────────────────────────

  function buildEnvironment() {
    const t = theme();
    world.scene.fog = new Fog(t.fog, 5, 40);
    world.scene.background = new Color(t.sky);

    // Ambient + directional light
    const ambient = new AmbientLight(0x222233, 0.4);
    world.scene.add(ambient);
    const dirLight = new DirectionalLight(0xffffff, 0.3);
    dirLight.position.set(5, 10, 5);
    world.scene.add(dirLight);

    // Water surface — large transparent plane
    const waterGeo = new PlaneGeometry(40, 40, 40, 40);
    const waterMat = new MeshStandardMaterial({
      color: new Color(t.water), transparent: true, opacity: 0.6,
      metalness: 0.3, roughness: 0.2, side: DoubleSide,
    });
    const waterMesh = new Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(0, 0, -10);
    world.scene.add(waterMesh);

    // Water grid lines
    const gridMat = new LineBasicMaterial({ color: new Color(t.grid), transparent: true, opacity: 0.3 });
    for (let i = -20; i <= 20; i += 2) {
      const pts1 = [new Vector3(i, 0.01, -30), new Vector3(i, 0.01, 10)];
      const pts2 = [new Vector3(-20, 0.01, i - 10), new Vector3(20, 0.01, i - 10)];
      const g1 = new BufferGeometry().setFromPoints(pts1);
      const g2 = new BufferGeometry().setFromPoints(pts2);
      world.scene.add(new Line(g1, gridMat));
      world.scene.add(new Line(g2, gridMat));
    }

    // Dock/pier
    const dockMat = new MeshStandardMaterial({ color: 0x333344, metalness: 0.5, roughness: 0.4 });
    const dockEdgeMat = new LineBasicMaterial({ color: new Color(t.accent), transparent: true, opacity: 0.6 });
    const dockGeo = new BoxGeometry(2, 0.15, 4);
    const dock = new Mesh(dockGeo, dockMat);
    dock.position.set(0, 0.5, 0);
    world.scene.add(dock);
    world.scene.add(new LineSegments(new EdgesGeometry(dockGeo), dockEdgeMat));
    (world.scene.children[world.scene.children.length - 1] as any).position.copy(dock.position);

    // Dock legs
    for (const [x, z] of [[-0.8, -1.5], [0.8, -1.5], [-0.8, 1.5], [0.8, 1.5]]) {
      const leg = new Mesh(new CylinderGeometry(0.05, 0.05, 1), dockMat);
      leg.position.set(x, 0, z);
      world.scene.add(leg);
    }

    // Dock railing
    for (const x of [-1, 1]) {
      const post = new Mesh(new CylinderGeometry(0.03, 0.03, 0.8), new MeshStandardMaterial({ color: new Color(t.accent), emissive: new Color(t.accent), emissiveIntensity: 0.3 }));
      post.position.set(x, 0.95, -1.8);
      world.scene.add(post);
    }

    // Accent lights over water
    const colors = [t.accent, t.glow, t.fish];
    colors.forEach((c, i) => {
      const light = new PointLight(new Color(c), 0.8, 15);
      light.position.set(-5 + i * 5, 3, -8);
      world.scene.add(light);
    });

    // Spotlight on fishing area
    const spot = new SpotLight(new Color(t.accent), 0.5, 20, Math.PI / 6);
    spot.position.set(0, 8, -5);
    spot.target.position.set(0, 0, -6);
    world.scene.add(spot);
    world.scene.add(spot.target);

    // Floating decorations
    const decoMat = new MeshBasicMaterial({ color: new Color(t.accent), wireframe: true, transparent: true, opacity: 0.15 });
    const decoTypes = [new TorusGeometry(0.5, 0.15, 8, 16), new BoxGeometry(0.6, 0.6, 0.6), new SphereGeometry(0.4, 8, 8), new ConeGeometry(0.4, 0.8, 6)];
    for (let i = 0; i < 14; i++) {
      const mesh = new Mesh(decoTypes[i % 4], decoMat);
      mesh.position.set((Math.random() - 0.5) * 30, 3 + Math.random() * 4, -5 + (Math.random() - 0.5) * 25);
      world.scene.add(mesh);
      decorations.push(mesh);
    }

    // Ambient floating particles
    const partMat = new MeshBasicMaterial({ color: new Color(t.accent), transparent: true, opacity: 0.4, blending: AdditiveBlending });
    for (let i = 0; i < 40; i++) {
      const dot = new Mesh(new SphereGeometry(0.02, 4, 4), partMat.clone());
      dot.position.set((Math.random() - 0.5) * 30, 0.5 + Math.random() * 6, -5 + (Math.random() - 0.5) * 25);
      world.scene.add(dot);
      ambientDots.push(dot);
    }

    return { waterMesh };
  }

  const decorations: Mesh[] = [];
  const ambientDots: Mesh[] = [];
  const env = buildEnvironment();

  // ─── Fishing Rod 3D ──────────────────────────────────────────

  const rodGroup = new Group();
  const rodPole = new Mesh(
    new CylinderGeometry(0.012, 0.006, 1.5, 8),
    new MeshStandardMaterial({ color: new Color(rod().color), emissive: new Color(rod().color), emissiveIntensity: 0.3, metalness: 0.6, roughness: 0.3 })
  );
  rodPole.rotation.x = -Math.PI / 4;
  rodGroup.add(rodPole);
  const rodTip = new Mesh(
    new SphereGeometry(0.015, 8, 8),
    new MeshBasicMaterial({ color: new Color(rod().color), transparent: true, blending: AdditiveBlending, opacity: 0.8 })
  );
  rodTip.position.set(0, 0.5, -0.5);
  rodGroup.add(rodTip);
  rodGroup.position.set(0.3, 0.9, -0.5);
  rodGroup.visible = false;
  world.scene.add(rodGroup);

  // Fishing line
  const lineGeo = new BufferGeometry();
  const linePositions = new Float32Array(6);
  lineGeo.setAttribute('position', new Float32BufferAttribute(linePositions, 3));
  const lineMesh = new Line(lineGeo, new LineBasicMaterial({ color: new Color(theme().accent), transparent: true, opacity: 0.8 }));
  lineMesh.visible = false;
  world.scene.add(lineMesh);

  // Bobber
  const bobberGroup = new Group();
  const bobberBody = new Mesh(new SphereGeometry(0.04, 8, 8),
    new MeshStandardMaterial({ color: 0xff4444, emissive: 0xff2222, emissiveIntensity: 0.5 }));
  bobberGroup.add(bobberBody);
  const bobberTop = new Mesh(new CylinderGeometry(0.005, 0.005, 0.06),
    new MeshBasicMaterial({ color: new Color(theme().accent) }));
  bobberTop.position.y = 0.05;
  bobberGroup.add(bobberTop);
  bobberGroup.visible = false;
  world.scene.add(bobberGroup);

  // Fish mesh (reused)
  const fishGroup = new Group();
  const fishBody = new Mesh(new SphereGeometry(0.15, 8, 6),
    new MeshStandardMaterial({ color: 0x00ffff, emissive: 0x004444, emissiveIntensity: 0.5, wireframe: true }));
  fishBody.scale.set(1.8, 1, 1);
  fishGroup.add(fishBody);
  const fishTail = new Mesh(new ConeGeometry(0.1, 0.15, 4),
    new MeshBasicMaterial({ color: 0x00ffff, wireframe: true, transparent: true, opacity: 0.6 }));
  fishTail.rotation.z = Math.PI / 2;
  fishTail.position.set(-0.25, 0, 0);
  fishGroup.add(fishTail);
  const fishGlow = new Mesh(new SphereGeometry(0.25, 8, 8),
    new MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.15, blending: AdditiveBlending }));
  fishGlow.scale.set(1.5, 1, 1);
  fishGroup.add(fishGlow);
  fishGroup.visible = false;
  fishGroup.position.set(0, -0.3, -6);
  world.scene.add(fishGroup);

  // Shadow under water (approaching fish indicator)
  const shadowMesh = new Mesh(
    new CircleGeometry(0.3, 16),
    new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, side: DoubleSide })
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.set(0, 0.02, -6);
  world.scene.add(shadowMesh);

  // Cast power indicator ring on dock
  const castRing = new Mesh(
    new RingGeometry(0.3, 0.35, 32),
    new MeshBasicMaterial({ color: new Color(theme().accent), transparent: true, opacity: 0, side: DoubleSide, blending: AdditiveBlending })
  );
  castRing.rotation.x = -Math.PI / 2;
  castRing.position.set(0, 0.58, -0.5);
  world.scene.add(castRing);

  // ─── UI Panels ───────────────────────────────────────────────

  interface PanelRef { entity: any; doc: UIKitDocument | null; }
  const panels: Record<string, PanelRef> = {};

  function createWorldPanel(name: string, config: string, w: number, h: number, pos: [number, number, number]): PanelRef {
    const e = world.createTransformEntity(undefined, { persistent: true });
    e.object3D!.position.set(...pos);
    e.addComponent(PanelUI, { config, maxWidth: w, maxHeight: h });
    const ref: PanelRef = { entity: e, doc: null };
    panels[name] = ref;
    return ref;
  }

  function createHUDPanel(name: string, config: string, w: number, h: number, offset: [number, number, number]): PanelRef {
    const e = world.createTransformEntity(undefined, { persistent: true });
    e.addComponent(PanelUI, { config, maxWidth: w, maxHeight: h });
    e.addComponent(Follower, { target: (world as any).player?.head, offsetPosition: offset, behavior: FollowBehavior.PivotY, speed: 5, tolerance: 0.3 });
    const ref: PanelRef = { entity: e, doc: null };
    panels[name] = ref;
    return ref;
  }

  function createScreenPanel(name: string, config: string, w: string, pos: { bottom?: string; top?: string; left?: string; right?: string }): PanelRef {
    const e = world.createTransformEntity(undefined, { persistent: true });
    e.addComponent(PanelUI, { config, maxWidth: 0.4, maxHeight: 0.2 });
    e.addComponent(ScreenSpace, { width: w, height: 'auto', ...pos, zOffset: 0.25 });
    const ref: PanelRef = { entity: e, doc: null };
    panels[name] = ref;
    return ref;
  }

  // World-space panels
  createWorldPanel('title', '/ui/title.json', 0.9, 1.2, [0, 1.5, -2.5]);
  createWorldPanel('modeselect', '/ui/modeselect.json', 0.9, 1.0, [0, 1.5, -2.5]);
  createWorldPanel('difficulty', '/ui/difficulty.json', 0.7, 0.6, [0, 1.5, -2.5]);
  createWorldPanel('rods', '/ui/rods.json', 0.9, 1.0, [0, 1.5, -2.5]);
  createWorldPanel('pause', '/ui/pause.json', 0.6, 0.4, [0, 1.6, -2]);
  createWorldPanel('catch', '/ui/catch.json', 0.8, 0.8, [0, 1.5, -2.5]);
  createWorldPanel('gameover', '/ui/gameover.json', 0.8, 1.0, [0, 1.5, -2.5]);
  createWorldPanel('codex', '/ui/codex.json', 1.0, 1.2, [0, 1.5, -2.5]);
  createWorldPanel('leaderboard', '/ui/leaderboard.json', 0.8, 1.0, [0, 1.5, -2.5]);
  createWorldPanel('achievements', '/ui/achievements.json', 0.9, 1.2, [0, 1.5, -2.5]);
  createWorldPanel('settings', '/ui/settings.json', 0.8, 0.9, [0, 1.5, -2.5]);
  createWorldPanel('help', '/ui/help.json', 0.9, 1.2, [0, 1.5, -2.5]);
  createWorldPanel('stats', '/ui/stats.json', 0.9, 1.2, [0, 1.5, -2.5]);
  createWorldPanel('bait', '/ui/bait.json', 0.9, 1.2, [0, 1.5, -2.5]);

  // HUD panels (Follower head-locked)
  createHUDPanel('hud', '/ui/hud.json', 0.35, 0.15, [0.25, -0.12, -0.5]);
  createHUDPanel('tension', '/ui/tension.json', 0.25, 0.08, [-0.2, -0.15, -0.5]);
  createHUDPanel('toast', '/ui/toast.json', 0.35, 0.06, [0, 0.2, -0.5]);
  createHUDPanel('countdown', '/ui/countdown.json', 0.2, 0.1, [0, 0, -0.5]);
  createHUDPanel('weather', '/ui/weather.json', 0.2, 0.06, [-0.25, 0.12, -0.5]);
  createHUDPanel('tutorial', '/ui/tutorial.json', 0.45, 0.25, [0, 0.05, -0.6]);

  // Wait for docs to be ready
  function getDoc(name: string): UIKitDocument | null {
    if (panels[name].doc) return panels[name].doc;
    const d = panels[name].entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
    if (d) panels[name].doc = d;
    return d || null;
  }

  function showPanel(name: string) {
    for (const [k, p] of Object.entries(panels)) {
      p.entity.object3D.visible = k === name;
    }
  }

  function showPanels(...names: string[]) {
    for (const [k, p] of Object.entries(panels)) {
      p.entity.object3D.visible = names.includes(k);
    }
  }

  function hideAll() {
    for (const p of Object.values(panels)) p.entity.object3D.visible = false;
  }

  // ─── Helper: setText ─────────────────────────────────────────

  function setText(doc: UIKitDocument | null, id: string, text: string) {
    if (!doc) return;
    const el = doc.getElementById(id);
    if (el) (el as any).text.value = text;
  }

  function setBtn(doc: UIKitDocument | null, id: string, cb: () => void) {
    if (!doc) return;
    const el = doc.getElementById(id);
    if (el) el.addEventListener('click', cb);
  }

  // ─── Toast System ────────────────────────────────────────────

  let toastTimer = 0;
  function showToast(msg: string, duration = 2) {
    const doc = getDoc('toast');
    setText(doc, 'toast-msg', msg);
    panels.toast.entity.object3D.visible = true;
    toastTimer = duration;
  }

  // ─── Fishing Logic ───────────────────────────────────────────

  function selectFishForCast(): FishSpecies {
    const r = rod();
    const b = BAITS[gsm.currentBait];
    const w = WEATHER_CONDITIONS.find(wc => wc.type === gsm.weather) || WEATHER_CONDITIONS[0];
    const luck = r.luckBonus + b.rarityBonus + w.rarityMod;
    const depthMap: Record<string, string[]> = {
      surface: ['surface'],
      mid: ['surface', 'mid'],
      deep: ['surface', 'mid', 'deep'],
      abyss: ['surface', 'mid', 'deep', 'abyss'],
    };
    // Determine depth based on cast distance
    let depth: string;
    if (gsm.lineDistance < 4) depth = 'surface';
    else if (gsm.lineDistance < 8) depth = 'mid';
    else if (gsm.lineDistance < 14) depth = 'deep';
    else depth = 'abyss';

    // Bait depth bonus can extend accessible depths
    if (b.depthBonus === 'all' || b.depthBonus === 'abyss') depth = 'abyss';
    else if (b.depthBonus === 'deep' && depth === 'mid') depth = 'deep';
    else if (b.depthBonus === 'mid' && depth === 'surface') depth = 'mid';

    const validDepths = depthMap[depth] || ['surface'];
    let pool = FISH_SPECIES.filter(f => validDepths.includes(f.depth));

    // Weighted selection based on rarity
    const weights: Record<string, number> = {
      common: 50, uncommon: 25 + luck * 30, rare: 12 + luck * 20,
      epic: 5 + luck * 15, legendary: 2 + luck * 10,
    };

    if (gsm.difficulty === 'easy') { weights.common += 20; weights.legendary -= 1; }
    if (gsm.difficulty === 'hard') { weights.rare += 5; weights.epic += 3; weights.legendary += 1; }

    let totalW = 0;
    const weighted = pool.map(f => {
      const w = weights[f.rarity] || 10;
      totalW += w;
      return { fish: f, cumW: totalW };
    });

    const roll = Math.random() * totalW;
    for (const w of weighted) {
      if (roll <= w.cumW) return w.fish;
    }
    return pool[0];
  }

  function getWaitTime(): number {
    const base = gsm.difficulty === 'easy' ? 3 : gsm.difficulty === 'medium' ? 5 : 7;
    const w = WEATHER_CONDITIONS.find(wc => wc.type === gsm.weather) || WEATHER_CONDITIONS[0];
    const b = BAITS[gsm.currentBait];
    return (base + Math.random() * (base * 1.5)) / (w.biteMod * b.biteSpeedMod);
  }

  function startCast(power: number) {
    gsm.totalCasts++;
    const w = WEATHER_CONDITIONS.find(wc => wc.type === gsm.weather) || WEATHER_CONDITIONS[0];
    // Wind adds randomness to cast distance
    const windVariance = gsm.weather === 'wind' ? (Math.random() - 0.5) * 6 : 0;
    gsm.lineDistance = Math.max(2, Math.min(20, (2 + power * 0.16) * w.castMod + windVariance));
    const bobX = (Math.random() - 0.5) * 0.5;
    const bobZ = -(2 + gsm.lineDistance);
    bobberGroup.position.set(bobX, 0.05, bobZ);
    bobberGroup.visible = true;
    lineMesh.visible = true;

    // Update line geometry
    updateLine(rodTip.getWorldPosition(new Vector3()), bobberGroup.position);

    audio.castSwoosh();
    setTimeout(() => audio.splash(), 200);
    particles.ripple(bobberGroup.position.clone(), theme().accent);

    gsm.state = 'waiting';
    gsm.waitTimer = getWaitTime();
    shadowMesh.position.set(bobX + 3, 0.02, bobZ);
    (shadowMesh.material as MeshBasicMaterial).opacity = 0;
  }

  function updateLine(from: Vector3, to: Vector3) {
    const pos = lineMesh.geometry.attributes.position as Float32BufferAttribute;
    pos.setXYZ(0, from.x, from.y, from.z);
    pos.setXYZ(1, to.x, to.y, to.z);
    pos.needsUpdate = true;
  }

  function startBite() {
    const fish = selectFishForCast();
    gsm.fishOnLine = fish;
    gsm.biteTimer = fish.biteWindow * (gsm.difficulty === 'easy' ? 1.3 : gsm.difficulty === 'hard' ? 0.8 : 1.0);
    gsm.state = 'biting';
    audio.bite();
    showToast('FISH ON! Hook it!');
  }

  function hookFish() {
    if (!gsm.fishOnLine) return;
    audio.hookSet();
    const f = gsm.fishOnLine;
    gsm.fishWeight = f.minWeight + Math.random() * (f.maxWeight - f.minWeight);
    gsm.fishWeight = Math.round(gsm.fishWeight * 100) / 100;
    gsm.fishDistance = gsm.lineDistance;
    gsm.fishStamina = 100;
    gsm.fishFightTimer = f.fightDuration * (gsm.difficulty === 'easy' ? 1.3 : gsm.difficulty === 'hard' ? 0.8 : 1.0);
    gsm.tension = 20;
    gsm.reeling = false;
    gsm.state = 'fighting';

    // Position fish
    fishGroup.visible = true;
    const bp = bobberGroup.position;
    fishGroup.position.set(bp.x, -0.3, bp.z);
    const fc = new Color(f.color);
    (fishBody.material as MeshStandardMaterial).color.copy(fc);
    (fishBody.material as MeshStandardMaterial).emissive.set(f.emissive);
    (fishTail.material as MeshBasicMaterial).color.copy(fc);
    (fishGlow.material as MeshBasicMaterial).color.copy(fc);

    // Scale by weight
    const s = 0.5 + (gsm.fishWeight / f.maxWeight) * 0.8;
    fishGroup.scale.setScalar(s);

    showPanels('hud', 'tension');
  }

  function catchFish() {
    if (!gsm.fishOnLine) return;
    const f = gsm.fishOnLine;
    const isRare = ['rare', 'epic', 'legendary'].includes(f.rarity);
    if (isRare) audio.rareCatch(); else audio.fishCaught();

    const pts = f.points * (gsm.combo + 1);
    gsm.score += pts;
    gsm.combo++;
    if (gsm.combo > gsm.bestCombo) gsm.bestCombo = gsm.combo;
    if (gsm.combo > 1) { audio.comboUp(); showToast(`Combo x${gsm.combo}!`); }

    const caught: CaughtFish = { species: f.name, weight: gsm.fishWeight, points: pts, timestamp: Date.now() };
    gsm.sessionCaught.push(caught);
    gsm.codex.add(f.name);
    const xpMult = gsm.weather === 'aurora' ? 1.5 : 1.0;
    gsm.addXP(Math.floor(pts / 10 * xpMult));
    gsm.stats.totalCaught++;
    gsm.stats.totalWeight += gsm.fishWeight;
    if (gsm.fishWeight > gsm.stats.heaviestCatch) {
      gsm.stats.heaviestCatch = gsm.fishWeight;
      gsm.stats.heaviestName = f.name;
    }
    if (f.rarity === 'legendary') gsm.stats.legendsCaught++;
    gsm.stats.totalFights = (gsm.stats.totalFights || 0) + 1;
    if (gsm.stats.weatherFished instanceof Set) gsm.stats.weatherFished.add(gsm.weather);
    if (gsm.stats.baitUsed instanceof Set) gsm.stats.baitUsed.add(BAITS[gsm.currentBait].name);
    const rarityRank = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    if (!gsm.stats.rarestCatch || rarityRank.indexOf(f.rarity) > rarityRank.indexOf(gsm.stats.rarestCatch)) {
      gsm.stats.rarestCatch = f.rarity;
    }

    // Trophy check
    if (gsm.mode === 'trophy' && f.name === gsm.trophyTarget) gsm.trophyCaught = true;

    // Particles
    particles.burst(fishGroup.position.clone().add(new Vector3(0, 0.5, 0)), f.color, 20, 3);
    particles.burst(fishGroup.position.clone().add(new Vector3(0, 0.3, 0)), RARITY_COLORS[f.rarity], 10, 2);

    fishGroup.visible = false;
    bobberGroup.visible = false;
    lineMesh.visible = false;

    // Show catch screen
    gsm.state = 'caught';
    updateCatchPanel(f);
    showPanel('catch');

    checkAchievements();
    gsm.save();
  }

  function loseFish(reason: 'snap' | 'escape' | 'timeout') {
    if (reason === 'snap') { audio.lineSnap(); gsm.lineSnaps++; gsm.stats.totalLineSnaps++; showToast('Line snapped!'); }
    else if (reason === 'escape') { audio.fishEscape(); gsm.escapes++; gsm.stats.totalEscapes++; showToast('Fish escaped!'); }
    else { audio.fishEscape(); gsm.escapes++; showToast('Time ran out!'); }

    gsm.combo = 0;
    gsm.fishOnLine = null;
    fishGroup.visible = false;
    bobberGroup.visible = false;
    lineMesh.visible = false;

    // Back to casting
    if (isGameOver()) { endGame(); }
    else { gsm.state = 'casting'; gsm.castPower = 0; gsm.castCharging = false; showPanels('hud'); }
  }

  function isGameOver(): boolean {
    if (gsm.mode === 'timeattack' && gsm.gameTimer <= 0) return true;
    if (gsm.mode === 'trophy' && gsm.trophyCaught) return true;
    if (gsm.mode === 'tournament') {
      if (gsm.sessionCaught.length >= 5) return true;
    }
    return false;
  }

  function endGame() {
    gsm.stats.gamesPlayed++;
    if (gsm.score > gsm.stats.bestScore) gsm.stats.bestScore = gsm.score;
    gsm.stats.totalCasts += gsm.totalCasts;
    if (gsm.bestCombo > gsm.stats.bestCombo) gsm.stats.bestCombo = gsm.bestCombo;

    // Save score
    gsm.bestScores.push({ score: gsm.score, mode: gsm.mode, date: new Date().toLocaleDateString() });
    gsm.bestScores.sort((a, b) => b.score - a.score);
    gsm.bestScores = gsm.bestScores.slice(0, 20);

    gsm.state = 'gameover';
    audio.gameOver();
    updateGameOverPanel();
    showPanel('gameover');
    checkAchievements();
    gsm.save();
  }

  // ─── Panel Updates ───────────────────────────────────────────

  function updateCatchPanel(fish: FishSpecies) {
    const doc = getDoc('catch');
    setText(doc, 'fish-name', fish.name);
    setText(doc, 'fish-rarity', fish.rarity.toUpperCase());
    setText(doc, 'fish-weight', `${gsm.fishWeight} kg`);
    setText(doc, 'fish-points', `+${gsm.sessionCaught[gsm.sessionCaught.length - 1]?.points || 0}`);
    setText(doc, 'fish-combo', gsm.combo > 1 ? `Combo x${gsm.combo}` : '');
    setText(doc, 'fish-new', gsm.codex.has(fish.name) && gsm.sessionCaught.filter(f => f.species === fish.name).length === 1 ? 'NEW SPECIES!' : '');
  }

  function updateGameOverPanel() {
    const doc = getDoc('gameover');
    setText(doc, 'go-score', `${gsm.score}`);
    setText(doc, 'go-caught', `${gsm.sessionCaught.length}`);
    setText(doc, 'go-weight', `${Math.round(gsm.sessionCaught.reduce((s, f) => s + f.weight, 0) * 100) / 100} kg`);
    setText(doc, 'go-combo', `${gsm.bestCombo}`);
    setText(doc, 'go-casts', `${gsm.totalCasts}`);
    setText(doc, 'go-snaps', `${gsm.lineSnaps}`);
    setText(doc, 'go-mode', gsm.mode.toUpperCase());
  }

  function updateHUD() {
    const doc = getDoc('hud');
    setText(doc, 'hud-score', `${gsm.score}`);
    setText(doc, 'hud-caught', `${gsm.sessionCaught.length}`);
    setText(doc, 'hud-combo', gsm.combo > 1 ? `x${gsm.combo}` : '');
    if (gsm.mode === 'timeattack') {
      setText(doc, 'hud-time', `${Math.ceil(gsm.gameTimer)}s`);
    } else {
      setText(doc, 'hud-time', '');
    }
    setText(doc, 'hud-mode', gsm.mode === 'free' ? 'FREE FISH' : gsm.mode === 'timeattack' ? 'TIME ATTACK' : gsm.mode === 'trophy' ? 'TROPHY HUNT' : gsm.mode === 'tournament' ? 'TOURNAMENT' : gsm.mode === 'daily' ? 'DAILY' : 'ZEN');
  }

  function updateTensionBar() {
    const doc = getDoc('tension');
    const pct = Math.round(gsm.tension);
    setText(doc, 'tension-value', `${pct}%`);
    const blocks = Math.floor(pct / 5);
    setText(doc, 'tension-bar', '|'.repeat(blocks));
    setText(doc, 'tension-label', pct > 80 ? 'DANGER!' : pct > 50 ? 'CAREFUL' : 'SAFE');
    if (gsm.fishOnLine) {
      setText(doc, 'fish-dist', `${Math.round(gsm.fishDistance * 10) / 10}m`);
    }
  }

  function updateCodexPanel() {
    const doc = getDoc('codex');
    if (!doc) return;
    FISH_SPECIES.forEach((f, i) => {
      const discovered = gsm.codex.has(f.name);
      setText(doc, `codex-name-${i}`, discovered ? f.name : '???');
      setText(doc, `codex-rarity-${i}`, discovered ? f.rarity.toUpperCase() : '---');
    });
    setText(doc, 'codex-count', `${gsm.codex.size} / ${FISH_SPECIES.length}`);
  }

  function updateLeaderboardPanel() {
    const doc = getDoc('leaderboard');
    if (!doc) return;
    for (let i = 0; i < 10; i++) {
      const entry = gsm.bestScores[i];
      setText(doc, `lb-rank-${i}`, entry ? `${i + 1}` : '');
      setText(doc, `lb-score-${i}`, entry ? `${entry.score}` : '');
      setText(doc, `lb-mode-${i}`, entry ? entry.mode : '');
      setText(doc, `lb-date-${i}`, entry ? entry.date : '');
    }
  }

  function updateSettingsPanel() {
    const doc = getDoc('settings');
    setText(doc, 'vol-master', `${Math.round(gsm.volumes.master * 100)}%`);
    setText(doc, 'vol-sfx', `${Math.round(gsm.volumes.sfx * 100)}%`);
    setText(doc, 'vol-music', `${Math.round(gsm.volumes.music * 100)}%`);
    setText(doc, 'theme-name', THEMES[gsm.currentTheme].name);
  }

  function updateAchievementsPanel() {
    const doc = getDoc('achievements');
    if (!doc) return;
    ACHIEVEMENTS.forEach((a, i) => {
      setText(doc, `ach-check-${i}`, gsm.achievements.has(a.id) ? '[X]' : '[ ]');
      setText(doc, `ach-name-${i}`, a.name);
      setText(doc, `ach-desc-${i}`, a.desc);
    });
  }

  function updateRodsPanel() {
    const doc = getDoc('rods');
    if (!doc) return;
    RODS.forEach((r, i) => {
      const unlocked = gsm.level >= r.unlockLevel;
      const equipped = gsm.currentRod === i;
      setText(doc, `rod-name-${i}`, unlocked ? r.name : `Locked (Lv ${r.unlockLevel})`);
      setText(doc, `rod-status-${i}`, equipped ? 'EQUIPPED' : unlocked ? 'SELECT' : 'LOCKED');
    });
  }

  // ─── Stats Panel ──────────────────────────────────────────────

  function updateStatsPanel() {
    const doc = getDoc('stats');
    if (!doc) return;
    setText(doc, 'st-games', `${gsm.stats.gamesPlayed}`);
    setText(doc, 'st-caught', `${gsm.stats.totalCaught}`);
    setText(doc, 'st-weight', `${Math.round(gsm.stats.totalWeight * 100) / 100} kg`);
    setText(doc, 'st-casts', `${gsm.stats.totalCasts}`);
    setText(doc, 'st-snaps', `${gsm.stats.totalLineSnaps}`);
    setText(doc, 'st-escapes', `${gsm.stats.totalEscapes}`);
    setText(doc, 'st-best', `${gsm.stats.bestScore}`);
    setText(doc, 'st-combo', `${gsm.stats.bestCombo}`);
    setText(doc, 'st-heavy', gsm.stats.heaviestName ? `${gsm.stats.heaviestName} (${gsm.stats.heaviestCatch} kg)` : '---');
    setText(doc, 'st-rarest', gsm.stats.rarestCatch ? gsm.stats.rarestCatch.toUpperCase() : '---');
    setText(doc, 'st-legends', `${gsm.stats.legendsCaught}`);
    setText(doc, 'st-level', `${gsm.level}`);
    setText(doc, 'st-xp', `${gsm.stats.totalXP}`);
    setText(doc, 'st-species', `${gsm.codex.size} / ${FISH_SPECIES.length}`);
    setText(doc, 'st-achs', `${gsm.achievements.size} / ${ACHIEVEMENTS.length}`);
    const hrs = Math.floor(gsm.stats.totalPlayTime / 3600);
    const mins = Math.floor((gsm.stats.totalPlayTime % 3600) / 60);
    setText(doc, 'st-time', `${hrs}h ${mins}m`);
  }

  // ─── Bait Panel ───────────────────────────────────────────────

  function updateBaitPanel() {
    const doc = getDoc('bait');
    if (!doc) return;
    BAITS.forEach((b, i) => {
      const unlocked = gsm.level >= b.unlockLevel;
      const equipped = gsm.currentBait === i;
      setText(doc, `bait-name-${i}`, unlocked ? b.name : `Locked (Lv ${b.unlockLevel})`);
      setText(doc, `bait-desc-${i}`, unlocked ? b.desc : '???');
      setText(doc, `bait-status-${i}`, equipped ? 'EQUIPPED' : unlocked ? 'SELECT' : `Lv ${b.unlockLevel}`);
    });
  }

  // ─── Weather System ───────────────────────────────────────────

  function cycleWeather() {
    const pool = WEATHER_CONDITIONS.filter(w => w.type !== gsm.weather);
    const next = pool[Math.floor(Math.random() * pool.length)];
    gsm.weather = next.type;
    updateWeatherHUD();
    showToast(`Weather: ${next.name}`);
    audio.buttonClick();
  }

  function updateWeatherHUD() {
    const doc = getDoc('weather');
    const w = WEATHER_CONDITIONS.find(wc => wc.type === gsm.weather) || WEATHER_CONDITIONS[0];
    setText(doc, 'weather-icon', w.icon);
    setText(doc, 'weather-name', w.name);
    setText(doc, 'weather-effect', w.effect);
  }

  // ─── Tutorial System ──────────────────────────────────────────

  function updateTutorialPanel() {
    const doc = getDoc('tutorial');
    if (!doc) return;
    const step = TUTORIAL_STEPS[gsm.tutorialStep] || TUTORIAL_STEPS[0];
    setText(doc, 'tut-step-num', `${step.num}`);
    setText(doc, 'tut-step-title', step.title);
    setText(doc, 'tut-step-desc', step.desc);
    setText(doc, 'tut-step-input', step.input);
    setText(doc, 'tut-progress', `Step ${step.num} of ${TUTORIAL_STEPS.length}`);
  }

  function advanceTutorial(currentState: GameState) {
    if (gsm.tutorialComplete) return;
    const step = TUTORIAL_STEPS[gsm.tutorialStep];
    if (step && currentState === step.triggerState) {
      gsm.tutorialStep++;
      if (gsm.tutorialStep >= TUTORIAL_STEPS.length) {
        gsm.tutorialComplete = true;
        gsm.save();
        panels.tutorial.entity.object3D.visible = false;
        showToast('Tutorial complete!');
      } else {
        updateTutorialPanel();
      }
    }
  }

  // ─── Rain Particle System ─────────────────────────────────────

  const rainDrops: Mesh[] = [];
  const maxRainDrops = 80;

  function createRainSystem() {
    const rainMat = new MeshBasicMaterial({
      color: new Color('#4488ff'), transparent: true, opacity: 0.4, blending: AdditiveBlending,
    });
    for (let i = 0; i < maxRainDrops; i++) {
      const drop = new Mesh(new CylinderGeometry(0.005, 0.005, 0.15, 4), rainMat.clone());
      drop.position.set((Math.random() - 0.5) * 20, 4 + Math.random() * 4, -5 + (Math.random() - 0.5) * 20);
      drop.visible = false;
      world.scene.add(drop);
      rainDrops.push(drop);
    }
  }
  createRainSystem();

  function updateRain(dt: number) {
    const isRaining = gsm.weather === 'rain' || gsm.weather === 'storm';
    const intensity = gsm.weather === 'storm' ? 1.0 : gsm.weather === 'rain' ? 0.6 : 0;
    rainDrops.forEach((drop, i) => {
      drop.visible = isRaining && i < maxRainDrops * intensity;
      if (!drop.visible) return;
      drop.position.y -= (8 + Math.random() * 4) * dt;
      if (drop.position.y < -0.5) {
        drop.position.y = 4 + Math.random() * 3;
        drop.position.x = (Math.random() - 0.5) * 20;
        drop.position.z = -5 + (Math.random() - 0.5) * 20;
      }
      (drop.material as MeshBasicMaterial).opacity = intensity * (0.2 + Math.random() * 0.3);
    });
  }

  // ─── Fish Jump Animation ──────────────────────────────────────

  let jumpingFishGroup: Group | null = null;
  let jumpTimer = 0;
  let jumpActive = false;
  let jumpPhase = 0;
  let jumpStartPos = new Vector3();

  function createJumpingFish() {
    jumpingFishGroup = new Group();
    const jBody = new Mesh(
      new SphereGeometry(0.1, 8, 6),
      new MeshStandardMaterial({ color: 0x00ffff, emissive: 0x004444, emissiveIntensity: 0.5, wireframe: true })
    );
    jBody.scale.set(1.5, 1, 1);
    jumpingFishGroup.add(jBody);
    const jTail = new Mesh(
      new ConeGeometry(0.07, 0.1, 4),
      new MeshBasicMaterial({ color: 0x00ffff, wireframe: true, transparent: true, opacity: 0.6 })
    );
    jTail.rotation.z = Math.PI / 2;
    jTail.position.set(-0.15, 0, 0);
    jumpingFishGroup.add(jTail);
    jumpingFishGroup.visible = false;
    world.scene.add(jumpingFishGroup);
  }
  createJumpingFish();

  function updateFishJump(dt: number) {
    if (!jumpingFishGroup) return;
    const isWaiting = gsm.state === 'waiting' || gsm.state === 'casting';
    if (!isWaiting) { jumpingFishGroup.visible = false; return; }

    jumpTimer -= dt;
    if (!jumpActive && jumpTimer <= 0) {
      // Trigger a jump
      jumpActive = true;
      jumpPhase = 0;
      jumpStartPos.set(
        (Math.random() - 0.5) * 12,
        0,
        -4 + (Math.random() - 0.5) * 10
      );
      jumpingFishGroup.visible = true;
      jumpingFishGroup.position.copy(jumpStartPos);
      // Randomize color from theme
      const t = theme();
      const colors = [t.accent, t.glow, t.fish];
      const c = colors[Math.floor(Math.random() * colors.length)];
      (jumpingFishGroup.children[0] as Mesh).material = new MeshStandardMaterial({
        color: new Color(c), emissive: new Color(c), emissiveIntensity: 0.3, wireframe: true,
      });
      (jumpingFishGroup.children[1] as Mesh).material = new MeshBasicMaterial({
        color: new Color(c), wireframe: true, transparent: true, opacity: 0.6,
      });
      audio.splash();
    }

    if (jumpActive) {
      jumpPhase += dt * 2.5;
      const arcHeight = 1.2;
      const arcDuration = Math.PI;
      if (jumpPhase >= arcDuration) {
        jumpActive = false;
        jumpingFishGroup.visible = false;
        jumpTimer = 5 + Math.random() * 10; // Next jump in 5-15 seconds
        particles.ripple(jumpStartPos.clone(), theme().accent);
      } else {
        const y = Math.sin(jumpPhase) * arcHeight;
        const fwd = (jumpPhase / arcDuration) * 1.5;
        jumpingFishGroup.position.set(jumpStartPos.x + fwd, y, jumpStartPos.z);
        jumpingFishGroup.rotation.z = Math.cos(jumpPhase) * 0.5;
      }
    }
  }

  // ─── Cast Arc Visualization ───────────────────────────────────

  const arcPoints: Vector3[] = [];
  for (let i = 0; i <= 20; i++) arcPoints.push(new Vector3());
  const arcGeo = new BufferGeometry().setFromPoints(arcPoints);
  const arcMesh = new Line(arcGeo, new LineBasicMaterial({
    color: new Color(theme().accent), transparent: true, opacity: 0.4, blending: AdditiveBlending,
  }));
  arcMesh.visible = false;
  world.scene.add(arcMesh);

  function updateCastArc(power: number) {
    if (!gsm.castCharging || power < 5) { arcMesh.visible = false; return; }
    arcMesh.visible = true;
    const dist = 2 + power * 0.16;
    const peakH = 1 + dist * 0.15;
    const pos = arcGeo.attributes.position as Float32BufferAttribute;
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const x = (Math.random() - 0.5) * 0.02;
      const y = 0.9 + Math.sin(t * Math.PI) * peakH - t * 0.9;
      const z = -0.5 - t * dist;
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
  }

  // ─── Achievements ────────────────────────────────────────────

  const ACHIEVEMENTS: Achievement[] = [
    { id: 'first_cast', name: 'First Cast', desc: 'Cast your line for the first time', check: () => gsm.stats.totalCasts >= 1 },
    { id: 'first_catch', name: 'First Catch', desc: 'Catch your first fish', check: () => gsm.stats.totalCaught >= 1 },
    { id: 'ten_catches', name: 'Angler', desc: 'Catch 10 fish', check: () => gsm.stats.totalCaught >= 10 },
    { id: 'fifty_catches', name: 'Fisherman', desc: 'Catch 50 fish', check: () => gsm.stats.totalCaught >= 50 },
    { id: 'hundred_catches', name: 'Master Angler', desc: 'Catch 100 fish', check: () => gsm.stats.totalCaught >= 100 },
    { id: 'rare_catch', name: 'Rare Find', desc: 'Catch a rare fish', check: () => [...gsm.codex].some(n => FISH_SPECIES.find(f => f.name === n)?.rarity === 'rare') },
    { id: 'epic_catch', name: 'Epic Discovery', desc: 'Catch an epic fish', check: () => [...gsm.codex].some(n => FISH_SPECIES.find(f => f.name === n)?.rarity === 'epic') },
    { id: 'legendary_catch', name: 'Legend of the Deep', desc: 'Catch a legendary fish', check: () => [...gsm.codex].some(n => FISH_SPECIES.find(f => f.name === n)?.rarity === 'legendary') },
    { id: 'codex_5', name: 'Collector', desc: 'Discover 5 species', check: () => gsm.codex.size >= 5 },
    { id: 'codex_10', name: 'Ichthyologist', desc: 'Discover 10 species', check: () => gsm.codex.size >= 10 },
    { id: 'codex_all', name: 'Complete Codex', desc: 'Discover all fish species', check: () => gsm.codex.size >= FISH_SPECIES.length },
    { id: 'score_1k', name: 'Score Hunter', desc: 'Score 1,000 in a single session', check: () => gsm.score >= 1000 },
    { id: 'score_5k', name: 'High Scorer', desc: 'Score 5,000 in a single session', check: () => gsm.score >= 5000 },
    { id: 'score_10k', name: 'Point Master', desc: 'Score 10,000 in a single session', check: () => gsm.score >= 10000 },
    { id: 'combo_3', name: 'Combo Starter', desc: 'Get a 3x combo', check: () => gsm.bestCombo >= 3 },
    { id: 'combo_5', name: 'Combo Master', desc: 'Get a 5x combo', check: () => gsm.bestCombo >= 5 },
    { id: 'combo_10', name: 'Combo King', desc: 'Get a 10x combo', check: () => gsm.bestCombo >= 10 },
    { id: 'heavy_5', name: 'Big One', desc: 'Catch a fish over 5 kg', check: () => gsm.stats.heaviestCatch >= 5 },
    { id: 'heavy_20', name: 'Monster Catch', desc: 'Catch a fish over 20 kg', check: () => gsm.stats.heaviestCatch >= 20 },
    { id: 'heavy_50', name: 'Leviathan', desc: 'Catch a fish over 50 kg', check: () => gsm.stats.heaviestCatch >= 50 },
    { id: 'snap_first', name: 'Broken Line', desc: 'Snap your line for the first time', check: () => gsm.stats.totalLineSnaps >= 1 },
    { id: 'games_10', name: 'Regular', desc: 'Play 10 sessions', check: () => gsm.stats.gamesPlayed >= 10 },
    { id: 'games_50', name: 'Veteran', desc: 'Play 50 sessions', check: () => gsm.stats.gamesPlayed >= 50 },
    { id: 'level_10', name: 'Rising Star', desc: 'Reach level 10', check: () => gsm.level >= 10 },
    { id: 'level_25', name: 'Expert Angler', desc: 'Reach level 25', check: () => gsm.level >= 25 },
    { id: 'level_50', name: 'Legendary Angler', desc: 'Reach level 50', check: () => gsm.level >= 50 },
    { id: 'daily_done', name: 'Daily Fisher', desc: 'Complete a daily challenge', check: () => gsm.mode === 'daily' && gsm.sessionCaught.length > 0 },
    { id: 'trophy_done', name: 'Trophy Hunter', desc: 'Complete a trophy hunt', check: () => gsm.trophyCaught },
    { id: 'no_snap', name: 'Steady Hands', desc: 'Complete a session with 0 line snaps', check: () => gsm.lineSnaps === 0 && gsm.sessionCaught.length >= 3 },
    { id: 'legends_3', name: 'Legend Slayer', desc: 'Catch 3 legendary fish total', check: () => gsm.stats.legendsCaught >= 3 },
    // New achievements
    { id: 'weather_rain', name: 'Rain Fisher', desc: 'Catch a fish during Neon Rain', check: () => gsm.weather === 'rain' && gsm.sessionCaught.length > 0 },
    { id: 'weather_storm', name: 'Storm Chaser', desc: 'Catch a fish during an Ion Storm', check: () => gsm.weather === 'storm' && gsm.sessionCaught.length > 0 },
    { id: 'weather_all', name: 'All-Weather Angler', desc: 'Fish in every weather condition', check: () => (gsm.stats.weatherFished?.size || 0) >= 6 },
    { id: 'bait_all', name: 'Tackle Master', desc: 'Use every bait type', check: () => (gsm.stats.baitUsed?.size || 0) >= 6 },
    { id: 'catch_5_session', name: 'Hot Streak', desc: 'Catch 5 fish in one session', check: () => gsm.sessionCaught.length >= 5 },
    { id: 'catch_10_session', name: 'On Fire', desc: 'Catch 10 fish in one session', check: () => gsm.sessionCaught.length >= 10 },
    { id: 'catch_20_session', name: 'Unstoppable', desc: 'Catch 20 fish in one session', check: () => gsm.sessionCaught.length >= 20 },
    { id: 'weight_100', name: 'Centennial Haul', desc: 'Accumulate 100 kg total weight', check: () => gsm.stats.totalWeight >= 100 },
    { id: 'weight_500', name: 'Half Ton', desc: 'Accumulate 500 kg total weight', check: () => gsm.stats.totalWeight >= 500 },
    { id: 'score_25k', name: 'Score Legend', desc: 'Score 25,000 in a single session', check: () => gsm.score >= 25000 },
    { id: 'zen_master', name: 'Zen Master', desc: 'Catch 10 fish in Zen mode', check: () => gsm.mode === 'zen' && gsm.sessionCaught.length >= 10 },
    { id: 'tournament_win', name: 'Tournament Victor', desc: 'Score 3,000+ in tournament mode', check: () => gsm.mode === 'tournament' && gsm.score >= 3000 },
    { id: 'speed_cast', name: 'Quick Draw', desc: 'Hook a fish within 2 seconds of cast', check: () => gsm.state === 'biting' && gsm.waitTimer > -2 },
  ];

  function checkAchievements() {
    for (const a of ACHIEVEMENTS) {
      if (!gsm.achievements.has(a.id) && a.check()) {
        gsm.achievements.add(a.id);
        audio.achievement();
        showToast(`Achievement: ${a.name}!`);
      }
    }
  }

  // ─── State Transitions ───────────────────────────────────────

  function goToState(s: GameState) {
    gsm.prevState = gsm.state;
    gsm.state = s;
    rodGroup.visible = false;
    bobberGroup.visible = false;
    lineMesh.visible = false;
    fishGroup.visible = false;

    switch (s) {
      case 'title':
        showPanel('title');
        audio.stopDrone();
        break;
      case 'modeselect':
        showPanel('modeselect');
        break;
      case 'difficulty':
        showPanel('difficulty');
        break;
      case 'rods':
        updateRodsPanel();
        showPanel('rods');
        break;
      case 'countdown':
        gsm.countdownValue = 3;
        gsm.countdownTimer = 0;
        showPanel('countdown');
        setText(getDoc('countdown'), 'cd-value', '3');
        audio.countdownTick();
        break;
      case 'casting':
        gsm.castPower = 0;
        gsm.castCharging = false;
        rodGroup.visible = true;
        // Update rod color
        (rodPole.material as MeshStandardMaterial).color.set(rod().color);
        (rodPole.material as MeshStandardMaterial).emissive.set(rod().color);
        (rodTip.material as MeshBasicMaterial).color.set(rod().color);
        showPanels('hud', 'weather');
        updateHUD();
        updateWeatherHUD();
        audio.init();
        audio.setVolumes(gsm.volumes);
        audio.startDrone();
        break;
      case 'codex':
        updateCodexPanel();
        showPanel('codex');
        break;
      case 'leaderboard':
        updateLeaderboardPanel();
        showPanel('leaderboard');
        break;
      case 'achievements':
        updateAchievementsPanel();
        showPanel('achievements');
        break;
      case 'settings':
        updateSettingsPanel();
        showPanel('settings');
        break;
      case 'help':
        showPanel('help');
        break;
      case 'pause':
        showPanel('pause');
        break;
      case 'stats':
        updateStatsPanel();
        showPanel('stats');
        break;
      case 'bait':
        updateBaitPanel();
        showPanel('bait');
        break;
      case 'tutorial':
        gsm.tutorialStep = 0;
        updateTutorialPanel();
        showPanel('tutorial');
        break;
      case 'gameover':
        // handled in endGame
        break;
    }
  }

  function startGame() {
    gsm.resetSession();
    gsm.stats.totalCasts = gsm.stats.totalCasts; // keep running total
    if (gsm.mode === 'timeattack') gsm.gameTimeLimit = gsm.difficulty === 'easy' ? 120 : gsm.difficulty === 'medium' ? 90 : 60;
    if (gsm.mode === 'timeattack') gsm.gameTimer = gsm.gameTimeLimit;
    if (gsm.mode === 'trophy') {
      // Pick a random rare+ fish as target
      const pool = FISH_SPECIES.filter(f => ['rare', 'epic', 'legendary'].includes(f.rarity));
      gsm.trophyTarget = pool[Math.floor(Math.random() * pool.length)].name;
    }
    if (gsm.mode === 'daily') {
      // Use date as seed
      const today = new Date().toISOString().slice(0, 10);
      gsm.gameTimer = 90; gsm.gameTimeLimit = 90;
    }
    goToState('countdown');
  }

  // ─── Button Wiring (deferred until docs available) ───────────

  let buttonsWired = false;
  function wireButtons() {
    if (buttonsWired) return;

    // Title
    const td = getDoc('title');
    if (!td) return;
    setBtn(td, 'btn-play', () => { audio.init(); audio.buttonClick(); goToState('modeselect'); });
    setBtn(td, 'btn-codex', () => { audio.init(); audio.buttonClick(); goToState('codex'); });
    setBtn(td, 'btn-scores', () => { audio.init(); audio.buttonClick(); goToState('leaderboard'); });
    setBtn(td, 'btn-achievements', () => { audio.init(); audio.buttonClick(); goToState('achievements'); });
    setBtn(td, 'btn-rods', () => { audio.init(); audio.buttonClick(); goToState('rods'); });
    setBtn(td, 'btn-settings', () => { audio.init(); audio.buttonClick(); goToState('settings'); });
    setBtn(td, 'btn-help', () => { audio.init(); audio.buttonClick(); goToState('help'); });
    setBtn(td, 'btn-stats', () => { audio.init(); audio.buttonClick(); goToState('stats'); });
    setBtn(td, 'btn-bait', () => { audio.init(); audio.buttonClick(); goToState('bait'); });

    // Mode select
    const md = getDoc('modeselect');
    if (!md) return;
    const modes: GameMode[] = ['free', 'timeattack', 'trophy', 'tournament', 'daily', 'zen'];
    modes.forEach(m => {
      setBtn(md, `btn-${m}`, () => { audio.buttonClick(); gsm.mode = m; goToState('difficulty'); });
    });
    setBtn(md, 'btn-back-mode', () => { audio.buttonClick(); goToState('title'); });

    // Difficulty
    const dd = getDoc('difficulty');
    if (!dd) return;
    (['easy', 'medium', 'hard'] as Difficulty[]).forEach(d => {
      setBtn(dd, `btn-${d}`, () => { audio.buttonClick(); gsm.difficulty = d; startGame(); });
    });
    setBtn(dd, 'btn-back-diff', () => { audio.buttonClick(); goToState('modeselect'); });

    // Rods
    const rd = getDoc('rods');
    if (rd) {
      RODS.forEach((_, i) => {
        setBtn(rd, `btn-rod-${i}`, () => {
          if (gsm.level >= RODS[i].unlockLevel) { gsm.currentRod = i; audio.buttonClick(); updateRodsPanel(); gsm.save(); }
        });
      });
      setBtn(rd, 'btn-back-rods', () => { audio.buttonClick(); goToState('title'); });
    }

    // Pause
    const pd = getDoc('pause');
    if (pd) {
      setBtn(pd, 'btn-resume', () => { audio.buttonClick(); gsm.state = gsm.prevState; showPanels('hud', 'tension'); });
      setBtn(pd, 'btn-quit', () => { audio.buttonClick(); endGame(); });
    }

    // Catch
    const cd = getDoc('catch');
    if (cd) {
      setBtn(cd, 'btn-continue', () => {
        audio.buttonClick();
        if (isGameOver()) { endGame(); }
        else { gsm.state = 'casting'; gsm.castPower = 0; gsm.castCharging = false; showPanels('hud'); }
      });
    }

    // Game over
    const god = getDoc('gameover');
    if (god) {
      setBtn(god, 'btn-rematch', () => { audio.buttonClick(); startGame(); });
      setBtn(god, 'btn-title', () => { audio.buttonClick(); goToState('title'); });
    }

    // Settings
    const sd = getDoc('settings');
    if (sd) {
      const volAdj = (key: 'master' | 'sfx' | 'music', delta: number) => {
        gsm.volumes[key] = Math.max(0, Math.min(1, gsm.volumes[key] + delta));
        audio.setVolumes(gsm.volumes);
        updateSettingsPanel();
        gsm.save();
      };
      setBtn(sd, 'btn-master-up', () => volAdj('master', 0.1));
      setBtn(sd, 'btn-master-dn', () => volAdj('master', -0.1));
      setBtn(sd, 'btn-sfx-up', () => volAdj('sfx', 0.1));
      setBtn(sd, 'btn-sfx-dn', () => volAdj('sfx', -0.1));
      setBtn(sd, 'btn-music-up', () => volAdj('music', 0.1));
      setBtn(sd, 'btn-music-dn', () => volAdj('music', -0.1));
      setBtn(sd, 'btn-theme-prev', () => {
        gsm.currentTheme = (gsm.currentTheme - 1 + THEMES.length) % THEMES.length;
        updateSettingsPanel(); gsm.save();
      });
      setBtn(sd, 'btn-theme-next', () => {
        gsm.currentTheme = (gsm.currentTheme + 1) % THEMES.length;
        updateSettingsPanel(); gsm.save();
      });
      setBtn(sd, 'btn-back-settings', () => { audio.buttonClick(); goToState('title'); });
    }

    // Back buttons
    const backPanels = ['codex', 'leaderboard', 'achievements', 'help', 'stats'];
    backPanels.forEach(name => {
      const d = getDoc(name);
      if (d) setBtn(d, `btn-back-${name}`, () => { audio.buttonClick(); goToState('title'); });
    });

    // Bait panel
    const bd = getDoc('bait');
    if (bd) {
      BAITS.forEach((_, i) => {
        setBtn(bd, `btn-bait-${i}`, () => {
          if (gsm.level >= BAITS[i].unlockLevel) { gsm.currentBait = i; audio.buttonClick(); updateBaitPanel(); gsm.save(); }
        });
      });
      setBtn(bd, 'btn-back-bait', () => { audio.buttonClick(); goToState('title'); });
    }

    // Tutorial skip
    const tutDoc = getDoc('tutorial');
    if (tutDoc) {
      setBtn(tutDoc, 'btn-tut-skip', () => {
        gsm.tutorialComplete = true;
        gsm.save();
        panels.tutorial.entity.object3D.visible = false;
        audio.buttonClick();
      });
    }

    buttonsWired = true;
  }

  // ─── Game Loop ───────────────────────────────────────────────

  let lastTime = 0;
  let waterTime = 0;
  let reelClickTimer = 0;
  let bobberBobTime = 0;
  let chargeHumTimer = 0;
  let waterAmbientTimer = 0;

  goToState('title');

  const updateFn = (world as any).onUpdate || (world as any).update;
  updateFn.call(world, (time: number) => {
    const dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    waterTime += dt;
    bobberBobTime += dt;

    // Wire buttons on first available frame
    if (!buttonsWired) wireButtons();

    // Animate decorations
    decorations.forEach((m, i) => {
      m.rotation.y += dt * 0.3 * (i % 2 === 0 ? 1 : -1);
      m.rotation.x += dt * 0.1;
      m.position.y += Math.sin(waterTime * 0.5 + i) * 0.001;
    });

    // Ambient dots
    ambientDots.forEach((d, i) => {
      d.position.y += Math.sin(waterTime + i * 0.5) * 0.003;
      d.position.x += Math.sin(waterTime * 0.3 + i) * 0.002;
      (d.material as MeshBasicMaterial).opacity = 0.2 + 0.2 * Math.sin(waterTime * 2 + i);
    });

    // Water wave animation
    const waterGeo = env.waterMesh.geometry;
    const waterPos = waterGeo.attributes.position;
    for (let i = 0; i < waterPos.count; i++) {
      const x = waterPos.getX(i);
      const z = waterPos.getZ(i);
      waterPos.setY(i, Math.sin(x * 0.5 + waterTime * 1.2) * 0.04 + Math.cos(z * 0.3 + waterTime * 0.8) * 0.03);
    }
    waterPos.needsUpdate = true;
    waterGeo.computeVertexNormals();

    // Water ambient
    waterAmbientTimer -= dt;
    if (waterAmbientTimer <= 0) { audio.waterAmbient(); waterAmbientTimer = 3; }

    // Particles
    particles.update(dt);

    // Weather cycling
    if (['casting', 'waiting', 'biting', 'fighting'].includes(gsm.state)) {
      gsm.weatherTimer += dt;
      if (gsm.weatherTimer >= gsm.weatherCycleTime) {
        gsm.weatherTimer = 0;
        cycleWeather();
      }
    }

    // Rain effect
    updateRain(dt);

    // Fish jump animation
    updateFishJump(dt);

    // Tutorial advancement
    if (!gsm.tutorialComplete && ['casting', 'waiting', 'biting', 'fighting'].includes(gsm.state)) {
      advanceTutorial(gsm.state);
      if (!gsm.tutorialComplete) {
        panels.tutorial.entity.object3D.visible = true;
      }
    }

    // Fog effect for weather
    if (gsm.weather === 'fog') {
      const t = theme();
      if (world.scene.fog) (world.scene.fog as any).far = 20;
    } else if (gsm.weather === 'storm') {
      if (world.scene.fog) (world.scene.fog as any).far = 25;
    } else {
      if (world.scene.fog) (world.scene.fog as any).far = 40;
    }

    // Toast timer
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) panels.toast.entity.object3D.visible = false;
    }

    // ─── State-specific updates ────────────────────────────────

    // Countdown
    if (gsm.state === 'countdown') {
      gsm.countdownTimer += dt;
      if (gsm.countdownTimer >= 1) {
        gsm.countdownTimer = 0;
        gsm.countdownValue--;
        if (gsm.countdownValue <= 0) {
          audio.countdownGo();
          setText(getDoc('countdown'), 'cd-value', 'FISH!');
          setTimeout(() => goToState('casting'), 300);
        } else {
          audio.countdownTick();
          setText(getDoc('countdown'), 'cd-value', `${gsm.countdownValue}`);
        }
      }
    }

    // Casting — charge power
    if (gsm.state === 'casting') {
      if (gsm.castCharging) {
        gsm.castPower = Math.min(100, gsm.castPower + dt * 60);
        castRing.visible = true;
        (castRing.material as MeshBasicMaterial).opacity = 0.3 + gsm.castPower * 0.005;
        castRing.scale.setScalar(0.5 + gsm.castPower * 0.01);
        chargeHumTimer -= dt;
        if (chargeHumTimer <= 0) { audio.chargeHum(gsm.castPower); chargeHumTimer = 0.1; }
        updateCastArc(gsm.castPower);
      } else {
        castRing.visible = false;
        arcMesh.visible = false;
      }
      rodGroup.visible = true;
      // Rod animation during charge
      rodPole.rotation.x = -Math.PI / 4 + (gsm.castCharging ? Math.sin(waterTime * 8) * 0.02 : 0);
    }

    // Waiting for bite
    if (gsm.state === 'waiting') {
      gsm.waitTimer -= dt;
      rodGroup.visible = true;

      // Bobber bob animation
      bobberGroup.position.y = 0.05 + Math.sin(bobberBobTime * 2) * 0.01;

      // Shadow approaching (fish indicator)
      const shadowProgress = 1 - (gsm.waitTimer / getWaitTime());
      if (shadowProgress > 0.5) {
        const sp = Math.min(1, (shadowProgress - 0.5) * 2);
        (shadowMesh.material as MeshBasicMaterial).opacity = sp * 0.3;
        const bp = bobberGroup.position;
        shadowMesh.position.x += (bp.x - shadowMesh.position.x) * dt * 2;
        shadowMesh.position.z += (bp.z - shadowMesh.position.z) * dt * 2;
      }

      // Update line
      updateLine(rodTip.getWorldPosition(new Vector3()), bobberGroup.position);

      if (gsm.waitTimer <= 0) {
        // Fish bites!
        audio.bobberDip();
        startBite();
      }

      // Time attack timer
      if (gsm.mode === 'timeattack' || gsm.mode === 'daily') {
        gsm.gameTimer -= dt;
        updateHUD();
        if (gsm.gameTimer <= 0) endGame();
      }
    }

    // Biting — player must hook
    if (gsm.state === 'biting') {
      gsm.biteTimer -= dt;
      rodGroup.visible = true;

      // Bobber dip animation
      bobberGroup.position.y = -0.02 + Math.sin(waterTime * 15) * 0.02;

      // Line tugging
      updateLine(rodTip.getWorldPosition(new Vector3()), bobberGroup.position);

      if (gsm.biteTimer <= 0) {
        // Missed the bite
        gsm.missedBites++;
        gsm.combo = 0;
        (shadowMesh.material as MeshBasicMaterial).opacity = 0;
        bobberGroup.visible = false;
        lineMesh.visible = false;
        showToast('Missed the bite!');
        if (isGameOver()) endGame();
        else { gsm.state = 'casting'; gsm.castPower = 0; gsm.castCharging = false; }
      }
    }

    // Fighting — reel and manage tension
    if (gsm.state === 'fighting') {
      rodGroup.visible = true;
      const f = gsm.fishOnLine;
      if (!f) return;

      // Fish fight behavior
      gsm.fishFightTimer -= dt;
      gsm.fishStamina = Math.max(0, gsm.fishStamina - dt * 2);
      const fightForce = f.fightStrength * (gsm.fishStamina / 100);

      // Random tugs
      if (Math.random() < dt * (2 + fightForce * 3)) {
        gsm.tension += 5 + fightForce * 15;
        audio.fishTug();
        // Fish moves outward
        gsm.fishDistance += 0.3 + fightForce * 0.5;
      }

      // Reeling
      if (gsm.reeling) {
        const reelRate = rod().reelSpeed * (0.5 + (1 - fightForce) * 0.5);
        gsm.fishDistance -= reelRate * dt * 2;
        const stormTensionMod = gsm.weather === 'storm' ? 1.3 : 1.0;
        gsm.tension += dt * 15 * (1 + fightForce) * stormTensionMod;
        reelClickTimer -= dt;
        if (reelClickTimer <= 0) { audio.reelClick(); reelClickTimer = 0.15; }
      } else {
        gsm.tension -= dt * 20;
      }

      // Tension decay/clamp
      gsm.tension = Math.max(0, Math.min(rod().tensionMax, gsm.tension));

      // Tension warning
      if (gsm.tension > rod().tensionMax * 0.8 && Math.random() < dt * 3) {
        audio.tensionWarning();
      }

      // Check outcomes
      if (gsm.tension >= rod().tensionMax) { loseFish('snap'); return; }
      if (gsm.fishFightTimer <= 0) { loseFish('timeout'); return; }
      if (gsm.fishDistance <= 0.3) { catchFish(); return; }

      // Update fish visual position
      const bp = bobberGroup.position;
      const fishProg = 1 - (gsm.fishDistance / gsm.lineDistance);
      fishGroup.position.z = bp.z + gsm.fishDistance;
      fishGroup.position.y = -0.3 + Math.sin(waterTime * 5) * 0.05 * fightForce;
      fishGroup.rotation.y += dt * 3 * (gsm.reeling ? -1 : 1);

      // Update line to fish
      updateLine(rodTip.getWorldPosition(new Vector3()), fishGroup.position.clone().add(new Vector3(0, 0.3, 0)));

      updateTensionBar();
      updateHUD();
      showPanels('hud', 'tension', 'weather');

      // Time attack timer
      if (gsm.mode === 'timeattack' || gsm.mode === 'daily') {
        gsm.gameTimer -= dt;
        if (gsm.gameTimer <= 0) { loseFish('timeout'); endGame(); }
      }
    }

    // ─── Input ─────────────────────────────────────────────────

    // Browser keyboard
    const kb = (world.input as any).keyboard;
    const isPlaying = ['casting', 'waiting', 'biting', 'fighting'].includes(gsm.state);

    if (isPlaying && kb.getKeyDown('Escape')) {
      gsm.prevState = gsm.state;
      goToState('pause');
    }

    if (gsm.state === 'casting') {
      if (kb.getKeyDown('Space')) gsm.castCharging = true;
      if (kb.getKeyUp('Space') && gsm.castCharging) {
        gsm.castCharging = false;
        if (gsm.castPower > 5) startCast(gsm.castPower);
      }
    }

    if (gsm.state === 'biting') {
      if (kb.getKeyDown('Space')) hookFish();
    }

    if (gsm.state === 'fighting') {
      gsm.reeling = kb.getKeyPressed('Space');
    }

    if (gsm.state === 'gameover') {
      if (kb.getKeyDown('KeyR')) startGame();
      if (kb.getKeyDown('KeyM')) goToState('title');
    }

    if (gsm.state === 'caught') {
      if (kb.getKeyDown('Space') || kb.getKeyDown('Enter')) {
        if (isGameOver()) endGame();
        else { gsm.state = 'casting'; gsm.castPower = 0; gsm.castCharging = false; showPanels('hud'); }
      }
    }

    // XR Controller input
    const rightGP = (world.input as any).xr?.gamepads?.right;
    if (rightGP) {
      const triggerDown = rightGP.getButtonDown?.(InputComponent.Trigger);
      const triggerPressed = rightGP.getButtonPressed?.(InputComponent.Trigger);
      const triggerUp = rightGP.getButtonUp?.(InputComponent.Trigger);
      const bDown = rightGP.getButtonDown?.(InputComponent.B_Button);

      if (isPlaying && bDown) {
        gsm.prevState = gsm.state;
        goToState('pause');
      }

      if (gsm.state === 'casting') {
        if (triggerDown) gsm.castCharging = true;
        if (triggerUp && gsm.castCharging) {
          gsm.castCharging = false;
          if (gsm.castPower > 5) startCast(gsm.castPower);
        }
      }

      if (gsm.state === 'biting' && triggerDown) hookFish();
      if (gsm.state === 'fighting') gsm.reeling = !!triggerPressed;
      if (gsm.state === 'caught' && triggerDown) {
        if (isGameOver()) endGame();
        else { gsm.state = 'casting'; gsm.castPower = 0; gsm.castCharging = false; showPanels('hud'); }
      }
    }
  });
}

main().catch(console.error);
