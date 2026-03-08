'use client'

import { useState, useRef } from 'react'

type Props = {
  content: string
  children: React.ReactNode
}

export default function Tooltip({ content, children }: Props) {
  const [visible, setVisible] = useState(false)
  const [isBelow, setIsBelow] = useState(false)
  const [isRight, setIsRight] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  function handleMouseEnter() {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      // Tooltip body is ~224px wide (w-56) and ~80px tall (approx)
      setIsRight(rect.right > window.innerWidth - 220)
      setIsBelow(rect.top < 96)
    }
    setVisible(true)
  }

  // Build dynamic position style
  const tooltipStyle: React.CSSProperties = {}
  if (isBelow) {
    tooltipStyle.top = 'calc(100% + 8px)'
  } else {
    tooltipStyle.bottom = 'calc(100% + 8px)'
  }
  if (isRight) {
    tooltipStyle.right = 0
  } else {
    tooltipStyle.left = '50%'
    tooltipStyle.transform = 'translateX(-50%)'
  }

  return (
    <div
      ref={ref}
      className="relative inline-flex items-center gap-1"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {/* ? icon */}
      <span className="w-3.5 h-3.5 rounded-full bg-gray-200 text-gray-500 text-[10px] flex items-center justify-center cursor-help select-none flex-shrink-0">
        ?
      </span>
      {/* Tooltip body — position calculated from viewport on hover */}
      {visible && (
        <div
          className="absolute z-50 bg-gray-900 text-white text-xs rounded-lg py-2 px-3 w-56 shadow-lg pointer-events-none normal-case font-normal tracking-normal leading-snug"
          style={tooltipStyle}
        >
          {content}
          {/* Directional arrow */}
          {isBelow ? (
            /* Trigger is near top → tooltip shows below → arrow points up */
            <div className={`absolute bottom-full border-4 border-transparent border-b-gray-900 ${isRight ? 'right-3' : 'left-1/2 -translate-x-1/2'}`} />
          ) : (
            /* Default → tooltip shows above → arrow points down */
            <div className={`absolute top-full border-4 border-transparent border-t-gray-900 ${isRight ? 'right-3' : 'left-1/2 -translate-x-1/2'}`} />
          )}
        </div>
      )}
    </div>
  )
}
