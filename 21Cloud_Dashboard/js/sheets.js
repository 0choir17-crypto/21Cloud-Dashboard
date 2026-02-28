// ============================================================
// sheets.js — Google Sheets CSV Fetcher & Parser
// ============================================================

import { SHEET_GIDS } from './config.js';

const SPREADSHEET_ID = '1AMkEdiX0FOh-wWy3a2kdS-cLk4YClChepyAeGCUfWEY';

function buildCsvUrl(sheetName) {
    const gid = SHEET_GIDS[sheetName];
    if (gid === undefined) throw new Error(`Unknown sheet: ${sheetName}`);
    return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
}

/**
 * Parse CSV text into array of objects using headers from first row.
 * Handles quoted fields with commas and newlines.
 */
function parseCsv(text) {
    // Strip BOM if present
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

    const lines = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '"') {
            if (inQuotes && text[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
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

    if (lines.length === 0) return [];

    const splitRow = (line) => {
        const fields = [];
        let field = '';
        let q = false;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"') {
                if (q && line[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    q = !q;
                }
            } else if (c === ',' && !q) {
                fields.push(field);
                field = '';
            } else {
                field += c;
            }
        }
        fields.push(field);
        return fields;
    };

    const headers = splitRow(lines[0]);
    // Handle duplicate column names by appending _2, _3, etc.
    const headerCounts = {};
    const uniqueHeaders = headers.map(h => {
        const key = h.trim();
        if (!headerCounts[key]) {
            headerCounts[key] = 1;
            return key;
        }
        headerCounts[key]++;
        return `${key}_${headerCounts[key]}`;
    });
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        const values = splitRow(lines[i]);
        if (values.every(v => v.trim() === '')) continue;
        const obj = {};
        uniqueHeaders.forEach((h, idx) => {
            const v = values[idx] || '';
            const trimmed = v.trim();
            if (trimmed === '') {
                obj[h.trim()] = null;
            } else if (/^\d{4}-\d{1,2}-\d{1,2}/.test(trimmed) || /^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed)) {
                // Preserve date-like strings (YYYY-MM-DD or M/D/YYYY)
                obj[h.trim()] = trimmed;
            } else if (/^\d{5}$/.test(trimmed) && /date/i.test(h)) {
                // Preserve 5-digit date serial numbers in Date columns as strings
                obj[h.trim()] = trimmed;
            } else {
                const num = Number(trimmed);
                obj[h.trim()] = !isNaN(num) ? num : trimmed;
            }
        });
        result.push(obj);
    }

    return result;
}

/**
 * Fetch and parse a sheet.
 */
export async function fetchSheet(sheetName) {
    const url = buildCsvUrl(sheetName);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to fetch ${sheetName}: ${resp.status}`);
    const text = await resp.text();

    // HTML が返った場合（認証切れ・非公開シート）
    if (text.trimStart().startsWith('<')) {
        throw new Error(`${sheetName}: CSVではなくHTMLが返されました。シートの共有設定を確認してください`);
    }
    if (text.trim().length === 0) {
        console.warn(`${sheetName}: 空のレスポンス`);
        return [];
    }
    return parseCsv(text);
}

/**
 * Fetch multiple sheets in parallel.
 */
export async function fetchSheets(sheetNames) {
    const results = {};
    const promises = sheetNames.map(async (name) => {
        try {
            results[name] = await fetchSheet(name);
        } catch (e) {
            console.error(`Error fetching ${name}:`, e);
            results[name] = [];
        }
    });
    await Promise.all(promises);
    return results;
}

/**
 * Fetch raw CSV text (no parsing). For sheets with non-standard structure.
 */
export async function fetchSheetRaw(sheetName) {
    const url = buildCsvUrl(sheetName);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to fetch ${sheetName}: ${resp.status}`);
    let text = await resp.text();
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

    if (text.trimStart().startsWith('<')) {
        throw new Error(`${sheetName}: CSVではなくHTMLが返されました。シートの共有設定を確認してください`);
    }
    return text;
}

export { SHEET_GIDS };
