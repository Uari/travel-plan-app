import { searchPlaces } from './placeSearch.js'

// 장소명 텍스트 → { lat, lng }. 실패 시 null.
// 검색(Kakao 우선 → Nominatim 폴백)의 첫 결과 좌표를 사용한다.
// 일정 저장 시, 검색으로 장소를 고르지 않고 직접 타이핑만 한 경우의 폴백용.
export async function geocode(query) {
  const q = (query || '').trim()
  if (!q) return null
  const results = await searchPlaces(q)
  if (results && results.length > 0) {
    return { lat: results[0].lat, lng: results[0].lng }
  }
  return null
}
