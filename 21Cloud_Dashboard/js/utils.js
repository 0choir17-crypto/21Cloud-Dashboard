// ============================================================
// utils.js — Shared Utilities
// ============================================================

/**
 * Escape HTML special characters to prevent XSS.
 * Safe to use with innerHTML template literals for external data.
 */
export function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
