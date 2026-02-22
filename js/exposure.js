// ============================================================
// exposure.js — Exposure Score Calculation + SVG Gauge
// Ported from 21cloud_dashboard_v2_1.html
// ============================================================

/**
 * Calculate Exposure Score (100 points max, 6 factors).
 * @param {Array} indices - Index data with Dist_21EMA%, Dist_50MA%
 * @param {Object} breadth - { toraku25, newHigh, newLow, advPct }
 * @param {Array} sectors - Sector data with phase, b80pct
 * @returns {{ score, label, components, killSwitch }}
 */
export function calcExposure(indices, breadth, sectors) {
    const components = [];

    // Derive emaPos from Dist_21EMA%
    const enriched = indices.map(idx => {
        const d21 = parseFloat(idx['Dist_21EMA%']) || 0;
        const d50 = parseFloat(idx['Dist_50MA%']) || 0;
        return {
            ...idx,
            emaPos: d21 > 0.5 ? 'above' : d21 > -0.5 ? 'inside' : 'below',
            abv50: d50 > 0,
        };
    });

    // ① Index × 21EMA (40pts)
    let s1 = 0;
    enriched.forEach(idx => {
        if (idx.emaPos === 'above') s1 += 13.33;
        else if (idx.emaPos === 'inside') s1 += 6.67;
    });
    s1 = Math.round(s1 * 10) / 10;
    const killSwitch = s1 === 0;
    components.push({ name: 'Index×21EMA', pts: s1, max: 40 });

    // ② Index × 50SMA (10pts)
    let s2 = 0;
    enriched.forEach(idx => { if (idx.abv50) s2 += 3.33; });
    s2 = Math.round(s2 * 10) / 10;
    components.push({ name: 'Index×50SMA', pts: s2, max: 10 });

    // ③ 騰落レシオ25 (15pts)
    const t = breadth.toraku25 || 0;
    let s3 = 0;
    if (t >= 90 && t <= 110) s3 = 15;
    else if ((t >= 80 && t < 90) || (t > 110 && t <= 120)) s3 = 10;
    else if ((t >= 70 && t < 80) || (t > 120 && t <= 130)) s3 = 5;
    components.push({ name: '騰落レシオ(25)', pts: s3, max: 15 });

    // ④ NH/NL比率 (10pts)
    const nh = breadth.newHigh || 0, nl = breadth.newLow || 0;
    const s4 = (nh + nl) > 0 ? Math.round(nh / (nh + nl) * 10 * 10) / 10 : 0;
    components.push({ name: 'NH/NL比率', pts: s4, max: 10 });

    // ⑤ 値上がり率 (10pts)
    const ap = breadth.advPct || 0;
    let s5 = 0;
    if (ap >= 55) s5 = 10;
    else if (ap >= 45) s5 = 7;
    else if (ap >= 35) s5 = 4;
    components.push({ name: '値上がり率', pts: s5, max: 10 });

    // ⑥ Sector Breadth (15pts)
    let phase4Count = 0;
    let b80Sum = 0;
    const validSectors = sectors.filter(s => s.Sector);
    validSectors.forEach(s => {
        const phase = derivePhase(s);
        if (phase === 4) phase4Count++;
        b80Sum += parseFloat(s.Band80_Pct) || 0;
    });
    const phase4Ratio = validSectors.length > 0 ? phase4Count / validSectors.length : 0;
    const b80Avg = validSectors.length > 0 ? b80Sum / validSectors.length : 0;
    let s6 = Math.round(phase4Ratio * 10 * 10) / 10;
    if (b80Avg >= 20) s6 += 5;
    s6 = Math.min(15, s6);
    components.push({ name: 'Sector Breadth', pts: s6, max: 15 });

    const raw = components.reduce((sum, c) => sum + c.pts, 0);
    const score = killSwitch ? 0 : Math.round(Math.min(100, raw) * 10) / 10;

    let label;
    if (killSwitch) label = 'RISK OFF';
    else if (score >= 80) label = 'AGGRESSIVE';
    else if (score >= 60) label = 'BULLISH';
    else if (score >= 40) label = 'CAUTIOUS';
    else if (score >= 20) label = 'DEFENSIVE';
    else label = 'RISK OFF';

    return { score, label, components, killSwitch, raw: Math.round(raw * 10) / 10 };
}

/**
 * Derive sector Phase from RS/ER data.
 * 4:強↑ = RS high + ER positive
 * 3:改善 = RS improving (ER positive but RS moderate)
 * 2:失速 = RS declining (ER mixed)
 * 1:弱↓ = RS low + ER negative
 */
export function derivePhase(sector) {
    const rs21 = parseFloat(sector.RS_21) || 50;
    const er1w = parseFloat(sector.ER_1W) || 0;
    const rsDay = parseFloat(sector['RS_Day%']) || 0;

    if (rs21 >= 50 && er1w > 0) return 4;       // 強↑
    if (er1w > 0 && rs21 >= 30) return 3;        // 改善
    if (er1w <= 0 && rs21 >= 30) return 2;       // 失速
    return 1;                                     // 弱↓
}

export function phaseLabel(phase) {
    switch (phase) {
        case 4: return '4:強↑';
        case 3: return '3:改善';
        case 2: return '2:失速';
        case 1: return '1:弱↓';
        default: return '--';
    }
}

export function phaseColor(phase) {
    switch (phase) {
        case 4: return '#30D158';
        case 3: return '#0A84FF';
        case 2: return '#FFD60A';
        case 1: return '#FF453A';
        default: return '#48484A';
    }
}

/**
 * Render exposure gauge as SVG HTML string.
 */
export function renderExposureGauge(exposure, container) {
    const { score, label, components, killSwitch } = exposure;
    const size = 130;
    const r = size / 2 - 8;
    const halfCirc = Math.PI * r;
    const offset = halfCirc * (1 - Math.min(100, score) / 100);

    const gaugeColor = score >= 80 ? '#30D158' : score >= 60 ? '#30D158' : score >= 40 ? '#FFD60A' : score >= 20 ? '#FF9F0A' : '#FF453A';
    const labelColor = {
        'AGGRESSIVE': '#30D158', 'BULLISH': '#30D158', 'CAUTIOUS': '#FFD60A',
        'DEFENSIVE': '#FF9F0A', 'RISK OFF': '#FF453A',
    }[label] || '#48484A';

    container.innerHTML = `
        <div class="exposure-card">
            <svg width="${size}" height="${size / 2 + 16}" viewBox="0 0 ${size} ${size / 2 + 16}">
                <path d="M 8,${size / 2 + 6} A ${r},${r} 0 0 1 ${size - 8},${size / 2 + 6}"
                      fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="6" stroke-linecap="round"/>
                <path d="M 8,${size / 2 + 6} A ${r},${r} 0 0 1 ${size - 8},${size / 2 + 6}"
                      fill="none" stroke="${gaugeColor}" stroke-width="6" stroke-linecap="round"
                      stroke-dasharray="${halfCirc}" stroke-dashoffset="${offset}"
                      style="transition: stroke-dashoffset 1s ease"/>
                <text x="${size / 2}" y="${size / 2}" text-anchor="middle"
                      style="font-size:24px;font-weight:700;fill:#E8E8ED;font-family:'IBM Plex Mono',monospace">${Math.round(score)}</text>
                <text x="${size / 2}" y="${size / 2 + 14}" text-anchor="middle"
                      style="font-size:9px;font-weight:600;fill:${labelColor};letter-spacing:0.06em">${label}</text>
            </svg>
            <div class="exposure-label">Exposure Score</div>
            <div class="exposure-breakdown">
                ${components.map(c => {
        const pct = c.max > 0 ? c.pts / c.max : 0;
        const cls = pct >= 0.7 ? 'positive' : pct >= 0.4 ? 'warning' : 'negative';
        return `<span class="exposure-factor ${cls}">${c.name.slice(0, 8)}:${c.pts.toFixed(0)}/${c.max}</span>`;
    }).join('')}
            </div>
            ${killSwitch ? '<div class="killswitch-badge">⚠ KillSwitch: 全指数21EMA下</div>' : ''}
        </div>`;
}

/**
 * Extract breadth summary from Indices data for Exposure Score
 */
export function extractBreadth(indicesRaw) {
    // Find the latest row with breadth data
    // Breadth rows use Date_2 (duplicate header dedup) when Indices sheet has two Date columns
    const breadthRows = indicesRaw.filter(r => (r.Date_2 || r.Date) && r.Advances !== null && r.Advances !== undefined);
    if (breadthRows.length === 0) {
        return { toraku25: 100, toraku10: 100, newHigh: 0, newLow: 0, advPct: 50, advances: 0, declines: 0 };
    }

    const latest = breadthRows[breadthRows.length - 1];
    const adv = parseFloat(latest.Advances) || 0;
    const dec = parseFloat(latest.Declines) || 0;
    const total = adv + dec;

    return {
        toraku25: parseFloat(latest.AD_Ratio_25) || 0,
        toraku10: parseFloat(latest.AD_Ratio_10) || 0,
        newHigh: parseFloat(latest.NewHigh) || parseFloat(latest.NH) || 0,
        newLow: parseFloat(latest.NewLow) || parseFloat(latest.NL) || 0,
        advPct: total > 0 ? Math.round(adv / total * 100) : 50,
        advances: adv,
        declines: dec,
    };
}
