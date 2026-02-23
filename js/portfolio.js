// ============================================================
// portfolio.js — Portfolio View (Risk / Positions / Entry / History)
// ============================================================

import { escapeHtml } from './utils.js';

// ── CSV helpers (self-contained to avoid modifying sheets.js internals) ──

function splitCsvLines(text) {
    const lines = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '"') {
            if (inQuotes && text[i + 1] === '"') {
                current += '""'; // preserve escaped quotes
                i++;
            } else {
                inQuotes = !inQuotes;
                current += '"'; // preserve quote chars for splitRow
            }
        } else if (ch === '\n' && !inQuotes) {
            lines.push(current);
            current = '';
        } else if (ch === '\r' && !inQuotes) {
            // skip
        } else {
            current += ch;
        }
    }
    if (current.trim()) lines.push(current);
    return lines;
}

function splitRow(line) {
    const fields = [];
    let field = '';
    let q = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
            if (q && line[i + 1] === '"') { field += '"'; i++; }
            else q = !q;
        } else if (c === ',' && !q) {
            fields.push(field);
            field = '';
        } else {
            field += c;
        }
    }
    fields.push(field);
    return fields;
}

function parseNum(v) {
    if (v === null || v === undefined || v === '') return null;
    const s = String(v).replace(/[,¥￥\s%]/g, '');
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
}

// Check if value is a percentage string (e.g. "2.0%", "-8.0%")
function isPctStr(v) {
    return typeof v === 'string' && v.trim().endsWith('%');
}

// ── Section Parser ──

const SECTION_MAP = {
    'リスク管理': 'risk',
    'エントリー計画': 'entry',
    '保有ポジション': 'positions',
    'トレード履歴': 'history',
    'トレード統計': 'stats',
};

function parsePortfolioSections(csvText) {
    const lines = splitCsvLines(csvText);
    const sections = {};
    let currentKey = null;
    let rows = [];

    function flush() {
        if (currentKey) sections[currentKey] = rows;
        rows = [];
    }

    for (const line of lines) {
        const fields = splitRow(line);
        const first = (fields[0] || '').trim();

        // Detect ■ section marker
        if (first.startsWith('■')) {
            flush();
            const normalized = first.replace(/[\s　]/g, '');
            const matched = Object.entries(SECTION_MAP).find(([jp]) => normalized.includes(jp));
            currentKey = matched ? matched[1] : null;
            continue;
        }

        if (!currentKey) continue;

        // Skip fully empty rows — but keep them as markers for risk section sub-groups
        if (fields.every(f => f.trim() === '')) {
            rows.push(null); // null = empty row separator
            continue;
        }

        rows.push(fields.map(f => f.trim()));
    }
    flush();
    return sections;
}

// ── Risk section: header→value pairs ──

function parseRisk(rawRows) {
    if (!rawRows) return {};
    // Filter out null (empty row) separators and annotation rows (↑, 推奨, etc.)
    const isAnnotation = (r) => {
        const first = (r[0] || '').trim();
        return first.startsWith('↑') || first.startsWith('推奨') || first.startsWith('※');
    };

    const groups = [];
    let buf = [];
    for (const r of rawRows) {
        if (r === null) {
            if (buf.length) groups.push(buf);
            buf = [];
        } else if (!isAnnotation(r)) {
            buf.push(r);
        }
    }
    if (buf.length) groups.push(buf);

    // Each group: [headerFields, valueFields]
    const obj = {};
    for (const g of groups) {
        if (g.length < 2) continue;
        const headers = g[0];
        const values = g[1];
        headers.forEach((h, i) => {
            if (!h) return;
            const v = values[i] || '';
            // Preserve percentage strings as-is, parse numbers
            obj[h] = v === '' ? null : (isPctStr(v) ? v : (parseNum(v) !== null ? parseNum(v) : v));
        });
    }
    return obj;
}

// ── Table section: first row = header, rest = data objects ──

function parseTable(rawRows) {
    if (!rawRows) return [];
    const filtered = rawRows.filter(r => r !== null);
    if (filtered.length < 2) return [];
    const headers = filtered[0];
    return filtered.slice(1).map(fields => {
        const obj = {};
        headers.forEach((h, i) => {
            if (!h) return;
            const v = (fields[i] || '').trim();
            if (v === '') { obj[h] = null; return; }
            // Preserve date strings (M/D, YYYY-MM-DD, M/D/YYYY)
            if (/^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(v) || /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(v)) {
                obj[h] = v; return;
            }
            // Preserve percentage strings
            if (isPctStr(v)) { obj[h] = v; return; }
            const n = parseNum(v);
            obj[h] = n !== null ? n : v;
        });
        return obj;
    }).filter(obj => Object.values(obj).some(v => v !== null));
}

// ── Stats section: key-value pairs (label in col 0, value in col 1) ──

function parseStats(rawRows) {
    if (!rawRows) return {};
    const filtered = rawRows.filter(r => r !== null);
    const obj = {};
    for (const fields of filtered) {
        const key = (fields[0] || '').trim();
        const val = (fields[1] || '').trim();
        if (!key) continue;
        obj[key] = val === '' ? null : (parseNum(val) !== null ? parseNum(val) : val);
    }
    return obj;
}

// ── Format Helpers ──

function fmtYen(v) {
    const n = parseNum(v);
    if (n === null) return '--';
    return '\u00a5' + Math.round(n).toLocaleString('ja-JP');
}

function fmtPct(v, dec = 1) {
    if (v === null || v === undefined || v === '') return '--';
    if (isPctStr(v)) {
        const n = parseNum(v);
        if (n === null) return '--';
        return (n >= 0 ? '+' : '') + n.toFixed(dec) + '%';
    }
    const n = parseNum(v);
    if (n === null) return '--';
    return (n >= 0 ? '+' : '') + n.toFixed(dec) + '%';
}

function pnlCls(v) {
    const n = parseNum(v);
    if (n === null) return '';
    return n >= 0 ? 'positive' : 'negative';
}

function rCls(v) {
    const n = parseNum(v);
    if (n === null) return '';
    if (n >= 1) return 'positive';
    if (n >= 0) return 'pf-r-yellow';
    return 'negative';
}

// ── Position Summary Extractor (from raw rows) ──

function extractPosSummary(rawRows) {
    if (!rawRows) return {};
    const summary = {};

    const KEYS = [
        { pattern: '投入合計', key: 'totalInvested' },
        { pattern: '利用可能', key: 'available' },
        { pattern: 'ポートフォリオリスク', key: 'portRisk' },
        { pattern: '含み損益', key: 'unrealizedPL' },
    ];

    for (const fields of rawRows) {
        if (!fields || fields === null) continue;
        const first = (fields[0] || '').trim();
        // Skip header row and data rows (valid tickers)
        if (first === 'Ticker' || /^\d{4,5}$/.test(first)) continue;

        for (let i = 0; i < fields.length; i++) {
            const f = (fields[i] || '').trim();
            const next = i + 1 < fields.length ? (fields[i + 1] || '').trim() : '';
            if (!next) continue;
            for (const { pattern, key } of KEYS) {
                if (f.includes(pattern)) {
                    const n = parseNum(next);
                    summary[key] = n !== null ? n : next;
                }
            }
        }
    }
    return summary;
}

// ── A. Risk Management Card ──

function renderRiskCard(risk, container) {
    const total = risk['総資金(¥)'] ?? risk['総資金'];
    const riskTrade = risk['Risk¥/Trade'] ?? risk['Risk/Trade'];
    const maxInvest = risk['最大投入¥'] ?? risk['最大投入'];
    const lossStreak = risk['連敗数'] ?? 0;
    const appliedRisk = risk['適用リスク%'];
    const maxPos = risk['最大ポジ数'];

    const ddMonthly = risk['月間DD%'];
    const ddLimit = risk['月間DD上限'];
    const ddJudge = risk['DD判定'];
    const monthPL = risk['月間確定P&L'];
    const monthStart = risk['月初残高(¥)'] ?? risk['月初残高'];

    const ddNG = ddJudge && String(ddJudge).toUpperCase().includes('NG');
    const ddRatio = (parseNum(ddMonthly) !== null && parseNum(ddLimit) !== null && parseNum(ddLimit) !== 0)
        ? Math.abs(parseNum(ddMonthly)) / Math.abs(parseNum(ddLimit))
        : 0;
    const ddWarn = ddRatio > 0.7;

    const card = document.createElement('div');
    card.className = 'pf-risk-card';
    card.innerHTML = `
        <h2 class="pf-section-title">リスク管理</h2>
        <div class="pf-risk-grid">
            <div class="pf-risk-col">
                <div class="pf-risk-item">
                    <span class="pf-risk-label">総資金</span>
                    <span class="pf-risk-value">${fmtYen(total)}</span>
                </div>
                <div class="pf-risk-item">
                    <span class="pf-risk-label">Risk/Trade</span>
                    <span class="pf-risk-value">${fmtYen(riskTrade)}</span>
                </div>
                <div class="pf-risk-item">
                    <span class="pf-risk-label">最大投入</span>
                    <span class="pf-risk-value">${fmtYen(maxInvest)}</span>
                </div>
                <div class="pf-risk-item">
                    <span class="pf-risk-label">最大ポジ数</span>
                    <span class="pf-risk-value">${maxPos ?? '--'}</span>
                </div>
                <div class="pf-risk-item">
                    <span class="pf-risk-label">連敗数</span>
                    <span class="pf-risk-value">${lossStreak}</span>
                </div>
            </div>
            <div class="pf-risk-col">
                <div class="pf-risk-item">
                    <span class="pf-risk-label">適用リスク%</span>
                    <span class="pf-risk-value">${fmtPct(appliedRisk, 2)}</span>
                </div>
                <div class="pf-risk-item">
                    <span class="pf-risk-label">月間DD%</span>
                    <span class="pf-risk-value ${ddWarn ? 'pf-dd-warning' : ''}">${fmtPct(ddMonthly)}</span>
                </div>
                <div class="pf-risk-item">
                    <span class="pf-risk-label">DD判定</span>
                    <span class="pf-risk-value ${ddNG ? 'pf-dd-ng' : 'pf-dd-ok'}">${escapeHtml(ddJudge) || '--'}</span>
                </div>
                <div class="pf-risk-item">
                    <span class="pf-risk-label">月間確定P&L</span>
                    <span class="pf-risk-value ${pnlCls(monthPL)}">${fmtYen(monthPL)}</span>
                </div>
                <div class="pf-risk-item">
                    <span class="pf-risk-label">月初残高</span>
                    <span class="pf-risk-value">${fmtYen(monthStart)}</span>
                </div>
            </div>
        </div>
    `;
    container.appendChild(card);
}

// ── B. Open Positions ──

function renderPositions(rows, summary, container) {
    const section = document.createElement('div');
    section.className = 'pf-positions-section';

    // Only include rows with valid stock ticker (4-5 digit code)
    const dataRows = rows.filter(r => {
        const t = String(r.Ticker || '').trim();
        return /^\d{4,5}$/.test(t);
    });

    let html = `<h2 class="pf-section-title">保有ポジション <span class="pf-count">(${dataRows.length})</span></h2>`;

    if (dataRows.length === 0) {
        html += '<div class="pf-empty">現在保有ポジションはありません</div>';
    } else {
        html += '<div class="pf-position-cards">';
        dataRows.forEach(row => {
            const ticker = String(row.Ticker || '').replace(/[^\d]/g, '');
            const name = row['銘柄名'] || '';
            const sector = row['セクター'] || '';
            const entryDate = row['Entry日'] || '';
            const entryPrice = parseNum(row['Entry価格']);
            const currentPrice = parseNum(row['現在価格']);
            const pnlYen = parseNum(row['含み損益¥'] ?? row['含み損益']);
            const pnlPct = parseNum(row['含み損益%']);
            const rVal = parseNum(row['R倍率']);
            const stop = parseNum(row['Stop(21L)']);
            const trailDist = parseNum(row['Trail Dist%']);
            const shares = parseNum(row['株数']);
            const cost = parseNum(row['取得コスト']);
            const initRisk = parseNum(row['Init Risk%']);

            // R-bar: scale -2R to +6R
            const rNum = rVal ?? 0;
            const rBarPct = Math.max(0, Math.min(100, ((rNum + 2) / 8) * 100));
            const rColor = rNum >= 1 ? 'var(--green)' : rNum >= 0 ? 'var(--yellow)' : 'var(--red)';

            // P&L bar width (relative to cost)
            const pnlBarPct = (cost && pnlYen !== null) ? Math.min(Math.abs(pnlYen) / cost * 100, 100) : 0;

            html += `
            <div class="pf-position-card">
                <div class="pf-pos-header">
                    <a href="https://jp.tradingview.com/chart/?symbol=TSE:${ticker}" target="_blank" rel="noopener" class="pf-pos-ticker">${ticker}</a>
                    <a href="https://kabutan.jp/stock/?code=${ticker}" target="_blank" rel="noopener" class="pf-pos-name">${escapeHtml(name)}</a>
                    <span class="pf-pos-sector">${escapeHtml(sector)}</span>
                </div>
                <div class="pf-pos-prices">
                    <span class="pf-pos-entry">Entry ${entryDate ? escapeHtml(entryDate) + ' ' : ''}${fmtYen(entryPrice)}</span>
                    <span class="pf-pos-arrow">\u2192</span>
                    <span class="pf-pos-current">${fmtYen(currentPrice)}</span>
                    <span class="pf-pos-pnlpct ${pnlCls(pnlPct)}">${pnlPct !== null ? fmtPct(pnlPct) : '--'}</span>
                </div>
                <div class="pf-pos-r-bar">
                    <span class="pf-pos-r-label">R倍率</span>
                    <div class="pf-r-track">
                        <div class="pf-r-zero"></div>
                        <div class="pf-r-fill" style="width:${rBarPct}%;background:${rColor}"></div>
                    </div>
                    <span class="pf-pos-r-value" style="color:${rColor}">${rVal !== null ? rVal.toFixed(2) + 'R' : '--'}</span>
                </div>
                <div class="pf-pos-meta">
                    <div class="pf-pos-meta-item">
                        <span class="pf-pos-meta-label">Stop(21L)</span>
                        <span class="pf-pos-meta-value">${fmtYen(stop)}</span>
                    </div>
                    <div class="pf-pos-meta-item">
                        <span class="pf-pos-meta-label">Trail Dist%</span>
                        <span class="pf-pos-meta-value">${trailDist !== null ? fmtPct(trailDist) : '--'}</span>
                    </div>
                    <div class="pf-pos-meta-item">
                        <span class="pf-pos-meta-label">株数</span>
                        <span class="pf-pos-meta-value">${shares ?? '--'}</span>
                    </div>
                    <div class="pf-pos-meta-item">
                        <span class="pf-pos-meta-label">Init Risk%</span>
                        <span class="pf-pos-meta-value">${initRisk !== null ? fmtPct(initRisk) : '--'}</span>
                    </div>
                </div>
                <div class="pf-pos-pnl-bar">
                    <div class="pf-pnl-track">
                        <div class="pf-pnl-fill ${pnlYen !== null && pnlYen >= 0 ? 'pf-pnl-pos' : 'pf-pnl-neg'}" style="width:${pnlBarPct}%"></div>
                    </div>
                    <span class="pf-pnl-value ${pnlCls(pnlYen)}">${fmtYen(pnlYen)}</span>
                </div>
            </div>`;
        });
        html += '</div>';

        // Position summary bar
        let totalCost = 0, totalPnl = 0;
        dataRows.forEach(r => {
            totalCost += parseNum(r['取得コスト']) || 0;
            totalPnl += parseNum(r['含み損益¥'] ?? r['含み損益']) || 0;
        });
        html += '<div class="pf-pos-summary">';
        html += `<div class="pf-pos-summary-item"><span class="pf-pos-summary-label">合計投入</span><span class="pf-pos-summary-value">${fmtYen(totalCost)}</span></div>`;
        html += `<div class="pf-pos-summary-item"><span class="pf-pos-summary-label">含み損益</span><span class="pf-pos-summary-value ${pnlCls(totalPnl)}">${fmtYen(totalPnl)}</span></div>`;
        if (summary.available != null) {
            html += `<div class="pf-pos-summary-item"><span class="pf-pos-summary-label">利用可能</span><span class="pf-pos-summary-value">${fmtYen(summary.available)}</span></div>`;
        }
        if (summary.portRisk) {
            html += `<div class="pf-pos-summary-item"><span class="pf-pos-summary-label">リスク</span><span class="pf-pos-summary-value">${fmtPct(summary.portRisk)}</span></div>`;
        }
        html += '</div>';
    }

    section.innerHTML = html;
    container.appendChild(section);
}

// ── C. Entry Plans ──

function renderEntryPlans(rows, container) {
    if (!rows || rows.length === 0) return;

    const section = document.createElement('div');
    section.className = 'pf-entry-section';

    // Determine columns from first row keys
    const allKeys = Object.keys(rows[0] || {}).filter(k => k);
    // Priority columns
    const priority = ['Ticker', '銘柄名', 'セクター', '想定Entry', 'Stop(21L)', 'StopDist%', 'StopDist¥', 'Risk¥', '算出株数', '単元株数', '投入額¥', '投入%'];
    const cols = priority.filter(c => allKeys.includes(c));
    // Add any remaining columns (judgment columns etc.)
    const remaining = allKeys.filter(c => !cols.includes(c));
    cols.push(...remaining);

    let html = `<h2 class="pf-section-title">エントリー計画</h2>`;
    html += '<div class="data-table-container"><div class="table-scroll">';
    html += '<table class="data-table pf-entry-table"><thead><tr>';
    cols.forEach(c => { html += `<th>${c}</th>`; });
    html += '</tr></thead><tbody>';

    rows.forEach(row => {
        if (!row.Ticker && !row['銘柄名']) return;
        const ticker = String(row.Ticker || '').replace(/[^\d]/g, '');
        const stopDist = parseNum(row['StopDist%']);
        const stopWarn = stopDist !== null && Math.abs(stopDist) > 5;
        const judgment = row['判定'] || '';
        const isZeroShares = judgment.includes('0株');

        html += `<tr class="${isZeroShares ? 'pf-entry-zero' : ''}">`;
        cols.forEach(c => {
            const v = row[c];
            if (c === 'Ticker') {
                html += `<td class="col-ticker"><a href="https://jp.tradingview.com/chart/?symbol=TSE:${ticker}" target="_blank" rel="noopener">${ticker || '--'}</a></td>`;
            } else if (c === '銘柄名') {
                html += `<td class="col-name"><a href="https://kabutan.jp/stock/?code=${ticker}" target="_blank" rel="noopener">${escapeHtml(v || '')}</a></td>`;
            } else if (c === 'セクター') {
                html += `<td class="col-sector">${escapeHtml(v || '')}</td>`;
            } else if (c === 'StopDist%') {
                html += `<td class="${stopWarn ? 'pf-stop-warning' : ''}">${v !== null ? fmtPct(v) : '--'}</td>`;
            } else if (c.includes('判定') || c.includes('Check') || c.includes('OK')) {
                const isOk = v && (String(v).includes('OK') || String(v).includes('○') || v === true || v === 1);
                const isNg = v && (String(v).includes('NG') || String(v).includes('×') || v === false || v === 0);
                const cls = isOk ? 'pf-judge-ok' : isNg ? 'pf-judge-ng' : '';
                html += `<td><span class="pf-judgment-badge ${cls}">${escapeHtml(v ?? '--')}</span></td>`;
            } else if (c.includes('¥') || c === 'Risk¥') {
                html += `<td>${fmtYen(v)}</td>`;
            } else if (c.includes('%')) {
                html += `<td>${v !== null ? fmtPct(v) : '--'}</td>`;
            } else {
                html += `<td>${v ?? '--'}</td>`;
            }
        });
        html += '</tr>';
    });

    html += '</tbody></table></div></div>';
    section.innerHTML = html;
    container.appendChild(section);
}

// ── D. Trade Statistics + History ──

function renderTradeStats(stats, container) {
    if (!stats || Object.keys(stats).length === 0) return;

    const card = document.createElement('div');
    card.className = 'pf-stats-card';

    const tradeCount = stats['トレード数'] ?? stats['Trades'];
    const wins = stats['勝ち'] ?? stats['Wins'];
    const losses = stats['負け'] ?? stats['Losses'];
    const winRate = stats['勝率'] ?? stats['Win Rate'];
    const totalPL = stats['合計Net P&L'] ?? stats['合計P&L'] ?? stats['Total P&L'];
    const avgR = stats['平均R倍率'] ?? stats['Avg R'];
    const maxWin = stats['最大利益'] ?? stats['Max Win'];
    const maxLoss = stats['最大損失'] ?? stats['Max Loss'];
    const avgDays = stats['平均保有日数'] ?? stats['Avg Days'];
    const pf = stats['Profit Factor'] ?? stats['PF'];

    card.innerHTML = `
        <h2 class="pf-section-title">トレード統計</h2>
        <div class="pf-stats-grid">
            <div class="pf-stat-item">
                <span class="pf-stat-label">勝率</span>
                <span class="pf-stat-value">${winRate !== null && winRate !== undefined ? fmtPct(winRate) : '--'}</span>
            </div>
            <div class="pf-stat-item">
                <span class="pf-stat-label">平均R</span>
                <span class="pf-stat-value ${rCls(avgR)}">${avgR != null ? Number(avgR).toFixed(2) + 'R' : '--'}</span>
            </div>
            <div class="pf-stat-item">
                <span class="pf-stat-label">Profit Factor</span>
                <span class="pf-stat-value ${parseNum(pf) !== null && parseNum(pf) >= 1 ? 'positive' : 'negative'}">${pf != null ? Number(pf).toFixed(2) : '--'}</span>
            </div>
            <div class="pf-stat-item">
                <span class="pf-stat-label">合計P&L</span>
                <span class="pf-stat-value ${pnlCls(totalPL)}">${fmtYen(totalPL)}</span>
            </div>
        </div>
        <div class="pf-stats-detail">
            <div class="pf-stats-detail-grid">
                <div class="pf-stat-detail-item">
                    <span class="pf-stat-detail-label">トレード数</span>
                    <span class="pf-stat-detail-value">${tradeCount ?? '--'}</span>
                </div>
                <div class="pf-stat-detail-item">
                    <span class="pf-stat-detail-label">勝ち / 負け</span>
                    <span class="pf-stat-detail-value">${wins ?? '--'} / ${losses ?? '--'}</span>
                </div>
                <div class="pf-stat-detail-item">
                    <span class="pf-stat-detail-label">最大利益</span>
                    <span class="pf-stat-detail-value positive">${fmtYen(maxWin)}</span>
                </div>
                <div class="pf-stat-detail-item">
                    <span class="pf-stat-detail-label">最大損失</span>
                    <span class="pf-stat-detail-value negative">${fmtYen(maxLoss)}</span>
                </div>
                <div class="pf-stat-detail-item">
                    <span class="pf-stat-detail-label">平均保有日数</span>
                    <span class="pf-stat-detail-value">${avgDays != null ? avgDays + '日' : '--'}</span>
                </div>
            </div>
        </div>
    `;
    container.appendChild(card);
}

function renderTradeHistory(rows, container) {
    if (!rows || rows.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'pf-empty';
        empty.textContent = 'まだトレード履歴がありません';
        container.appendChild(empty);
        return;
    }

    const DEFAULT_SHOW = 10;
    const section = document.createElement('div');
    section.className = 'pf-history-section';

    const allKeys = Object.keys(rows[0]).filter(k => k);

    let html = '<h2 class="pf-section-title">トレード履歴</h2>';
    html += '<div class="data-table-container"><div class="table-scroll">';
    html += '<table class="data-table pf-history-table"><thead><tr>';
    allKeys.forEach(c => { html += `<th>${c}</th>`; });
    html += '</tr></thead><tbody>';

    // Show newest first
    const sorted = [...rows].reverse();

    sorted.forEach((row, idx) => {
        const hidden = idx >= DEFAULT_SHOW ? ' pf-history-hidden' : '';
        const rVal = parseNum(row['R倍率']);

        html += `<tr class="${hidden}">`;
        allKeys.forEach(c => {
            const v = row[c];
            if (c === 'Ticker') {
                const t = String(v || '').replace(/[^\d]/g, '');
                html += `<td class="col-ticker"><a href="https://jp.tradingview.com/chart/?symbol=TSE:${t}" target="_blank" rel="noopener">${t || '--'}</a></td>`;
            } else if (c === 'R倍率') {
                html += `<td class="${rCls(v)}" style="font-weight:600">${v != null ? Number(v).toFixed(2) + 'R' : '--'}</td>`;
            } else if (c === 'Exit理由' || c === 'Exit Reason') {
                html += `<td><span class="pf-exit-badge">${escapeHtml(v || '--')}</span></td>`;
            } else if (c.includes('P&L') || c === 'Gross P&L' || c === 'Net P&L') {
                html += `<td class="${pnlCls(v)}">${fmtYen(v)}</td>`;
            } else if (c.includes('¥')) {
                html += `<td>${fmtYen(v)}</td>`;
            } else {
                html += `<td>${v ?? '--'}</td>`;
            }
        });
        html += '</tr>';
    });

    html += '</tbody></table></div>';

    if (sorted.length > DEFAULT_SHOW) {
        html += `<button class="pf-history-toggle">全${sorted.length}件を表示 \u25BC</button>`;
    }

    html += '</div>';
    section.innerHTML = html;
    container.appendChild(section);

    // Toggle expand/collapse
    const btn = section.querySelector('.pf-history-toggle');
    if (btn) {
        let expanded = false;
        section.querySelectorAll('.pf-history-hidden').forEach(tr => { tr.style.display = 'none'; });
        btn.addEventListener('click', () => {
            expanded = !expanded;
            section.querySelectorAll('.pf-history-hidden').forEach(tr => {
                tr.style.display = expanded ? '' : 'none';
            });
            btn.textContent = expanded
                ? '10件に折りたたむ \u25B2'
                : `全${sorted.length}件を表示 \u25BC`;
        });
    }
}

// ── Main Export ──

export function renderPortfolio(csvText, container) {
    container.innerHTML = '';

    if (!csvText || csvText.trim() === '') {
        container.innerHTML = '<div class="error-banner">ポートフォリオデータを取得できませんでした</div>';
        return;
    }

    const sections = parsePortfolioSections(csvText);

    // A. Risk Management
    const risk = parseRisk(sections.risk);
    if (Object.keys(risk).length > 0) {
        renderRiskCard(risk, container);
    }

    // B. Open Positions
    const positions = parseTable(sections.positions);
    const posSummary = extractPosSummary(sections.positions);
    renderPositions(positions, posSummary, container);

    // C. Entry Plans
    const entry = parseTable(sections.entry);
    if (entry.length > 0) {
        renderEntryPlans(entry, container);
    }

    // D. Trade Stats + History
    const stats = parseStats(sections.stats);
    renderTradeStats(stats, container);

    const history = parseTable(sections.history);
    renderTradeHistory(history, container);
}
