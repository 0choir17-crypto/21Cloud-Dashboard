// ============================================================
// app.js — Dashboard App Entry Point
// ============================================================

import { fetchSheets } from './sheets.js';
import { renderIndexCards, renderBreadthCharts } from './market.js';
import { renderSectorHeatmap } from './sector.js';
import { initScreener } from './screener.js';
import { calcExposure, renderExposureGauge, extractBreadth } from './exposure.js';

// ── State ──
let isLoading = false;
let liveScreenData = null;
let historyRows = [];

// ── DOM Refs ──
const sidebar = document.getElementById('sidebar');
const hamburger = document.getElementById('hamburger');
const mobileRefresh = document.getElementById('mobileRefresh');
const refreshBtn = document.getElementById('refreshBtn');
const loadingEl = document.getElementById('loadingOverlay');
const lastUpdated = document.getElementById('lastUpdated');

// ── Navigation ──
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const viewId = item.dataset.view;
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        views.forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${viewId}`)?.classList.add('active');
        // Close mobile sidebar
        sidebar.classList.remove('open');
        backdrop?.classList.remove('show');
    });
});

// ── Mobile menu ──
let backdrop = document.querySelector('.sidebar-backdrop');
if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
}

hamburger?.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    backdrop.classList.toggle('show');
});

backdrop.addEventListener('click', () => {
    sidebar.classList.remove('open');
    backdrop.classList.remove('show');
});

// ── Sidebar Collapse/Expand ──
const sidebarToggle = document.getElementById('sidebarToggle');
sidebarToggle?.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    document.body.classList.toggle('sidebar-collapsed');
});

// ── Date Display (updated from sheet data in loadData) ──
const viewDate = document.getElementById('viewDate');

// ── Refresh ──
refreshBtn?.addEventListener('click', loadData);
mobileRefresh?.addEventListener('click', loadData);

// ── Date Picker (historical screener data) ──
const dateSelect = document.getElementById('dateSelect');
dateSelect?.addEventListener('change', () => {
    const val = dateSelect.value;
    const summaryEl = document.getElementById('screenSummary');
    let data;
    if (val === 'today') {
        data = liveScreenData;
    } else {
        // Split history rows by Screen column for the selected date
        data = {};
        historyRows.forEach(row => {
            if (row.Date !== val) return;
            const screen = row.Screen;
            if (!screen) return;
            if (!data[screen]) data[screen] = [];
            data[screen].push(row);
        });
        // Check if any screener data exists for this date
        if (Object.keys(data).length === 0) {
            summaryEl.textContent = `${val}: スクリーナーデータなし`;
            summaryEl.style.color = 'var(--red)';
            return;
        }
    }
    if (summaryEl) summaryEl.style.color = '';
    if (!data) return;
    initScreener(
        data,
        document.getElementById('screenTabs'),
        summaryEl,
        document.getElementById('screenerTable'),
        document.getElementById('screenerSearch'),
        document.getElementById('screenerSort'),
    );
});

// ── Load Data ──
async function loadData() {
    if (isLoading) return;
    isLoading = true;

    loadingEl?.classList.remove('hidden');
    refreshBtn?.classList.add('loading');

    try {
        // Fetch all sheets in parallel
        const data = await fetchSheets([
            'Indices', 'Sectors', 'SectorHistory',
            'St_Momentum', 'St_21EMA', 'St_Movers', 'St_Pivot',
            'St_Surprise', 'St_EREvent', 'St_Quiet',
            'St_SectorAlpha', 'St_Earnings',
            'St_History',
        ]);

        // ── Indices sheet has two data sections ──
        const indicesRaw = data.Indices || [];

        const scorecard = indicesRaw.filter(r => r.Name && r.Price);
        // Breadth data: rows where scorecard fields (Name/Price) are empty but breadth fields exist
        const breadthData = indicesRaw.filter(r => {
            return !r.Name && (r.Advances != null || r.Declines != null);
        });

        // ── Normalize Sectors: handle empty first-column header ──
        const rawSectors = data.Sectors || [];
        rawSectors.forEach(row => {
            if (!row.Sector && row[''] !== undefined) {
                row.Sector = row[''];
            }
        });

        // ── Update date display from sheet data ──
        if (viewDate) {
            const latestDate = breadthData.map(r => r.Date_2 || r.Date).filter(Boolean).pop();
            if (latestDate) {
                viewDate.textContent = latestDate;
            }
        }

        // ── Market View ──
        try {
            renderIndexCards(scorecard, document.getElementById('indexCards'));
            renderBreadthCharts(
                breadthData,
                document.getElementById('breadthChart'),
                document.getElementById('nhNlChart'),
            );

            // Exposure Score — needs indices + breadth + sectors
            const sectors = rawSectors;
            const breadthSummary = extractBreadth(indicesRaw);
            const exposure = calcExposure(scorecard, breadthSummary, sectors);
            renderExposureGauge(exposure, document.getElementById('exposureContainer'));
        } catch (e) {
            console.error('Market view error:', e);
        }

        // ── Sector View ──
        try {
            const sectorHistory = data.SectorHistory || [];
            renderSectorHeatmap(rawSectors, document.getElementById('sectorHeatmap'), sectorHistory);
        } catch (e) {
            console.error('Sector view error:', e);
        }

        // ── Screener View ──
        try {
            // Build live screen data (exclude St_History)
            const screenData = {};
            for (const key of Object.keys(data)) {
                if (key.startsWith('St_') && key !== 'St_History') {
                    screenData[key] = data[key];
                }
            }
            liveScreenData = screenData;
            historyRows = data.St_History || [];

            // Populate date picker — merge dates from St_History + SectorHistory
            const dateSelect = document.getElementById('dateSelect');
            if (dateSelect) {
                const sectorHistoryRows = data.SectorHistory || [];
                const allDates = new Set([
                    ...historyRows.map(r => r.Date).filter(Boolean),
                    ...sectorHistoryRows.map(r => r.Date).filter(Boolean),
                ]);
                const dates = [...allDates].sort().reverse();
                dateSelect.innerHTML = '<option value="today">Today</option>';
                dates.forEach(d => {
                    const opt = document.createElement('option');
                    opt.value = d;
                    opt.textContent = d;
                    dateSelect.appendChild(opt);
                });
            }

            initScreener(
                screenData,
                document.getElementById('screenTabs'),
                document.getElementById('screenSummary'),
                document.getElementById('screenerTable'),
                document.getElementById('screenerSearch'),
                document.getElementById('screenerSort'),
            );
        } catch (e) {
            console.error('Screener view error:', e);
        }

        // Update timestamp
        const now = new Date();
        lastUpdated.textContent = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')} 更新`;

    } catch (err) {
        console.error('Data load error:', err);
        const mainContent = document.getElementById('mainContent');
        const errorBanner = document.createElement('div');
        errorBanner.className = 'error-banner';
        errorBanner.textContent = `データ取得エラー: ${err.message}. スプレッドシートの共有設定を確認してください。`;
        mainContent.prepend(errorBanner);
        setTimeout(() => errorBanner.remove(), 10000);
    } finally {
        isLoading = false;
        loadingEl?.classList.add('hidden');
        refreshBtn?.classList.remove('loading');
    }
}

// ── Init ──
loadData();
