// ============================================================
// screener.js — Stock Screener View (v2.1 features ported)
// Cross-Screen Overlap + Entry基準
// ============================================================

const SCREEN_CONFIG = [
    { key: 'St_Momentum', label: 'Momentum', abbr: 'MOM', color: '#f472b6' },
    { key: 'St_21EMA', label: '21EMA', abbr: 'EMA', color: '#a78bfa' },
    { key: 'St_Movers', label: 'Movers', abbr: 'MOV', color: '#30D158' },
    { key: 'St_Pivot', label: 'Pivot', abbr: 'PVT', color: '#2dd4bf' },
    { key: 'St_Surprise', label: 'Surprise', abbr: 'SUR', color: '#22d3ee' },
    { key: 'St_EREvent', label: 'ER Event', abbr: 'ERE', color: '#FFD60A' },
    { key: 'St_Quiet', label: 'Quiet', abbr: 'QUI', color: '#0A84FF' },
    { key: 'St_SectorAlpha', label: 'Sec Alpha', abbr: 'SEC', color: '#FF453A' },
    { key: 'St_Earnings', label: 'Earnings', abbr: 'EAR', color: '#FFD60A' },
];

// Columns to display
const BASE_COLS = ['Ticker', 'Name', 'Sector', 'DAY%', 'RS21'];
const POST_RS_COLS = ['ER_1W(vsSec)'];  // after RS21, before screen-specific
const TAIL_COL = 'ER_Days';  // right end before entry基準

// Per-screen specific columns (inserted between RV(20D) and ER_Days)
const SCREEN_COLS = {
    St_Momentum:   ['RS_ROC(21D)'],
    St_21EMA:      ['RS21_Peak', 'Pullback'],
    St_Movers:     ['RV(20D)', 'Accel_Score'],
    St_Pivot:      ['SP_Break', 'SP_Dist%', 'SP_Cnt', 'SP_Age'],
    St_Surprise:   ['EPS_Surp%', 'Days_Since_ER', 'EPS_G%'],
    St_EREvent:    ['EPS_G%', 'OP_Mgn%'],
    St_Quiet:      ['RV(20D)', 'Range%(30D)', 'VCS'],
    St_SectorAlpha:['Match', 'Range%(30D)'],
    St_Earnings:   ['EPS_G%', 'Fcst_EPS_G%', 'OP_Mgn%', 'EPS_Surp%'],
};

// Entry基準 thresholds (from v2.1)
const adr_ok = v => v >= 2.5 && v <= 7;
const r21_ok = v => v >= -0.3 && v <= 0.8;
const e21_ok = v => v <= 4;
const r50_ok = v => v <= 2.5;

function getEntry(row) {
    return {
        adr: parseFloat(row['ADR%'] ?? row['ADR%(20D)'] ?? row['ADR']),
        atr21e: parseFloat(row['R×21E'] ?? row['ATR_21EMA'] ?? row['ATR21E_R']),
        e21p: parseFloat(row['E21L%'] ?? row['Dist_21EMA%']),
        atr50s: parseFloat(row['R×50S'] ?? row['ATR_50SMA'] ?? row['ATR50S_R']),
    };
}

function entryScore(row) {
    let n = 0;
    const { adr, atr21e, e21p, atr50s } = getEntry(row);
    if (!isNaN(adr) && adr_ok(adr)) n++;
    if (!isNaN(atr21e) && r21_ok(atr21e)) n++;
    if (!isNaN(e21p) && e21_ok(e21p)) n++;
    if (!isNaN(atr50s) && r50_ok(atr50s)) n++;
    return n;
}

let currentScreen = 'ALL';
let screenData = {};
let tickerMap = {}; // Cross-screen overlap map
let headerSort = { col: null, dir: null };
let currentSector = null; // null = all sectors
let _summaryEl, _tableEl, _searchInput, _sortSelect;

function rerender() {
    renderScreenContent(_summaryEl, _tableEl, _searchInput.value, _sortSelect.value);
}

/**
 * Build cross-screen overlap map.
 * { ticker: { screens: Set, name, sector, ... } }
 */
function buildTickerMap(data) {
    const map = {};
    Object.entries(data).forEach(([screenKey, rows]) => {
        if (!rows || !Array.isArray(rows)) return;
        rows.forEach(row => {
            const ticker = stripFormula(row.Ticker);
            if (!ticker) return;
            if (!map[ticker]) {
                map[ticker] = { screens: new Set(), name: stripFormula(row.Name), sector: row.Sector || '', bestRow: row };
            }
            map[ticker].screens.add(screenKey);
        });
    });
    // Convert Sets to arrays and count
    Object.values(map).forEach(v => {
        v.screens = [...v.screens];
        v.count = v.screens.length;
    });
    return map;
}

let _initialized = false;
let _tabContainer;

export function initScreener(data, tabContainer, summaryEl, tableEl, searchInput, sortSelect) {
    screenData = data;
    tickerMap = buildTickerMap(data);
    _summaryEl = summaryEl;
    _tableEl = tableEl;
    _searchInput = searchInput;
    _sortSelect = sortSelect;
    _tabContainer = tabContainer;

    // Reset state on re-init
    currentScreen = 'ALL';
    headerSort = { col: null, dir: null };
    currentSector = null;

    // Build tabs (with ALL tab)
    renderTabs(tabContainer, () => {
        headerSort = { col: null, dir: null };
        rerender();
    });

    // Sector filter
    renderSectorFilter();

    // Event listeners — only once
    if (!_initialized) {
        searchInput.addEventListener('input', () => rerender());
        sortSelect.addEventListener('change', () => {
            headerSort = { col: null, dir: null };
            rerender();
        });
        _initialized = true;
    }

    // Reset controls
    searchInput.value = '';
    sortSelect.value = 'default';

    // Initial render
    renderScreenContent(summaryEl, tableEl, '', 'default');
}

function renderTabs(container, onChange) {
    container.innerHTML = '';

    // ALL tab
    const allCount = Object.keys(tickerMap).length;
    const allBtn = document.createElement('button');
    allBtn.className = 'screen-tab' + (currentScreen === 'ALL' ? ' active' : '');
    allBtn.style.cssText = currentScreen === 'ALL' ? 'background:var(--text-primary);color:var(--bg-primary);border-color:var(--text-primary)' : '';
    allBtn.innerHTML = `ALL <span class="tab-count">${allCount}</span>`;
    allBtn.addEventListener('click', () => {
        currentScreen = 'ALL';
        renderTabs(container, onChange);
        onChange();
    });
    container.appendChild(allBtn);

    SCREEN_CONFIG.forEach(cfg => {
        const btn = document.createElement('button');
        btn.className = 'screen-tab' + (cfg.key === currentScreen ? ' active' : '');
        const count = (screenData[cfg.key] || []).length;
        if (cfg.key === currentScreen) {
            btn.style.cssText = `background:${cfg.color}18;color:${cfg.color};border-color:${cfg.color}`;
        }
        btn.innerHTML = `${cfg.label} <span class="tab-count">${count}</span>`;
        btn.addEventListener('click', () => {
            currentScreen = cfg.key;
            renderTabs(container, onChange);
            onChange();
        });
        container.appendChild(btn);
    });
}

function renderScreenContent(summaryEl, tableEl, searchText, sortKey) {
    // Summary
    if (currentScreen === 'ALL') {
        const dupCount = Object.values(tickerMap).filter(v => v.count >= 2).length;
        summaryEl.textContent = `全銘柄 (重複除去): ${Object.keys(tickerMap).length}銘柄`;
        if (dupCount > 0) {
            summaryEl.innerHTML += ` · <span style="color:#FFD60A;font-weight:600">${dupCount}銘柄が2+スクリーン重複</span>`;
        }
    } else {
        const cfg = SCREEN_CONFIG.find(c => c.key === currentScreen);
        const data = screenData[currentScreen] || [];
        summaryEl.textContent = `${cfg?.label || currentScreen}: ${data.length}銘柄`;
    }

    // Render overlap section + table
    renderOverlapAndTable(tableEl, searchText, sortKey);
}

function renderOverlapAndTable(tableEl, searchText, sortKey) {
    // Remove existing overlap card
    document.getElementById('overlapCard')?.remove();

    // Show cross-screen overlap for ALL tab
    if (currentScreen === 'ALL') {
        const dupStocks = Object.entries(tickerMap)
            .filter(([_, v]) => v.count >= 2)
            .sort(([_, a], [__, b]) => b.count - a.count);

        if (dupStocks.length > 0) {
            const card = document.createElement('div');
            card.id = 'overlapCard';
            card.className = 'overlap-card';
            card.innerHTML = `
                <div class="overlap-header">🔥 Cross-Screen Overlap — ${dupStocks.length} stocks matched 2+ screens</div>
                <div class="overlap-badges">
                    ${dupStocks.map(([ticker, info]) => `
                        <div class="overlap-badge">
                            <a href="https://shikiho.toyokeizai.net/stocks/${ticker}" target="_blank" class="ob-name">${info.name || ticker}</a>
                            <a href="https://jp.tradingview.com/symbols/TSE-${ticker}/" target="_blank" class="ob-ticker">${ticker}</a>
                            <span class="ob-count">×${info.count}</span>
                            <span class="ob-screens">${info.screens.map(s => {
                const cfg = SCREEN_CONFIG.find(c => c.key === s);
                return cfg ? `<span class="scr-icon" style="background:${cfg.color}18;color:${cfg.color}">${cfg.abbr}</span>` : '';
            }).join('')}</span>
                        </div>`).join('')}
                </div>`;
            tableEl.closest('.data-table-container').insertBefore(card, tableEl.closest('.table-scroll'));
        }
    }

    renderScreenTable(tableEl, searchText, sortKey);
}

function renderScreenTable(tableEl, searchText, sortKey) {
    let data;

    if (currentScreen === 'ALL') {
        // Deduplicated list — merge missing fields from later sheets
        const seen = {};
        data = [];
        Object.entries(screenData).forEach(([screenKey, rows]) => {
            if (!rows || !Array.isArray(rows)) return;
            rows.forEach(row => {
                const ticker = stripFormula(row.Ticker);
                if (!ticker) return;
                if (seen[ticker] !== undefined) {
                    // Merge missing fields from this row into existing
                    const existing = data[seen[ticker]];
                    Object.keys(row).forEach(key => {
                        if ((existing[key] == null || existing[key] === '') &&
                            row[key] != null && row[key] !== '') {
                            existing[key] = row[key];
                        }
                    });
                    return;
                }
                seen[ticker] = data.length;
                data.push({ ...row, _screenKey: screenKey });
            });
        });
    } else {
        data = [...(screenData[currentScreen] || [])];
    }

    // Filter by sector
    if (currentSector) {
        data = data.filter(row => row.Sector === currentSector);
    }

    // Filter by search text
    if (searchText) {
        const q = searchText.toLowerCase();
        data = data.filter(row =>
            (row.Ticker && String(row.Ticker).toLowerCase().includes(q)) ||
            (row.Name && String(row.Name).toLowerCase().includes(q)) ||
            (row.Sector && String(row.Sector).toLowerCase().includes(q))
        );
    }

    // Sort — header sort takes priority over dropdown
    if (headerSort.col) {
        const col = headerSort.col;
        const dir = headerSort.dir === 'asc' ? 1 : -1;
        data.sort((a, b) => {
            let va, vb;
            if (col === 'Ticker') { va = stripFormula(a.Ticker); vb = stripFormula(b.Ticker); }
            else if (col === 'Name') { va = stripFormula(a.Name); vb = stripFormula(b.Name); }
            else if (col === 'Screens') { va = tickerMap[stripFormula(a.Ticker)]?.count || 0; vb = tickerMap[stripFormula(b.Ticker)]?.count || 0; }
            else if (col === 'ADR%') { va = getEntry(a).adr; vb = getEntry(b).adr; }
            else if (col === 'R×21E') { va = getEntry(a).atr21e; vb = getEntry(b).atr21e; }
            else if (col === 'E21L%') { va = getEntry(a).e21p; vb = getEntry(b).e21p; }
            else if (col === 'R×50S') { va = getEntry(a).atr50s; vb = getEntry(b).atr50s; }
            else if (col === '基準') { va = entryScore(a); vb = entryScore(b); }
            else { va = a[col]; vb = b[col]; }

            // String sort for text columns
            if (col === 'Ticker' || col === 'Name' || col === 'Sector') {
                return String(va || '').localeCompare(String(vb || ''), 'ja') * dir;
            }
            // Numeric sort (NaN always last)
            const na = parseFloat(va), nb = parseFloat(vb);
            if (isNaN(na) && isNaN(nb)) return 0;
            if (isNaN(na)) return 1;
            if (isNaN(nb)) return -1;
            return (na - nb) * dir;
        });
    } else {
        switch (sortKey) {
            case 'rs21-desc': data.sort((a, b) => (num(b.RS21) - num(a.RS21))); break;
            case 'rs21-asc': data.sort((a, b) => (num(a.RS21) - num(b.RS21))); break;
            case 'change-desc': data.sort((a, b) => (num(b['DAY%']) - num(a['DAY%']))); break;
            case 'change-asc': data.sort((a, b) => (num(a['DAY%']) - num(b['DAY%']))); break;
        }
    }

    // Build columns: Base + PostRS + ScreenSpecific + Entry基準 + ER_Days(last)
    const cols = [...BASE_COLS, ...POST_RS_COLS];

    // Screen-specific columns
    const specificCols = currentScreen !== 'ALL' ? (SCREEN_COLS[currentScreen] || []) : [];
    cols.push(...specificCols);

    // Entry基準 columns (always show if data exists)
    const hasEntry = data.some(r =>
        r['ADR%'] != null || r['ADR%(20D)'] != null ||
        r['R×21E'] != null || r['ATR_21EMA'] != null ||
        r['E21L%'] != null || r['Dist_21EMA%'] != null ||
        r['R×50S'] != null || r['ATR_50SMA'] != null
    );
    const entryCols = hasEntry ? ['ADR%', 'R×21E', 'E21L%', 'R×50S', '基準'] : [];
    cols.push(...entryCols);

    // ER_Days at the very end
    cols.push(TAIL_COL);

    const allCols = [...cols];

    // SCREEN column for all tabs (after Ticker)
    allCols.splice(1, 0, 'Screens');

    const thead = tableEl.querySelector('thead');
    thead.innerHTML = '<tr>' + allCols.map(h => {
        const isEntry = entryCols.includes(h);
        const isActive = headerSort.col === h;
        const arrow = isActive ? (headerSort.dir === 'asc' ? ' ▲' : ' ▼') : '';
        const label = h === 'Screens' ? 'SCREEN' : h;
        const cls = isActive ? ' sort-active' : '';
        const color = isEntry ? '#FFD60A' : isActive ? 'var(--accent)' : '';
        const style = color ? ` style="color:${color}"` : '';
        return `<th class="sortable-th${cls}" data-col="${h}"${style}>${label}${arrow}</th>`;
    }).join('') + '</tr>';

    // Attach click-to-sort on each <th>
    thead.querySelectorAll('th.sortable-th').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.col;
            if (headerSort.col === col) {
                headerSort.dir = headerSort.dir === 'desc' ? 'asc' : 'desc';
            } else {
                headerSort.col = col;
                headerSort.dir = 'desc';
            }
            if (_sortSelect) _sortSelect.value = 'default';
            rerender();
        });
    });

    const tbody = tableEl.querySelector('tbody');
    tbody.innerHTML = '';

    data.forEach(row => {
        const ticker = stripFormula(row.Ticker);
        const info = tickerMap[ticker];
        const dupCount = info?.count || 1;
        const isHighDup = dupCount >= 3;
        const score = entryScore(row);
        const isGoodEntry = score >= 3;

        const tr = document.createElement('tr');
        tr.style.background = isHighDup ? 'rgba(255,214,10,0.03)' : isGoodEntry ? 'rgba(48,209,88,0.03)' : '';

        tr.innerHTML = allCols.map(h => {
            const v = row[h];

            if (h === 'Ticker') {
                return `<td class="col-ticker">
                    <a href="https://jp.tradingview.com/chart/?symbol=TSE:${ticker}" target="_blank">${ticker}</a>
                    ${dupCount >= 2 ? `<span class="dup-badge" title="${(info?.screens || []).join(', ')}">${dupCount}</span>` : ''}
                </td>`;
            }
            if (h === 'Name') {
                const name = stripFormula(v);
                return `<td class="col-name">
                    <a href="https://shikiho.toyokeizai.net/stocks/${ticker}" target="_blank" title="${name}">${name}</a>
                </td>`;
            }
            if (h === 'Sector') return `<td class="col-sector">${v || ''}</td>`;
            if (h === 'Screens') {
                const screens = info?.screens || [];
                return `<td class="col-screens">${screens.map(s => {
                    const cfg = SCREEN_CONFIG.find(c => c.key === s);
                    return cfg ? `<span class="scr-icon" style="background:${cfg.color}18;color:${cfg.color}" title="${cfg.label}">${cfg.abbr}</span>` : '';
                }).join('')}</td>`;
            }

            // RS column with colored badge
            if (h === 'RS21') {
                return `<td>${rsBadge(v)}</td>`;
            }

            // Entry基準 columns
            if (h === 'ADR%') { const { adr } = getEntry(row); return entryCell(adr, adr_ok, '%'); }
            if (h === 'R×21E') { const { atr21e } = getEntry(row); return entryCell(atr21e, r21_ok); }
            if (h === 'E21L%') { const { e21p } = getEntry(row); return entryCell(e21p, e21_ok, '%'); }
            if (h === 'R×50S') { const { atr50s } = getEntry(row); return entryCell(atr50s, r50_ok); }
            if (h === '基準') return scoreBadge(score);

            // Signed numeric columns
            const cls = isSignedCol(h) ? colorClass(v) : '';
            return `<td class="${cls}">${formatVal(v)}</td>`;
        }).join('');
        tbody.appendChild(tr);
    });
}

// ── Entry基準 cell rendering ──

function entryCell(val, okFn, unit = '') {
    const n = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(n)) return '<td><span style="color:var(--text-muted)">--</span></td>';
    const ok = okFn(n);
    const color = ok ? 'var(--green)' : 'var(--text-muted)';
    return `<td><span style="font-family:var(--font-mono);font-weight:600;color:${color}">${n.toFixed(1)}${unit}</span></td>`;
}

function scoreBadge(score) {
    const bg = score >= 3 ? 'var(--green-bg)' : score >= 2 ? 'var(--yellow-bg)' : 'transparent';
    const color = score >= 3 ? 'var(--green)' : score >= 2 ? 'var(--yellow)' : 'var(--text-muted)';
    return `<td><span class="score-badge" style="background:${bg};color:${color}">${score}/4</span></td>`;
}

// ── Sector Filter ──

function renderSectorFilter() {
    const container = document.getElementById('sectorFilter');
    if (!container) return;

    // Collect sectors with average RS21
    const sectorStats = {};
    Object.values(screenData).flat().forEach(r => {
        if (!r.Sector) return;
        if (!sectorStats[r.Sector]) sectorStats[r.Sector] = { sum: 0, count: 0 };
        const rs = parseFloat(r.RS21);
        if (!isNaN(rs)) {
            sectorStats[r.Sector].sum += rs;
            sectorStats[r.Sector].count++;
        }
    });

    // Sort by average RS21 descending
    const sectors = Object.keys(sectorStats)
        .map(sec => ({
            name: sec,
            avgRS: sectorStats[sec].count > 0 ? sectorStats[sec].sum / sectorStats[sec].count : 0,
        }))
        .sort((a, b) => b.avgRS - a.avgRS);

    container.innerHTML = '';

    // ALL button
    const allBtn = document.createElement('button');
    allBtn.className = 'sector-chip' + (!currentSector ? ' active' : '');
    allBtn.textContent = 'ALL';
    allBtn.addEventListener('click', () => {
        currentSector = null;
        renderSectorFilter();
        rerender();
    });
    container.appendChild(allBtn);

    sectors.forEach(({ name, avgRS }) => {
        const btn = document.createElement('button');
        btn.className = 'sector-chip' + (currentSector === name ? ' active' : '');
        const rsColor = avgRS >= 60 ? 'var(--green)' : avgRS >= 40 ? 'var(--text-secondary)' : 'var(--red)';
        btn.innerHTML = `${name} <span class="sector-rs" style="color:${rsColor}">${avgRS.toFixed(0)}</span>`;
        btn.addEventListener('click', () => {
            currentSector = name;
            renderSectorFilter();
            rerender();
        });
        container.appendChild(btn);
    });
}

// ── Helpers ──

function num(v) {
    const n = parseFloat(v);
    return isNaN(n) ? -9999 : n;
}

function stripFormula(v) {
    if (v === null || v === undefined) return '';
    const s = String(v);
    const match = s.match(/=HYPERLINK\(".*?","(.+?)"\)/i);
    if (match) return match[1];
    return s;
}

function rsBadge(val) {
    if (val === null || val === undefined || val === '') return '<span class="rs-badge">--</span>';
    const n = Number(val);
    const cls = n >= 80 ? 'rs-blue' : n >= 60 ? 'rs-high' : n >= 40 ? 'rs-mid' : 'rs-low';
    return `<span class="rs-badge ${cls}">${n.toFixed(1)}</span>`;
}

function formatVal(val) {
    if (val === null || val === undefined || val === '') return '--';
    if (typeof val === 'number') {
        if (Number.isInteger(val) && Math.abs(val) > 100) return val.toLocaleString('ja-JP');
        return val.toFixed(2);
    }
    return String(val);
}

function isSignedCol(h) {
    return [
        'DAY%', '1W%', '1M%', 'RS_1W%', 'RS_1M%', 'Chg%',
        'ER_1W(vsSec)', 'SP_Dist%',
        'EPS_G%', 'Sales_G%', 'Fcst_EPS_G%', 'EPS_Surp%',
        'RS_ROC(21D)', 'Pullback',
    ].includes(h);
}

function colorClass(val) {
    if (val === null || val === undefined || val === '') return '';
    const n = Number(val);
    if (isNaN(n)) return '';
    return n > 0 ? 'positive' : n < 0 ? 'negative' : '';
}
