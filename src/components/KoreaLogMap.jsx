import { motion } from 'framer-motion'
import MAP_PATHS from '../data/korea-map-paths.json'

// 여행 로그용 대한민국 상세지도 (레벨 2). 홈의 KoreaMapSVG(다트 게임)와 분리된 전용 컴포넌트.
// 도(道)별로 다트를 찍고, 여러 번 갔으면 횟수 뱃지를 표시한다.
// - visited: { [도 단축명]: count }  예: { '부산': 2, '강원': 1 }
// - onSelectProvince(prov): 도 다트 클릭 콜백

// korea-map-paths.json의 영문 도 이름 → 한글 단축명
const EN_TO_KR = {
  Seoul: '서울', Incheon: '인천', 'Gyeonggi-do': '경기', 'Gangwon-do': '강원',
  'Chungcheongbuk-do': '충북', 'Chungcheongnam-do': '충남', Daejeon: '대전',
  'Jeollabuk-do': '전북', 'Jeollanam-do': '전남', Gwangju: '광주',
  'Gyeongsangbuk-do': '경북', Daegu: '대구', 'Gyeongsangnam-do': '경남',
  Ulsan: '울산', Busan: '부산', Jeju: '제주',
}

// 도 단축명 → 중심좌표
const CENTROID_BY_PROVINCE = {}
MAP_PATHS.forEach((p) => {
  const kr = EN_TO_KR[p.name]
  if (kr) CENTROID_BY_PROVINCE[kr] = { cx: p.cx, cy: p.cy }
})

const W = 340
const H = 420

export default function KoreaLogMap({ visited = {}, onSelectProvince }) {
  const entries = Object.entries(visited).filter(([prov]) => CENTROID_BY_PROVINCE[prov])

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="world-map-svg"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="대한민국 여행 로그 지도"
    >
      {/* 도 배경 */}
      <g>
        {MAP_PATHS.map((p, i) => (
          <path key={i} d={p.path} className="wm-country" />
        ))}
      </g>

      {/* 다녀온 도 다트 */}
      {entries.map(([prov, count], idx) => {
        const { cx, cy } = CENTROID_BY_PROVINCE[prov]
        return (
          <g
            key={prov}
            className="wm-dart"
            onClick={() => onSelectProvince && onSelectProvince(prov)}
            role="button"
            aria-label={`${prov} 여행 로그 보기`}
          >
            <circle cx={cx} cy={cy} r="16" fill="transparent" />
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
            <text x={cx} y={cy - 12} fontSize="9" textAnchor="middle" style={{ pointerEvents: 'none' }}>🎯</text>
            {count > 1 && (
              <>
                <circle cx={cx + 7} cy={cy - 7} r="6" fill="var(--accent-rose, #f43f5e)" />
                <text x={cx + 7} y={cy - 7 + 2.8} fontSize="7" fontWeight="800" fill="#fff" textAnchor="middle">
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
