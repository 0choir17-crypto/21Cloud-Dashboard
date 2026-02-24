// ============================================================
// config.js — Single Source of Truth for Dashboard Configuration
// ============================================================

// ── Screen Definitions ──
// Adding a new screener = add one entry here (GID + display + columns)
export const SCREENS = [
    // Primary screens (green, shown first)
    { key: 'St_Momentum', gid: 361464786, label: 'Momentum', abbr: 'MOM', color: '#30D158', primary: true, columns: ['RS_ROC(21D)'] },
    { key: 'St_21EMA', gid: 901482065, label: '21EMA', abbr: 'EMA', color: '#30D158', primary: true, columns: ['RS21_Peak', 'Pullback'] },
    { key: 'St_Surprise', gid: 1651981051, label: 'Surprise', abbr: 'SUR', color: '#30D158', primary: true, columns: ['EPS_Surp%', 'Days_Since_ER', 'EPS_G%'] },
    { key: 'St_EREvent', gid: 1724174728, label: 'ER Event', abbr: 'ERE', color: '#30D158', primary: true, columns: ['EPS_G%', 'OP_Mgn%'] },
    // Secondary screens (muted)
    { key: 'St_Movers', gid: 2084933405, label: 'Movers', abbr: 'MOV', color: '#636366', columns: ['RV(20D)', 'Accel_Score'] },
    { key: 'St_Pivot', gid: 478643393, label: 'Pivot', abbr: 'PVT', color: '#636366', columns: ['SP_Break', 'SP_Dist%', 'SP_Cnt', 'SP_Age'] },
    { key: 'St_Quiet', gid: 1809768446, label: 'Quiet', abbr: 'QUI', color: '#636366', columns: ['RV(20D)', 'Range%(30D)', 'VCS'] },
    { key: 'St_SectorAlpha', gid: 1512618812, label: 'Sec Alpha', abbr: 'SEC', color: '#636366', columns: ['Match', 'Range%(30D)'] },
    { key: 'St_Earnings', gid: 1901445788, label: 'Earnings', abbr: 'EAR', color: '#636366', columns: ['EPS_G%', 'Fcst_EPS_G%', 'OP_Mgn%', 'EPS_Surp%'] },
];

// Auto-generated lookup maps
export const SCREEN_COLS = Object.fromEntries(SCREENS.map(s => [s.key, s.columns]));

// ── Non-Screen Sheet GIDs ──
export const SHEET_GIDS = {
    Portfolio: 726693304,
    Indices: 593468503,
    Sectors: 593468503,
    St_History: 1745377223,
    SectorHistory: 519198713,
    // Screen GIDs merged in
    ...Object.fromEntries(SCREENS.map(s => [s.key, s.gid])),
};

// ── Exposure Score Weights ──
// ① Index×21EMA  ② Index×50SMA  ③ 騰落レシオ  ④ NH/NL  ⑤ 値上がり率  ⑥ Sector Breadth
export const EXPOSURE = {
    weights: { ema21: 35, sma50: 10, toraku: 17, nhNl: 13, advPct: 10, sectorBreadth: 15 },
    insideBand: 1.0,       // ±% for EMA inside zone
    toraku: {
        overheatDanger: 140,
        overheatWarn: 120,
        optimalHigh: 120,
        optimalLow: 100,
        warmLow: 80,
        coolLow: 70,
        // Step scores (mapped to toraku weight of 17)
        steps: { optimal: 17, warm: 11, cool: 6, overheat: 3, extreme: 0, cold: 2 },
    },
    nhBonus: { threshold100: 3, threshold50: 2 },
    advPctSteps: [
        { min: 55, pts: 10 },
        { min: 45, pts: 7 },
        { min: 35, pts: 4 },
    ],
    sectorB80Threshold: 20,
    sectorB80Bonus: 5,
};

// ── Phase Thresholds ──
export const PHASE = {
    strong: { rs21Min: 50, erPositive: true },    // Phase 4: 強↑
    improving: { rs21Min: 30, erPositive: true },  // Phase 3: 改善
    stalling: { rs21Min: 30, erPositive: false },  // Phase 2: 失速
    // Phase 1: everything else (弱↓)
};

// ── Entry Score Thresholds ──
export const ENTRY = {
    adr: { min: 2.5, max: 7 },
    atr21ema: { min: -0.3, max: 0.8 },
    dist21ema: { max: 4 },
    atr50sma: { max: 2.5 },
};
