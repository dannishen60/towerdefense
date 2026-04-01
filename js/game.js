/**
 * Tower Defense — maps, difficulties, enemy types with powers, codex, upgrades.
 */

const CELL = 40;
const W_DEFAULT = 880;
const H_DEFAULT = 520;
/** Playfield size (updated per mode). */
let W = W_DEFAULT;
let H = H_DEFAULT;
let COLS = Math.floor(W / CELL);
let ROWS = Math.floor(H / CELL);

const MAX_DEFENDER_LEVEL = 5;
const BASE_HP_FIXED = 20;

/** Game mode: campaign, battle, special (portal), raider, war. */
const GAME_MODE = {
  campaign: "campaign",
  battle: "battle",
  special: "special",
  raider: "raider",
  war: "war",
};
const BATTLE_DURATION_SEC = 180;

/** Battle difficulty (bot kill rate) — tuned to start easier. */
const BATTLE_BOT_RATES = { easy: 0.032, medium: 0.075, hard: 0.13, challenge: 0.2 };
const BATTLE_WAVE_SCALE = 10;
const BATTLE_SPAWN_DELAY_MULT = 1.7;

const DIFFICULTY_MODES = {
  easy: {
    id: "easy",
    label: "Easy",
    waves: 10,
    hpMult: 0.52,
    speedMult: 0.8,
    countMult: 0.65,
    goldMult: 1.38,
    coinReward: 18,
  },
  medium: {
    id: "medium",
    label: "Medium",
    waves: 15,
    hpMult: 1,
    speedMult: 1,
    countMult: 1,
    goldMult: 1,
    coinReward: 28,
  },
  hard: {
    id: "hard",
    label: "Hard",
    waves: 20,
    hpMult: 1.4,
    speedMult: 1.12,
    countMult: 1.25,
    goldMult: 0.8,
    coinReward: 42,
  },
  nightmare: {
    id: "nightmare",
    label: "Nightmare",
    waves: 23,
    hpMult: 1.38,
    speedMult: 1.1,
    countMult: 1.22,
    goldMult: 0.72,
    coinReward: 58,
  },
  impossible: {
    id: "impossible",
    label: "Impossible",
    waves: 30,
    hpMult: 1.58,
    speedMult: 1.14,
    countMult: 1.28,
    goldMult: 0.62,
    coinReward: 80,
  },
  /** Portal special — harder than Hard, not as punishing as Nightmare/Impossible. */
  special: {
    id: "special",
    label: "Special operation",
    waves: 12,
    hpMult: 1.1,
    speedMult: 1.05,
    countMult: 1.06,
    goldMult: 0.96,
    coinReward: 48,
  },
};

/** Final wave boss per difficulty (mode-themed). */
const BOSS_FOR_DIFFICULTY = {
  easy: "boss_titan",
  medium: "boss_storm",
  hard: "boss_void",
  nightmare: "boss_chaos",
  impossible: "boss_apex",
  special: "boss_void",
};

const LS_COINS = "td_coins_v1";
const LS_INV = "td_inventory_v2";
const LS_CLEAR_EASY = "td_clear_easy_v1";
const LS_CLEAR_MEDIUM = "td_clear_medium_v1";
const LS_CLEAR_HARD = "td_clear_hard_v1";
const LS_SPECIAL_BEAT = "td_special_beat_v1";
const LS_MYSTERY_SHOP = "td_mystery_shop_v1";

/** Classic shop packs (original line). */
const BOT_PACK_PRICE = 22;
const SPACE_PACK_PRICE = 26;
const MONSTER_PACK_PRICE = 24;
const MATH_PACK_PRICE = 28;

const AURORA_PACK_PRICE = 22;
const GEAR_PACK_PRICE = 26;
const TRENCH_PACK_PRICE = 24;
const NOCTURNE_PACK_PRICE = 28;
const MYSTERY_PACK_A_PRICE = 34;
const MYSTERY_PACK_B_PRICE = 42;

/** Mystery shop — high variance, weighted toward upper tiers (unlock by clearing special op). */
const PACK_MYSTERY_A_IDS = [
  "brain_bot",
  "void_lens",
  "serpent_coil",
  "prime_beam",
  "lensflare",
  "steam_valve",
  "tideglass",
  "constellation",
];
const PACK_MYSTERY_B_IDS = [
  "ghost_bot",
  "singularity",
  "eldritch_eye",
  "golden_spiral",
  "dawnspire",
  "clockwork_eye",
  "abyss_hum",
  "eclipse_pin",
];

/** Always available without packs (most common). */
const COMMON_DEFENDER_IDS = ["astronaut", "sentry", "frost"];

const PACK_BOT_IDS = ["calm_bot", "sleepy_bot", "angry_bot", "brain_bot", "ghost_bot"];
const PACK_SPACE_IDS = ["orbit_sentry", "pulsar", "comet", "void_lens", "singularity"];
const PACK_MONSTER_IDS = ["goblin_tower", "spore_cannon", "magma_maw", "serpent_coil", "eldritch_eye"];
const PACK_MATH_IDS = ["abacus", "vector", "fractal", "prime_beam", "golden_spiral"];

/** Aurora Shelf — prisms & light. */
const PACK_AURORA_IDS = ["glimmer_turret", "halftone_shard", "afterimage", "lensflare", "dawnspire"];

/** Gearwright Box — clockwork & steam. */
const PACK_GEAR_IDS = ["brass_pin", "spring_ratchet", "steam_valve", "copper_coil", "clockwork_eye"];

/** Trench Bloom — tide & reef. */
const PACK_TRENCH_IDS = ["barnacle_post", "kelp_strand", "urchin_spike", "tideglass", "abyss_hum"];

/** Nocturne Satchel — meteors & night sky. */
const PACK_NOCTURNE_IDS = ["meteor_tick", "echo_bat", "lullaby_node", "constellation", "eclipse_pin"];

/** Every defender ID stored in inventory (classic + curated packs). */
const ALL_PACK_DEFENDER_IDS = [
  ...PACK_BOT_IDS,
  ...PACK_SPACE_IDS,
  ...PACK_MONSTER_IDS,
  ...PACK_MATH_IDS,
  ...PACK_AURORA_IDS,
  ...PACK_GEAR_IDS,
  ...PACK_TRENCH_IDS,
  ...PACK_NOCTURNE_IDS,
];

/** Enemy archetypes — some have special powers. */
const ENEMY_TYPES = {
  crawler: {
    id: "crawler",
    name: "Crawler",
    color: "#9b59b6",
    hpBase: 1,
    speedMult: 1,
    power: null,
    powerDesc: "No special ability — the standard block runner.",
  },
  runner: {
    id: "runner",
    name: "Runner",
    color: "#3498db",
    hpBase: 0.42,
    speedMult: 1.48,
    power: "speed",
    powerDesc: "Moves faster along the path.",
  },
  brute: {
    id: "brute",
    name: "Brute",
    color: "#c0392b",
    hpBase: 2.35,
    speedMult: 0.7,
    power: null,
    powerDesc: "No ability — very tanky but slow.",
  },
  ward: {
    id: "ward",
    name: "Ward",
    color: "#1abc9c",
    hpBase: 0.88,
    speedMult: 0.94,
    power: "shield",
    powerDesc: "Shield absorbs the first 8 damage before health drops.",
    shield: 8,
  },
  weaver: {
    id: "weaver",
    name: "Weaver",
    color: "#e67e22",
    hpBase: 0.82,
    speedMult: 1,
    power: "regen",
    powerDesc: "Regenerates 1 HP every 2 seconds (up to max).",
  },
  skimmer: {
    id: "skimmer",
    name: "Skimmer",
    color: "#f1c40f",
    hpBase: 0.62,
    speedMult: 1.22,
    power: "frost_resist",
    powerDesc: "Slow effects from towers are only half as strong.",
  },
  phantom: {
    id: "phantom",
    name: "Phantom",
    color: "#8e44ad",
    hpBase: 0.74,
    speedMult: 1,
    power: "resilient",
    powerDesc: "Takes 15% less damage from each hit.",
    damageTakenMult: 0.85,
  },
  carrier: {
    id: "carrier",
    name: "Carrier",
    color: "#e91e63",
    hpBase: 1.05,
    speedMult: 0.9,
    power: "adrenaline",
    powerDesc: "When hit, surges with speed for a short time.",
  },
  rainbow_block: {
    id: "rainbow_block",
    name: "Rainbow Block",
    color: "#e879f9",
    hpBase: 1,
    speedMult: 1,
    power: "transform",
    powerDesc: "Always 30 HP. When destroyed, becomes a random non-boss enemy.",
    fixedHp: 30,
  },
  wildcard_capsule: {
    id: "wildcard_capsule",
    name: "Wildcard Capsule",
    color: "#f59e0b",
    hpBase: 1,
    speedMult: 0.98,
    power: "transform",
    powerDesc:
      "Fixed 50 HP. When destroyed, becomes a random non-boss minion — any type in the roster, including Sneak Attacker.",
    fixedHp: 50,
  },
  bomber: {
    id: "bomber",
    name: "Bomber",
    color: "#b91c1c",
    hpBase: 1,
    speedMult: 0.78,
    power: "bomber",
    powerDesc: "100 HP. Periodically drops bombs on your towers — destroys one in range.",
    fixedHp: 100,
  },
  grime_crawler: {
    id: "grime_crawler",
    name: "Grime Crawler",
    color: "#6d597a",
    hpBase: 1.12,
    speedMult: 0.94,
    power: null,
    powerDesc: "Slightly tougher than a normal crawler — a bit slower.",
  },
  dartling: {
    id: "dartling",
    name: "Dartling",
    color: "#00b4d8",
    hpBase: 0.36,
    speedMult: 1.56,
    power: "speed",
    powerDesc: "Glass cannon — very fast, very fragile.",
  },
  shell_bug: {
    id: "shell_bug",
    name: "Shell Bug",
    color: "#95d5b2",
    hpBase: 0.72,
    speedMult: 0.88,
    power: "shield",
    powerDesc: "Carapace absorbs the first 6 damage.",
    shield: 6,
  },
  moss_wisp: {
    id: "moss_wisp",
    name: "Moss Wisp",
    color: "#588157",
    hpBase: 0.68,
    speedMult: 1.08,
    power: "regen",
    powerDesc: "Regenerates 1 HP every 2 seconds (up to max).",
  },
  buzzer: {
    id: "buzzer",
    name: "Buzzer",
    color: "#ff006e",
    hpBase: 0.58,
    speedMult: 1.42,
    power: "adrenaline",
    powerDesc: "When hit, surges forward briefly.",
  },
  iron_flake: {
    id: "iron_flake",
    name: "Iron Flake",
    color: "#adb5bd",
    hpBase: 1.18,
    speedMult: 0.82,
    power: "resilient",
    powerDesc: "Armored — takes 12% less damage from each hit.",
    damageTakenMult: 0.88,
  },
  chill_mite: {
    id: "chill_mite",
    name: "Chill Mite",
    color: "#48cae4",
    hpBase: 0.76,
    speedMult: 1.18,
    power: "frost_resist",
    powerDesc: "Slow effects from towers are only half as strong.",
  },
  swarm_mote: {
    id: "swarm_mote",
    name: "Swarm Mote",
    color: "#ffccd5",
    hpBase: 0.26,
    speedMult: 1.68,
    power: "speed",
    powerDesc: "Tiny and hyper-fast — dies in one solid hit if you can land it.",
  },
  mirror_tile: {
    id: "mirror_tile",
    name: "Mirror Tile",
    color: "#c8b6ff",
    hpBase: 0.92,
    speedMult: 1,
    power: "resilient",
    powerDesc: "Reflective plating — takes 10% less damage per hit.",
    damageTakenMult: 0.9,
  },
  bulwark: {
    id: "bulwark",
    name: "Bulwark",
    color: "#bc6c25",
    hpBase: 1.55,
    speedMult: 0.64,
    power: "shield",
    powerDesc: "Heavy shield absorbs the first 12 damage.",
    shield: 12,
  },
  buffer: {
    id: "buffer",
    name: "Buffer",
    color: "#a855f7",
    hpBase: 1,
    speedMult: 0.68,
    power: "buffer",
    powerDesc:
      "Support unit — 50 HP. Allies within range move faster, take less damage, and regenerate health.",
    fixedHp: 50,
  },
  ghost_block: {
    id: "ghost_block",
    name: "Ghost Block",
    color: "#cbd5e1",
    hpBase: 0.82,
    speedMult: 1.02,
    power: "ghost",
    powerDesc:
      "Phases invisible for 5 seconds — while faded, towers ignore it and shots cannot connect.",
  },
  sneak_attacker: {
    id: "sneak_attacker",
    name: "Sneak Attacker",
    color: "#7f1d1d",
    hpBase: 1,
    speedMult: 1.18,
    power: "sneak_attacker",
    powerDesc:
      "10 HP. When it enters from waves, 3% chance to replace a normal spawn — destroys one random tower first, then appears.",
    fixedHp: 10,
  },
  siege_colossus: {
    id: "siege_colossus",
    name: "Siege Colossus",
    color: "#5d4e37",
    hpBase: 2.48,
    speedMult: 0.52,
    power: "shield",
    powerDesc: "Elite siege unit — a huge shield absorbs the first 24 damage.",
    shield: 24,
  },
  gloom_reaper: {
    id: "gloom_reaper",
    name: "Gloom Reaper",
    color: "#2c1810",
    hpBase: 1.55,
    speedMult: 0.82,
    power: "resilient",
    powerDesc: "Elite chassis — takes 32% less damage from every hit.",
    damageTakenMult: 0.68,
  },
  tempest_skirmisher: {
    id: "tempest_skirmisher",
    name: "Tempest Skirmisher",
    color: "#00a8e8",
    hpBase: 1.12,
    speedMult: 1.44,
    power: "frost_resist",
    powerDesc: "Elite skirmisher — shrugs off slows and moves at frightening speed.",
  },
  blood_warden: {
    id: "blood_warden",
    name: "Blood Warden",
    color: "#8b1538",
    hpBase: 1.9,
    speedMult: 0.7,
    power: "regen",
    powerDesc: "Elite ward — very durable; regenerates 1 HP every 2 seconds.",
  },
  apex_stalker: {
    id: "apex_stalker",
    name: "Apex Stalker",
    color: "#d4a017",
    hpBase: 1.42,
    speedMult: 1.12,
    power: "adrenaline",
    powerDesc: "Elite hunter — when hit, surges forward with brutal speed bursts.",
  },
  boss_titan: {
    id: "boss_titan",
    name: "Titan Block",
    color: "#7f8c8d",
    hpBase: 11,
    speedMult: 0.52,
    isBoss: true,
    power: "boss",
    powerDesc: "Easy boss — slow stone colossus.",
  },
  boss_storm: {
    id: "boss_storm",
    name: "Storm Core",
    color: "#2980b9",
    hpBase: 13,
    speedMult: 0.62,
    isBoss: true,
    power: "boss",
    powerDesc: "Medium boss — rolling lightning mass.",
  },
  boss_void: {
    id: "boss_void",
    name: "Void Walker",
    color: "#5b2c6f",
    hpBase: 15,
    speedMult: 0.68,
    isBoss: true,
    power: "boss",
    powerDesc: "Hard boss — phases with void resistance.",
    damageTakenMult: 0.88,
  },
  boss_chaos: {
    id: "boss_chaos",
    name: "Chaos Prism",
    color: "#c0392b",
    hpBase: 17,
    speedMult: 0.75,
    isBoss: true,
    power: "boss",
    powerDesc: "Nightmare boss — erratic speed surges.",
  },
  boss_apex: {
    id: "boss_apex",
    name: "Apex Singularity",
    color: "#1a1a2e",
    hpBase: 20,
    speedMult: 0.78,
    isBoss: true,
    power: "boss",
    powerDesc: "Impossible boss — dense and relentless (still beatable).",
    damageTakenMult: 0.82,
    shield: 12,
  },
};

const MAPS = {
  classic: {
    id: "classic",
    name: "Training Ground",
    theme: "classic",
    waypoints: [
      { x: 0, y: 260 },
      { x: 200, y: 260 },
      { x: 200, y: 120 },
      { x: 440, y: 120 },
      { x: 440, y: 380 },
      { x: 680, y: 380 },
      { x: 680, y: 200 },
      { x: 820, y: 200 },
    ],
    base: { x: 820, y: 200, radius: 28, maxHp: BASE_HP_FIXED },
  },
  forest: {
    id: "forest",
    name: "Whisper Woods",
    theme: "forest",
    waypoints: [
      { x: 0, y: 300 },
      { x: 220, y: 300 },
      { x: 220, y: 140 },
      { x: 480, y: 140 },
      { x: 480, y: 400 },
      { x: 700, y: 400 },
      { x: 700, y: 200 },
      { x: 820, y: 200 },
    ],
    base: { x: 820, y: 200, radius: 28, maxHp: BASE_HP_FIXED },
  },
  desert: {
    id: "desert",
    name: "Sunscar Dunes",
    theme: "desert",
    waypoints: [
      { x: 0, y: 180 },
      { x: 360, y: 180 },
      { x: 360, y: 420 },
      { x: 640, y: 420 },
      { x: 640, y: 240 },
      { x: 820, y: 240 },
    ],
    base: { x: 820, y: 240, radius: 28, maxHp: BASE_HP_FIXED },
  },
  disco: {
    id: "disco",
    name: "Disco City",
    theme: "disco",
    waypoints: [
      { x: 0, y: 420 },
      { x: 280, y: 420 },
      { x: 280, y: 160 },
      { x: 520, y: 160 },
      { x: 520, y: 340 },
      { x: 720, y: 340 },
      { x: 720, y: 220 },
      { x: 820, y: 220 },
    ],
    base: { x: 820, y: 220, radius: 28, maxHp: BASE_HP_FIXED },
  },
  snowy: {
    id: "snowy",
    name: "Snowy Mountain",
    theme: "snowy",
    waypoints: [
      { x: 0, y: 200 },
      { x: 240, y: 200 },
      { x: 240, y: 380 },
      { x: 480, y: 380 },
      { x: 480, y: 120 },
      { x: 680, y: 120 },
      { x: 680, y: 260 },
      { x: 820, y: 260 },
    ],
    base: { x: 820, y: 260, radius: 28, maxHp: BASE_HP_FIXED },
  },
  factory: {
    id: "factory",
    name: "Big Factory",
    theme: "factory",
    waypoints: [
      { x: 0, y: 320 },
      { x: 400, y: 320 },
      { x: 400, y: 100 },
      { x: 650, y: 100 },
      { x: 650, y: 400 },
      { x: 820, y: 400 },
    ],
    base: { x: 820, y: 400, radius: 28, maxHp: BASE_HP_FIXED },
  },
  coast: {
    id: "coast",
    name: "Tidal Coast",
    theme: "coast",
    waypoints: [
      { x: 0, y: 100 },
      { x: 200, y: 100 },
      { x: 200, y: 300 },
      { x: 450, y: 300 },
      { x: 450, y: 140 },
      { x: 720, y: 140 },
      { x: 720, y: 280 },
      { x: 820, y: 280 },
    ],
    base: { x: 820, y: 280, radius: 28, maxHp: BASE_HP_FIXED },
  },
  metro: {
    id: "metro",
    name: "Metro Core",
    theme: "metro",
    waypoints: [
      { x: 0, y: 260 },
      { x: 180, y: 260 },
      { x: 180, y: 140 },
      { x: 420, y: 140 },
      { x: 420, y: 400 },
      { x: 640, y: 400 },
      { x: 640, y: 200 },
      { x: 820, y: 200 },
    ],
    base: { x: 820, y: 200, radius: 28, maxHp: BASE_HP_FIXED },
  },
  /** Stronger minions (+10% HP & speed) on their home turf. */
  enemys_base: {
    id: "enemys_base",
    name: "Enemy's Base",
    theme: "enemys_base",
    enemyStrengthMult: 1.1,
    waypoints: [
      { x: 0, y: 280 },
      { x: 320, y: 280 },
      { x: 320, y: 140 },
      { x: 560, y: 140 },
      { x: 560, y: 360 },
      { x: 760, y: 360 },
      { x: 760, y: 220 },
      { x: 820, y: 220 },
    ],
    base: { x: 820, y: 220, radius: 28, maxHp: BASE_HP_FIXED },
  },
  math_contest: {
    id: "math_contest",
    name: "Math Contest",
    theme: "math_contest",
    waypoints: [
      { x: 0, y: 240 },
      { x: 200, y: 240 },
      { x: 200, y: 100 },
      { x: 500, y: 100 },
      { x: 500, y: 420 },
      { x: 680, y: 420 },
      { x: 680, y: 180 },
      { x: 820, y: 180 },
    ],
    base: { x: 820, y: 180, radius: 28, maxHp: BASE_HP_FIXED },
  },
  /** Custom painted backdrop — see `assets/space-map.png`. */
  space_ribbon: {
    id: "space_ribbon",
    name: "Space Ribbon",
    theme: "space_map",
    waypoints: [
      { x: 0, y: 260 },
      { x: 200, y: 260 },
      { x: 200, y: 140 },
      { x: 420, y: 140 },
      { x: 420, y: 400 },
      { x: 640, y: 400 },
      { x: 640, y: 200 },
      { x: 820, y: 200 },
    ],
    base: { x: 820, y: 200, radius: 28, maxHp: BASE_HP_FIXED },
  },
};

let PATH_WAYPOINTS = [...MAPS.space_ribbon.waypoints];
let BASE = { ...MAPS.space_ribbon.base };
let PATH_CELL_KEYS = new Set();
let TOTAL_PATH_LEN = 0;

/** @type {string} */
let currentGameMode = GAME_MODE.campaign;
let battleTimeLeft = 0;
let playerBattleKills = 0;
let botBattleKills = 0;
/** @type {string} */
let battleDifficultyId = "medium";
/** @type {Record<string, boolean>} */
const keysDown = {};

/** War: trees/rocks block building and block tower LOS to enemies. */
const warSolidCells = new Set();
/** War: brush — buildable; shots through brush deal less damage. */
const warCoverCells = new Set();
/** Campaign map when mode is Special (portal). */
let specialCampaignMapId = "space_ribbon";

/** Raider / War: units you send along the path (same `enemies` array, flagged). */
let botDefenders = [];
let botTowerAcc = 0;
let botBaseHp = 0;
/** War: enemy HQ health; raid units that reach the path end chip this down. */
let warEnemyBaseHp = 0;
/** After your base HP hits 0 in War, this guardian must survive. */
let warGuardBossHp = 0;
let warPhase = "normal";
let warEnemyBossId = null;

/** Raid tier (1–15): gates spawnable enemy types; rises over time in Endurance raid / War. */
let raidUnlockWave = 1;
let raidUnlockAcc = 0;
const RAID_UNLOCK_INTERVAL_SEC = 38;
const RAID_UNLOCK_MAX = 15;
/** @type {Record<string, number> | null} */
let raidMinWaveCache = null;

function pathCellsFromWaypoints(waypoints) {
  const cells = new Set();
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    const steps = Math.max(
      Math.ceil(Math.abs(b.x - a.x) / CELL),
      Math.ceil(Math.abs(b.y - a.y) / CELL),
      1
    );
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = a.x + (b.x - a.x) * t;
      const py = a.y + (b.y - a.y) * t;
      const cx = Math.floor(px / CELL);
      const cy = Math.floor(py / CELL);
      if (cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS) {
        cells.add(`${cx},${cy}`);
      }
    }
  }
  return cells;
}

function pathLength(waypoints) {
  let len = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    len += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return len;
}

function applyMap(mapId) {
  const m = MAPS[mapId];
  if (!m) return;
  PATH_WAYPOINTS = m.waypoints.map((p) => ({ ...p }));
  BASE = { ...m.base, maxHp: BASE_HP_FIXED };
  PATH_CELL_KEYS = pathCellsFromWaypoints(PATH_WAYPOINTS);
  TOTAL_PATH_LEN = pathLength(PATH_WAYPOINTS);
  currentMapId = mapId;
  currentTheme = m.theme;
}

function applyPlayfieldSize(w, h) {
  W = w;
  H = h;
  COLS = Math.floor(W / CELL);
  ROWS = Math.floor(H / CELL);
  const cv = document.getElementById("game");
  if (cv) {
    cv.width = W;
    cv.height = H;
  }
}

function cellNeighborsPath(col, row) {
  for (const pk of PATH_CELL_KEYS) {
    const [pc, pr] = pk.split(",").map(Number);
    if (Math.abs(pc - col) + Math.abs(pr - row) === 1) return true;
  }
  return false;
}

/** War: brush and rocks on cells beside the path — solids block LOS and placement. */
function buildWarTerrain() {
  warSolidCells.clear();
  warCoverCells.clear();
  const mapSalt = (currentMapId || "").length + 77;
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const key = `${c},${r}`;
      if (PATH_CELL_KEYS.has(key)) continue;
      if (!cellNeighborsPath(c, r)) continue;
      const n = (c * 73 + r * 47 + mapSalt) % 100;
      if (n < 11) warSolidCells.add(key);
      else if (n < 31) warCoverCells.add(key);
    }
  }
}

function bresenhamLineKeys(c0, r0, c1, r1) {
  const cells = [];
  let x0 = c0;
  let y0 = r0;
  const x1 = c1;
  const y1 = r1;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  while (true) {
    cells.push(`${x0},${y0}`);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
  return cells;
}

/** War: no solid cell between tower and target (LOS). */
function warLineLosClear(x1, y1, x2, y2) {
  const c0 = Math.floor(x1 / CELL);
  const r0 = Math.floor(y1 / CELL);
  const c1 = Math.floor(x2 / CELL);
  const r1 = Math.floor(y2 / CELL);
  const line = bresenhamLineKeys(c0, r0, c1, r1);
  for (let i = 1; i < line.length - 1; i++) {
    if (warSolidCells.has(line[i])) return false;
  }
  return true;
}

/** War: damage through brush along the shot line. */
function warShotLineCoverFactor(x1, y1, x2, y2) {
  const c0 = Math.floor(x1 / CELL);
  const r0 = Math.floor(y1 / CELL);
  const c1 = Math.floor(x2 / CELL);
  const r1 = Math.floor(y2 / CELL);
  const line = bresenhamLineKeys(c0, r0, c1, r1);
  let brush = 0;
  for (let i = 1; i < line.length - 1; i++) {
    if (warCoverCells.has(line[i])) brush++;
  }
  if (brush === 0) return 1;
  return Math.max(0.55, 1 - 0.09 * brush);
}

function enemyInWarCoverCell(ex, ey) {
  const k = `${Math.floor(ex / CELL)},${Math.floor(ey / CELL)}`;
  return warCoverCells.has(k);
}

function isBuildable(col, row) {
  const key = `${col},${row}`;
  if (currentGameMode === GAME_MODE.war && warSolidCells.has(key)) return false;
  if (PATH_CELL_KEYS.has(key)) return false;
  for (const pk of PATH_CELL_KEYS) {
    const [pc, pr] = pk.split(",").map(Number);
    const d = Math.abs(pc - col) + Math.abs(pr - row);
    if (d === 1) return true;
  }
  return false;
}

function pointOnPath(distance) {
  let remaining = distance;
  for (let i = 0; i < PATH_WAYPOINTS.length - 1; i++) {
    const a = PATH_WAYPOINTS[i];
    const b = PATH_WAYPOINTS[i + 1];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    if (remaining <= segLen) {
      const t = segLen > 0 ? remaining / segLen : 0;
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      };
    }
    remaining -= segLen;
  }
  const last = PATH_WAYPOINTS[PATH_WAYPOINTS.length - 1];
  return { x: last.x, y: last.y };
}

function getDifficulty() {
  if (currentGameMode === GAME_MODE.special) {
    return DIFFICULTY_MODES.special;
  }
  if (currentGameMode === GAME_MODE.battle || currentGameMode === GAME_MODE.raider) {
    return DIFFICULTY_MODES.medium;
  }
  return DIFFICULTY_MODES[currentDifficultyId] || DIFFICULTY_MODES.medium;
}

function getMaxWaves() {
  return getDifficulty().waves || 15;
}

function poolForWave(waveNum) {
  const pool = ["crawler"];
  if (waveNum >= 2) {
    pool.push("runner", "grime_crawler");
  }
  if (waveNum >= 3) {
    pool.push("brute", "dartling");
  }
  if (waveNum >= 4) {
    pool.push("ward", "shell_bug");
  }
  if (waveNum >= 5) {
    pool.push("weaver", "rainbow_block", "wildcard_capsule");
  }
  if (waveNum >= 6) {
    pool.push("skimmer", "moss_wisp");
  }
  if (waveNum >= 7) {
    pool.push("phantom", "buzzer");
  }
  if (waveNum >= 8) {
    pool.push("carrier", "iron_flake");
  }
  if (waveNum >= 9) pool.push("chill_mite");
  if (waveNum >= 10) pool.push("swarm_mote");
  if (waveNum >= 11) pool.push("mirror_tile", "ghost_block");
  if (waveNum >= 12) pool.push("bulwark");
  if (waveNum >= 10) pool.push("buffer");
  if (waveNum >= 14) pool.push("bomber");
  if (waveNum >= 13) {
    pool.push(
      "siege_colossus",
      "gloom_reaper",
      "tempest_skirmisher",
      "blood_warden",
      "apex_stalker"
    );
  }
  return pool;
}

function ensureRaidMinWaveCache() {
  if (raidMinWaveCache) return;
  raidMinWaveCache = {};
  for (let w = 1; w <= 20; w++) {
    const pool = poolForWave(w);
    for (const id of pool) {
      if (raidMinWaveCache[id] == null) raidMinWaveCache[id] = w;
    }
  }
}

function raidMinWaveForType(typeId) {
  ensureRaidMinWaveCache();
  if (typeId === "sneak_attacker") return 6;
  return raidMinWaveCache[typeId] ?? 99;
}

function raidGoldCostForType(typeId) {
  const def = ENEMY_TYPES[typeId];
  const mw = raidMinWaveForType(typeId);
  if (!def) return 28;
  const hp = def.hpBase != null ? def.hpBase : 1;
  // Tuned so bot-tower kills (~goldForEnemyKill) roughly break even with deploy cost in raider/war.
  return Math.max(10, Math.floor(10 + mw * 2 + hp * 6));
}

/** Gold when an enemy dies to a projectile (raid units get extra bounty in raider/war). */
function goldForEnemyKill(e) {
  const gm = getDifficulty().goldMult;
  const base = Math.floor((12 + wave) * gm);
  if (
    e.fromPlayerRaid &&
    (currentGameMode === GAME_MODE.raider || currentGameMode === GAME_MODE.war)
  ) {
    const cost = raidGoldCostForType(e.enemyTypeId);
    return Math.floor(cost * 0.62) + base;
  }
  return base;
}

function populateRaidEnemySelect() {
  const sel = document.getElementById("raid-enemy-select");
  if (!sel) return;
  ensureRaidMinWaveCache();
  const prev = sel.value;
  sel.innerHTML = "";
  const ids = Object.keys(ENEMY_TYPES).filter((id) => !ENEMY_TYPES[id].isBoss);
  ids.sort((a, b) => {
    const da = raidMinWaveForType(a) - raidMinWaveForType(b);
    if (da !== 0) return da;
    return ENEMY_TYPES[a].name.localeCompare(ENEMY_TYPES[b].name);
  });
  let firstAllowed = "";
  for (const id of ids) {
    const def = ENEMY_TYPES[id];
    const mw = raidMinWaveForType(id);
    const cost = raidGoldCostForType(id);
    const opt = document.createElement("option");
    opt.value = id;
    const locked = raidUnlockWave < mw;
    opt.textContent = locked
      ? `${def.name} — ${cost}g (tier ≥${mw})`
      : `${def.name} — ${cost}g`;
    opt.disabled = locked;
    sel.appendChild(opt);
    if (!locked && !firstAllowed) firstAllowed = id;
  }
  if (firstAllowed) sel.value = firstAllowed;
  else if (prev && ids.includes(prev)) sel.value = prev;
}

function tickRaidUnlock(dt) {
  if (currentGameMode !== GAME_MODE.raider && currentGameMode !== GAME_MODE.war) return;
  raidUnlockAcc += dt;
  if (raidUnlockAcc >= RAID_UNLOCK_INTERVAL_SEC) {
    raidUnlockAcc = 0;
    if (raidUnlockWave < RAID_UNLOCK_MAX) {
      raidUnlockWave++;
      populateRaidEnemySelect();
      setMessage(`Raid tier ${raidUnlockWave}/${RAID_UNLOCK_MAX} — more enemy types unlocked.`);
    }
  }
}

function buildWaveQueue(waveNum) {
  const d = getDifficulty();
  const maxW = getMaxWaves();
  if (waveNum === maxW) {
    const diffId = getDifficulty().id;
    const bossId = BOSS_FOR_DIFFICULTY[diffId] || "boss_titan";
    const pool = poolForWave(waveNum);
    const q = [];
    const escort = Math.max(3, Math.floor(5 + waveNum * 0.35 * d.countMult));
    for (let i = 0; i < escort; i++) {
      q.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    q.push(bossId);
    return applySneakAttackerWaveQuota(q);
  }
  const count = Math.max(3, Math.floor((8 + waveNum * 2) * d.countMult));
  const pool = poolForWave(waveNum);
  const q = [];
  for (let i = 0; i < count; i++) {
    q.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return applySneakAttackerWaveQuota(q);
}

/** ~3% of wave spawns (rounded) become Sneak Attacker; replaces per-spawn 3% rolls. */
function applySneakAttackerWaveQuota(q) {
  if (currentGameMode === GAME_MODE.raider) return q.slice();
  const eligible = [];
  for (let i = 0; i < q.length; i++) {
    if (!ENEMY_TYPES[q[i]].isBoss) eligible.push(i);
  }
  const n = Math.round(q.length * 0.03);
  if (n <= 0 || eligible.length === 0) return q.slice();
  const pickCount = Math.min(n, eligible.length);
  const idxs = eligible.slice();
  for (let i = idxs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
  }
  const out = q.slice();
  for (let k = 0; k < pickCount; k++) {
    out[idxs[k]] = "sneak_attacker";
  }
  return out;
}

function mapEnemyStrengthMult() {
  const m = MAPS[currentMapId];
  return m && m.enemyStrengthMult != null ? m.enemyStrengthMult : 1;
}

function scaledEnemyHp(typeId, waveNum) {
  const def = ENEMY_TYPES[typeId];
  const em = mapEnemyStrengthMult();
  if (def.fixedHp != null) return Math.max(1, Math.floor(def.fixedHp * em));
  const d = getDifficulty();
  const baseHp = 4 + waveNum * 2;
  let hp = baseHp * def.hpBase * d.hpMult;
  if (def.isBoss) hp *= 1.38;
  return Math.max(1, Math.floor(hp * em));
}

/** Random type when Rainbow Block breaks (no bosses, no second rainbow). */
const RAINBOW_EXCLUDED_ENEMY_IDS = new Set([
  "rainbow_block",
  "wildcard_capsule",
  "bomber",
  "buffer",
  "ghost_block",
  "sneak_attacker",
  "siege_colossus",
  "gloom_reaper",
  "tempest_skirmisher",
  "blood_warden",
  "apex_stalker",
]);

function pickRainbowTransformTypeId() {
  const pool = Object.keys(ENEMY_TYPES).filter(
    (id) => !ENEMY_TYPES[id].isBoss && !RAINBOW_EXCLUDED_ENEMY_IDS.has(id)
  );
  return pool[Math.floor(Math.random() * pool.length)] || "crawler";
}

/** Random non-boss when Wildcard Capsule breaks — includes Sneak Attacker; excludes only this shell. */
function pickWildcardCapsuleTransformTypeId() {
  const pool = Object.keys(ENEMY_TYPES).filter((id) => !ENEMY_TYPES[id].isBoss && id !== "wildcard_capsule");
  return pool[Math.floor(Math.random() * pool.length)] || "crawler";
}

const GHOST_INVISIBLE_MS = 5000;
const GHOST_VISIBLE_MS = 3500;

function enemyIsGhostInvisible(e) {
  const d = ENEMY_TYPES[e.enemyTypeId];
  return !!(d && d.power === "ghost" && e.ghostPhase === "invisible");
}

function transformEnemyInPlace(e, innerTypeId) {
  const def = ENEMY_TYPES[innerTypeId];
  const d = getDifficulty();
  const maxHp = scaledEnemyHp(innerTypeId, wave);
  const baseSpeed = 55 + wave * 5;
  const spd = baseSpeed * def.speedMult * d.speedMult;
  e.enemyTypeId = innerTypeId;
  e.typeName = def.name;
  e.hp = maxHp;
  e.maxHp = maxHp;
  e.color = def.color;
  e.baseSpeed = spd;
  e.isBoss = !!def.isBoss;
  e.blockSize = def.isBoss ? 28 : 16;
  delete e.shieldLeft;
  if (def.shield != null) e.shieldLeft = def.shield;
  delete e.damageTakenMult;
  if (def.damageTakenMult != null) e.damageTakenMult = def.damageTakenMult;
  delete e.frostResist;
  if (def.power === "frost_resist") e.frostResist = 0.5;
  e.regenAcc = 0;
  e.boostUntil = 0;
  e.slowUntil = 0;
  e.slowFactor = 1;
  delete e.ghostPhase;
  delete e.ghostPhaseEnd;
  if (def.power === "ghost") {
    e.ghostPhase = "visible";
    e.ghostPhaseEnd = performance.now() + GHOST_VISIBLE_MS;
  }
}

const DEFENDER_TYPES = {
  astronaut: {
    id: "astronaut",
    name: "Astronaut",
    cost: 75,
    range: 150,
    damage: 3,
    reloadMs: 500,
    projectile: "planet",
    color: "#c8e6ff",
  },
  sentry: {
    id: "sentry",
    name: "Sentry",
    cost: 45,
    range: 120,
    damage: 1,
    reloadMs: 400,
    projectile: "bullet",
    color: "#ffd56a",
  },
  frost: {
    id: "frost",
    name: "Frost Bot",
    cost: 90,
    range: 130,
    damage: 2,
    reloadMs: 1200,
    projectile: "shard",
    color: "#7dd3fc",
    slow: 0.45,
    slowMs: 2000,
  },
  prism: {
    id: "prism",
    name: "Prism",
    cost: 100,
    range: 178,
    damage: 4,
    reloadMs: 1400,
    projectile: "beam",
    color: "#dda0dd",
  },
  volt: {
    id: "volt",
    name: "Volt",
    cost: 88,
    range: 132,
    damage: 5,
    reloadMs: 750,
    projectile: "volt",
    color: "#a78bfa",
  },
  calm_bot: {
    id: "calm_bot",
    name: "Calm Bot",
    fromPack: true,
    packKind: "bot",
    cost: 42,
    range: 118,
    damage: 1.2,
    reloadMs: 550,
    projectile: "bullet",
    color: "#aed581",
  },
  sleepy_bot: {
    id: "sleepy_bot",
    name: "Sleepy Bot",
    fromPack: true,
    packKind: "bot",
    cost: 48,
    range: 122,
    damage: 1.5,
    reloadMs: 950,
    projectile: "shard",
    color: "#90caf9",
    slow: 0.55,
    slowMs: 1800,
  },
  angry_bot: {
    id: "angry_bot",
    name: "Angry Bot",
    fromPack: true,
    packKind: "bot",
    cost: 62,
    range: 128,
    damage: 3.2,
    reloadMs: 420,
    projectile: "bullet",
    color: "#ef5350",
  },
  brain_bot: {
    id: "brain_bot",
    name: "Brain Bot",
    fromPack: true,
    packKind: "bot",
    cost: 85,
    range: 168,
    damage: 4.2,
    reloadMs: 1100,
    projectile: "beam",
    color: "#ba68c8",
  },
  ghost_bot: {
    id: "ghost_bot",
    name: "Ghost Bot",
    fromPack: true,
    packKind: "bot",
    cost: 95,
    range: 145,
    damage: 6,
    reloadMs: 520,
    projectile: "volt",
    color: "#eceff1",
  },
  orbit_sentry: {
    id: "orbit_sentry",
    name: "Orbit Sentry",
    fromPack: true,
    packKind: "space",
    cost: 58,
    range: 128,
    damage: 1.5,
    reloadMs: 480,
    projectile: "bullet",
    color: "#7ec8e3",
  },
  pulsar: {
    id: "pulsar",
    name: "Pulsar",
    fromPack: true,
    packKind: "space",
    cost: 68,
    range: 136,
    damage: 4.2,
    reloadMs: 820,
    projectile: "volt",
    color: "#a78bfa",
  },
  comet: {
    id: "comet",
    name: "Comet",
    fromPack: true,
    packKind: "space",
    cost: 74,
    range: 142,
    damage: 3.8,
    reloadMs: 680,
    projectile: "planet",
    color: "#fde68a",
  },
  void_lens: {
    id: "void_lens",
    name: "Void Lens",
    fromPack: true,
    packKind: "space",
    cost: 86,
    range: 172,
    damage: 4.8,
    reloadMs: 1280,
    projectile: "beam",
    color: "#c4b5fd",
  },
  singularity: {
    id: "singularity",
    name: "Singularity",
    fromPack: true,
    packKind: "space",
    cost: 98,
    range: 138,
    damage: 7.2,
    reloadMs: 640,
    projectile: "volt",
    color: "#6366f1",
  },
  goblin_tower: {
    id: "goblin_tower",
    name: "Goblin Tower",
    fromPack: true,
    packKind: "monster",
    cost: 44,
    range: 115,
    damage: 1.1,
    reloadMs: 380,
    projectile: "bullet",
    color: "#86efac",
  },
  spore_cannon: {
    id: "spore_cannon",
    name: "Spore Cannon",
    fromPack: true,
    packKind: "monster",
    cost: 56,
    range: 124,
    damage: 2,
    reloadMs: 1100,
    projectile: "shard",
    color: "#a3e635",
    slow: 0.48,
    slowMs: 2100,
  },
  magma_maw: {
    id: "magma_maw",
    name: "Magma Maw",
    fromPack: true,
    packKind: "monster",
    cost: 78,
    range: 132,
    damage: 4.5,
    reloadMs: 1000,
    projectile: "beam",
    color: "#f97316",
  },
  serpent_coil: {
    id: "serpent_coil",
    name: "Serpent Coil",
    fromPack: true,
    packKind: "monster",
    cost: 70,
    range: 148,
    damage: 2.8,
    reloadMs: 520,
    projectile: "bullet",
    color: "#34d399",
  },
  eldritch_eye: {
    id: "eldritch_eye",
    name: "Eldritch Eye",
    fromPack: true,
    packKind: "monster",
    cost: 94,
    range: 152,
    damage: 6.5,
    reloadMs: 780,
    projectile: "volt",
    color: "#f472b6",
  },
  abacus: {
    id: "abacus",
    name: "Abacus",
    fromPack: true,
    packKind: "math",
    cost: 46,
    range: 118,
    damage: 0.95,
    reloadMs: 320,
    projectile: "bullet",
    color: "#fcd34d",
  },
  vector: {
    id: "vector",
    name: "Vector",
    fromPack: true,
    packKind: "math",
    cost: 60,
    range: 134,
    damage: 2.2,
    reloadMs: 1050,
    projectile: "shard",
    color: "#38bdf8",
    slow: 0.5,
    slowMs: 1900,
  },
  fractal: {
    id: "fractal",
    name: "Fractal",
    fromPack: true,
    packKind: "math",
    cost: 76,
    range: 160,
    damage: 3.8,
    reloadMs: 1350,
    projectile: "beam",
    color: "#e879f9",
  },
  prime_beam: {
    id: "prime_beam",
    name: "Prime Beam",
    fromPack: true,
    packKind: "math",
    cost: 84,
    range: 156,
    damage: 5.2,
    reloadMs: 1150,
    projectile: "beam",
    color: "#fbbf24",
  },
  golden_spiral: {
    id: "golden_spiral",
    name: "Golden Spiral",
    fromPack: true,
    packKind: "math",
    cost: 96,
    range: 140,
    damage: 5.5,
    reloadMs: 720,
    projectile: "planet",
    color: "#f59e0b",
  },
  glimmer_turret: {
    id: "glimmer_turret",
    name: "Glimmer Turret",
    fromPack: true,
    packKind: "aurora",
    cost: 42,
    range: 120,
    damage: 1.25,
    reloadMs: 540,
    projectile: "bullet",
    color: "#a5f3fc",
  },
  halftone_shard: {
    id: "halftone_shard",
    name: "Halftone Shard",
    fromPack: true,
    packKind: "aurora",
    cost: 50,
    range: 124,
    damage: 1.55,
    reloadMs: 960,
    projectile: "shard",
    color: "#67e8f9",
    slow: 0.52,
    slowMs: 1850,
  },
  afterimage: {
    id: "afterimage",
    name: "Afterimage",
    fromPack: true,
    packKind: "aurora",
    cost: 62,
    range: 130,
    damage: 3.1,
    reloadMs: 430,
    projectile: "bullet",
    color: "#22d3ee",
  },
  lensflare: {
    id: "lensflare",
    name: "Lensflare",
    fromPack: true,
    packKind: "aurora",
    cost: 86,
    range: 170,
    damage: 4.1,
    reloadMs: 1120,
    projectile: "beam",
    color: "#fde68a",
  },
  dawnspire: {
    id: "dawnspire",
    name: "Dawnspire",
    fromPack: true,
    packKind: "aurora",
    cost: 96,
    range: 142,
    damage: 6.1,
    reloadMs: 530,
    projectile: "volt",
    color: "#fef08a",
  },
  brass_pin: {
    id: "brass_pin",
    name: "Brass Pin",
    fromPack: true,
    packKind: "gear",
    cost: 46,
    range: 116,
    damage: 1.05,
    reloadMs: 390,
    projectile: "bullet",
    color: "#d4a574",
  },
  spring_ratchet: {
    id: "spring_ratchet",
    name: "Spring Ratchet",
    fromPack: true,
    packKind: "gear",
    cost: 56,
    range: 126,
    damage: 2.05,
    reloadMs: 1080,
    projectile: "shard",
    color: "#b45309",
    slow: 0.46,
    slowMs: 2050,
  },
  steam_valve: {
    id: "steam_valve",
    name: "Steam Valve",
    fromPack: true,
    packKind: "gear",
    cost: 78,
    range: 134,
    damage: 4.45,
    reloadMs: 1020,
    projectile: "beam",
    color: "#9a3412",
  },
  copper_coil: {
    id: "copper_coil",
    name: "Copper Coil",
    fromPack: true,
    packKind: "gear",
    cost: 70,
    range: 146,
    damage: 2.75,
    reloadMs: 510,
    projectile: "bullet",
    color: "#ea580c",
  },
  clockwork_eye: {
    id: "clockwork_eye",
    name: "Clockwork Eye",
    fromPack: true,
    packKind: "gear",
    cost: 94,
    range: 150,
    damage: 6.4,
    reloadMs: 770,
    projectile: "volt",
    color: "#fbbf24",
  },
  barnacle_post: {
    id: "barnacle_post",
    name: "Barnacle Post",
    fromPack: true,
    packKind: "trench",
    cost: 44,
    range: 114,
    damage: 1.08,
    reloadMs: 385,
    projectile: "bullet",
    color: "#5eead4",
  },
  kelp_strand: {
    id: "kelp_strand",
    name: "Kelp Strand",
    fromPack: true,
    packKind: "trench",
    cost: 56,
    range: 122,
    damage: 1.95,
    reloadMs: 1090,
    projectile: "shard",
    color: "#34d399",
    slow: 0.49,
    slowMs: 2080,
  },
  urchin_spike: {
    id: "urchin_spike",
    name: "Urchin Spike",
    fromPack: true,
    packKind: "trench",
    cost: 72,
    range: 136,
    damage: 3.75,
    reloadMs: 670,
    projectile: "bullet",
    color: "#14b8a6",
  },
  tideglass: {
    id: "tideglass",
    name: "Tideglass",
    fromPack: true,
    packKind: "trench",
    cost: 84,
    range: 158,
    damage: 4.85,
    reloadMs: 1260,
    projectile: "beam",
    color: "#7dd3fc",
  },
  abyss_hum: {
    id: "abyss_hum",
    name: "Abyss Hum",
    fromPack: true,
    packKind: "trench",
    cost: 98,
    range: 140,
    damage: 7.0,
    reloadMs: 635,
    projectile: "volt",
    color: "#1e3a5f",
  },
  meteor_tick: {
    id: "meteor_tick",
    name: "Meteor Tick",
    fromPack: true,
    packKind: "nocturne",
    cost: 48,
    range: 120,
    damage: 1.0,
    reloadMs: 330,
    projectile: "bullet",
    color: "#c4b5fd",
  },
  echo_bat: {
    id: "echo_bat",
    name: "Echo Bat",
    fromPack: true,
    packKind: "nocturne",
    cost: 60,
    range: 132,
    damage: 2.15,
    reloadMs: 1040,
    projectile: "shard",
    color: "#a78bfa",
    slow: 0.51,
    slowMs: 1920,
  },
  lullaby_node: {
    id: "lullaby_node",
    name: "Lullaby Node",
    fromPack: true,
    packKind: "nocturne",
    cost: 76,
    range: 162,
    damage: 3.9,
    reloadMs: 1360,
    projectile: "beam",
    color: "#e9d5ff",
  },
  constellation: {
    id: "constellation",
    name: "Constellation",
    fromPack: true,
    packKind: "nocturne",
    cost: 84,
    range: 154,
    damage: 5.15,
    reloadMs: 1160,
    projectile: "beam",
    color: "#fcd34d",
  },
  eclipse_pin: {
    id: "eclipse_pin",
    name: "Eclipse Pin",
    fromPack: true,
    packKind: "nocturne",
    cost: 96,
    range: 138,
    damage: 5.6,
    reloadMs: 715,
    projectile: "planet",
    color: "#818cf8",
  },
};

function getDefenderStats(def) {
  const spec = DEFENDER_TYPES[def.type];
  const lv = Math.min(MAX_DEFENDER_LEVEL, Math.max(1, def.level | 0));
  const dmgMult = 1 + (lv - 1) * 0.22;
  const rangeMult = 1 + (lv - 1) * 0.08;
  const reloadMult = Math.max(0.55, 1 - (lv - 1) * 0.09);
  return {
    damage: spec.damage * dmgMult,
    range: spec.range * rangeMult,
    reloadMs: Math.max(120, spec.reloadMs * reloadMult),
    projectile: spec.projectile,
    slow: spec.slow,
    slowMs: spec.slowMs ?? 0,
  };
}

function upgradeCost(def) {
  const spec = DEFENDER_TYPES[def.type];
  const lv = def.level | 0;
  if (lv >= MAX_DEFENDER_LEVEL) return null;
  return Math.floor(spec.cost * 0.5 * lv);
}

function totalGoldInvestedInTower(def) {
  const spec = DEFENDER_TYPES[def.type];
  let t = spec.cost;
  const lv = Math.max(1, def.level | 0);
  for (let L = 1; L < lv; L++) {
    const u = upgradeCost({ type: def.type, level: L });
    if (u) t += u;
  }
  return t;
}

/** Level 1: full refund of placement + upgrades chain at that tier; higher levels: 50% of total invested. */
function sellRefundGold(def) {
  const lv = Math.max(1, def.level | 0);
  const total = totalGoldInvestedInTower(def);
  if (lv === 1) return total;
  return Math.floor(total * 0.5);
}

const DEFENDER_ICONS = {
  astronaut: "🧑‍🚀",
  sentry: "🔫",
  frost: "❄️",
  prism: "🔷",
  volt: "⚡",
  calm_bot: "🤖",
  sleepy_bot: "😴",
  angry_bot: "💢",
  brain_bot: "🧠",
  ghost_bot: "👻",
  orbit_sentry: "🛰️",
  pulsar: "✨",
  comet: "☄️",
  void_lens: "🌌",
  singularity: "🕳️",
  goblin_tower: "👺",
  spore_cannon: "🍄",
  magma_maw: "🌋",
  serpent_coil: "🐍",
  eldritch_eye: "👁️",
  abacus: "🧮",
  vector: "📐",
  fractal: "🔺",
  prime_beam: "🔢",
  golden_spiral: "🌀",
  glimmer_turret: "✨",
  halftone_shard: "🧊",
  afterimage: "💠",
  lensflare: "🌅",
  dawnspire: "🌄",
  brass_pin: "📍",
  spring_ratchet: "🔩",
  steam_valve: "♨️",
  copper_coil: "🌀",
  clockwork_eye: "👁️",
  barnacle_post: "🪸",
  kelp_strand: "🌿",
  urchin_spike: "🦔",
  tideglass: "🫧",
  abyss_hum: "🌑",
  meteor_tick: "☄️",
  echo_bat: "🦇",
  lullaby_node: "🎵",
  constellation: "⭐",
  eclipse_pin: "🌘",
};

const PACK_KIND_LABEL = {
  bot: "Bot pack",
  space: "Space pack",
  monster: "Monster pack",
  math: "Math pack",
  aurora: "Aurora Shelf",
  gear: "Gearwright Box",
  trench: "Trench Bloom",
  nocturne: "Nocturne Satchel",
};

/** Pack / collection tier for reveal UI. */
const DEFENDER_RARITY = {
  astronaut: "common",
  sentry: "common",
  frost: "common",
  prism: "uncommon",
  volt: "uncommon",
  calm_bot: "common",
  sleepy_bot: "uncommon",
  angry_bot: "rare",
  brain_bot: "epic",
  ghost_bot: "legendary",
  orbit_sentry: "common",
  pulsar: "uncommon",
  comet: "rare",
  void_lens: "epic",
  singularity: "mythical",
  goblin_tower: "common",
  spore_cannon: "uncommon",
  magma_maw: "rare",
  serpent_coil: "rare",
  eldritch_eye: "legendary",
  abacus: "common",
  vector: "uncommon",
  fractal: "rare",
  prime_beam: "epic",
  golden_spiral: "legendary",
  glimmer_turret: "common",
  halftone_shard: "uncommon",
  afterimage: "rare",
  lensflare: "epic",
  dawnspire: "mythical",
  brass_pin: "common",
  spring_ratchet: "uncommon",
  steam_valve: "rare",
  copper_coil: "rare",
  clockwork_eye: "legendary",
  barnacle_post: "common",
  kelp_strand: "uncommon",
  urchin_spike: "rare",
  tideglass: "epic",
  abyss_hum: "mythical",
  meteor_tick: "common",
  echo_bat: "uncommon",
  lullaby_node: "rare",
  constellation: "epic",
  eclipse_pin: "mythical",
};

function getDefenderRarity(id) {
  return DEFENDER_RARITY[id] || "common";
}

function loadCoins() {
  const n = parseInt(localStorage.getItem(LS_COINS) || "0", 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function saveCoins(c) {
  localStorage.setItem(LS_COINS, String(c));
}

function loadPortalUnlocked() {
  return (
    localStorage.getItem(LS_CLEAR_EASY) === "1" &&
    localStorage.getItem(LS_CLEAR_MEDIUM) === "1" &&
    localStorage.getItem(LS_CLEAR_HARD) === "1"
  );
}

function loadMysteryShopUnlocked() {
  return localStorage.getItem(LS_MYSTERY_SHOP) === "1";
}

function refreshPortalAndMysteryUi() {
  const opt = document.getElementById("mode-special-option");
  if (opt) {
    opt.disabled = !loadPortalUnlocked();
    opt.title = loadPortalUnlocked()
      ? "Harder than Hard; beat it to unlock Mystery shop packs."
      : "Beat Campaign on Easy, Medium, and Hard once each to open the portal.";
  }
  const mysterySection = document.getElementById("mystery-shop-section");
  if (mysterySection) {
    mysterySection.hidden = !loadMysteryShopUnlocked();
  }
}

function loadInventory() {
  const out = Object.fromEntries(ALL_PACK_DEFENDER_IDS.map((id) => [id, 0]));
  try {
    const raw = localStorage.getItem(LS_INV);
    const j = raw ? JSON.parse(raw) : {};
    for (const id of ALL_PACK_DEFENDER_IDS) {
      const v = parseInt(j[id] || 0, 10);
      out[id] = Number.isFinite(v) ? Math.max(0, v) : 0;
    }
  } catch {
    /* keep zeros */
  }
  return out;
}

/** Persists full pack collection — always writes every pack defender ID so nothing is dropped. */
function saveInventory(inv) {
  const snapshot = Object.fromEntries(
    ALL_PACK_DEFENDER_IDS.map((id) => [id, Math.max(0, Math.floor(Number(inv[id]) || 0))])
  );
  try {
    localStorage.setItem(LS_INV, JSON.stringify(snapshot));
  } catch {
    /* quota / private mode — collection may not persist */
  }
}

function pickWeightedFromIds(ids, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < ids.length; i++) {
    r -= weights[i];
    if (r < 0) return ids[i];
  }
  return ids[ids.length - 1];
}

/**
 * @param {number} price
 * @param {number} missChance
 * @param {string[]} ids
 * @param {number[]} weights
 * @param {string} emptyMsg
 */
function openPackWithTable(price, missChance, ids, weights, emptyMsg) {
  if (coins < price) {
    return { ok: false, empty: true, text: "Not enough coins." };
  }
  coins -= price;
  saveCoins(coins);
  if (Math.random() < missChance) {
    return { ok: true, empty: true, text: emptyMsg };
  }
  const id = pickWeightedFromIds(ids, weights);
  inventory = loadInventory();
  inventory[id] = (inventory[id] || 0) + 1;
  saveInventory(inventory);
  const name = DEFENDER_TYPES[id].name;
  return {
    ok: true,
    empty: false,
    defenderId: id,
    text: `You got ${name}! (Added to collection.)`,
  };
}

function openAuroraPack() {
  return openPackWithTable(
    AURORA_PACK_PRICE,
    0.35,
    PACK_AURORA_IDS,
    [65, 50, 35, 10, 1],
    "Shelf was empty — try again!"
  );
}

function openGearPack() {
  return openPackWithTable(
    GEAR_PACK_PRICE,
    0.32,
    PACK_GEAR_IDS,
    [52, 42, 32, 14, 6],
    "Gears jammed — no drop this time."
  );
}

function openTrenchPack() {
  return openPackWithTable(
    TRENCH_PACK_PRICE,
    0.33,
    PACK_TRENCH_IDS,
    [55, 40, 28, 12, 5],
    "Just seawater in that crate."
  );
}

function openNocturnePack() {
  return openPackWithTable(
    NOCTURNE_PACK_PRICE,
    0.3,
    PACK_NOCTURNE_IDS,
    [48, 40, 32, 14, 6],
    "Cloud cover — nothing fell tonight."
  );
}

function openMysteryPackA() {
  return openPackWithTable(
    MYSTERY_PACK_A_PRICE,
    0.32,
    PACK_MYSTERY_A_IDS,
    [18, 16, 14, 12, 10, 8, 6, 4],
    "The crate was empty."
  );
}

function openMysteryPackB() {
  return openPackWithTable(
    MYSTERY_PACK_B_PRICE,
    0.35,
    PACK_MYSTERY_B_IDS,
    [14, 12, 10, 8, 6, 5, 4, 3],
    "Nothing but dust."
  );
}

function openBotPack() {
  return openPackWithTable(
    BOT_PACK_PRICE,
    0.35,
    PACK_BOT_IDS,
    [65, 50, 35, 10, 1],
    "No bot this time — better luck next pack!"
  );
}

function openSpacePack() {
  return openPackWithTable(
    SPACE_PACK_PRICE,
    0.32,
    PACK_SPACE_IDS,
    [52, 42, 32, 14, 6],
    "Empty sector — try another launch!"
  );
}

function openMonsterPack() {
  return openPackWithTable(
    MONSTER_PACK_PRICE,
    0.33,
    PACK_MONSTER_IDS,
    [55, 40, 28, 12, 5],
    "The crate was empty — hunt again later!"
  );
}

function openMathPack() {
  return openPackWithTable(
    MATH_PACK_PRICE,
    0.3,
    PACK_MATH_IDS,
    [48, 40, 32, 14, 6],
    "No theorem today — open another pack!"
  );
}

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
/** Full-bleed backdrop for the Space Ribbon map (`assets/space-map.png`). */
const spaceMapBgImage = new Image();
spaceMapBgImage.src = "assets/space-map.png";
if (canvas) {
  canvas.tabIndex = 0;
}
const goldEl = document.getElementById("gold");
const livesEl = document.getElementById("lives");
const waveEl = document.getElementById("wave");
const diffEl = document.getElementById("diff-label");
const messageEl = document.getElementById("message");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const restartBtn = document.getElementById("restart");
const defButtons = document.getElementById("defender-buttons");
const mapSelect = document.getElementById("map-select");
const difficultySelect = document.getElementById("difficulty-select");
const upgradePanel = document.getElementById("upgrade-panel");
const upgradeTitle = document.getElementById("upgrade-title");
const upgradeMeta = document.getElementById("upgrade-meta");
const upgradeBtn = document.getElementById("upgrade-btn");
const deselectBtn = document.getElementById("deselect-btn");
const enemyIntro = document.getElementById("enemy-intro");
const enemyIntroTitle = document.getElementById("enemy-intro-title");
const enemyIntroBody = document.getElementById("enemy-intro-body");
const enemyIntroDismiss = document.getElementById("enemy-intro-dismiss");
const codexModal = document.getElementById("codex-modal");
const codexOpenBtn = document.getElementById("codex-open");
const codexCloseBtn = document.getElementById("codex-close");
const codexEnemies = document.getElementById("codex-enemies");
const codexDefenders = document.getElementById("codex-defenders");
const coinsEl = document.getElementById("coins");
const shopModal = document.getElementById("shop-modal");
const shopOpenBtn = document.getElementById("shop-open");
const shopCloseBtn = document.getElementById("shop-close");
const shopCoinsLine = document.getElementById("shop-coins");
const openBotPackBtn = document.getElementById("open-bot-pack");
const openSpacePackBtn = document.getElementById("open-space-pack");
const openMonsterPackBtn = document.getElementById("open-monster-pack");
const openMathPackBtn = document.getElementById("open-math-pack");
const openAuroraPackBtn = document.getElementById("open-aurora-pack");
const openGearPackBtn = document.getElementById("open-gear-pack");
const openTrenchPackBtn = document.getElementById("open-trench-pack");
const openNocturnePackBtn = document.getElementById("open-nocturne-pack");
const packResultEl = document.getElementById("pack-result");
const bombBtn = document.getElementById("bomb-btn");
const soundToggleBtn = document.getElementById("sound-toggle");
const modeSelectEl = document.getElementById("mode-select");
const battleDiffSelectEl = document.getElementById("battle-difficulty");
const campaignControlsEl = document.getElementById("campaign-controls");
const battleControlsEl = document.getElementById("battle-controls");
const specialControlsEl = document.getElementById("special-controls");
const specialMapSelectEl = document.getElementById("special-map-select");
const packRevealModal = document.getElementById("pack-reveal-modal");
const packRevealDismiss = document.getElementById("pack-reveal-dismiss");
const packRevealCanvas = document.getElementById("pack-reveal-canvas");
const packRevealTitleEl = document.getElementById("pack-reveal-title");
const packRevealRarityEl = document.getElementById("pack-reveal-rarity");
const sellTowerBtn = document.getElementById("sell-tower-btn");
const openMysteryPackABtn = document.getElementById("open-mystery-pack-a");
const openMysteryPackBBtn = document.getElementById("open-mystery-pack-b");
const raidControlsEl = document.getElementById("raid-controls");

let gold = 120;
let coins = 0;
/** @type {Record<string, number>} */
let inventory = {};
/** Placements used this battle for pack bots (inventory is total owned). */
let battlePlaced = {};
let bombAvailable = true;
let baseHp = BASE_HP_FIXED;
let wave = 1;
let selectedType = "astronaut";
let defenders = [];
let enemies = [];
let projectiles = [];
let particles = [];
let waveSpawnRemaining = 0;
let spawnTimer = 0;
let waveActive = false;
let waveCooldown = 0;
let gameOver = false;
let won = false;
let awaitingWaveClear = false;
let currentMapId = "space_ribbon";
let currentTheme = "space_map";
let currentDifficultyId = "medium";
/** @type {string[]} */
let waveQueue = [];
let introBlocking = false;
/** Types already introduced this run (for “new enemy” screen). */
const discoveredEnemyTypes = new Set();
let gamePaused = false;
/** @type {object | null} */
let selectedDefender = null;

function awardWaveCompletion() {
  const gm = getDifficulty().goldMult;
  gold += Math.floor((30 + wave * 10) * gm);
  wave += 1;
  updateHud();
  awaitingWaveClear = false;
  const maxW = getMaxWaves();
  if (wave > maxW) {
    const cr = getDifficulty().coinReward ?? 25;
    coins += cr;
    saveCoins(coins);
    if (currentGameMode === GAME_MODE.campaign) {
      if (currentDifficultyId === "easy") localStorage.setItem(LS_CLEAR_EASY, "1");
      if (currentDifficultyId === "medium") localStorage.setItem(LS_CLEAR_MEDIUM, "1");
      if (currentDifficultyId === "hard") localStorage.setItem(LS_CLEAR_HARD, "1");
    }
    if (currentGameMode === GAME_MODE.special) {
      localStorage.setItem(LS_SPECIAL_BEAT, "1");
      localStorage.setItem(LS_MYSTERY_SHOP, "1");
    }
    won = true;
    gameOver = true;
    overlayTitle.textContent = "Victory";
    overlayText.textContent = `You cleared all ${maxW} waves on ${getDifficulty().label}! +${cr} coins.`;
    overlay.classList.remove("hidden");
    updateHud();
    updateBombButton();
    refreshPortalAndMysteryUi();
    if (typeof playSoundVictory === "function") playSoundVictory();
  } else {
    waveCooldown = 0;
    setMessage("Wave complete! Build or upgrade, then click Start wave.");
    if (typeof playSoundWaveComplete === "function") playSoundWaveComplete();
  }
}

function startWave() {
  if (
    currentGameMode !== GAME_MODE.campaign &&
    currentGameMode !== GAME_MODE.war &&
    currentGameMode !== GAME_MODE.special
  )
    return;
  if (gameOver || waveActive || introBlocking) return;
  if (wave > getMaxWaves()) return;
  awaitingWaveClear = false;
  waveActive = true;
  waveQueue = buildWaveQueue(wave);
  waveSpawnRemaining = waveQueue.length;
  spawnTimer = 0;
  const bossNote = wave === getMaxWaves() ? " — BOSS WAVE" : "";
  setMessage(`Wave ${wave} / ${getMaxWaves()} — ${waveSpawnRemaining} enemies${bossNote}`);
  if (typeof playSoundWaveStart === "function") playSoundWaveStart();
}

function resetGame() {
  if (modeSelectEl) currentGameMode = modeSelectEl.value;
  if (battleDiffSelectEl && currentGameMode === GAME_MODE.battle) {
    battleDifficultyId = battleDiffSelectEl.value;
  }
  if (specialMapSelectEl && currentGameMode === GAME_MODE.special) {
    specialCampaignMapId = specialMapSelectEl.value;
  }

  for (const k of Object.keys(keysDown)) delete keysDown[k];

  gold = 120;
  defenders = [];
  botDefenders = [];
  enemies = [];
  projectiles = [];
  particles = [];
  waveQueue = [];
  waveSpawnRemaining = 0;
  spawnTimer = 0;
  waveActive = false;
  waveCooldown = 0;
  awaitingWaveClear = false;
  gameOver = false;
  won = false;
  introBlocking = false;
  gamePaused = false;
  discoveredEnemyTypes.clear();
  selectedDefender = null;
  battlePlaced = {};
  bombAvailable = true;
  coins = loadCoins();
  inventory = loadInventory();
  overlay.classList.add("hidden");
  if (enemyIntro) enemyIntro.classList.add("hidden");
  if (codexModal) codexModal.classList.add("hidden");
  if (shopModal) shopModal.classList.add("hidden");

  if (currentGameMode === GAME_MODE.campaign) {
    applyPlayfieldSize(W_DEFAULT, H_DEFAULT);
    applyMap(currentMapId);
    baseHp = BASE_HP_FIXED;
    wave = 1;
    setMessage(
      "Place towers on highlighted cells, then click Start wave. New enemy types show a briefing first."
    );
  } else if (currentGameMode === GAME_MODE.battle) {
    applyPlayfieldSize(W_DEFAULT, H_DEFAULT);
    applyMap(currentMapId);
    baseHp = 1e9;
    wave = BATTLE_WAVE_SCALE;
    battleTimeLeft = BATTLE_DURATION_SEC;
    playerBattleKills = 0;
    botBattleKills = 0;
    for (const id of Object.keys(ENEMY_TYPES)) {
      if (!ENEMY_TYPES[id].isBoss) discoveredEnemyTypes.add(id);
    }
    waveActive = true;
    waveQueue = buildWaveQueue(wave);
    waveSpawnRemaining = waveQueue.length;
    spawnTimer = 0;
    setMessage(`Battle — ${BATTLE_DURATION_SEC}s. Rack up more kills than the bot!`);
  } else if (currentGameMode === GAME_MODE.special) {
    applyPlayfieldSize(W_DEFAULT, H_DEFAULT);
    applyMap(specialCampaignMapId);
    baseHp = BASE_HP_FIXED;
    wave = 1;
    setMessage(
      "Special operation — tougher than Hard, gentler than Nightmare. Clear all waves to open the Mystery shop."
    );
  } else if (currentGameMode === GAME_MODE.raider) {
    applyPlayfieldSize(W_DEFAULT, H_DEFAULT);
    applyMap(currentMapId);
    baseHp = 1e9;
    wave = 1;
    botDefenders = [];
    botTowerAcc = 0;
    botBaseHp = 100;
    gold = 280;
    raidUnlockWave = 1;
    raidUnlockAcc = 0;
    warPhase = "normal";
    warEnemyBaseHp = 0;
    warGuardBossHp = 0;
    for (const id of Object.keys(ENEMY_TYPES)) {
      if (!ENEMY_TYPES[id].isBoss) discoveredEnemyTypes.add(id);
    }
    setMessage("Endurance raid — pick any minion; strong types need higher raid tier (rises over time).");
  } else if (currentGameMode === GAME_MODE.war) {
    applyPlayfieldSize(W_DEFAULT, H_DEFAULT);
    applyMap(currentMapId);
    baseHp = 100;
    warEnemyBaseHp = 100;
    warPhase = "normal";
    warGuardBossHp = 0;
    warEnemyBossId = null;
    wave = 1;
    botDefenders = [];
    botTowerAcc = 0;
    gold = 180;
    raidUnlockWave = 1;
    raidUnlockAcc = 0;
    setMessage(
      "War: both HQs have 100 HP. Defend vs waves; spawn raiders to chip the enemy HQ. Boss phases when an HQ falls."
    );
    buildWarTerrain();
  }

  if (currentGameMode === GAME_MODE.raider || currentGameMode === GAME_MODE.war) {
    populateRaidEnemySelect();
  }

  updateModeUi();
  syncModeSelects();
  updateBombButton();
  updateHud();
  updateUpgradePanel();
  updateShopUi();
  buildDefenderButtons();
  refreshPortalAndMysteryUi();
}

function updateHud() {
  goldEl.textContent = `Gold: ${gold}`;
  if (coinsEl) coinsEl.textContent = `Coins: ${coins}`;
  if (currentGameMode === GAME_MODE.battle) {
    livesEl.textContent = "Base: ∞ (battle)";
    waveEl.textContent = `Kills: you ${playerBattleKills} vs bot ${botBattleKills} · ${Math.max(0, Math.ceil(battleTimeLeft))}s`;
    if (diffEl) diffEl.textContent = `Battle · ${battleDifficultyId}`;
  } else if (currentGameMode === GAME_MODE.special) {
    livesEl.textContent = `Base HP: ${baseHp}/${BASE_HP_FIXED}`;
    const m = MAPS[specialCampaignMapId] || MAPS.forest;
    waveEl.textContent = `Wave: ${wave} / ${getMaxWaves()} · ${m.name}`;
    if (diffEl) diffEl.textContent = "Special operation (portal)";
  } else if (currentGameMode === GAME_MODE.raider) {
    livesEl.textContent = `Bot HQ: ${Math.max(0, botBaseHp)}/100`;
    waveEl.textContent = `Raid tier ${raidUnlockWave}/${RAID_UNLOCK_MAX} · bot towers ${botDefenders.length} · your units ${enemies.length}`;
    if (diffEl) diffEl.textContent = "Endurance raid";
  } else if (currentGameMode === GAME_MODE.war) {
    if (warPhase === "playerBoss") {
      livesEl.textContent = `Guardian boss: ${Math.max(0, warGuardBossHp)}/400`;
    } else {
      livesEl.textContent = `Your base: ${Math.max(0, baseHp)}/100`;
    }
    const bossNote = warPhase === "enemyBoss" ? " — destroy their boss!" : "";
    waveEl.textContent = `Enemy HQ: ${Math.max(0, warEnemyBaseHp)}/100 · tier ${raidUnlockWave}/${RAID_UNLOCK_MAX} · wave ${wave}${bossNote}`;
    if (diffEl) diffEl.textContent = `War · ${getDifficulty().label}`;
  } else {
    livesEl.textContent = `Base HP: ${baseHp}/${BASE_HP_FIXED}`;
    waveEl.textContent = `Wave: ${wave} / ${getMaxWaves()}`;
    if (diffEl) diffEl.textContent = getDifficulty().label;
  }
  if (selectedDefender) updateUpgradePanel();
}

function updateBombButton() {
  if (!bombBtn) return;
  const show = currentGameMode === GAME_MODE.campaign || currentGameMode === GAME_MODE.special;
  bombBtn.style.display = show ? "" : "none";
  if (!show) return;
  bombBtn.disabled = !bombAvailable || gameOver;
  bombBtn.textContent = bombAvailable ? "Emergency bomb (1)" : "Bomb used";
}

function updateShopUi() {
  if (shopCoinsLine) shopCoinsLine.textContent = `Your coins: ${coins}`;
  if (openBotPackBtn) openBotPackBtn.disabled = coins < BOT_PACK_PRICE;
  if (openSpacePackBtn) openSpacePackBtn.disabled = coins < SPACE_PACK_PRICE;
  if (openMonsterPackBtn) openMonsterPackBtn.disabled = coins < MONSTER_PACK_PRICE;
  if (openMathPackBtn) openMathPackBtn.disabled = coins < MATH_PACK_PRICE;
  if (openAuroraPackBtn) openAuroraPackBtn.disabled = coins < AURORA_PACK_PRICE;
  if (openGearPackBtn) openGearPackBtn.disabled = coins < GEAR_PACK_PRICE;
  if (openTrenchPackBtn) openTrenchPackBtn.disabled = coins < TRENCH_PACK_PRICE;
  if (openNocturnePackBtn) openNocturnePackBtn.disabled = coins < NOCTURNE_PACK_PRICE;
  const myst = loadMysteryShopUnlocked();
  if (openMysteryPackABtn) openMysteryPackABtn.disabled = !myst || coins < MYSTERY_PACK_A_PRICE;
  if (openMysteryPackBBtn) openMysteryPackBBtn.disabled = !myst || coins < MYSTERY_PACK_B_PRICE;
  refreshPortalAndMysteryUi();
}

function setMessage(text) {
  messageEl.textContent = text;
}

function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

function enemyListForProjectiles() {
  return enemies;
}

function findTarget(def, opts) {
  const ignoreRaid = opts && opts.ignoreRaid;
  const onlyRaid = opts && opts.onlyRaid;
  const stats = getDefenderStats(def);
  let best = null;
  let bestD = stats.range + 1;
  const list = enemyListForProjectiles();
  const warLos = currentGameMode === GAME_MODE.war;
  for (const e of list) {
    if (ignoreRaid && e.fromPlayerRaid) continue;
    if (onlyRaid && !e.fromPlayerRaid) continue;
    if (enemyIsGhostInvisible(e)) continue;
    const d = dist(def.x, def.y, e.x, e.y);
    if (d > stats.range || d >= bestD) continue;
    if (warLos && !warLineLosClear(def.x, def.y, e.x, e.y)) continue;
    bestD = d;
    best = e;
  }
  return best;
}

function spawnEnemyInstance(typeId, extra) {
  const def = ENEMY_TYPES[typeId];
  const d = getDifficulty();
  const maxHp = scaledEnemyHp(typeId, wave);
  const baseSpeed = 55 + wave * 5;
  const speed = baseSpeed * def.speedMult * d.speedMult * mapEnemyStrengthMult();
  const e = {
    id: Math.random(),
    enemyTypeId: typeId,
    typeName: def.name,
    dist: 0,
    speed,
    baseSpeed: speed,
    hp: maxHp,
    maxHp,
    color: def.color,
    slowUntil: 0,
    slowFactor: 1,
    regenAcc: 0,
    boostUntil: 0,
    boostMult: 1.5,
    isBoss: !!def.isBoss,
    blockSize: def.isBoss ? 28 : 16,
  };
  if (def.shield != null) e.shieldLeft = def.shield;
  if (def.damageTakenMult != null) e.damageTakenMult = def.damageTakenMult;
  if (def.power === "frost_resist") e.frostResist = 0.5;
  if (def.power === "bomber") e.bombAcc = 0;
  if (def.power === "ghost") {
    e.ghostPhase = "visible";
    e.ghostPhaseEnd = performance.now() + GHOST_VISIBLE_MS;
  }
  if (def.power === "sneak_attacker") {
    sneakAttackerKillRandomDefender();
    discoveredEnemyTypes.add("sneak_attacker");
  }
  if (extra && extra.fromPlayerRaid) e.fromPlayerRaid = true;
  enemies.push(e);
}

function spawnDelay() {
  let base = Math.max(280, 550 - Math.min(220, wave * 14));
  if (currentGameMode === GAME_MODE.battle) base *= BATTLE_SPAWN_DELAY_MULT;
  return base;
}

function showEnemyIntro(typeId) {
  const def = ENEMY_TYPES[typeId];
  const hp = scaledEnemyHp(typeId, wave);
  introBlocking = true;
  if (!enemyIntro || !enemyIntroTitle || !enemyIntroBody) return;
  enemyIntroTitle.textContent = def.isBoss ? `Boss: ${def.name}` : `New enemy: ${def.name}`;
  const powerLine =
    def.power === "boss"
      ? `<p><strong>Boss:</strong> ${def.powerDesc}</p>`
      : def.power
        ? `<p><strong>Power:</strong> ${def.powerDesc}</p>`
        : `<p><strong>Power:</strong> None — this type has no special ability.</p>`;
  const lead = def.isBoss
    ? "<p class=\"intro-lead\">Final wave — the boss approaches.</p>"
    : "<p class=\"intro-lead\">A new threat appears this wave.</p>";
  enemyIntroBody.innerHTML = `
    ${lead}
    <p><strong>Health (this wave):</strong> ${hp} HP</p>
    ${powerLine}
    <p class="intro-hint">You can re-read this in the Field Index anytime.</p>
  `;
  enemyIntro.classList.remove("hidden");
}

function dismissEnemyIntro() {
  if (!enemyIntro) return;
  enemyIntro.classList.add("hidden");
  introBlocking = false;
}

function defenderAt(x, y) {
  const hitR = 22;
  for (const d of defenders) {
    if (dist(d.x, d.y, x, y) <= hitR) return d;
  }
  return null;
}

function placeDefender(col, row) {
  if (currentGameMode === GAME_MODE.raider) {
    setMessage("You don't build here — use Spawn raider buttons.");
    return;
  }
  const type = selectedType;
  const spec = DEFENDER_TYPES[type];
  if (!spec) return;
  if (spec.fromPack) {
    const owned = inventory[type] || 0;
    const used = battlePlaced[type] || 0;
    if (owned <= used) {
      setMessage("You have no copies left — open packs in the Shop.");
      return;
    }
  }
  if (!isBuildable(col, row)) {
    setMessage("Build only on highlighted cells next to the track.");
    return;
  }
  const cx = col * CELL + CELL / 2;
  const cy = row * CELL + CELL / 2;
  for (const d of defenders) {
    if (dist(d.x, d.y, cx, cy) < CELL * 0.9) {
      setMessage("That cell is occupied.");
      return;
    }
  }
  if (gold < spec.cost) {
    setMessage(`Need ${spec.cost} gold.`);
    return;
  }
  gold -= spec.cost;
  if (spec.fromPack) {
    battlePlaced[type] = (battlePlaced[type] || 0) + 1;
  }
  defenders.push({
    type,
    x: cx,
    y: cy,
    lastShot: -999999,
    level: 1,
  });
  updateHud();
  setMessage(`${spec.name} placed.`);
  if (typeof playSoundBuild === "function") playSoundBuild();
}

function spawnRaidUnit(typeId) {
  if (currentGameMode !== GAME_MODE.raider && currentGameMode !== GAME_MODE.war) return;
  if (gameOver || introBlocking) return;
  const def = ENEMY_TYPES[typeId];
  if (!def || def.isBoss) return;
  ensureRaidMinWaveCache();
  const needTier = raidMinWaveForType(typeId);
  if (raidUnlockWave < needTier) {
    setMessage(`Need raid tier ${needTier} (now ${raidUnlockWave}). Tier rises every ~${RAID_UNLOCK_INTERVAL_SEC}s.`);
    return;
  }
  const cost = raidGoldCostForType(typeId);
  if (gold < cost) {
    setMessage(`Need ${cost} gold to deploy ${def.name}.`);
    return;
  }
  gold -= cost;
  spawnEnemyInstance(typeId, { fromPlayerRaid: true });
  updateHud();
  setMessage(`Deployed ${def.name} toward their HQ.`);
  if (typeof playSoundWaveStart === "function") playSoundWaveStart();
}

function tryPlaceBotTower() {
  if (gameOver || botDefenders.length >= 16) return;
  const candidates = [];
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (!isBuildable(c, r)) continue;
      const cx = c * CELL + CELL / 2;
      const cy = r * CELL + CELL / 2;
      let ok = true;
      for (const d of botDefenders) {
        if (dist(d.x, d.y, cx, cy) < CELL * 0.9) ok = false;
      }
      for (const d of defenders) {
        if (dist(d.x, d.y, cx, cy) < CELL * 0.9) ok = false;
      }
      if (ok) candidates.push({ cx, cy });
    }
  }
  if (candidates.length === 0) return;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  const types = ["sentry", "frost", "astronaut"];
  const t = types[Math.floor(Math.random() * types.length)];
  botDefenders.push({
    type: t,
    x: pick.cx,
    y: pick.cy,
    lastShot: -999999,
    level: 1,
  });
}

function startWarEnemyBossPhase() {
  if (warPhase !== "normal") return;
  warEnemyBaseHp = 0;
  warPhase = "enemyBoss";
  const ids = ["boss_titan", "boss_storm", "boss_void"];
  const id = ids[Math.floor(Math.random() * ids.length)];
  warEnemyBossId = id;
  spawnEnemyInstance(id);
  setMessage("Enemy HQ destroyed! Their boss counterattacks — destroy it to win!");
}

function endRaiderWin() {
  if (gameOver) return;
  gameOver = true;
  const reward = 22;
  coins += reward;
  saveCoins(coins);
  overlayTitle.textContent = "Victory!";
  overlayText.textContent = `Their HQ fell! +${reward} coins.`;
  overlay.classList.remove("hidden");
  updateHud();
  updateBombButton();
  if (typeof playSoundVictory === "function") playSoundVictory();
}

function endWarWin() {
  if (gameOver) return;
  gameOver = true;
  const reward = 35;
  coins += reward;
  saveCoins(coins);
  overlayTitle.textContent = "War won!";
  overlayText.textContent = `You defeated their boss! +${reward} coins.`;
  overlay.classList.remove("hidden");
  updateHud();
  updateBombButton();
  if (typeof playSoundVictory === "function") playSoundVictory();
}

function endWarLose() {
  if (gameOver) return;
  gameOver = true;
  overlayTitle.textContent = "Defeat";
  overlayText.textContent = "The guardian from your base was destroyed.";
  overlay.classList.remove("hidden");
  updateHud();
  updateBombButton();
  if (typeof playSoundDefeat === "function") playSoundDefeat();
}

function updateRaiderMode(dt, now) {
  tickRaidUnlock(dt);
  botTowerAcc += dt;
  if (botTowerAcc >= 4.8) {
    botTowerAcc = 0;
    tryPlaceBotTower();
  }
  updateEnemies(dt, now);
}

function useBomb() {
  if (!bombAvailable || gameOver) return;
  if (typeof playSoundBomb === "function") playSoundBomb();
  bombAvailable = false;
  updateBombButton();
  const gm = getDifficulty().goldMult;
  const next = [];
  for (const e of enemies) {
    if (e.isBoss) {
      e.hp -= e.maxHp * 0.48;
      if (e.hp <= 0) {
        gold += Math.floor((12 + wave) * gm);
      } else {
        next.push(e);
      }
    }
  }
  enemies = next;
  for (let i = 0; i < 40; i++) {
    particles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 400,
      vy: (Math.random() - 0.5) * 400,
      life: 0.5 + Math.random() * 0.3,
      color: "#ff9f43",
    });
  }
  updateHud();
  setMessage("Emergency bomb! Minions vaporized; boss badly hurt.");
}

function tryUpgrade() {
  if (!selectedDefender || gameOver) return;
  const def = selectedDefender;
  const cost = upgradeCost(def);
  if (cost == null) {
    setMessage("Already max level.");
    return;
  }
  if (gold < cost) {
    setMessage(`Need ${cost} gold to upgrade.`);
    return;
  }
  gold -= cost;
  def.level = (def.level | 0) + 1;
  updateHud();
  updateUpgradePanel();
  const spec = DEFENDER_TYPES[def.type];
  setMessage(`${spec.name} → Lv.${def.level}`);
  if (typeof playSoundUpgrade === "function") playSoundUpgrade();
}

function fireProjectile(def, target, stats, fromBot) {
  const spec = DEFENDER_TYPES[def.type];
  let spd = spec.projectile === "planet" ? 220 : 380;
  if (spec.projectile === "beam") spd = 520;
  if (spec.projectile === "volt") spd = 440;
  if (typeof playSoundShoot === "function") playSoundShoot(spec.projectile || "bullet");
  projectiles.push({
    x: def.x,
    y: def.y,
    originX: def.x,
    originY: def.y,
    target,
    damage: stats.damage,
    kind: stats.projectile,
    slow: stats.slow,
    slowMs: stats.slowMs,
    speed: spd,
    fromBot: !!fromBot,
  });
}

function updateDefenders(now) {
  if (gamePaused) return;
  const ftOpts =
    currentGameMode === GAME_MODE.war ? { ignoreRaid: true } : undefined;
  for (const def of defenders) {
    const stats = getDefenderStats(def);
    const target = findTarget(def, ftOpts);
    if (!target) continue;
    if (now - def.lastShot < stats.reloadMs) continue;
    def.lastShot = now;
    fireProjectile(def, target, stats, false);
  }
}

function updateBotDefenders(now) {
  if (gamePaused) return;
  for (const def of botDefenders) {
    const stats = getDefenderStats(def);
    const target = findTarget(def, { onlyRaid: true });
    if (!target) continue;
    if (now - def.lastShot < stats.reloadMs) continue;
    def.lastShot = now;
    fireProjectile(def, target, stats, true);
  }
}

function applyDamageToEnemy(e, rawDmg, now, p) {
  let dmg = rawDmg;
  if (currentGameMode === GAME_MODE.war && p) {
    const ox = p.originX != null ? p.originX : p.x;
    const oy = p.originY != null ? p.originY : p.y;
    dmg *= warShotLineCoverFactor(ox, oy, e.x, e.y);
    if (enemyInWarCoverCell(e.x, e.y)) dmg *= 0.88;
  }
  if (e.damageTakenMult != null) dmg *= e.damageTakenMult;
  if (e.bufferAuraDmgMult != null && e.bufferAuraDmgMult !== 1) dmg *= e.bufferAuraDmgMult;
  if (e.shieldLeft > 0) {
    const absorb = Math.min(e.shieldLeft, dmg);
    e.shieldLeft -= absorb;
    dmg -= absorb;
  }
  e.hp -= dmg;
  if (p.slow != null && p.slowMs) {
    let sf = p.slow;
    if (e.frostResist != null) {
      sf = 1 + (sf - 1) * (1 - e.frostResist);
    }
    e.slowFactor = sf;
    e.slowUntil = now + p.slowMs;
  }
  const hitDef = ENEMY_TYPES[e.enemyTypeId];
  if (hitDef && hitDef.power === "adrenaline") {
    e.boostUntil = now + 650;
  }
}

function updateProjectiles(dt, now) {
  if (gamePaused) return;
  const next = [];
  const enemyList = enemyListForProjectiles();
  for (const p of projectiles) {
    if (p.fromBot && !p.target.fromPlayerRaid) {
      continue;
    }
    if (!p.fromBot && p.target.fromPlayerRaid && currentGameMode === GAME_MODE.war) {
      continue;
    }
    if (!enemyList.includes(p.target)) {
      continue;
    }
    const tx = p.target.x;
    const ty = p.target.y;
    const dx = tx - p.x;
    const dy = ty - p.y;
    const len = Math.hypot(dx, dy) || 1;
    const step = p.speed * dt;
    if (len <= step + 8) {
      const e = p.target;
      if (enemyIsGhostInvisible(e)) {
        continue;
      }
      applyDamageToEnemy(e, p.damage, now, p);
      if (e.hp <= 0) {
        if (e.enemyTypeId === "rainbow_block" || e.enemyTypeId === "wildcard_capsule") {
          if (typeof playSoundRainbowPop === "function") playSoundRainbowPop();
          gold += Math.floor(goldForEnemyKill(e) * 0.5);
          updateHud();
          const inner =
            e.enemyTypeId === "rainbow_block"
              ? pickRainbowTransformTypeId()
              : pickWildcardCapsuleTransformTypeId();
          transformEnemyInPlace(e, inner);
          for (let i = 0; i < 18; i++) {
            particles.push({
              x: tx,
              y: ty,
              vx: (Math.random() - 0.5) * 280,
              vy: (Math.random() - 0.5) * 280,
              life: 0.45 + Math.random() * 0.25,
              color: `hsl(${(i * 20) % 360}, 90%, 65%)`,
            });
          }
        } else {
          if (currentGameMode === GAME_MODE.war && warPhase === "enemyBoss" && e.isBoss) {
            endWarWin();
            const idx = enemyList.indexOf(e);
            if (idx !== -1) enemyList.splice(idx, 1);
            continue;
          }
          if (typeof playSoundKill === "function") playSoundKill();
          gold += goldForEnemyKill(e);
          updateHud();
          if (currentGameMode === GAME_MODE.battle) playerBattleKills++;
          const idx = enemyList.indexOf(e);
          if (idx !== -1) enemyList.splice(idx, 1);
        }
      } else {
        if (typeof playSoundHit === "function") playSoundHit();
        for (let i = 0; i < 6; i++) {
          particles.push({
            x: tx,
            y: ty,
            vx: (Math.random() - 0.5) * 120,
            vy: (Math.random() - 0.5) * 120,
            life: 0.35 + Math.random() * 0.2,
            color: e.color,
          });
        }
      }
      continue;
    }
    p.x += (dx / len) * step;
    p.y += (dy / len) * step;
    next.push(p);
  }
  projectiles = next;
}

/** Buffer support: nearby allies get speed, damage reduction, and regen (bosses and other buffers excluded). */
const BUFFER_AURA_RANGE = 118;
const BUFFER_SPEED_PER_STACK = 0.14;
const BUFFER_DMG_TAKEN_MULT_PER = 0.9;
const BUFFER_MAX_STACKS = 2;
const BUFFER_ALLY_REGEN_PER_STACK = 0.55;

function applyBufferAurasToEnemies(list) {
  const buffers = list.filter((u) => ENEMY_TYPES[u.enemyTypeId].power === "buffer");
  for (const e of list) {
    const def = ENEMY_TYPES[e.enemyTypeId];
    if (def.power === "buffer" || e.isBoss) {
      e.bufferAuraSpeed = 1;
      e.bufferAuraDmgMult = 1;
      e.bufferAuraRegen = 0;
      continue;
    }
    const posE = pointOnPath(e.dist);
    let stacks = 0;
    for (const b of buffers) {
      if (b.hp <= 0) continue;
      const posB = pointOnPath(b.dist);
      if (dist(posE.x, posE.y, posB.x, posB.y) <= BUFFER_AURA_RANGE) stacks++;
    }
    stacks = Math.min(stacks, BUFFER_MAX_STACKS);
    if (stacks > 0) {
      e.bufferAuraSpeed = 1 + BUFFER_SPEED_PER_STACK * stacks;
      e.bufferAuraDmgMult = Math.pow(BUFFER_DMG_TAKEN_MULT_PER, stacks);
      e.bufferAuraRegen = BUFFER_ALLY_REGEN_PER_STACK * stacks;
    } else {
      e.bufferAuraSpeed = 1;
      e.bufferAuraDmgMult = 1;
      e.bufferAuraRegen = 0;
    }
  }
}

function updateEnemies(dt, now) {
  if (gamePaused || gameOver) return;
  applyBufferAurasToEnemies(enemies);
  const leaked = [];
  for (const e of enemies) {
    const eDef = ENEMY_TYPES[e.enemyTypeId];
    if (eDef && eDef.power === "ghost") {
      if (now >= e.ghostPhaseEnd) {
        if (e.ghostPhase === "visible") {
          e.ghostPhase = "invisible";
          e.ghostPhaseEnd = now + GHOST_INVISIBLE_MS;
        } else {
          e.ghostPhase = "visible";
          e.ghostPhaseEnd = now + GHOST_VISIBLE_MS;
        }
      }
    }
    const towersForBomber =
      currentGameMode === GAME_MODE.raider ? botDefenders : defenders;
    if (eDef && eDef.power === "bomber" && !e.fromPlayerRaid) {
      e.bombAcc = (e.bombAcc || 0) + dt;
      if (e.bombAcc >= 2.75) {
        e.bombAcc = 0;
        const inRange = towersForBomber.filter((d) => dist(d.x, d.y, e.x, e.y) <= 210);
        if (inRange.length) {
          const victim = inRange[Math.floor(Math.random() * inRange.length)];
          const vi = defenders.indexOf(victim);
          if (vi !== -1) defenders.splice(vi, 1);
          if (selectedDefender === victim) selectedDefender = null;
          updateUpgradePanel();
          for (let i = 0; i < 32; i++) {
            particles.push({
              x: victim.x + (Math.random() - 0.5) * 20,
              y: victim.y + (Math.random() - 0.5) * 20,
              vx: (Math.random() - 0.5) * 380,
              vy: (Math.random() - 0.5) * 380,
              life: 0.45 + Math.random() * 0.35,
              color: i % 2 ? "#f97316" : "#ef4444",
            });
          }
          setMessage("Bomber hit a tower with a bomb!");
        }
      }
    }
    if (eDef && eDef.power === "regen" && e.hp < e.maxHp) {
      e.regenAcc += dt;
      if (e.regenAcc >= 2) {
        e.regenAcc = 0;
        e.hp = Math.min(e.maxHp, e.hp + 1);
      }
    }
    if (e.bufferAuraRegen > 0 && e.hp < e.maxHp) {
      e.hp = Math.min(e.maxHp, e.hp + e.bufferAuraRegen * dt);
    }
    let moveSpeed = e.baseSpeed;
    if (now < e.slowUntil) {
      moveSpeed *= e.slowFactor;
    } else {
      e.slowFactor = 1;
    }
    if (e.boostUntil && now < e.boostUntil) {
      moveSpeed *= e.boostMult || 1.5;
    }
    if (e.bufferAuraSpeed > 1) moveSpeed *= e.bufferAuraSpeed;
    e.dist += moveSpeed * dt;
    const pos = pointOnPath(e.dist);
    e.x = pos.x;
    e.y = pos.y;
    if (e.dist >= TOTAL_PATH_LEN - 5) {
      leaked.push(e);
    }
  }
  for (const e of leaked) {
    enemies = enemies.filter((x) => x !== e);
    if (e.fromPlayerRaid) {
      if (currentGameMode === GAME_MODE.raider) {
        botBaseHp -= 1;
        if (botBaseHp <= 0) endRaiderWin();
      } else if (currentGameMode === GAME_MODE.war) {
        warEnemyBaseHp -= 1;
        if (warEnemyBaseHp <= 0 && warPhase === "normal") startWarEnemyBossPhase();
      }
      continue;
    }
    if (currentGameMode === GAME_MODE.battle) continue;
    if (currentGameMode === GAME_MODE.war) {
      if (warPhase === "normal") {
        baseHp -= 1;
        if (baseHp <= 0) {
          warPhase = "playerBoss";
          warGuardBossHp = 400;
          baseHp = 0;
          setMessage("Your base is down! Protect your guardian boss!");
        }
      } else if (warPhase === "playerBoss") {
        warGuardBossHp -= 1;
        if (warGuardBossHp <= 0) endWarLose();
      }
    } else {
      baseHp -= 1;
    }
  }
  if (leaked.length && currentGameMode !== GAME_MODE.battle) {
    if (currentGameMode === GAME_MODE.raider) {
      updateHud();
    } else {
      if (typeof playSoundBaseHit === "function") playSoundBaseHit();
      updateHud();
      if (currentGameMode === GAME_MODE.war) {
        /* defeat only via endWarLose */
      } else if (baseHp <= 0) {
        gameOver = true;
        overlayTitle.textContent = "Defeat";
        overlayText.textContent = "The base was destroyed.";
        overlay.classList.remove("hidden");
        updateBombButton();
        if (typeof playSoundDefeat === "function") playSoundDefeat();
      }
    }
  }
}

function updateParticles(dt) {
  particles = particles.filter((p) => {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    return p.life > 0;
  });
}

function sneakAttackerKillRandomDefender() {
  if (!defenders.length) return;
  const victim = defenders[Math.floor(Math.random() * defenders.length)];
  const vi = defenders.indexOf(victim);
  if (vi === -1) return;
  defenders.splice(vi, 1);
  if (selectedDefender === victim) selectedDefender = null;
  updateUpgradePanel();
  setMessage("Sneak attacker — a tower was destroyed before it appeared!");
  for (let i = 0; i < 16; i++) {
    particles.push({
      x: victim.x + (Math.random() - 0.5) * 24,
      y: victim.y + (Math.random() - 0.5) * 24,
      vx: (Math.random() - 0.5) * 320,
      vy: (Math.random() - 0.5) * 320,
      life: 0.4 + Math.random() * 0.25,
      color: i % 2 ? "#f97316" : "#ef4444",
    });
  }
}

function endBattleMode() {
  gameOver = true;
  waveActive = false;
  const tier =
    battleDifficultyId === "challenge" ? 4 : battleDifficultyId === "hard" ? 3 : battleDifficultyId === "medium" ? 2 : 1;
  const reward = 12 + tier * 8;
  if (playerBattleKills > botBattleKills) {
    coins += reward;
    saveCoins(coins);
    overlayTitle.textContent = "Victory";
    overlayText.textContent = `You win ${playerBattleKills}–${botBattleKills} kills! +${reward} coins.`;
  } else if (playerBattleKills === botBattleKills) {
    const half = Math.max(4, Math.floor(reward * 0.5));
    coins += half;
    saveCoins(coins);
    overlayTitle.textContent = "Draw";
    overlayText.textContent = `Tied at ${playerBattleKills}. +${half} coins.`;
  } else {
    overlayTitle.textContent = "Defeat";
    overlayText.textContent = `Bot wins ${botBattleKills}–${playerBattleKills}.`;
  }
  overlay.classList.remove("hidden");
  updateHud();
  updateBombButton();
}

function trySpawnNext() {
  if (waveQueue.length === 0) return;
  const nextTypeId = waveQueue[0];
  if (!discoveredEnemyTypes.has(nextTypeId)) {
    showEnemyIntro(nextTypeId);
    return;
  }
  waveQueue.shift();
  const spawnType = nextTypeId;
  spawnEnemyInstance(spawnType);
  waveSpawnRemaining--;
  spawnTimer = spawnDelay();
}

function onIntroContinue() {
  if (waveQueue.length === 0) {
    dismissEnemyIntro();
    return;
  }
  const typeId = waveQueue[0];
  discoveredEnemyTypes.add(typeId);
  dismissEnemyIntro();
  waveQueue.shift();
  const spawnType = typeId;
  spawnEnemyInstance(spawnType);
  waveSpawnRemaining--;
  spawnTimer = spawnDelay();
}

function updateWaveSpawning(dt) {
  if (currentGameMode === GAME_MODE.battle) {
    if (introBlocking || gameOver) return;
    battleTimeLeft -= dt;
    const rate = BATTLE_BOT_RATES[battleDifficultyId] || 0.2;
    if (Math.random() < rate * dt) botBattleKills++;
    if (battleTimeLeft <= 0) {
      endBattleMode();
      return;
    }
    if (!waveActive) return;
    if (waveSpawnRemaining <= 0 && waveQueue.length === 0) {
      waveQueue = buildWaveQueue(wave);
      waveSpawnRemaining = waveQueue.length;
      spawnTimer = 0;
    }
    spawnTimer -= dt * 1000;
    if (spawnTimer <= 0) {
      trySpawnNext();
    }
    return;
  }
  if (!waveActive || introBlocking) return;
  if (waveSpawnRemaining <= 0 && waveQueue.length === 0) {
    waveActive = false;
    if (enemies.length === 0) {
      awardWaveCompletion();
    } else {
      awaitingWaveClear = true;
    }
    return;
  }
  spawnTimer -= dt * 1000;
  if (spawnTimer <= 0) {
    trySpawnNext();
  }
}

function tryWaveClear() {
  if (currentGameMode === GAME_MODE.battle || currentGameMode === GAME_MODE.raider) {
    return;
  }
  if (gameOver || waveActive || !awaitingWaveClear) return;
  if (enemies.length > 0) return;
  awardWaveCompletion();
}

let lastTs = 0;
function loop(ts) {
  const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0);
  lastTs = ts;

  if (!gameOver && !gamePaused) {
    if (currentGameMode === GAME_MODE.raider) {
      updateRaiderMode(dt, ts);
      updateBotDefenders(ts);
      updateProjectiles(dt, ts);
      updateParticles(dt);
    } else if (currentGameMode === GAME_MODE.war) {
      tickRaidUnlock(dt);
      botTowerAcc += dt;
      if (botTowerAcc >= 7) {
        botTowerAcc = 0;
        tryPlaceBotTower();
      }
      updateWaveSpawning(dt);
      updateEnemies(dt, ts);
      updateDefenders(ts);
      updateBotDefenders(ts);
      updateProjectiles(dt, ts);
      updateParticles(dt);
      tryWaveClear();
    } else {
      updateWaveSpawning(dt);
      updateEnemies(dt, ts);
      updateDefenders(ts);
      updateProjectiles(dt, ts);
      updateParticles(dt);
      tryWaveClear();
    }
  } else if (!gameOver) {
    updateParticles(dt);
  }

  if (
    !gameOver &&
    (currentGameMode === GAME_MODE.battle ||
      currentGameMode === GAME_MODE.raider ||
      currentGameMode === GAME_MODE.war)
  ) {
    updateHud();
  }

  renderScene();
  requestAnimationFrame(loop);
}

function themeBackground() {
  if (currentTheme === "disco") {
    const g = ctx.createLinearGradient(0, 0, W, H * 1.1);
    g.addColorStop(0, "#5b21b6");
    g.addColorStop(0.45, "#4c1d95");
    g.addColorStop(0.75, "#312e81");
    g.addColorStop(1, "#1e1b4b");
    return g;
  }
  if (currentTheme === "snowy") {
    const g = ctx.createLinearGradient(0, 0, W * 0.7, H);
    g.addColorStop(0, "#e0f2fe");
    g.addColorStop(0.35, "#7dd3fc");
    g.addColorStop(0.72, "#1e3a5f");
    g.addColorStop(1, "#0f172a");
    return g;
  }
  if (currentTheme === "factory") {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#475569");
    g.addColorStop(0.45, "#334155");
    g.addColorStop(1, "#0f172a");
    return g;
  }
  if (currentTheme === "enemys_base") {
    const g = ctx.createLinearGradient(0, 0, W * 0.9, H * 1.05);
    g.addColorStop(0, "#3f0f1a");
    g.addColorStop(0.32, "#1a0a0a");
    g.addColorStop(0.7, "#0f0508");
    g.addColorStop(1, "#0a0204");
    return g;
  }
  if (currentTheme === "coast") {
    const g = ctx.createLinearGradient(0, 0, W, H * 0.92);
    g.addColorStop(0, "#164e63");
    g.addColorStop(0.4, "#0c4a6e");
    g.addColorStop(0.78, "#0f172a");
    g.addColorStop(1, "#020617");
    return g;
  }
  if (currentTheme === "metro") {
    const g = ctx.createLinearGradient(0, 0, W * 0.85, H);
    g.addColorStop(0, "#3730a3");
    g.addColorStop(0.5, "#1e1b4b");
    g.addColorStop(1, "#050316");
    return g;
  }
  if (currentTheme === "forest") {
    const g = ctx.createLinearGradient(0, 0, W * 0.6, H);
    g.addColorStop(0, "#243d28");
    g.addColorStop(0.35, "#1a2a1e");
    g.addColorStop(0.72, "#121c16");
    g.addColorStop(1, "#0a100c");
    return g;
  }
  if (currentTheme === "desert") {
    const g = ctx.createLinearGradient(0, 0, W, H * 1.1);
    g.addColorStop(0, "#4a3d2e");
    g.addColorStop(0.4, "#2e2618");
    g.addColorStop(0.75, "#221a12");
    g.addColorStop(1, "#140f0a");
    return g;
  }
  if (currentTheme === "math_contest") {
    const g = ctx.createLinearGradient(0, 0, W * 0.85, H);
    g.addColorStop(0, "#1e3a2e");
    g.addColorStop(0.42, "#132a22");
    g.addColorStop(1, "#0a1612");
    return g;
  }
  if (currentTheme === "space_map") {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#a8c8ec");
    g.addColorStop(0.4, "#d4c4f0");
    g.addColorStop(0.72, "#f0c0d8");
    g.addColorStop(1, "#b8dce8");
    return g;
  }
  const g = ctx.createLinearGradient(0, 0, W * 0.45, H);
  g.addColorStop(0, "#1c2434");
  g.addColorStop(0.45, "#121820");
  g.addColorStop(1, "#080a0e");
  return g;
}

/** Subtle vignette + horizon haze for depth (drawn after base fill). */
function drawAtmosphereHaze() {
  if (currentTheme === "space_map") {
    const v = ctx.createRadialGradient(W * 0.5, H * 0.45, W * 0.2, W * 0.5, H * 0.5, W * 0.88);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(0.72, "rgba(0,0,0,0.06)");
    v.addColorStop(1, "rgba(0,0,0,0.18)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
    return;
  }
  const v = ctx.createRadialGradient(W * 0.5, H * 0.45, W * 0.15, W * 0.5, H * 0.5, W * 0.85);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(0.65, "rgba(0,0,0,0.12)");
  v.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  if (currentTheme === "forest") {
    const h = ctx.createLinearGradient(0, 0, 0, H * 0.55);
    h.addColorStop(0, "rgba(120, 180, 140, 0.06)");
    h.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = h;
    ctx.fillRect(0, 0, W, H);
  } else if (currentTheme === "desert") {
    const h = ctx.createLinearGradient(0, 0, 0, H * 0.5);
    h.addColorStop(0, "rgba(255, 210, 150, 0.08)");
    h.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = h;
    ctx.fillRect(0, 0, W, H);
  } else if (currentTheme === "disco") {
    const h = ctx.createLinearGradient(0, 0, W * 0.6, 0);
    h.addColorStop(0, "rgba(244, 114, 182, 0.08)");
    h.addColorStop(0.5, "rgba(168, 85, 247, 0.06)");
    h.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = h;
    ctx.fillRect(0, 0, W, H);
  } else if (currentTheme === "snowy") {
    const h = ctx.createLinearGradient(0, 0, 0, H * 0.45);
    h.addColorStop(0, "rgba(255, 255, 255, 0.09)");
    h.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = h;
    ctx.fillRect(0, 0, W, H);
  } else if (currentTheme === "factory") {
    const h = ctx.createLinearGradient(0, 0, 0, H * 0.38);
    h.addColorStop(0, "rgba(251, 191, 36, 0.07)");
    h.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = h;
    ctx.fillRect(0, 0, W, H);
  } else if (currentTheme === "enemys_base") {
    const h = ctx.createLinearGradient(0, 0, W * 0.45, H * 0.42);
    h.addColorStop(0, "rgba(220, 50, 50, 0.1)");
    h.addColorStop(0.55, "rgba(80, 20, 30, 0.05)");
    h.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = h;
    ctx.fillRect(0, 0, W, H);
  } else if (currentTheme === "coast") {
    const h = ctx.createLinearGradient(0, 0, 0, H * 0.55);
    h.addColorStop(0, "rgba(34, 211, 238, 0.07)");
    h.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = h;
    ctx.fillRect(0, 0, W, H);
  } else if (currentTheme === "metro") {
    const h = ctx.createLinearGradient(0, 0, W, 0);
    h.addColorStop(0, "rgba(99, 102, 241, 0.06)");
    h.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = h;
    ctx.fillRect(0, 0, W, H);
  } else if (currentTheme === "math_contest") {
    const h = ctx.createLinearGradient(0, 0, 0, H * 0.48);
    h.addColorStop(0, "rgba(200, 255, 220, 0.06)");
    h.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = h;
    ctx.fillRect(0, 0, W, H);
  } else {
    const h = ctx.createLinearGradient(0, 0, 0, H * 0.42);
    h.addColorStop(0, "rgba(100, 160, 220, 0.05)");
    h.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = h;
    ctx.fillRect(0, 0, W, H);
  }
  drawSkyDetailLayer();
}

/** Large soft highlights + low-floating “haze blobs” for depth (cheap radial passes). */
function drawSkyDetailLayer() {
  if (currentTheme === "space_map") return;
  const blobs = [
    { x: W * 0.12, y: H * 0.18, r: W * 0.35, a: 0.045 },
    { x: W * 0.82, y: H * 0.12, r: W * 0.28, a: 0.04 },
    { x: W * 0.55, y: H * 0.08, r: W * 0.22, a: 0.035 },
  ];
  for (const b of blobs) {
    const rg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    if (currentTheme === "forest") {
      rg.addColorStop(0, `rgba(160, 210, 170, ${b.a * 1.4})`);
      rg.addColorStop(1, "rgba(0,0,0,0)");
    } else if (currentTheme === "desert") {
      rg.addColorStop(0, `rgba(255, 220, 170, ${b.a * 1.5})`);
      rg.addColorStop(1, "rgba(0,0,0,0)");
    } else if (currentTheme === "disco") {
      rg.addColorStop(0, `rgba(244, 114, 182, ${b.a * 1.8})`);
      rg.addColorStop(0.5, `rgba(168, 85, 247, ${b.a * 0.9})`);
      rg.addColorStop(1, "rgba(0,0,0,0)");
    } else if (currentTheme === "snowy") {
      rg.addColorStop(0, `rgba(255, 255, 255, ${b.a * 2})`);
      rg.addColorStop(1, "rgba(0,0,0,0)");
    } else if (currentTheme === "factory") {
      rg.addColorStop(0, `rgba(251, 191, 36, ${b.a * 1.2})`);
      rg.addColorStop(1, "rgba(0,0,0,0)");
    } else if (currentTheme === "enemys_base") {
      rg.addColorStop(0, `rgba(248, 113, 113, ${b.a * 1.35})`);
      rg.addColorStop(0.55, `rgba(127, 29, 29, ${b.a * 0.65})`);
      rg.addColorStop(1, "rgba(0,0,0,0)");
    } else if (currentTheme === "coast") {
      rg.addColorStop(0, `rgba(165, 243, 252, ${b.a * 1.5})`);
      rg.addColorStop(1, "rgba(0,0,0,0)");
    } else if (currentTheme === "metro") {
      rg.addColorStop(0, `rgba(129, 140, 248, ${b.a * 1.2})`);
      rg.addColorStop(1, "rgba(0,0,0,0)");
    } else if (currentTheme === "math_contest") {
      rg.addColorStop(0, `rgba(220, 255, 230, ${b.a * 1.25})`);
      rg.addColorStop(1, "rgba(0,0,0,0)");
    } else {
      rg.addColorStop(0, `rgba(140, 180, 230, ${b.a * 1.3})`);
      rg.addColorStop(1, "rgba(0,0,0,0)");
    }
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
  }
}

function tileRand(c, r, salt) {
  let x = ((c * 73856093) ^ (r * 19349663) ^ (salt * 83492791)) >>> 0;
  x = (x * 1103515245 + 12345) >>> 0;
  return (x % 10000) / 10000;
}

/**
 * Speckles, micro-cracks, and theme-specific grain so tiles read less flat.
 * @param {"path"|"build"|"obstacle"} kind
 */
function drawTileSurfaceDetail(px, py, kind) {
  const pad = 2;
  const x = px + pad;
  const y = py + pad;
  const s = CELL - pad * 2;
  const c = Math.floor(px / CELL);
  const r = Math.floor(py / CELL);

  let speckA = 0.07;
  let speckRgb = "255,255,255";
  if (currentTheme === "forest") {
    speckRgb = kind === "path" ? "40,30,20" : "200,255,210";
    speckA = kind === "path" ? 0.12 : 0.06;
  } else if (currentTheme === "desert") {
    speckRgb = "120,80,40";
    speckA = 0.1;
  } else if (currentTheme === "disco") {
    speckRgb = "255,200,255";
    speckA = 0.11;
  } else if (currentTheme === "snowy") {
    speckRgb = "255,255,255";
    speckA = 0.14;
  } else if (currentTheme === "factory") {
    speckRgb = "255,200,120";
    speckA = 0.08;
  } else if (currentTheme === "enemys_base") {
    speckRgb = kind === "path" ? "255,200,180" : "255,120,120";
    speckA = 0.09;
  } else if (currentTheme === "coast") {
    speckRgb = "200,255,255";
    speckA = 0.09;
  } else if (currentTheme === "metro") {
    speckRgb = "200,190,255";
    speckA = 0.07;
  } else if (currentTheme === "math_contest") {
    speckRgb = kind === "path" ? "230,245,235" : "200,255,215";
    speckA = 0.08;
  } else if (currentTheme === "space_map") {
    speckRgb = kind === "path" ? "200,180,90" : "230,210,255";
    speckA = kind === "path" ? 0.07 : 0.045;
  } else {
    speckRgb = "200,220,255";
    speckA = 0.06;
  }

  const nSpecks = 5 + Math.floor(tileRand(c, r, 1) * 5);
  for (let i = 0; i < nSpecks; i++) {
    const u = tileRand(c, r, 10 + i);
    const v = tileRand(c, r, 20 + i);
    const sx = x + 2 + u * (s - 6);
    const sy = y + 2 + v * (s - 6);
    const w = 1 + Math.floor(tileRand(c, r, 30 + i) * 2);
    ctx.fillStyle = `rgba(${speckRgb},${speckA * (0.5 + tileRand(c, r, 40 + i))})`;
    ctx.fillRect(sx, sy, w, w);
  }

  if (kind === "path") {
    ctx.strokeStyle = `rgba(${speckRgb},${speckA * 0.9})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    const jx = tileRand(c, r, 2) * 4 - 2;
    const jy = tileRand(c, r, 3) * 4 - 2;
    ctx.moveTo(x + 2 + jx, y + s * 0.35);
    ctx.lineTo(x + s * 0.65 + jx, y + s * 0.72 + jy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + s * 0.25, y + 3);
    ctx.lineTo(x + s * 0.55, y + s * 0.45);
    ctx.stroke();
  }

  if (kind === "build") {
    const cx = x + s * 0.5;
    const cy = y + s * 0.5;
    const ringA = 0.04 + tileRand(c, r, 5) * 0.04;
    ctx.strokeStyle = `rgba(${speckRgb},${ringA})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.28 + tileRand(c, r, 6) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/**
 * Raised “3D” tile: light from top-left, shadow on bottom-right edges.
 * @param {"path"|"build"|"obstacle"} kind
 */
function drawTerrainTile(px, py, kind) {
  const pad = 2;
  const x = px + pad;
  const y = py + pad;
  const s = CELL - pad * 2;
  let light;
  let mid;
  let dark;
  let hi;
  let sh;

  if (currentTheme === "forest") {
    if (kind === "path") {
      light = "#7a6548";
      mid = "#5c4a32";
      dark = "#3d3020";
      hi = "rgba(255,235,200,0.22)";
      sh = "rgba(20,12,5,0.45)";
    } else if (kind === "build") {
      light = "rgba(85, 145, 95, 0.55)";
      mid = "rgba(55, 110, 68, 0.42)";
      dark = "rgba(28, 55, 35, 0.5)";
      hi = "rgba(180, 255, 200, 0.18)";
      sh = "rgba(10, 25, 12, 0.35)";
    } else {
      light = "rgba(42, 62, 46, 0.95)";
      mid = "rgba(32, 48, 36, 0.92)";
      dark = "rgba(18, 28, 22, 0.98)";
      hi = "rgba(120, 160, 130, 0.12)";
      sh = "rgba(0, 0, 0, 0.4)";
    }
  } else if (currentTheme === "desert") {
    if (kind === "path") {
      light = "#dcc090";
      mid = "#b89560";
      dark = "#8a6a40";
      hi = "rgba(255, 245, 220, 0.35)";
      sh = "rgba(60, 40, 15, 0.4)";
    } else if (kind === "build") {
      light = "rgba(220, 190, 130, 0.35)";
      mid = "rgba(180, 150, 95, 0.22)";
      dark = "rgba(100, 80, 45, 0.28)";
      hi = "rgba(255, 250, 220, 0.2)";
      sh = "rgba(50, 35, 15, 0.3)";
    } else {
      light = "rgba(200, 170, 120, 0.22)";
      mid = "rgba(160, 130, 85, 0.18)";
      dark = "rgba(90, 70, 45, 0.25)";
      hi = "rgba(255, 240, 200, 0.15)";
      sh = "rgba(40, 25, 10, 0.35)";
    }
  } else if (currentTheme === "disco") {
    if (kind === "path") {
      light = "#7c3aed";
      mid = "#5b21b6";
      dark = "#3b0764";
      hi = "rgba(244, 114, 182, 0.45)";
      sh = "rgba(0,0,0,0.55)";
    } else if (kind === "build") {
      light = "rgba(192, 132, 252, 0.4)";
      mid = "rgba(126, 58, 242, 0.28)";
      dark = "rgba(67, 23, 140, 0.45)";
      hi = "rgba(255, 255, 255, 0.2)";
      sh = "rgba(20, 5, 50, 0.4)";
    } else {
      light = "rgba(49, 27, 103, 0.95)";
      mid = "rgba(35, 18, 82, 0.98)";
      dark = "rgba(15, 8, 45, 1)";
      hi = "rgba(244, 114, 182, 0.15)";
      sh = "rgba(0,0,0,0.5)";
    }
  } else if (currentTheme === "snowy") {
    if (kind === "path") {
      light = "#cbd5e1";
      mid = "#94a3b8";
      dark = "#64748b";
      hi = "rgba(255,255,255,0.55)";
      sh = "rgba(15, 40, 70, 0.45)";
    } else if (kind === "build") {
      light = "rgba(226, 232, 240, 0.55)";
      mid = "rgba(148, 163, 184, 0.35)";
      dark = "rgba(71, 85, 105, 0.45)";
      hi = "rgba(255,255,255,0.35)";
      sh = "rgba(15, 30, 55, 0.35)";
    } else {
      light = "rgba(51, 65, 85, 0.92)";
      mid = "rgba(30, 41, 59, 0.96)";
      dark = "rgba(15, 23, 42, 1)";
      hi = "rgba(186, 230, 253, 0.12)";
      sh = "rgba(0,0,0,0.5)";
    }
  } else if (currentTheme === "factory") {
    if (kind === "path") {
      light = "#78716c";
      mid = "#57534e";
      dark = "#292524";
      hi = "rgba(251, 191, 36, 0.32)";
      sh = "rgba(0,0,0,0.55)";
    } else if (kind === "build") {
      light = "rgba(120, 113, 108, 0.55)";
      mid = "rgba(87, 83, 78, 0.4)";
      dark = "rgba(41, 37, 36, 0.55)";
      hi = "rgba(253, 224, 71, 0.18)";
      sh = "rgba(0,0,0,0.45)";
    } else {
      light = "rgba(28, 25, 23, 0.98)";
      mid = "rgba(20, 18, 16, 1)";
      dark = "rgba(12, 10, 9, 1)";
      hi = "rgba(251, 146, 60, 0.12)";
      sh = "rgba(0,0,0,0.55)";
    }
  } else if (currentTheme === "enemys_base") {
    if (kind === "path") {
      light = "#5c3d3d";
      mid = "#3d2528";
      dark = "#1a0f12";
      hi = "rgba(252, 211, 77, 0.42)";
      sh = "rgba(0,0,0,0.58)";
    } else if (kind === "build") {
      light = "rgba(90, 45, 55, 0.55)";
      mid = "rgba(55, 28, 38, 0.48)";
      dark = "rgba(25, 12, 18, 0.55)";
      hi = "rgba(239, 68, 68, 0.22)";
      sh = "rgba(0,0,0,0.5)";
    } else {
      light = "rgba(35, 18, 22, 0.98)";
      mid = "rgba(22, 10, 14, 1)";
      dark = "rgba(8, 4, 6, 1)";
      hi = "rgba(248, 113, 113, 0.14)";
      sh = "rgba(0,0,0,0.52)";
    }
  } else if (currentTheme === "coast") {
    if (kind === "path") {
      light = "#5eead4";
      mid = "#2dd4bf";
      dark = "#0f766e";
      hi = "rgba(207, 250, 254, 0.4)";
      sh = "rgba(8, 51, 68, 0.45)";
    } else if (kind === "build") {
      light = "rgba(94, 234, 212, 0.35)";
      mid = "rgba(45, 212, 191, 0.22)";
      dark = "rgba(17, 94, 89, 0.4)";
      hi = "rgba(254, 249, 195, 0.2)";
      sh = "rgba(8, 47, 73, 0.35)";
    } else {
      light = "rgba(14, 116, 144, 0.55)";
      mid = "rgba(8, 91, 115, 0.65)";
      dark = "rgba(6, 53, 72, 0.85)";
      hi = "rgba(165, 243, 252, 0.15)";
      sh = "rgba(0,0,0,0.45)";
    }
  } else if (currentTheme === "metro") {
    if (kind === "path") {
      light = "#4b5563";
      mid = "#374151";
      dark = "#1f2937";
      hi = "rgba(196, 181, 253, 0.28)";
      sh = "rgba(0,0,0,0.55)";
    } else if (kind === "build") {
      light = "rgba(99, 102, 241, 0.35)";
      mid = "rgba(67, 56, 202, 0.25)";
      dark = "rgba(30, 27, 75, 0.45)";
      hi = "rgba(254, 240, 138, 0.15)";
      sh = "rgba(0,0,0,0.45)";
    } else {
      light = "rgba(30, 27, 75, 0.95)";
      mid = "rgba(20, 18, 58, 0.98)";
      dark = "rgba(10, 8, 32, 1)";
      hi = "rgba(129, 140, 248, 0.12)";
      sh = "rgba(0,0,0,0.5)";
    }
  } else if (currentTheme === "math_contest") {
    if (kind === "path") {
      light = "#4a6b5c";
      mid = "#355a4a";
      dark = "#1e3d32";
      hi = "rgba(255, 245, 220, 0.35)";
      sh = "rgba(0, 0, 0, 0.48)";
    } else if (kind === "build") {
      light = "rgba(65, 110, 88, 0.5)";
      mid = "rgba(42, 88, 68, 0.4)";
      dark = "rgba(24, 58, 44, 0.48)";
      hi = "rgba(200, 255, 210, 0.2)";
      sh = "rgba(5, 15, 10, 0.38)";
    } else {
      light = "rgba(28, 52, 42, 0.95)";
      mid = "rgba(20, 42, 34, 0.96)";
      dark = "rgba(10, 26, 20, 0.99)";
      hi = "rgba(180, 255, 200, 0.1)";
      sh = "rgba(0, 0, 0, 0.42)";
    }
  } else if (currentTheme === "space_map") {
    if (kind === "path") {
      light = "rgba(240, 245, 140, 0.78)";
      mid = "rgba(200, 220, 100, 0.7)";
      dark = "rgba(140, 160, 70, 0.62)";
      hi = "rgba(255, 255, 220, 0.35)";
      sh = "rgba(60, 50, 20, 0.35)";
    } else if (kind === "build") {
      light = "rgba(230, 210, 255, 0.32)";
      mid = "rgba(190, 170, 230, 0.26)";
      dark = "rgba(110, 90, 150, 0.34)";
      hi = "rgba(255, 240, 255, 0.22)";
      sh = "rgba(40, 25, 70, 0.28)";
    } else {
      light = "rgba(130, 110, 170, 0.26)";
      mid = "rgba(95, 75, 130, 0.24)";
      dark = "rgba(55, 45, 85, 0.3)";
      hi = "rgba(220, 200, 255, 0.12)";
      sh = "rgba(15, 10, 35, 0.32)";
    }
  } else {
    if (kind === "path") {
      light = "#4a5568";
      mid = "#2f3848";
      dark = "#1a2230";
      hi = "rgba(200, 220, 255, 0.2)";
      sh = "rgba(0, 0, 0, 0.5)";
    } else if (kind === "build") {
      light = "rgba(100, 160, 120, 0.35)";
      mid = "rgba(70, 120, 95, 0.22)";
      dark = "rgba(35, 55, 45, 0.35)";
      hi = "rgba(200, 255, 220, 0.15)";
      sh = "rgba(5, 15, 10, 0.35)";
    } else {
      light = "rgba(30, 38, 48, 0.95)";
      mid = "rgba(20, 26, 34, 0.98)";
      dark = "rgba(12, 16, 22, 1)";
      hi = "rgba(180, 200, 220, 0.08)";
      sh = "rgba(0, 0, 0, 0.45)";
    }
  }

  const g = ctx.createLinearGradient(x, y, x + s, y + s);
  g.addColorStop(0, light);
  g.addColorStop(0.52, mid);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, s, s);

  ctx.strokeStyle = hi;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 0.5, y + s - 0.5);
  ctx.lineTo(x + 0.5, y + 0.5);
  ctx.lineTo(x + s - 0.5, y + 0.5);
  ctx.stroke();
  ctx.strokeStyle = sh;
  ctx.beginPath();
  ctx.moveTo(x + s - 0.5, y + 0.5);
  ctx.lineTo(x + s - 0.5, y + s - 0.5);
  ctx.lineTo(x + 0.5, y + s - 0.5);
  ctx.stroke();

  if (kind === "path") {
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    ctx.fillRect(x + s * 0.55, y + s * 0.55, s * 0.35, s * 0.35);
  }

  drawTileSurfaceDetail(px, py, kind);
}

/** Blocked tiles: concrete bunker + hazard stripe (enemy HQ aesthetic). */
function drawEnemyFortBunker(cx, cy) {
  const x = cx * CELL + CELL / 2;
  const y = cy * CELL + CELL / 2;
  ctx.fillStyle = "rgba(0,0,0,0.38)";
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 11, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a1215";
  ctx.fillRect(x - 14, y - 8, 28, 22);
  ctx.fillStyle = "#3f1720";
  ctx.fillRect(x - 12, y - 10, 24, 8);
  ctx.fillStyle = "rgba(220, 38, 38, 0.35)";
  ctx.fillRect(x - 12, y - 6, 24, 3);
  ctx.fillStyle = "rgba(250, 204, 21, 0.95)";
  ctx.fillRect(x - 14, y + 2, 28, 4);
  ctx.strokeStyle = "rgba(239, 68, 68, 0.55)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 14, y - 8, 28, 22);
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(x - 4, y - 7, 8, 6);
}

/** Coiled barrier wire on rough ground. */
function drawEnemyFortWire(cx, cy) {
  const x = cx * CELL + CELL / 2;
  const y = cy * CELL + CELL / 2;
  ctx.fillStyle = "rgba(40, 25, 28, 0.5)";
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(180, 180, 195, 0.4)";
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.arc(x + i * 5, y - 2, 8, 0.25, Math.PI - 0.25);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(220, 50, 50, 0.3)";
  ctx.strokeRect(x - 11, y - 10, 22, 18);
}

function drawTreeForest(cx, cy) {
  const x = cx * CELL + CELL / 2;
  const y = cy * CELL + CELL / 2;
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(x + 3, y + 12, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  const trunkG = ctx.createLinearGradient(x - 4, y + 2, x + 4, y + 16);
  trunkG.addColorStop(0, "#6a5340");
  trunkG.addColorStop(1, "#3a2a1c");
  ctx.fillStyle = trunkG;
  ctx.fillRect(x - 4, y + 2, 8, 14);
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.strokeRect(x - 4, y + 2, 8, 14);
  const lowG = ctx.createRadialGradient(x - 4, y + 4, 2, x, y + 2, 16);
  lowG.addColorStop(0, "#3d8a52");
  lowG.addColorStop(1, "#1d4a2a");
  ctx.beginPath();
  ctx.moveTo(x, y - 14);
  ctx.lineTo(x + 14, y + 8);
  ctx.lineTo(x - 14, y + 8);
  ctx.closePath();
  ctx.fillStyle = lowG;
  ctx.fill();
  const topG = ctx.createRadialGradient(x, y - 18, 1, x, y - 8, 14);
  topG.addColorStop(0, "#5cb87a");
  topG.addColorStop(1, "#2d6a3e");
  ctx.beginPath();
  ctx.moveTo(x, y - 22);
  ctx.lineTo(x + 11, y - 2);
  ctx.lineTo(x - 11, y - 2);
  ctx.closePath();
  ctx.fillStyle = topG;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 6, y - 2);
  ctx.lineTo(x - 2, y - 16);
  ctx.stroke();
}

function drawRockDesert(cx, cy) {
  const x = cx * CELL + CELL / 2;
  const y = cy * CELL + CELL / 2;
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 11, 14, 4, 0.2, 0, Math.PI * 2);
  ctx.fill();
  const rg = ctx.createLinearGradient(x - 12, y - 10, x + 14, y + 12);
  rg.addColorStop(0, "#9a8a78");
  rg.addColorStop(0.45, "#6a5a4a");
  rg.addColorStop(1, "#4a3d32");
  ctx.beginPath();
  ctx.moveTo(x - 2, y + 10);
  ctx.lineTo(x + 12, y + 4);
  ctx.lineTo(x + 8, y - 8);
  ctx.lineTo(x - 10, y - 2);
  ctx.closePath();
  ctx.fillStyle = rg;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 1);
  ctx.lineTo(x + 2, y - 6);
  ctx.stroke();
}

function drawSnowPine(cx, cy) {
  const x = cx * CELL + CELL / 2;
  const y = cy * CELL + CELL / 2;
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 12, 11, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5c4033";
  ctx.fillRect(x - 3, y + 4, 6, 11);
  ctx.fillStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.moveTo(x, y - 10);
  ctx.lineTo(x + 11, y + 8);
  ctx.lineTo(x - 11, y + 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#bae6fd";
  ctx.beginPath();
  ctx.moveTo(x, y - 18);
  ctx.lineTo(x + 8, y - 4);
  ctx.lineTo(x - 8, y - 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawFactoryStack(cx, cy) {
  const x = cx * CELL + CELL / 2;
  const y = cy * CELL + CELL / 2;
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(x - 14, y - 4, 28, 20);
  ctx.fillStyle = "#64748b";
  ctx.fillRect(x - 12, y - 8, 9, 24);
  ctx.fillStyle = "#475569";
  ctx.fillRect(x - 1, y - 12, 11, 28);
  ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
  ctx.fillRect(x + 2, y - 16, 6, 6);
  ctx.fillStyle = "rgba(251, 191, 36, 0.55)";
  ctx.beginPath();
  ctx.arc(x + 5, y - 20, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawDiscoColumn(cx, cy) {
  const x = cx * CELL + CELL / 2;
  const y = cy * CELL + CELL / 2;
  const g = ctx.createLinearGradient(x - 7, y - 14, x + 7, y + 14);
  g.addColorStop(0, "#c084fc");
  g.addColorStop(1, "#6b21a8");
  ctx.fillStyle = g;
  ctx.fillRect(x - 6, y - 10, 12, 22);
  ctx.strokeStyle = "#f472b6";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - 6, y - 10, 12, 22);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(x - 3, y - 6, 2, 12);
}

function drawCoastRocks(cx, cy) {
  const x = cx * CELL + CELL / 2;
  const y = cy * CELL + CELL / 2;
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 10, 13, 4, 0.1, 0, Math.PI * 2);
  ctx.fill();
  const rg = ctx.createLinearGradient(x - 12, y - 8, x + 14, y + 10);
  rg.addColorStop(0, "#94a3b8");
  rg.addColorStop(0.5, "#64748b");
  rg.addColorStop(1, "#334155");
  ctx.beginPath();
  ctx.moveTo(x - 2, y + 8);
  ctx.lineTo(x + 11, y + 3);
  ctx.lineTo(x + 6, y - 8);
  ctx.lineTo(x - 10, y - 2);
  ctx.closePath();
  ctx.fillStyle = rg;
  ctx.fill();
  ctx.strokeStyle = "rgba(125, 211, 252, 0.35)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawMetroBlock(cx, cy) {
  const x = cx * CELL + CELL / 2;
  const y = cy * CELL + CELL / 2;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(x - 13, y - 14, 26, 30);
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(x - 11, y - 12, 22, 12);
  ctx.fillStyle = "rgba(250, 204, 21, 0.35)";
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(x - 8 + i * 6, y - 4, 4, 5);
  }
  ctx.strokeStyle = "rgba(129, 140, 248, 0.4)";
  ctx.strokeRect(x - 13, y - 14, 26, 30);
}

/** Faint chalk marks on blocked “blackboard” cells. */
function drawMathChalkDecor(cx, cy) {
  const x = cx * CELL + CELL / 2;
  const y = cy * CELL + CELL / 2;
  const h = (cx * 7 + cy * 11) % 4;
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 1.1;
  ctx.lineCap = "round";
  if (h === 0) {
    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.lineTo(x + 10, y);
    ctx.moveTo(x, y - 8);
    ctx.lineTo(x, y + 8);
    ctx.stroke();
  } else if (h === 1) {
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.stroke();
  } else if (h === 2) {
    ctx.beginPath();
    ctx.moveTo(x - 8, y + 6);
    ctx.lineTo(x, y - 8);
    ctx.lineTo(x + 8, y + 6);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 4);
    ctx.lineTo(x + 6, y + 8);
    ctx.stroke();
  }
}

function drawClassicBush(cx, cy) {
  const x = cx * CELL + CELL / 2;
  const y = cy * CELL + CELL / 2;
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 10, 13, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(x - 6, y - 2, 2, x, y + 4, 14);
  g.addColorStop(0, "#5a9e6a");
  g.addColorStop(1, "#2d5a38");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x - 4, y + 2, 9, 0, Math.PI * 2);
  ctx.arc(x + 6, y + 1, 8, 0, Math.PI * 2);
  ctx.arc(x + 1, y - 4, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawClassicRock(cx, cy) {
  const x = cx * CELL + CELL / 2;
  const y = cy * CELL + CELL / 2;
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(x + 1, y + 9, 10, 3, 0.1, 0, Math.PI * 2);
  ctx.fill();
  const rg = ctx.createLinearGradient(x - 8, y - 6, x + 8, y + 8);
  rg.addColorStop(0, "#6b7280");
  rg.addColorStop(0.5, "#4b5563");
  rg.addColorStop(1, "#374151");
  ctx.beginPath();
  ctx.moveTo(x - 6, y + 6);
  ctx.lineTo(x + 7, y + 4);
  ctx.lineTo(x + 4, y - 5);
  ctx.lineTo(x - 8, y - 2);
  ctx.closePath();
  ctx.fillStyle = rg;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawDesertGrassClump(cx, cy) {
  const x = cx * CELL + CELL / 2;
  const y = cy * CELL + CELL / 2;
  for (let i = 0; i < 5; i++) {
    const ox = (i - 2) * 3;
    ctx.strokeStyle = `rgba(120, 160, 80, ${0.25 + i * 0.05})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x + ox, y + 8);
    ctx.quadraticCurveTo(x + ox + 2, y + 2, x + ox + 4, y - 4);
    ctx.stroke();
  }
}

function drawThemeObstacleDecor(c, r) {
  const h = (c * 7 + r * 11) % 6;
  if (currentTheme === "forest") {
    drawTreeForest(c, r);
    if (h <= 1) {
      ctx.fillStyle = "rgba(45, 90, 50, 0.35)";
      ctx.beginPath();
      ctx.ellipse(c * CELL + CELL / 2 + 10, r * CELL + CELL - 4, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (currentTheme === "desert") {
    if (h % 3 === 0) {
      drawRockDesert(c, r);
    } else if (h % 3 === 1) {
      drawDesertGrassClump(c, r);
    } else {
      ctx.fillStyle = "rgba(180, 140, 80, 0.12)";
      ctx.beginPath();
      ctx.ellipse(c * CELL + CELL / 2, r * CELL + CELL / 2 + 6, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (currentTheme === "snowy" && h <= 2) {
    drawSnowPine(c, r);
  } else if (currentTheme === "factory" && h <= 2) {
    drawFactoryStack(c, r);
  } else if (currentTheme === "disco" && h <= 2) {
    drawDiscoColumn(c, r);
  } else if (currentTheme === "coast" && h <= 2) {
    drawCoastRocks(c, r);
  } else if (currentTheme === "metro" && h <= 2) {
    drawMetroBlock(c, r);
  } else if (currentTheme === "enemys_base") {
    if (h % 2 === 0) {
      drawEnemyFortBunker(c, r);
    } else {
      drawEnemyFortWire(c, r);
    }
  } else if (currentTheme === "math_contest") {
    drawMathChalkDecor(c, r);
  } else if (currentTheme === "classic") {
    if (h % 2 === 0) {
      drawClassicBush(c, r);
    } else {
      drawClassicRock(c, r);
    }
  }
}

/** Dashed lane marker along the spline — reads more like a road / lane. */
function drawPathCenterLine() {
  let dashColor = "rgba(255,255,255,0.11)";
  if (currentTheme === "forest") dashColor = "rgba(255,235,210,0.16)";
  else if (currentTheme === "desert") dashColor = "rgba(255,230,190,0.12)";
  else if (currentTheme === "disco") dashColor = "rgba(251, 207, 232, 0.18)";
  else if (currentTheme === "snowy") dashColor = "rgba(255,255,255,0.2)";
  else if (currentTheme === "factory") dashColor = "rgba(253, 224, 71, 0.14)";
  else if (currentTheme === "coast") dashColor = "rgba(207, 250, 254, 0.16)";
  else if (currentTheme === "metro") dashColor = "rgba(221, 214, 254, 0.14)";
  else if (currentTheme === "enemys_base") dashColor = "rgba(254, 249, 195, 0.18)";
  else if (currentTheme === "math_contest") dashColor = "rgba(255, 250, 230, 0.15)";
  else if (currentTheme === "space_map") dashColor = "rgba(255, 248, 200, 0.17)";
  ctx.save();
  ctx.setLineDash([5, 7]);
  ctx.lineWidth = 1.15;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = dashColor;
  ctx.beginPath();
  ctx.moveTo(PATH_WAYPOINTS[0].x, PATH_WAYPOINTS[0].y);
  for (let i = 1; i < PATH_WAYPOINTS.length; i++) {
    ctx.lineTo(PATH_WAYPOINTS[i].x, PATH_WAYPOINTS[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawPathTrack() {
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const key = `${c},${r}`;
      const px = c * CELL;
      const py = r * CELL;
      if (PATH_CELL_KEYS.has(key)) {
        drawTerrainTile(px, py, "path");
      } else if (currentTheme === "space_map") {
        /* Map art only — no build/obstacle tile squares. */
      } else if (isBuildable(c, r)) {
        drawTerrainTile(px, py, "build");
      } else {
        drawTerrainTile(px, py, "obstacle");
        drawThemeObstacleDecor(c, r);
      }
    }
  }

  let pathStroke = "rgba(200, 220, 255, 0.35)";
  let pathGlow = "rgba(120, 180, 255, 0.25)";
  if (currentTheme === "forest") {
    pathStroke = "rgba(200, 170, 120, 0.85)";
    pathGlow = "rgba(90, 70, 45, 0.5)";
  }
  if (currentTheme === "desert") {
    pathStroke = "rgba(255, 220, 160, 0.55)";
    pathGlow = "rgba(100, 70, 35, 0.45)";
  }
  if (currentTheme === "disco") {
    pathStroke = "rgba(244, 114, 182, 0.85)";
    pathGlow = "rgba(168, 85, 247, 0.5)";
  }
  if (currentTheme === "snowy") {
    pathStroke = "rgba(224, 242, 254, 0.72)";
    pathGlow = "rgba(125, 211, 252, 0.38)";
  }
  if (currentTheme === "factory") {
    pathStroke = "rgba(251, 191, 36, 0.6)";
    pathGlow = "rgba(251, 146, 60, 0.35)";
  }
  if (currentTheme === "coast") {
    pathStroke = "rgba(165, 243, 252, 0.68)";
    pathGlow = "rgba(14, 165, 233, 0.38)";
  }
  if (currentTheme === "metro") {
    pathStroke = "rgba(196, 181, 253, 0.65)";
    pathGlow = "rgba(139, 92, 246, 0.38)";
  }
  if (currentTheme === "enemys_base") {
    pathStroke = "rgba(252, 211, 77, 0.78)";
    pathGlow = "rgba(185, 28, 28, 0.48)";
  }
  if (currentTheme === "math_contest") {
    pathStroke = "rgba(255, 250, 220, 0.72)";
    pathGlow = "rgba(167, 243, 208, 0.38)";
  }
  if (currentTheme === "space_map") {
    pathStroke = "rgba(255, 248, 160, 0.85)";
    pathGlow = "rgba(220, 230, 100, 0.42)";
  }

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(PATH_WAYPOINTS[0].x, PATH_WAYPOINTS[0].y);
  for (let i = 1; i < PATH_WAYPOINTS.length; i++) {
    ctx.lineTo(PATH_WAYPOINTS[i].x, PATH_WAYPOINTS[i].y);
  }
  const pathW =
    currentTheme === "classic" ||
    currentTheme === "math_contest" ||
    currentTheme === "enemys_base" ||
    currentTheme === "space_map"
      ? 3
      : 4;
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = pathW + 4;
  ctx.stroke();
  ctx.strokeStyle = pathGlow;
  ctx.lineWidth = pathW + 2;
  ctx.stroke();
  ctx.strokeStyle = pathStroke;
  ctx.lineWidth =
    currentTheme === "classic" ||
    currentTheme === "math_contest" ||
    currentTheme === "enemys_base" ||
    currentTheme === "space_map"
      ? 2.5
      : 3.5;
  ctx.stroke();

  drawPathCenterLine();

  if (currentGameMode === GAME_MODE.war) {
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const key = `${c},${r}`;
        const px = c * CELL;
        const py = r * CELL;
        if (warSolidCells.has(key)) {
          drawTerrainTile(px, py, "obstacle");
          drawThemeObstacleDecor(c, r);
        } else if (warCoverCells.has(key)) {
          ctx.fillStyle = "rgba(34, 100, 45, 0.2)";
          ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
        }
      }
    }
  }
}

function drawGrid() {
  if (currentTheme === "space_map") return;
  const base =
    currentTheme === "classic" || currentTheme === "math_contest" || currentTheme === "enemys_base"
      ? 0.05
      : 0.038;
  ctx.lineWidth = 1;
  for (let c = 0; c <= COLS; c++) {
    const a = base * (0.88 + (c / COLS) * 0.12);
    ctx.strokeStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath();
    ctx.moveTo(c * CELL, 0);
    ctx.lineTo(c * CELL, H);
    ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    const a = base * (0.92 + (r / ROWS) * 0.08);
    ctx.strokeStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath();
    ctx.moveTo(0, r * CELL);
    ctx.lineTo(W, r * CELL);
    ctx.stroke();
  }
  const dotA = base * 0.55;
  ctx.fillStyle = `rgba(255,255,255,${dotA})`;
  for (let c = 0; c <= COLS; c++) {
    for (let r = 0; r <= ROWS; r++) {
      if ((c + r) % 2 === 0) {
        ctx.beginPath();
        ctx.arc(c * CELL, r * CELL, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawBase() {
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(BASE.x + 4, BASE.y + 6, BASE.radius * 1.05, BASE.radius * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(BASE.x, BASE.y, BASE.radius, 0, Math.PI * 2);
  let grd;
  if (currentTheme === "desert") {
    grd = ctx.createRadialGradient(BASE.x - 8, BASE.y - 8, 4, BASE.x, BASE.y, BASE.radius);
    grd.addColorStop(0, "#ffd4a8");
    grd.addColorStop(1, "#b86a2a");
  } else if (currentTheme === "forest") {
    grd = ctx.createRadialGradient(BASE.x - 8, BASE.y - 8, 4, BASE.x, BASE.y, BASE.radius);
    grd.addColorStop(0, "#a8e6a8");
    grd.addColorStop(1, "#2a6a3e");
  } else if (currentTheme === "disco") {
    grd = ctx.createRadialGradient(BASE.x - 8, BASE.y - 8, 4, BASE.x, BASE.y, BASE.radius);
    grd.addColorStop(0, "#f0abfc");
    grd.addColorStop(1, "#86198f");
  } else if (currentTheme === "snowy") {
    grd = ctx.createRadialGradient(BASE.x - 8, BASE.y - 8, 4, BASE.x, BASE.y, BASE.radius);
    grd.addColorStop(0, "#f8fafc");
    grd.addColorStop(1, "#3b82f6");
  } else if (currentTheme === "factory") {
    grd = ctx.createRadialGradient(BASE.x - 8, BASE.y - 8, 4, BASE.x, BASE.y, BASE.radius);
    grd.addColorStop(0, "#fcd34d");
    grd.addColorStop(1, "#b45309");
  } else if (currentTheme === "coast") {
    grd = ctx.createRadialGradient(BASE.x - 8, BASE.y - 8, 4, BASE.x, BASE.y, BASE.radius);
    grd.addColorStop(0, "#a5f3fc");
    grd.addColorStop(1, "#0e7490");
  } else if (currentTheme === "metro") {
    grd = ctx.createRadialGradient(BASE.x - 8, BASE.y - 8, 4, BASE.x, BASE.y, BASE.radius);
    grd.addColorStop(0, "#c4b5fd");
    grd.addColorStop(1, "#4c1d95");
  } else if (currentTheme === "enemys_base") {
    grd = ctx.createRadialGradient(BASE.x - 8, BASE.y - 8, 4, BASE.x, BASE.y, BASE.radius);
    grd.addColorStop(0, "#fecaca");
    grd.addColorStop(0.45, "#b91c1c");
    grd.addColorStop(1, "#450a0a");
  } else if (currentTheme === "math_contest") {
    grd = ctx.createRadialGradient(BASE.x - 8, BASE.y - 8, 4, BASE.x, BASE.y, BASE.radius);
    grd.addColorStop(0, "#fefce8");
    grd.addColorStop(1, "#166534");
  } else if (currentTheme === "space_map") {
    grd = ctx.createRadialGradient(BASE.x - 8, BASE.y - 8, 4, BASE.x, BASE.y, BASE.radius);
    grd.addColorStop(0, "#fff8e8");
    grd.addColorStop(0.42, "#fbbf24");
    grd.addColorStop(1, "#b45309");
  } else {
    grd = ctx.createRadialGradient(BASE.x - 8, BASE.y - 8, 4, BASE.x, BASE.y, BASE.radius);
    grd.addColorStop(0, "#6ecbff");
    grd.addColorStop(1, "#2a6a9e");
  }
  ctx.fillStyle = grd;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 13px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("BASE", BASE.x, BASE.y);
}

function parseHexColor(hex) {
  if (!hex || typeof hex !== "string" || hex[0] !== "#") return { r: 128, g: 140, b: 160 };
  const h = hex.slice(1);
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    };
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function mixTowardWhite(hex, t) {
  const { r, g, b } = parseHexColor(hex);
  return `rgb(${Math.round(r + (255 - r) * t)},${Math.round(g + (255 - g) * t)},${Math.round(
    b + (255 - b) * t
  )})`;
}

function shadeHex(hex, t) {
  const { r, g, b } = parseHexColor(hex);
  return `rgb(${Math.round(r * t)},${Math.round(g * t)},${Math.round(b * t)})`;
}

/** Astronaut / common defenders — painted portrait instead of emoji. */
function drawRealisticDefenderPortrait(x, y, typeId) {
  if (typeId === "astronaut") {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(0.88, 0.88);
    const shell = ctx.createRadialGradient(-5, -8, 2, 0, -4, 14);
    shell.addColorStop(0, "#f8fafc");
    shell.addColorStop(0.65, "#cbd5e1");
    shell.addColorStop(1, "#94a3b8");
    ctx.fillStyle = shell;
    ctx.beginPath();
    ctx.arc(0, -4, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(15,23,42,0.55)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    const vis = ctx.createRadialGradient(-3, -7, 1, -1, -5, 9);
    vis.addColorStop(0, "rgba(200,235,255,0.98)");
    vis.addColorStop(0.5, "rgba(90,130,175,0.8)");
    vis.addColorStop(1, "rgba(25,45,75,0.95)");
    ctx.fillStyle = vis;
    ctx.beginPath();
    ctx.ellipse(-1, -5, 7.5, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(15,30,50,0.45)";
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.fillStyle = "#e8edf3";
    ctx.fillRect(-9, 3, 18, 16);
    ctx.strokeStyle = "#94a3b8";
    ctx.strokeRect(-9, 3, 18, 16);
    ctx.fillStyle = "#64748b";
    ctx.fillRect(-8, 4, 6, 13);
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(3, 7, 3, 3);
    ctx.restore();
    return true;
  }
  if (typeId === "sentry") {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(0.88, 0.88);
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(0, -4, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(96,165,250,0.45)";
    ctx.beginPath();
    ctx.arc(-1, -2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.fillStyle = "#475569";
    ctx.fillRect(-8, 4, 16, 14);
    ctx.strokeStyle = "#334155";
    ctx.strokeRect(-8, 4, 16, 14);
    ctx.restore();
    return true;
  }
  if (typeId === "frost") {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(0.88, 0.88);
    const shell = ctx.createRadialGradient(4, -6, 2, 0, -4, 12);
    shell.addColorStop(0, "#f0f9ff");
    shell.addColorStop(1, "#38bdf8");
    ctx.fillStyle = shell;
    ctx.beginPath();
    ctx.arc(0, -4, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#0369a1";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.arc(-2, -4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#bae6fd";
    ctx.fillRect(-8, 4, 16, 14);
    ctx.restore();
    return true;
  }
  return false;
}

function drawDefenderTower(d, spec, sel, isBotTower) {
  const x = d.x;
  const y = d.y;
  const tgt = findTarget(
    d,
    isBotTower
      ? { onlyRaid: true }
      : currentGameMode === GAME_MODE.war
        ? { ignoreRaid: true }
        : undefined
  );
  let ang = -Math.PI / 2;
  if (tgt) ang = Math.atan2(tgt.y - y, tgt.x - x);
  const baseFootY = y + 6;
  const col = spec.color;
  const kind = spec.projectile || "bullet";

  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(x + 3, baseFootY + 9, 17, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(x, baseFootY);
  const platG = ctx.createLinearGradient(-16, 10, 16, -4);
  platG.addColorStop(0, "#1f2937");
  platG.addColorStop(0.5, "#374151");
  platG.addColorStop(1, "#0f172a");
  ctx.beginPath();
  ctx.moveTo(-15, 4);
  ctx.lineTo(15, 4);
  ctx.lineTo(13, 14);
  ctx.lineTo(-13, 14);
  ctx.closePath();
  ctx.fillStyle = platG;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);

  const bodyR = 12;
  const bodyG = ctx.createRadialGradient(-4, -4, 1, 0, 0, bodyR);
  bodyG.addColorStop(0, mixTowardWhite(col, 0.45));
  bodyG.addColorStop(0.55, col);
  bodyG.addColorStop(1, shadeHex(col, 0.45));
  ctx.beginPath();
  ctx.arc(0, 0, bodyR, 0, Math.PI * 2);
  ctx.fillStyle = bodyG;
  ctx.fill();
  ctx.strokeStyle = isBotTower
    ? sel
      ? "rgba(255,120,120,0.95)"
      : "rgba(180,60,60,0.85)"
    : sel
      ? "rgba(255,255,255,0.9)"
      : "rgba(0,0,0,0.4)";
  ctx.lineWidth = sel ? 2.5 : 1.5;
  ctx.stroke();

  const barrel = shadeHex(col, 0.55);
  const barrelHi = mixTowardWhite(col, 0.25);
  ctx.fillStyle = barrel;

  if (kind === "bullet") {
    ctx.fillRect(2, -3.5, 15, 7);
    ctx.fillStyle = barrelHi;
    ctx.fillRect(2, -2, 15, 2);
  } else if (kind === "shard") {
    ctx.beginPath();
    ctx.moveTo(2, -4);
    ctx.lineTo(18, 0);
    ctx.lineTo(2, 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(200,240,255,0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
  } else if (kind === "beam") {
    const bg = ctx.createLinearGradient(2, -5, 14, 5);
    bg.addColorStop(0, mixTowardWhite(col, 0.5));
    bg.addColorStop(1, col);
    ctx.fillStyle = bg;
    ctx.fillRect(2, -5, 14, 10);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(4, -3, 3, 6);
  } else if (kind === "planet") {
    const og = ctx.createRadialGradient(12, -2, 1, 12, 0, 7);
    og.addColorStop(0, mixTowardWhite(col, 0.55));
    og.addColorStop(0.6, col);
    og.addColorStop(1, shadeHex(col, 0.4));
    ctx.fillStyle = og;
    ctx.beginPath();
    ctx.arc(12, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.stroke();
  } else if (kind === "volt") {
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(2, -5);
    ctx.lineTo(10, -1);
    ctx.lineTo(6, 1);
    ctx.lineTo(16, 5);
    ctx.stroke();
    ctx.fillStyle = "rgba(250, 204, 21, 0.35)";
    ctx.beginPath();
    ctx.arc(14, 0, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (!drawRealisticDefenderPortrait(x, y, d.type)) {
    ctx.font = "14px Segoe UI, sans-serif";
    const icon = DEFENDER_ICONS[d.type] || "◆";
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillText(icon, x + 0.8, y + 0.5);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText(icon, x, y);
  }

  const lv = d.level | 0;
  if (lv > 1) {
    ctx.font = "bold 9px Segoe UI, sans-serif";
    ctx.fillStyle = "rgba(0,0,0,0.78)";
    ctx.fillRect(x - 12, y + 12, 24, 11);
    ctx.fillStyle = "#e8ecf4";
    ctx.fillText(`Lv.${lv}`, x, y + 17);
  }
}

function drawDefenders() {
  ctx.font = "16px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const d of defenders) {
    const spec = DEFENDER_TYPES[d.type];
    const sel = d === selectedDefender;
    if (sel) {
      const st = getDefenderStats(d);
      ctx.beginPath();
      ctx.arc(d.x, d.y, st.range, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(91, 192, 222, 0.08)";
      ctx.fill();
      ctx.strokeStyle = "rgba(91, 192, 222, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    drawDefenderTower(d, spec, sel, false);
  }
}

function drawBotDefenders() {
  if (!botDefenders.length) return;
  ctx.font = "16px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const d of botDefenders) {
    const spec = DEFENDER_TYPES[d.type];
    drawDefenderTower(d, spec, false, true);
  }
}

function drawEnemies() {
  for (const e of enemies) {
    const s = e.blockSize || 16;
    const hp = Math.max(0, Number(e.hp) || 0);
    const maxHp = Math.max(1, Number(e.maxHp) || 1);
    const hpFrac = Math.min(1, hp / maxHp);
    const ghostHidden = enemyIsGhostInvisible(e);

    if (e.enemyTypeId === "rainbow_block") {
      const hue = (performance.now() / 18) % 360;
      const g = ctx.createLinearGradient(e.x - s / 2, e.y - s / 2, e.x + s / 2, e.y + s / 2);
      g.addColorStop(0, `hsl(${(hue + 0) % 360}, 95%, 58%)`);
      g.addColorStop(0.5, `hsl(${(hue + 120) % 360}, 90%, 55%)`);
      g.addColorStop(1, `hsl(${(hue + 240) % 360}, 95%, 52%)`);
      ctx.fillStyle = g;
    } else if (e.enemyTypeId === "wildcard_capsule") {
      const hue = (performance.now() / 24) % 360;
      const g = ctx.createLinearGradient(e.x - s / 2, e.y - s / 2, e.x + s / 2, e.y + s / 2);
      g.addColorStop(0, `hsl(${(hue + 40) % 360}, 88%, 52%)`);
      g.addColorStop(0.45, `hsl(${(hue + 200) % 360}, 85%, 48%)`);
      g.addColorStop(1, `hsl(${(hue + 300) % 360}, 90%, 55%)`);
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = e.color;
    }
    ctx.save();
    if (ghostHidden) ctx.globalAlpha = 0.22;
    ctx.fillRect(e.x - s / 2, e.y - s / 2, s, s);
    ctx.strokeStyle = ghostHidden ? "rgba(200,220,255,0.35)" : "rgba(0,0,0,0.4)";
    ctx.lineWidth = 2;
    ctx.strokeRect(e.x - s / 2, e.y - s / 2, s, s);
    ctx.restore();
    if (e.shieldLeft > 0) {
      ctx.strokeStyle = "rgba(100, 220, 255, 0.85)";
      ctx.lineWidth = 2;
      ctx.strokeRect(e.x - s / 2 - 3, e.y - s / 2 - 3, s + 6, s + 6);
    }
    const hpw = 30;
    const barY = e.y - s / 2 - 8;
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(e.x - hpw / 2, barY, hpw, 5);
    ctx.fillStyle = hpFrac > 0.35 ? "#6bcb77" : hpFrac > 0.15 ? "#e8c547" : "#e85d6c";
    ctx.fillRect(e.x - hpw / 2, barY, hpw * hpFrac, 5);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(e.x - hpw / 2, barY, hpw, 5);
    ctx.font = "9px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText(`${Math.ceil(hp)}/${maxHp}`, e.x, barY - 1);
    ctx.font = "8px Segoe UI, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText(
      ghostHidden ? "hidden" : e.isBoss ? "BOSS" : e.typeName || "",
      e.x,
      e.y + s / 2 + 10
    );
    if (e.slowUntil > performance.now()) {
      ctx.strokeStyle = "rgba(120,200,255,0.8)";
      ctx.lineWidth = 2;
      ctx.strokeRect(e.x - s / 2 - 2, e.y - s / 2 - 2, s + 4, s + 4);
    }
  }
}

function drawPlanet(x, y) {
  ctx.save();
  ctx.translate(x, y);
  const g = ctx.createRadialGradient(-3, -3, 1, 0, 0, 9);
  g.addColorStop(0, "#ffeaa7");
  g.addColorStop(0.5, "#d4a017");
  g.addColorStop(1, "#6b4f1a");
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawProjectiles() {
  for (const p of projectiles) {
    if (p.kind === "planet") {
      drawPlanet(p.x, p.y);
    } else if (p.kind === "shard") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.target.y - p.y, p.target.x - p.x));
      ctx.fillStyle = "#a8e6ff";
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-6, 5);
      ctx.lineTo(-6, -5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (p.kind === "beam") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.target.y - p.y, p.target.x - p.x));
      const grd = ctx.createLinearGradient(-4, 0, 10, 0);
      grd.addColorStop(0, "rgba(255,180,255,0.2)");
      grd.addColorStop(1, "#dda0dd");
      ctx.fillStyle = grd;
      ctx.fillRect(-4, -3, 16, 6);
      ctx.restore();
    } else if (p.kind === "volt") {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#c4b5fd";
      ctx.fill();
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffd56a";
      ctx.fill();
    }
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life * 3);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    ctx.globalAlpha = 1;
  }
}

function drawRangePreview() {
  if (gameOver) return;
  if (currentGameMode === GAME_MODE.raider) return;
  const spec = DEFENDER_TYPES[selectedType];
  if (!spec) return;
  const mx = hoverCell?.col;
  const my = hoverCell?.row;
  if (mx == null || !isBuildable(mx, my)) return;
  const cx = mx * CELL + CELL / 2;
  const cy = my * CELL + CELL / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, spec.range, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(91, 192, 222, 0.25)";
  ctx.fillStyle = "rgba(91, 192, 222, 0.06)";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.stroke();
}

let hoverCell = null;

/** Paints the Space Ribbon artwork (cover-fit) on top of the theme gradient fallback. */
function drawSpaceMapBackgroundImage() {
  if (currentTheme !== "space_map") return;
  if (!spaceMapBgImage.complete || spaceMapBgImage.naturalWidth === 0) return;
  const iw = spaceMapBgImage.naturalWidth;
  const ih = spaceMapBgImage.naturalHeight;
  const scale = Math.max(W / iw, H / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (W - dw) / 2;
  const dy = (H - dh) / 2;
  ctx.drawImage(spaceMapBgImage, dx, dy, dw, dh);
}

function renderScene() {
  const bg = themeBackground();
  ctx.fillStyle = typeof bg === "string" ? bg : bg;
  ctx.fillRect(0, 0, W, H);
  drawSpaceMapBackgroundImage();
  drawAtmosphereHaze();
  drawGrid();
  drawPathTrack();
  drawRangePreview();
  drawBase();
  drawDefenders();
  drawBotDefenders();
  drawEnemies();
  drawProjectiles();
  drawParticles();
}

function updateUpgradePanel() {
  if (!upgradePanel) return;
  if (!selectedDefender) {
    upgradePanel.hidden = true;
    return;
  }
  upgradePanel.hidden = false;
  const def = selectedDefender;
  const spec = DEFENDER_TYPES[def.type];
  const st = getDefenderStats(def);
  const lv = def.level | 0;
  const cost = upgradeCost(def);
  upgradeTitle.textContent = `${spec.name} · Lv.${lv}`;
  upgradeMeta.textContent = `${Math.round(st.damage * 10) / 10} dmg · ${Math.round(
    st.range
  )} range · ${(st.reloadMs / 1000).toFixed(2)}s reload`;
  if (cost == null) {
    upgradeBtn.disabled = true;
    upgradeBtn.textContent = "Max level";
  } else {
    upgradeBtn.disabled = gold < cost;
    upgradeBtn.textContent = `Upgrade (${cost} gold)`;
  }
  if (sellTowerBtn) {
    const refund = sellRefundGold(def);
    sellTowerBtn.textContent = `Sell (+${refund} gold)`;
    sellTowerBtn.disabled = false;
  }
}

function trySellTower() {
  if (!selectedDefender || gameOver) return;
  const def = selectedDefender;
  const refund = sellRefundGold(def);
  gold += refund;
  const idx = defenders.indexOf(def);
  if (idx !== -1) defenders.splice(idx, 1);
  selectedDefender = null;
  updateHud();
  updateUpgradePanel();
  setMessage(`Sold tower for ${refund} gold.`);
}

function renderPackRevealPreview(typeId) {
  const canvas = packRevealCanvas || document.getElementById("pack-reveal-canvas");
  if (!canvas) return;
  const c2d = canvas.getContext("2d");
  const prev = ctx;
  try {
    ctx = c2d;
    const w = canvas.width;
    const h = canvas.height;
    c2d.clearRect(0, 0, w, h);
    c2d.fillStyle = "#0f172a";
    c2d.fillRect(0, 0, w, h);
    const fake = { x: w * 0.5, y: h * 0.52, level: 1, type: typeId };
    const spec = DEFENDER_TYPES[typeId];
    if (spec) drawDefenderTower(fake, spec, false, false);
  } finally {
    ctx = prev;
  }
}

function showPackRevealModal(result) {
  if (!result || !result.defenderId || result.empty) return;
  const id = result.defenderId;
  const spec = DEFENDER_TYPES[id];
  if (!spec) return;
  const rarity = getDefenderRarity(id);
  if (packRevealTitleEl) packRevealTitleEl.textContent = spec.name;
  if (packRevealRarityEl) {
    packRevealRarityEl.textContent = rarity.charAt(0).toUpperCase() + rarity.slice(1);
    packRevealRarityEl.className = `pack-reveal-rarity rarity-${rarity}`;
  }
  renderPackRevealPreview(id);
  if (packRevealModal) {
    packRevealModal.classList.remove("hidden");
    gamePaused = true;
  }
}

function dismissPackReveal() {
  if (packRevealModal) packRevealModal.classList.add("hidden");
  if (!introBlocking) gamePaused = false;
}

function syncMapSelect() {
  if (mapSelect) mapSelect.value = currentMapId;
}

function syncDifficultySelect() {
  if (difficultySelect) difficultySelect.value = currentDifficultyId;
}

function updateModeUi() {
  if (campaignControlsEl) {
    campaignControlsEl.hidden =
      currentGameMode !== GAME_MODE.campaign &&
      currentGameMode !== GAME_MODE.war &&
      currentGameMode !== GAME_MODE.raider;
  }
  if (battleControlsEl) {
    battleControlsEl.hidden = currentGameMode !== GAME_MODE.battle;
  }
  if (specialControlsEl) {
    specialControlsEl.hidden = currentGameMode !== GAME_MODE.special;
  }
  if (raidControlsEl) {
    raidControlsEl.hidden =
      currentGameMode !== GAME_MODE.raider && currentGameMode !== GAME_MODE.war;
  }
  const sw = document.querySelector(".btn-wave");
  if (sw) {
    sw.hidden =
      currentGameMode !== GAME_MODE.campaign &&
      currentGameMode !== GAME_MODE.war &&
      currentGameMode !== GAME_MODE.special;
  }
  const diffWrap = document.getElementById("diff-wrap");
  if (diffWrap) {
    diffWrap.hidden = currentGameMode === GAME_MODE.special;
  }
}

function syncModeSelects() {
  if (modeSelectEl) modeSelectEl.value = currentGameMode;
  if (battleDiffSelectEl) battleDiffSelectEl.value = battleDifficultyId;
  if (specialMapSelectEl) specialMapSelectEl.value = specialCampaignMapId;
  syncMapSelect();
  syncDifficultySelect();
}

function fillCodex() {
  if (!codexEnemies || !codexDefenders) return;
  const d = getDifficulty();
  codexEnemies.innerHTML = Object.keys(ENEMY_TYPES)
    .map((id) => {
      const e = ENEMY_TYPES[id];
      const exHp =
        e.fixedHp != null
          ? e.fixedHp
          : Math.max(1, Math.floor(14 * e.hpBase * d.hpMult));
      const pow =
        e.power == null
          ? "<em>No power</em>"
          : `<strong>${e.power}</strong> — ${e.powerDesc}`;
      const tag = e.isBoss ? " <span class=\"tag-boss\">Boss</span>" : "";
      return `<div class="codex-card">
        <h4>${e.name}${tag}</h4>
        <p>Example HP (wave ~5, ${d.label}): ~${exHp}</p>
        <p>${pow}</p>
      </div>`;
    })
    .join("");
  codexDefenders.innerHTML = Object.keys(DEFENDER_TYPES)
    .map((id) => {
      const x = DEFENDER_TYPES[id];
      const pack = x.fromPack
        ? ` · <em>from ${PACK_KIND_LABEL[x.packKind] || "pack"}</em>`
        : " · <em>always in roster</em>";
      return `<div class="codex-card">
        <h4>${DEFENDER_ICONS[id] || ""} ${x.name}</h4>
        <p>${x.cost} gold · ${x.damage} dmg · ${x.range} range · ${x.reloadMs / 1000}s reload${pack}</p>
      </div>`;
    })
    .join("");
}

canvas.addEventListener("mousemove", (ev) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (ev.clientX - rect.left) * scaleX;
  const y = (ev.clientY - rect.top) * scaleY;
  hoverCell = { col: Math.floor(x / CELL), row: Math.floor(y / CELL) };
});

canvas.addEventListener("mouseleave", () => {
  hoverCell = null;
});

canvas.addEventListener("click", (ev) => {
  if (gameOver || gamePaused) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (ev.clientX - rect.left) * scaleX;
  const y = (ev.clientY - rect.top) * scaleY;
  const hit = defenderAt(x, y);
  if (hit) {
    selectedDefender = hit;
    updateUpgradePanel();
    setMessage(`Selected ${DEFENDER_TYPES[hit.type].name} — upgrade in panel or click away.`);
    return;
  }
  selectedDefender = null;
  updateUpgradePanel();
  const col = Math.floor(x / CELL);
  const row = Math.floor(y / CELL);
  placeDefender(col, row);
});

function buildDefenderButtons() {
  defButtons.innerHTML = "";
  const packAvailable = ALL_PACK_DEFENDER_IDS.filter((id) => (inventory[id] || 0) > 0);
  const order = [...COMMON_DEFENDER_IDS, "prism", "volt", ...packAvailable];
  let selectedStillValid = false;
  for (const key of order) {
    const spec = DEFENDER_TYPES[key];
    if (!spec) continue;
    const owned = spec.fromPack ? inventory[key] || 0 : null;
    const used = spec.fromPack ? battlePlaced[key] || 0 : 0;
    const meta = spec.fromPack
      ? `${spec.cost} g · ${spec.damage} dmg · ${(spec.reloadMs / 1000).toFixed(2)}s · owned ${owned} (this battle ${used}/${owned})`
      : `${spec.cost} gold · ${spec.damage} dmg · ${spec.reloadMs / 1000}s reload`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.type = key;
    btn.innerHTML = `<span class="name">${spec.name}</span><span class="meta">${meta}</span>`;
    btn.addEventListener("click", () => {
      selectedType = key;
      [...defButtons.children].forEach((b) => b.classList.toggle("selected", b === btn));
    });
    if (key === selectedType) {
      btn.classList.add("selected");
      selectedStillValid = true;
    }
    defButtons.appendChild(btn);
  }
  if (!selectedStillValid) {
    selectedType = "astronaut";
    const first = defButtons.querySelector('[data-type="astronaut"]');
    if (first) first.classList.add("selected");
  }
}

const startWaveBtn = document.createElement("button");
startWaveBtn.type = "button";
startWaveBtn.textContent = "Start wave";
startWaveBtn.className = "btn-wave";
startWaveBtn.addEventListener("click", () => {
  if (!waveActive && waveCooldown <= 0 && !gameOver && !introBlocking) startWave();
});
document.querySelector(".panel").appendChild(startWaveBtn);

if (upgradeBtn) {
  upgradeBtn.addEventListener("click", () => tryUpgrade());
}
if (deselectBtn) {
  deselectBtn.addEventListener("click", () => {
    selectedDefender = null;
    updateUpgradePanel();
  });
}

if (mapSelect) {
  mapSelect.addEventListener("change", () => {
    currentMapId = mapSelect.value;
    resetGame();
    const map = MAPS[currentMapId];
    let msg = `Map: ${map.name}.`;
    if (map.enemyStrengthMult != null && map.enemyStrengthMult > 1) {
      const pct = Math.round((map.enemyStrengthMult - 1) * 100);
      msg += ` Enemies +${pct}% HP & speed.`;
    }
    setMessage(msg);
  });
}

if (difficultySelect) {
  difficultySelect.addEventListener("change", () => {
    currentDifficultyId = difficultySelect.value;
    resetGame();
    fillCodex();
    setMessage(`Difficulty: ${getDifficulty().label}.`);
  });
}

if (modeSelectEl) {
  modeSelectEl.addEventListener("change", () => {
    if (modeSelectEl.value === "special" && !loadPortalUnlocked()) {
      setMessage("Portal locked — beat Campaign on Easy, Medium, and Hard once each.");
      modeSelectEl.value = "campaign";
    }
    resetGame();
    fillCodex();
  });
}
if (battleDiffSelectEl) {
  battleDiffSelectEl.addEventListener("change", () => {
    battleDifficultyId = battleDiffSelectEl.value;
    resetGame();
  });
}
const raidSpawnSelectedBtn = document.getElementById("raid-spawn-selected");
if (raidSpawnSelectedBtn) {
  raidSpawnSelectedBtn.addEventListener("click", () => {
    const sel = document.getElementById("raid-enemy-select");
    if (!sel || !sel.value) return;
    spawnRaidUnit(sel.value);
  });
}

if (enemyIntroDismiss) {
  enemyIntroDismiss.addEventListener("click", () => {
    onIntroContinue();
  });
}

if (codexOpenBtn) {
  codexOpenBtn.addEventListener("click", () => {
    fillCodex();
    if (codexModal) {
      codexModal.classList.remove("hidden");
      gamePaused = true;
    }
  });
}

if (codexCloseBtn) {
  codexCloseBtn.addEventListener("click", () => {
    if (codexModal) codexModal.classList.add("hidden");
    if (!introBlocking) gamePaused = false;
  });
}

if (shopOpenBtn) {
  shopOpenBtn.addEventListener("click", () => {
    updateShopUi();
    if (shopModal) {
      shopModal.classList.remove("hidden");
      gamePaused = true;
    }
  });
}

if (shopCloseBtn) {
  shopCloseBtn.addEventListener("click", () => {
    if (shopModal) shopModal.classList.add("hidden");
    gamePaused = false;
  });
}

function wirePackButton(btn, opener) {
  if (!btn) return;
  btn.addEventListener("click", () => {
    const r = opener();
    if (packResultEl) packResultEl.textContent = r.text || "";
    if (r.ok && r.defenderId && !r.empty) {
      showPackRevealModal(r);
      if (typeof playSoundPackOpen === "function") playSoundPackOpen();
    }
    updateShopUi();
    updateHud();
    buildDefenderButtons();
  });
}

wirePackButton(openBotPackBtn, openBotPack);
wirePackButton(openSpacePackBtn, openSpacePack);
wirePackButton(openMonsterPackBtn, openMonsterPack);
wirePackButton(openMathPackBtn, openMathPack);
wirePackButton(openAuroraPackBtn, openAuroraPack);
wirePackButton(openGearPackBtn, openGearPack);
wirePackButton(openTrenchPackBtn, openTrenchPack);
wirePackButton(openNocturnePackBtn, openNocturnePack);
wirePackButton(openMysteryPackABtn, openMysteryPackA);
wirePackButton(openMysteryPackBBtn, openMysteryPackB);

if (sellTowerBtn) {
  sellTowerBtn.addEventListener("click", () => trySellTower());
}
if (packRevealDismiss) {
  packRevealDismiss.addEventListener("click", () => dismissPackReveal());
}
if (specialMapSelectEl) {
  specialMapSelectEl.addEventListener("change", () => {
    specialCampaignMapId = specialMapSelectEl.value;
    resetGame();
  });
}

function syncSoundToggleButton() {
  if (!soundToggleBtn) return;
  const muted = typeof isGameSoundMuted === "function" && isGameSoundMuted();
  soundToggleBtn.textContent = muted ? "🔇" : "🔊";
  soundToggleBtn.setAttribute("aria-pressed", muted ? "true" : "false");
  soundToggleBtn.title = muted ? "Sound muted — click to enable" : "Sound on — click to mute";
}

if (soundToggleBtn) {
  soundToggleBtn.addEventListener("click", () => {
    if (typeof toggleGameSound === "function") toggleGameSound();
    if (typeof initGameAudio === "function") initGameAudio();
    syncSoundToggleButton();
  });
}

window.addEventListener(
  "pointerdown",
  () => {
    if (typeof initGameAudio === "function") initGameAudio();
  },
  { once: true }
);

if (bombBtn) {
  bombBtn.addEventListener("click", () => useBomb());
}

restartBtn.addEventListener("click", resetGame);

window.addEventListener("storage", (ev) => {
  if (ev.key !== LS_INV || ev.newValue == null) return;
  inventory = loadInventory();
  buildDefenderButtons();
});

window.addEventListener("keydown", (ev) => {
  if (enemyIntro && !enemyIntro.classList.contains("hidden")) {
    if (ev.key === "Enter" || ev.key === "Escape") {
      onIntroContinue();
    }
    return;
  }
  if (ev.key === "Escape" && packRevealModal && !packRevealModal.classList.contains("hidden")) {
    dismissPackReveal();
    return;
  }
  if (ev.key === "Escape" && shopModal && !shopModal.classList.contains("hidden")) {
    shopModal.classList.add("hidden");
    gamePaused = false;
    return;
  }
  if (ev.key === "Escape" && codexModal && !codexModal.classList.contains("hidden")) {
    codexModal.classList.add("hidden");
    gamePaused = false;
  }
});

window.addEventListener("keyup", (ev) => {
  keysDown[ev.code] = false;
  if (ev.key) keysDown[ev.key] = false;
});

buildDefenderButtons();
syncModeSelects();
fillCodex();
syncSoundToggleButton();
resetGame();

requestAnimationFrame((ts) => {
  lastTs = ts;
  requestAnimationFrame(loop);
});
