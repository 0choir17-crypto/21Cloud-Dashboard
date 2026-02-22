// ============================================================
// sheets.js — Google Sheets CSV Fetcher & Parser
// ============================================================

const SPREADSHEET_ID = '1AMkEdiX0FOh-wWy3a2kdS-cLk4YClChepyAeGCUfWEY';

const SHEET_GIDS = {
    Portfolio: 988929103,
    Indices: 593468503,
    Sectors: 1299334424,
    St_Momentum: 361464786,
    St_21EMA: 901482065,
    St_Movers: 2084933405,
    St_Pivot: 478643393,
    St_Surprise: 1651981051,
    St_EREvent: 1724174728,
    St_Quiet: 1809768446,
    St_SectorAlpha: 1512618812,
    St_Earnings: 1901445788,
    St_History: 1745377223,
    SectorHistory: 519198713,
};

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
            } else {
                const num = parseFloat(trimmed);
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

export { SHEET_GIDS };
