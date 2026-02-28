// ============================================================
// config.js — Single Source of Truth for Dashboard Configuration
// ============================================================

// ── Screen Definitions ──
// Adding a new screener = add one entry here (GID + display + columns)
export const SCREENS = [
    // Primary screens (green, shown first)
    { key: 'St_PEAD', gid: 745195661, label: 'PEAD', abbr: 'PEA', color: '#30D158', primary: true,
      columns: ['EPS_Surp%', 'Days_Since_ER', 'RVOL(20D)'],
      highlights: {
          'EPS_Surp%': { green: [100, null], desc: '最重要。大きいほどドリフト継続。100%超は強烈シグナル' },
          'Days_Since_ER': { green: [0, 5], red: [8, 10], desc: '0-5日がベスト。8日超はドリフト減衰中(DB上限10日)' },
      },
    },
    { key: 'St_CANSLIM', gid: 1867366941, label: 'CANSLIM', abbr: 'CAN', color: '#30D158', primary: true,
      columns: ['EPS_G%', 'Sales_G%', 'OP_Mgn%', 'Consec_Growth'],
      highlights: {
          'EPS_G%': { green: [20, 50], red: [100, null], desc: '20-50%が安定ゾーン。100%超は品質チェック推奨' },
          'Consec_Growth': { green: [3, null], desc: '3以上なら確信度UP。2は最低ライン' },
      },
    },
    { key: 'St_RVOL', gid: 1964001663, label: 'RVOL', abbr: 'RVL', color: '#30D158', primary: true,
      columns: ['RVOL(20D)', 'Vol_Chg_1W%', 'Change%_Day', 'EPS_Surp%'],
      highlights: {
          'RVOL(20D)': { green: [3, 5], red: [5, null], desc: '3-5倍が強シグナル。5倍超は異常値で注意' },
          'Change%_Day': { green: [5, 15], red: [[null, 2], [20, null]], desc: '5-15%が理想。2%以下は弱い、20%以上は過熱' },
      },
    },
    { key: 'St_HiddenLdr', gid: 2132770649, label: 'Hidden Ldr', abbr: 'HID', color: '#30D158', primary: true,
      columns: ['Sector_RS', 'VARS_21', 'SMA50_Rising', 'Sales_G%'],
      highlights: {
          'Sector_RS': { green: [45, 55], desc: 'DB条件40-55。45+は回復が進んだセクター' },
          'VARS_21': { green: [85, null], desc: 'DB条件≥75。85超は飛び抜けたリーダー' },
      },
    },
    // Secondary screens (yellow, highlighted)
    { key: 'St_SectorAlpha', gid: 1512618812, label: 'Sec Alpha', abbr: 'SEC', color: '#FFD60A',
      columns: ['Match', 'Range%(30D)', 'RV(20D)', 'Vol_Chg_1W%', 'Dist_50SMA%', 'ER_1M(vsSec)'],
      highlights: {
          'Match': { badge: { '固定': '#0A84FF', 'ER': '#FFD60A' }, desc: '固定=安定型セクター、ER=爆発型(高リターン/高リスク)' },
          'ER_1M(vsSec)': { green: [0, null], red: [null, 0], desc: 'セクター超過リターン。正=セクター上回り、負=下回り' },
      },
    },
    { key: 'St_DeepRecov', gid: 1781997250, label: 'Deep Recov', abbr: 'DPR', color: '#FFD60A',
      columns: ['Pct_52WH', 'OP_Mgn%', 'Sales_G%', 'RVOL(20D)'],
      highlights: {
          'Pct_52WH': { green: [-40, -30], red: [-60, -50], desc: 'DB条件は-30%超。-40~-30%が浅い押し(安全)。-60~-50%は暴落リスク大' },
          'OP_Mgn%': { green: [10, null], desc: '高いほど倒産リスク低い。10%以上なら安心' },
      },
    },
];

// Auto-generated lookup maps
export const SCREEN_COLS = Object.fromEntries(SCREENS.map(s => [s.key, s.columns]));

// ── Non-Screen Sheet GIDs ──
export const SHEET_GIDS = {
    Portfolio: 726693304,
    Indices: 593468503,
    Sectors: 1899936803,
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
    atr21ema: { min: -0.3, max: 1.5 },
    dist21ema: { max: 8 },
};
