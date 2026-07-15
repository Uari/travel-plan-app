// 여행 로그용 국가 목록.
// 여행이 불가능한 국가(북한 등)는 제외하고, 방문 빈도가 높은 국가 위주로 우선 구성한다.
// hasDetailMap: 국가 상세지도(드릴다운) 지원 여부. 현재는 대한민국만 true.
// 세계지도 다트 좌표(cx/cy)는 세계지도 자산이 생기는 3차에서 추가한다.
export const SUPPORTED_COUNTRIES = [
  { code: 'KR', name: '대한민국', emoji: '🇰🇷', hasDetailMap: true },
  { code: 'JP', name: '일본', emoji: '🇯🇵', hasDetailMap: false },
  { code: 'CN', name: '중국', emoji: '🇨🇳', hasDetailMap: false },
  { code: 'TW', name: '대만', emoji: '🇹🇼', hasDetailMap: false },
  { code: 'HK', name: '홍콩', emoji: '🇭🇰', hasDetailMap: false },
  { code: 'TH', name: '태국', emoji: '🇹🇭', hasDetailMap: false },
  { code: 'VN', name: '베트남', emoji: '🇻🇳', hasDetailMap: false },
  { code: 'PH', name: '필리핀', emoji: '🇵🇭', hasDetailMap: false },
  { code: 'SG', name: '싱가포르', emoji: '🇸🇬', hasDetailMap: false },
  { code: 'MY', name: '말레이시아', emoji: '🇲🇾', hasDetailMap: false },
  { code: 'ID', name: '인도네시아', emoji: '🇮🇩', hasDetailMap: false },
  { code: 'US', name: '미국', emoji: '🇺🇸', hasDetailMap: false },
  { code: 'GU', name: '괌', emoji: '🇬🇺', hasDetailMap: false },
  { code: 'AU', name: '호주', emoji: '🇦🇺', hasDetailMap: false },
  { code: 'FR', name: '프랑스', emoji: '🇫🇷', hasDetailMap: false },
  { code: 'IT', name: '이탈리아', emoji: '🇮🇹', hasDetailMap: false },
  { code: 'ES', name: '스페인', emoji: '🇪🇸', hasDetailMap: false },
  { code: 'GB', name: '영국', emoji: '🇬🇧', hasDetailMap: false },
  { code: 'DE', name: '독일', emoji: '🇩🇪', hasDetailMap: false },
  { code: 'CH', name: '스위스', emoji: '🇨🇭', hasDetailMap: false },
  { code: 'TR', name: '튀르키예', emoji: '🇹🇷', hasDetailMap: false },
  { code: 'AE', name: '아랍에미리트', emoji: '🇦🇪', hasDetailMap: false },
  { code: 'ETC', name: '기타', emoji: '🌍', hasDetailMap: false },
]

export function getCountry(code) {
  return SUPPORTED_COUNTRIES.find((c) => c.code === code) || null
}

// 대한민국 상세지도(KoreaMapSVG)의 도(道) 목록.
// 다트는 도 단위로만 배치 가능하므로, 완료 모달의 지역 선택은 도를 기준으로 한다.
// KOREA_REGIONS에 없는 도(대전/세종/대구/광주 등)도 여기 포함해 어떤 국내 여행도 기록할 수 있게 한다.
export const KOREA_PROVINCES = [
  '서울', '인천', '경기', '강원', '충북', '충남', '대전', '세종',
  '전북', '전남', '광주', '경북', '대구', '경남', '울산', '부산', '제주',
]
