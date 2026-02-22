// ============================================================
// sector.js — Sector Analysis View (Apple Health Style)
// ============================================================

import { derivePhase, phaseLabel, phaseColor } from './exposure.js';

let activeSector = null;
let currentSortKey = 'rank';
let sectorHistoryMap = {}; // { sectorName: [{ date, er1w, rs21, b80 }, ...] }

// ── Build history map from SectorHistory sheet ──
function buildSectorHistoryMap(historyData) {
    const map = {};
    if (!historyData || !Array.isArray(historyData)) return map;

    historyData.forEach(row => {
        const name = row.Sector;
        if (!name) return;
        if (!map[name]) map[name] = [];
        map[name].push({
            date: row.Date,
            er1w: parseFloat(row.ER_1W) || 0,
            rs21: parseFloat(row.RS_21) || 0,
            b80: parseFloat(row.Band80_Pct) || 0,
        });
    });

    // Sort each sector's history by date ascending
    Object.values(map).forEach(arr => {
        arr.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    });

    return map;
}

// ── Format history date to M/D label ──
function formatHistoryDate(d) {
    if (!d) return '';
    const s = String(d).trim();
    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(s)) {
        const parts = s.split('-');
        return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
    }
    return s;
}

// ── Phase Dot Indicator ──
function phaseDots(phase) {
    const filled = phase; // 1-4
    let dots = '';
    for (let i = 1; i <= 4; i++) {
        const color = i <= filled ? phaseColor(phase) : 'rgba(255,255,255,0.12)';
        dots += `<span class="phase-dot" style="background:${color}"></span>`;
    }
    const labels = { 4: '強↑', 3: '改善', 2: '失速', 1: '弱↓' };
    return `<div class="phase-dots-row">
        <div class="phase-dots">${dots}</div>
        <span class="phase-dots-label" style="color:${phaseColor(phase)}">Phase ${phase}: ${labels[phase] || '--'}</span>
    </div>`;
}

// ── Unique ID generator ──
let miniBarId = 0;

// ── SVG MiniBar Component (with tooltip support) ──
function renderMiniBar(data, options = {}) {
    if (!data || data.length < 2) return '<div class="minibar-empty">--</div>';

    const {
        height = 48,
        colorByRS = false,
        colorByER = false,
        colorByBand = false,
        color = '#30D158',
        maxVal = null,
        unit = '',
        refLine = null,
        dateLabels = null,
    } = options;

    const chartId = `minibar-${++miniBarId}`;

    const mn = colorByER ? Math.min(...data, 0) : 0;
    const mx = maxVal || (colorByER ? Math.max(...data, 0.1) : Math.max(...data, 1));
    const range = mx - mn || 1;
    const gap = 1;
    const barCount = data.length;
    const bw = Math.max(4, Math.floor((260 - gap * (barCount - 1)) / barCount));
    const totalW = bw * barCount + gap * (barCount - 1);

    const rsColor = v => v >= 80 ? '#0A84FF' : v >= 60 ? '#30D158' : v >= 40 ? '#FFD60A' : '#FF453A';
    const bandColor = v => v >= 40 ? '#0A84FF' : v >= 25 ? '#30D158' : v >= 15 ? '#FFD60A' : '#FF453A';
    const erColorFn = v => v > 0 ? '#30D158' : v < 0 ? '#FF453A' : '#48484A';
    const getColor = v => colorByRS ? rsColor(v) : colorByBand ? bandColor(v) : colorByER ? erColorFn(v) : color;

    let bars = '';
    const zeroY = colorByER ? (1 - (0 - mn) / range) * height : null;

    data.forEach((v, i) => {
        const isLast = i === data.length - 1;
        const op = isLast ? 1 : 0.3 + 0.6 * (i / data.length);
        const barC = getColor(v);
        const dateStr = dateLabels ? dateLabels[i] || '' : `Day ${i + 1}`;
        const valStr = v.toFixed(1) + unit;

        if (colorByER) {
            const barH = Math.abs((v / range) * height);
            const y = v >= 0 ? zeroY - barH : zeroY;
            bars += `<rect class="minibar-rect" x="${i * (bw + gap)}" y="${Math.max(0, y)}" width="${bw}" height="${Math.min(barH, height)}" rx="1" fill="${barC}" opacity="${op}" data-date="${dateStr}" data-val="${valStr}" data-idx="${i}"/>`;
        } else {
            const bh = Math.max(1, (v / mx) * height);
            bars += `<rect class="minibar-rect" x="${i * (bw + gap)}" y="${height - bh}" width="${bw}" height="${bh}" rx="1" fill="${barC}" opacity="${op}" data-date="${dateStr}" data-val="${valStr}" data-idx="${i}"/>`;
        }
    });

    // Reference line
    let refLineEl = '';
    if (refLine != null && !colorByER && mx > 0) {
        const ry = (1 - refLine / mx) * height;
        refLineEl = `<line x1="0" y1="${ry}" x2="${totalW}" y2="${ry}" stroke="#48484A" stroke-width="0.5" stroke-dasharray="3,3" opacity="0.4"/>
                     <text x="${totalW - 2}" y="${ry - 2}" fill="#48484A" font-size="7" font-family="'IBM Plex Mono',monospace" text-anchor="end">${refLine}</text>`;
    }
    // Zero line for ER
    let zeroLineEl = '';
    if (zeroY != null) {
        zeroLineEl = `<line x1="0" y1="${zeroY}" x2="${totalW}" y2="${zeroY}" stroke="#48484A" stroke-width="0.5" stroke-dasharray="2,2" opacity="0.5"/>`;
    }

    const first = data[0], last = data[data.length - 1];
    const firstColor = getColor(first), lastColor = getColor(last);
    const delta = last - first;
    const deltaColor = delta > 0 ? '#30D158' : delta < 0 ? '#FF453A' : '#48484A';
    const deltaSign = delta > 0 ? '+' : '';

    // Tooltip element
    const tooltipEl = `<div class="minibar-tooltip" id="${chartId}-tip" style="display:none"></div>`;

    return `<div class="minibar-container" id="${chartId}" data-chart-id="${chartId}">
        <svg width="100%" viewBox="0 0 ${totalW} ${height}" preserveAspectRatio="none" style="display:block">
            ${refLineEl}${zeroLineEl}${bars}
        </svg>
        ${tooltipEl}
        <div class="minibar-footer">
            <span style="color:${firstColor}">${first.toFixed(1)}${unit}</span>
            <span class="minibar-delta" style="color:${deltaColor}">${deltaSign}${delta.toFixed(1)}${unit}</span>
            <span style="color:${lastColor};font-weight:700">${last.toFixed(1)}${unit}</span>
        </div>
    </div>`;
}

// ── Attach tooltip events to MiniBar charts ──
function attachMiniBarEvents(container) {
    container.querySelectorAll('.minibar-container').forEach(chart => {
        const chartId = chart.dataset.chartId;
        const tip = chart.querySelector(`#${chartId}-tip`);
        if (!tip) return;

        chart.querySelectorAll('.minibar-rect').forEach(rect => {
            rect.style.cursor = 'pointer';
            rect.addEventListener('mouseenter', (e) => {
                const date = rect.dataset.date;
                const val = rect.dataset.val;
                tip.innerHTML = `<span class="tip-date">${date}</span> <span class="tip-val">${val}</span>`;
                tip.style.display = 'block';
                // Position tooltip near cursor
                const chartRect = chart.getBoundingClientRect();
                const x = e.clientX - chartRect.left;
                tip.style.left = `${Math.min(x, chartRect.width - 80)}px`;
            });
            rect.addEventListener('mouseleave', () => {
                tip.style.display = 'none';
            });
            rect.addEventListener('click', () => {
                const date = rect.dataset.date;
                const val = rect.dataset.val;
                tip.innerHTML = `<span class="tip-date">${date}</span> <span class="tip-val">${val}</span>`;
                tip.style.display = tip.style.display === 'block' ? 'none' : 'block';
                const chartRect = chart.getBoundingClientRect();
                const rectBox = rect.getBoundingClientRect();
                const x = rectBox.left - chartRect.left + rectBox.width / 2;
                tip.style.left = `${Math.min(x, chartRect.width - 80)}px`;
            });
        });
    });
}

/**
 * Render phase summary bar (colored bar showing distribution of phases).
 */
function renderPhaseSummary(sectors, container) {
    const phaseCounts = { 4: 0, 3: 0, 2: 0, 1: 0 };
    sectors.forEach(s => {
        if (!s.Sector) return;
        const p = derivePhase(s);
        phaseCounts[p]++;
    });
    const total = Object.values(phaseCounts).reduce((a, b) => a + b, 0);

    let html = '<div class="phase-summary-card">';
    html += '<span class="phase-label-text">Phase</span>';
    html += '<div class="phase-bar">';
    [
        [4, '強↑', '#30D158'],
        [3, '改善', '#0A84FF'],
        [2, '失速', '#FFD60A'],
        [1, '弱↓', '#FF453A'],
    ].forEach(([p, label, color]) => {
        const pct = total > 0 ? (phaseCounts[p] / total * 100) : 25;
        html += `<div class="phase-bar-segment" style="width:${pct}%;background:${color}" title="${label}: ${phaseCounts[p]}"></div>`;
    });
    html += '</div>';

    // Sort buttons
    html += '<div class="sector-sort-buttons">';
    html += '<span class="sort-label">Sort:</span>';
    const sortOptions = [
        { key: 'rank', label: 'RS21' },
        { key: 'phase', label: 'Phase' },
        { key: 'b80', label: '≥80%' },
        { key: 'er1w', label: 'ER週' },
        { key: 'rsDay', label: 'RS日%' },
    ];
    sortOptions.forEach(({ key, label }) => {
        const isActive = currentSortKey === key;
        html += `<button class="sort-btn ${isActive ? 'active' : ''}" data-sort="${key}">${label}</button>`;
    });
    html += '</div>';

    [
        [4, '強↑', '#30D158'],
        [3, '改善', '#0A84FF'],
        [2, '失速', '#FFD60A'],
        [1, '弱↓', '#FF453A'],
    ].forEach(([p, label, color]) => {
        html += `<span class="phase-count" style="color:${color}">${label}:${phaseCounts[p]}</span>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

/**
 * Sort sectors by current sort key.
 * Default 'rank' sorts by RS21 desc, then ER1W desc.
 */
function sortSectors(sectors) {
    const sorted = [...sectors].filter(r => r.Sector);

    sorted.sort((a, b) => {
        switch (currentSortKey) {
            case 'phase': {
                const dp = derivePhase(b) - derivePhase(a);
                return dp !== 0 ? dp : (parseFloat(b.RS_21) || 0) - (parseFloat(a.RS_21) || 0);
            }
            case 'b80':
                return (parseFloat(b.Band80_Pct) || 0) - (parseFloat(a.Band80_Pct) || 0);
            case 'er1w':
                return (parseFloat(b.ER_1W) || 0) - (parseFloat(a.ER_1W) || 0);
            case 'rsDay':
                return (parseFloat(b['RS_Day%']) || 0) - (parseFloat(a['RS_Day%']) || 0);
            case 'rank':
            default: {
                // Primary: RS21 desc, Secondary: ER1W desc
                const rsA = parseFloat(a.RS_21) || 0;
                const rsB = parseFloat(b.RS_21) || 0;
                if (rsB !== rsA) return rsB - rsA;
                return (parseFloat(b.ER_1W) || 0) - (parseFloat(a.ER_1W) || 0);
            }
        }
    });
    return sorted;
}

/**
 * Render sector heatmap tiles (Apple Health style).
 */
export function renderSectorHeatmap(sectors, container, historyData) {
    container.innerHTML = '';

    if (!sectors || sectors.length === 0) {
        container.innerHTML = '<div class="error-banner">セクターデータなし</div>';
        return;
    }

    // Build history map from SectorHistory sheet
    sectorHistoryMap = buildSectorHistoryMap(historyData);

    // Phase summary bar + sort buttons
    const summaryDiv = document.createElement('div');
    summaryDiv.id = 'phaseSummary';
    container.appendChild(summaryDiv);
    renderPhaseSummary(sectors, summaryDiv);

    const sorted = sortSectors(sectors);

    // Grid container
    const grid = document.createElement('div');
    grid.className = 'sector-grid';

    sorted.forEach((row, idx) => {
        const name = row.Sector;
        const rs21 = parseFloat(row.RS_21) || 0;
        const er1w = parseFloat(row.ER_1W) || 0;
        const erDay = parseFloat(row.ER_Day) || 0;
        const rsDay = parseFloat(row['RS_Day%']) || 0;
        const b80 = parseFloat(row.Band80_Pct) || 0;
        const phase = derivePhase(row);
        const pColor = phaseColor(phase);

        const tile = document.createElement('div');
        tile.className = 'sector-tile-apple';
        tile.dataset.sector = name;

        // Left accent line color based on phase
        tile.style.setProperty('--phase-color', pColor);

        // RS color class
        const rsClass = rs21 >= 80 ? 'rs-tier-blue' : rs21 >= 60 ? 'rs-tier-green' : rs21 >= 40 ? 'rs-tier-amber' : 'rs-tier-red';

        // ER Day bar width (clamped to ±5 range for visual)
        const erDayPct = Math.min(Math.abs(erDay) / 5 * 100, 100);
        const erDayBarColor = erDay > 0 ? '#30D158' : erDay < 0 ? '#FF453A' : '#48484A';

        tile.innerHTML = `
            <div class="sta-erday-bar">
                <div class="sta-erday-fill" style="width:${erDayPct}%;background:${erDayBarColor}"></div>
                <span class="sta-erday-label">ER Day</span>
                <span class="sta-erday-val" style="color:${erColor(erDay)}">${erDay >= 0 ? '+' : ''}${erDay.toFixed(2)}</span>
            </div>
            <div class="sta-header">
                <div class="sta-name-group">
                    <span class="sta-name">${name}</span>
                    <span class="sta-rank">#${idx + 1}</span>
                </div>
            </div>
            <div class="sta-main-row">
                <div class="sta-rs-hero ${rsClass}">${rs21.toFixed(1)}</div>
                <div class="sta-day-stack">
                    <div class="sta-day-item">
                        <span class="sta-day-label">RS_Day%</span>
                        <span class="sta-day-val ${rsDay >= 0 ? 'positive' : 'negative'}">${rsDay >= 0 ? '+' : ''}${rsDay.toFixed(2)}%</span>
                    </div>
                    <div class="sta-day-item">
                        <span class="sta-day-label">ER_Day</span>
                        <span class="sta-day-val" style="color:${erColor(erDay)}">${erDay >= 0 ? '+' : ''}${erDay.toFixed(2)}</span>
                    </div>
                </div>
            </div>
            ${phaseDots(phase)}
            <div class="sta-metrics">
                <span class="sta-er" style="color:${erColor(er1w)}">ER週 ${er1w >= 0 ? '+' : ''}${er1w.toFixed(2)}</span>
                <span class="sta-b80" style="color:${b80 >= 20 ? '#0A84FF' : '#48484A'}">≥80: ${Math.round(b80)}%</span>
            </div>`;

        tile.addEventListener('click', () => {
            if (activeSector === name) {
                activeSector = null;
                removeDetailPanel();
            } else {
                activeSector = name;
                showDetailPanel(row, tile, grid);
            }
            grid.querySelectorAll('.sector-tile-apple').forEach(t => {
                t.classList.toggle('active', t.dataset.sector === activeSector);
            });
        });

        grid.appendChild(tile);
    });

    // Attach sort button events that re-render
    summaryDiv.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentSortKey = btn.dataset.sort;
            renderSectorHeatmap(sectors, container, historyData);
        });
    });

    container.appendChild(grid);
}

/**
 * Show detail panel below the clicked sector tile (v2.1 style + MiniBar charts).
 */
function showDetailPanel(sector, tile, grid) {
    removeDetailPanel();

    const name = sector.Sector;
    const rs21 = parseFloat(sector.RS_21) || 0;
    const rs63 = parseFloat(sector.RS_63) || 0;
    const er1w = parseFloat(sector.ER_1W) || 0;
    const erDay = parseFloat(sector.ER_Day) || 0;
    const er1m = parseFloat(sector.ER_1M) || 0;
    const b80 = parseFloat(sector.Band80_Pct) || 0;
    const rsDay = parseFloat(sector['RS_Day%']) || 0;
    const rs1w = parseFloat(sector['RS_1W%']) || 0;
    const rs1m = parseFloat(sector['RS_1M%']) || 0;
    const phase = derivePhase(sector);

    // Use real history data from SectorHistory sheet
    const history = sectorHistoryMap[name] || [];
    const rsHistory = history.length > 0 ? history.map(h => h.rs21) : [rs21];
    const erHistory = history.length > 0 ? history.map(h => h.er1w) : [er1w];
    const bandHistory = history.length > 0 ? history.map(h => h.b80) : [b80];
    const dateLabels = history.length > 0 ? history.map(h => formatHistoryDate(h.date)) : [];

    const panel = document.createElement('div');
    panel.className = 'sector-detail-panel';
    panel.id = 'sectorDetailPanel';

    // Metrics layout:
    // Block 1: RS(21), RS(63)
    // Block 2: RS日次%, RS週次%, RS月次%  (SWAPPED with Band — now first)
    // Block 3: RS Band≥80%  (MOVED here)
    // Block 4: ER(Day), ER(1W), ER(1M)
    panel.innerHTML = `
        <div class="detail-panel-inner">
            <div class="detail-header">
                <div class="detail-header-left">
                    <span class="detail-title">${name}</span>
                    <span class="detail-phase" style="background:${phaseColor(phase)}18;color:${phaseColor(phase)}">${phaseLabel(phase)}</span>
                </div>
                <button class="detail-close" id="detailClose">✕ 閉じる</button>
            </div>

            <div class="detail-metrics-grid">
                <div class="detail-metric-block">
                    <div class="detail-metric">
                        <span class="detail-metric-label">RS(21)</span>
                        <span class="detail-metric-value" style="color:${rsColor(rs21)};font-size:24px">${rs21.toFixed(1)}</span>
                    </div>
                    <div class="detail-metric">
                        <span class="detail-metric-label">RS(63)</span>
                        <span class="detail-metric-value" style="color:${rsColor(rs63)}">${rs63.toFixed(1)}</span>
                    </div>
                </div>
                <div class="detail-metric-block">
                    <div class="detail-metric">
                        <span class="detail-metric-label">RS日次%</span>
                        <span class="detail-metric-value ${rsDay >= 0 ? 'positive' : 'negative'}">${rsDay >= 0 ? '+' : ''}${rsDay.toFixed(2)}%</span>
                    </div>
                    <div class="detail-metric">
                        <span class="detail-metric-label">RS週次%</span>
                        <span class="detail-metric-value ${rs1w >= 0 ? 'positive' : 'negative'}">${rs1w >= 0 ? '+' : ''}${rs1w.toFixed(2)}%</span>
                    </div>
                    <div class="detail-metric">
                        <span class="detail-metric-label">RS月次%</span>
                        <span class="detail-metric-value ${rs1m >= 0 ? 'positive' : 'negative'}">${rs1m >= 0 ? '+' : ''}${rs1m.toFixed(2)}%</span>
                    </div>
                </div>
                <div class="detail-metric-block">
                    <div class="detail-metric">
                        <span class="detail-metric-label">RS Band≥80%</span>
                        <span class="detail-metric-value" style="color:${b80 >= 20 ? '#0A84FF' : '#48484A'}">${Math.round(b80)}%</span>
                    </div>
                </div>
                <div class="detail-metric-block">
                    <div class="detail-metric">
                        <span class="detail-metric-label">ER(Day)</span>
                        <span class="detail-metric-value" style="color:${erColor(erDay)}">${erDay >= 0 ? '+' : ''}${erDay.toFixed(2)}</span>
                    </div>
                    <div class="detail-metric">
                        <span class="detail-metric-label">ER(1W)</span>
                        <span class="detail-metric-value" style="color:${erColor(er1w)}">${er1w >= 0 ? '+' : ''}${er1w.toFixed(2)}</span>
                    </div>
                    <div class="detail-metric">
                        <span class="detail-metric-label">ER(1M)</span>
                        <span class="detail-metric-value" style="color:${erColor(er1m)}">${er1m >= 0 ? '+' : ''}${er1m.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div class="detail-charts-grid">
                <div class="detail-chart-card">
                    <div class="detail-chart-header">
                        <span class="detail-chart-title">RS(21) 推移</span>
                    </div>
                    ${renderMiniBar(rsHistory, { colorByRS: true, maxVal: 100, refLine: 50, dateLabels })}
                </div>
                <div class="detail-chart-card">
                    <div class="detail-chart-header">
                        <span class="detail-chart-title">ER(週次) 推移</span>
                    </div>
                    ${renderMiniBar(erHistory, { colorByER: true, dateLabels })}
                </div>
                <div class="detail-chart-card">
                    <div class="detail-chart-header">
                        <span class="detail-chart-title">RS≥80 Band% 推移</span>
                    </div>
                    ${renderMiniBar(bandHistory, { colorByBand: true, maxVal: 100, unit: '%', refLine: 20, dateLabels })}
                </div>
            </div>

            <div class="detail-hint">🔗 個別銘柄タブでこのセクターの銘柄を検索できます</div>
        </div>`;

    // Insert after the tile's row in the grid
    const tiles = Array.from(grid.querySelectorAll('.sector-tile-apple'));
    const tileIndex = tiles.indexOf(tile);
    const colCount = getComputedStyle(grid).gridTemplateColumns.split(' ').length || 5;
    const rowEnd = Math.min(tileIndex - (tileIndex % colCount) + colCount, tiles.length);

    // Insert panel after the last tile in the row
    const allChildren = Array.from(grid.children);
    const insertIndex = allChildren.indexOf(tiles[rowEnd - 1]) + 1;

    if (insertIndex < allChildren.length) {
        grid.insertBefore(panel, allChildren[insertIndex]);
    } else {
        grid.appendChild(panel);
    }

    // Attach close button
    panel.querySelector('#detailClose').addEventListener('click', (e) => {
        e.stopPropagation();
        activeSector = null;
        removeDetailPanel();
        grid.querySelectorAll('.sector-tile-apple').forEach(t => t.classList.remove('active'));
    });

    // Attach MiniBar tooltip events
    attachMiniBarEvents(panel);
}

function removeDetailPanel() {
    document.getElementById('sectorDetailPanel')?.remove();
}

// ── Helpers ──
function rsColor(v) {
    return v >= 80 ? '#0A84FF' : v >= 60 ? '#30D158' : v >= 40 ? '#FFD60A' : '#FF453A';
}

function erColor(v) {
    return v > 0 ? '#30D158' : v < 0 ? '#FF453A' : '#48484A';
}
