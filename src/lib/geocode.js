// OSM Nominatim 지오코딩 (무료, API 키 불필요)
// 장소명 텍스트 → { lat, lng }. 실패 시 null.
// 주의: Nominatim 사용 정책상 과도한 호출 금지(초당 1회 권장). 일정 저장/지도 열람 시에만 호출한다.
export async function geocode(query) {
  const q = (query || '').trim()
  if (!q) return null
  try {
    const url =
      'https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=0&q=' +
      encodeURIComponent(q)
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null
    const lat = parseFloat(data[0].lat)
    const lng = parseFloat(data[0].lon)
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null
    return { lat, lng }
  } catch {
    return null
  }
}
