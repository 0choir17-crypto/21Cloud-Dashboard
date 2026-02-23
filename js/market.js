// ============================================================
// market.js — Market Overview View
// ============================================================

import { escapeHtml } from './utils.js';

// Chart.js instance refs (prevent memory leak on refresh)
let breadthChartInstance = null;
let nhNlChartInstance = null;

/**
 * Render index cards (Nikkei 225, TOPIX, Growth 250).
 */
export function renderIndexCards(indices, container) {
    container.innerHTML = '';

    if (!indices || indices.length === 0) {
        container.innerHTML = '<div class="error-banner">指数データを取得できませんでした</div>';
        return;
    }

    indices.forEach(row => {
        const name = row.Name;
        if (!name) return;

        const price = row.Price;
        const chg1w = row.Chg_1W;
        const chg1m = row.Chg_1M;
        const chgYtd = row.Chg_YTD;
        const chg1y = row.Chg_1Y;
        const pct52 = row.Pct_52WH;
        const dist10 = row['Dist_10MA%'];
        const dist21 = row['Dist_21EMA%'];
        const dist50 = row['Dist_50MA%'];

        const card = document.createElement('div');
        card.className = 'index-card';
        card.innerHTML = `
            <div class="card-name">${escapeHtml(name)}</div>
            <div class="card-price">${formatNum(price, 2)}</div>
            <div class="card-metrics">
                ${metricHtml('1W', chg1w)}
                ${metricHtml('1M', chg1m)}
                ${metricHtml('YTD', chgYtd)}
                ${metricHtml('1Y', chg1y)}
                ${metricHtml('52W高値比', pct52)}
            </div>
            <div class="ma-bar-container">
                ${maBarHtml('10MA', dist10)}
                ${maBarHtml('21EMA', dist21)}
                ${maBarHtml('50MA', dist50)}
            </div>
        `;
        container.appendChild(card);
    });
}

/**
 * Render breadth charts (AD Ratio + NH-NL).
 */
export function renderBreadthCharts(breadthData, breadthCanvas, nhNlCanvas) {
    // Destroy previous instances to prevent memory leak
    breadthChartInstance?.destroy();
    nhNlChartInstance?.destroy();
    breadthChartInstance = null;
    nhNlChartInstance = null;

    if (!breadthData || breadthData.length === 0) return;

    // Filter breadth data (rows from column L onward in Indices sheet)
    const dates = breadthData.map(r => r.Date_2 || r.Date).filter(Boolean);
    const adRatio25 = breadthData.map(r => r.AD_Ratio_25).filter((_, i) => dates[i]);
    const nh = breadthData.map(r => parseFloat(r.NewHigh || r.NH) || 0).filter((_, i) => dates[i]);
    const nl = breadthData.map(r => parseFloat(r.NewLow || r.NL) || 0).filter((_, i) => dates[i]);
    const filteredDates = dates.filter(Boolean);

    // Short date labels — handle various date formats + Google Sheets serial numbers
    const labels = filteredDates.map(d => formatDateLabel(d));
    // AD Ratio Chart
    if (breadthCanvas && adRatio25.length > 0) {
        const ctx = breadthCanvas.getContext('2d');
        breadthChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: '騰落レシオ(25日)',
                    data: adRatio25,
                    borderColor: '#0A84FF',
                    backgroundColor: 'rgba(10, 132, 255, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0,
                    pointHitRadius: 8,
                }]
            },
            options: chartOptions({
                annotations: [
                    { y: 120, color: 'rgba(255, 69, 58, 0.4)', label: '過熱 120' },
                    { y: 70, color: 'rgba(48, 209, 88, 0.4)', label: '底値圏 70' },
                ]
            }),
        });
    }

    // NH-NL Chart — Show NH and NL separately for clear situation reading
    if (nhNlCanvas && nh.length > 0) {
        const ctx = nhNlCanvas.getContext('2d');
        nhNlChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: '新高値',
                        data: nh,
                        backgroundColor: 'rgba(48, 209, 88, 0.7)',
                        borderRadius: 2,
                    },
                    {
                        label: '新安値',
                        data: nl.map(v => -v),
                        backgroundColor: 'rgba(255, 69, 58, 0.7)',
                        borderRadius: 2,
                    },
                ]
            },
            options: {
                ...chartOptions(),
                plugins: {
                    ...chartOptions().plugins,
                    legend: {
                        display: true,
                        labels: { color: '#8E8E93', font: { size: 11 }, boxWidth: 12, padding: 10 },
                    },
                },
                scales: {
                    ...chartOptions().scales,
                    x: { ...chartOptions().scales.x, stacked: true },
                    y: { ...chartOptions().scales.y, stacked: true },
                },
            },
        });
    }
}

// ── Helpers ──

/**
 * Convert various date formats to short M/D label.
 * Handles: YYYY-MM-DD, MM/DD/YYYY, Google Sheets serial numbers, Date objects
 */
function formatDateLabel(d) {
    if (!d) return '';
    const s = String(d).trim();

    // Google Sheets serial date number (e.g. 46067)
    if (/^\d{5}$/.test(s)) {
        const serial = parseInt(s);
        // Sheets epoch = 1899-12-30
        const date = new Date(Date.UTC(1899, 11, 30 + serial));
        return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
    }

    // YYYY-MM-DD
    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(s)) {
        const parts = s.split('-');
        return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
    }

    // MM/DD/YYYY or M/D/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(s)) {
        const parts = s.split('/');
        return `${parseInt(parts[0])}/${parseInt(parts[1])}`;
    }

    // Already short format (e.g. "2/18")
    if (/^\d{1,2}\/\d{1,2}$/.test(s)) return s;

    // Try parsing as Date
    const date = new Date(s);
    if (!isNaN(date.getTime())) {
        return `${date.getMonth() + 1}/${date.getDate()}`;
    }

    return s;
}


function formatNum(val, decimals = 2) {
    if (val === null || val === undefined || val === '') return '--';
    return Number(val).toLocaleString('ja-JP', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

function colorClass(val) {
    if (val === null || val === undefined || val === '') return 'neutral';
    return Number(val) >= 0 ? 'positive' : 'negative';
}

function metricHtml(label, value) {
    const cls = colorClass(value);
    const display = value !== null && value !== undefined && value !== ''
        ? (Number(value) >= 0 ? '+' : '') + Number(value).toFixed(2) + '%'
        : '--';
    return `
        <div class="metric">
            <span class="metric-label">${label}</span>
            <span class="metric-value ${cls}">${display}</span>
        </div>`;
}

function maBarHtml(label, value) {
    if (value === null || value === undefined || value === '') {
        return `<div class="ma-bar-row">
            <span class="ma-bar-label">${label}</span>
            <div class="ma-bar-track"><div class="ma-bar-center"></div></div>
            <span class="ma-bar-value neutral">--</span>
        </div>`;
    }
    const v = Number(value);
    const maxPct = 10; // ±10% scale
    const widthPct = Math.min(Math.abs(v) / maxPct * 50, 50);
    const cls = v >= 0 ? 'positive' : 'negative';
    const barCls = v >= 0 ? 'positive-bar' : 'negative-bar';

    return `<div class="ma-bar-row">
        <span class="ma-bar-label">${label}</span>
        <div class="ma-bar-track">
            <div class="ma-bar-center"></div>
            <div class="ma-bar-fill ${barCls}" style="width: ${widthPct}%"></div>
        </div>
        <span class="ma-bar-value ${cls}">${v >= 0 ? '+' : ''}${v.toFixed(2)}%</span>
    </div>`;
}

function chartOptions(extra = {}) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(26, 29, 39, 0.95)',
                titleFont: { family: "'Inter', 'Noto Sans JP', sans-serif", size: 12 },
                bodyFont: { family: "'IBM Plex Mono', monospace", size: 12 },
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                cornerRadius: 8,
                padding: 10,
            },
        },
        scales: {
            x: {
                grid: { color: 'rgba(255,255,255,0.04)' },
                ticks: { color: '#8E8E93', font: { size: 11, family: "'IBM Plex Mono', monospace" }, maxTicksLimit: 10 },
            },
            y: {
                grid: { color: 'rgba(255,255,255,0.04)' },
                ticks: { color: '#8E8E93', font: { size: 11, family: "'IBM Plex Mono', monospace" } },
            },
        },
    };
}
