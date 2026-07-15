import { motion } from 'framer-motion'
import MAP from '../data/world-map-paths.json'

/**
 * 세계지도 위에 여행 다녀온 국가 다트를 표시한다.
 * - visited: { [countryCode]: count } 형태 (완료 여행 수)
 * - onSelectCountry(code): 국가 다트 클릭 콜백
 * 사전 계산된 정적 path(world-map-paths.json)를 즉시 렌더링한다.
 */
export default function WorldMapSVG({ visited = {}, onSelectCountry }) {
  const entries = Object.entries(visited).filter(([code]) => MAP.centroids[code])

  return (
    <svg
      viewBox={`0 0 ${MAP.width} ${MAP.height}`}
      className="world-map-svg"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="세계지도 여행 로그"
    >
      {/* 국가 배경 */}
      <g>
        {MAP.countries.map((c, i) => (
          <path key={i} d={c.path} className="wm-country" />
        ))}
      </g>

      {/* 다녀온 국가 다트 */}
      {entries.map(([code, count], idx) => {
        const { cx, cy } = MAP.centroids[code]
        return (
          <g
            key={code}
            className="wm-dart"
            onClick={() => onSelectCountry && onSelectCountry(code)}
            role="button"
            aria-label={`${code} 여행 로그 보기`}
          >
            {/* 넓은 히트 영역 (모바일 탭) */}
            <circle cx={cx} cy={cy} r="16" fill="transparent" />
            {/* 펄스 링 */}
            <motion.circle
              cx={cx}
              cy={cy}
              r="6"
              fill="none"
              stroke="var(--accent-primary, #6366f1)"
              strokeWidth="1.5"
              initial={{ r: 6, opacity: 0.9 }}
              animate={{ r: 16, opacity: 0 }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut', delay: idx * 0.15 }}
            />
            <circle cx={cx} cy={cy} r="6.5" fill="#4f46e5" />
            <circle cx={cx} cy={cy} r="2.5" fill="#fff" />
            {count > 1 && (
              <>
                <circle cx={cx + 6} cy={cy - 6} r="5.5" fill="var(--accent-rose, #f43f5e)" />
                <text x={cx + 6} y={cy - 6 + 2.6} fontSize="6.5" fontWeight="800" fill="#fff" textAnchor="middle">
                  {count > 9 ? '9+' : count}
                </text>
              </>
            )}
          </g>
        )
      })}
    </svg>
  )
}
