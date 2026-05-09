import { useState } from 'react'

export default function StructurePivotLegend() {
  const [open, setOpen] = useState(false)

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs font-medium text-[var(--accent)] hover:underline"
      >
        {open ? '▼ 色凡例 / Color legend' : '▶ 色凡例 / Color legend'}
      </button>

      {open && (
        <div
          className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 rounded-xl border p-3 text-xs leading-snug"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border)',
          }}
        >
          <div>
            <p className="mb-1.5 font-semibold text-[var(--text-primary)]">
              Quality Tier
            </p>
            <ul className="space-y-1 text-[var(--text-secondary)]">
              <li>
                <span
                  className="inline-block px-1.5 rounded mr-1 font-mono font-semibold"
                  style={{
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    border: '1px solid #fcd34d',
                  }}
                >
                  ⭐ S
                </span>
                cockpit_rs 80–90 + mc_v4 70–85（推定 winrate ~76%）
              </li>
              <li>
                <span
                  className="inline-block px-1.5 rounded mr-1 font-mono font-semibold"
                  style={{
                    backgroundColor: '#e5e7eb',
                    color: '#374151',
                    border: '1px solid #9ca3af',
                  }}
                >
                  🅰️ A
                </span>
                cockpit_rs 60–90 + mc_v4 55–85（推定 winrate ~52–55%）
              </li>
              <li>
                <span
                  className="inline-block px-1.5 rounded mr-1 font-mono font-semibold"
                  style={{
                    backgroundColor: '#f9fafb',
                    color: '#6b7280',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  ⚪ B
                </span>
                上記以外（推定 winrate ~40%）
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-1.5 font-semibold text-[var(--text-primary)]">
              Signal Type
            </p>
            <ul className="space-y-1 text-[var(--text-secondary)]">
              <li>
                <span
                  className="inline-block px-1.5 rounded mr-1 font-mono font-semibold"
                  style={{
                    backgroundColor: '#dbeafe',
                    color: '#1e40af',
                    border: '1px solid #93c5fd',
                  }}
                >
                  🔵 HL_BREAK
                </span>
                当日 close が pivot_price をクロスオーバー
              </li>
              <li>
                <span
                  className="inline-block px-1.5 rounded mr-1 font-mono font-semibold"
                  style={{
                    backgroundColor: '#fef9c3',
                    color: '#854d0e',
                    border: '1px solid #fde68a',
                  }}
                >
                  🟡 SETUP_LONG
                </span>
                HL setup 中、break 待ち
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-1.5 font-semibold text-[var(--text-primary)]">
              VCP Status
            </p>
            <ul className="space-y-1 text-[var(--text-secondary)]">
              <li>
                <span
                  className="inline-block px-1.5 rounded mr-1 font-mono font-semibold"
                  style={{
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                    border: '1px solid #86efac',
                  }}
                >
                  🟢 1–21d
                </span>
                高 edge ゾーン（+8–13pp edge）
              </li>
              <li>
                <span
                  className="inline-block px-1.5 rounded mr-1 font-mono font-semibold"
                  style={{
                    backgroundColor: '#fef9c3',
                    color: '#854d0e',
                    border: '1px solid #fde68a',
                  }}
                >
                  🟡 22–63d
                </span>
                ウォーム
              </li>
              <li>
                <span className="inline-block px-1.5 rounded mr-1 font-mono text-gray-400">
                  --
                </span>
                未ヒット（screen / watchlist 経由で表示）
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
