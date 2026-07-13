// 랜덤 여행지 다트 게임용 한국 시/군 단위 지역 데이터
// 각 지역에 대표 음식/명소 키워드 포함

export const KOREA_REGIONS = [
  // 서울/수도권
  { id: 'seoul-bukchon', name: '서울 북촌', province: '서울', keywords: ['한옥마을', '경복궁', '광장시장 빈대떡'], emoji: '🏯' },
  { id: 'incheon-ganghwa', name: '인천 강화도', province: '인천', keywords: ['고려궁지', '강화 순무', '마니산 참성단'], emoji: '🌿' },

  // 강원도
  { id: 'gangwon-gangneung', name: '강원 강릉', province: '강원', keywords: ['안목해변 카페거리', '초당순두부', '경포해수욕장'], emoji: '☕' },
  { id: 'gangwon-yangyang', name: '강원 양양', province: '강원', keywords: ['서피비치', '하조대', '연어', '낙산사'], emoji: '🏄' },
  { id: 'gangwon-sokcho', name: '강원 속초', province: '강원', keywords: ['설악산', '아바이순대', '청초호', '속초해수욕장'], emoji: '🏔️' },
  { id: 'gangwon-pyeongchang', name: '강원 평창', province: '강원', keywords: ['대관령', '이효석문화마을', '메밀꽃', '오대산'], emoji: '🌸' },
  { id: 'gangwon-chuncheon', name: '강원 춘천', province: '강원', keywords: ['닭갈비', '막국수', '남이섬', '소양강'], emoji: '🍗' },
  { id: 'gangwon-jeongseon', name: '강원 정선', province: '강원', keywords: ['아우라지', '곤드레밥', '하이원리조트', '화암동굴'], emoji: '🚠' },

  // 충청도
  { id: 'chungnam-taean', name: '충남 태안', province: '충남', keywords: ['꽃지해수욕장', '안면도', '꽃 축제', '바지락죽'], emoji: '🌺' },
  { id: 'chungnam-gongju', name: '충남 공주', province: '충남', keywords: ['백제문화', '무령왕릉', '공주 밤', '마곡사'], emoji: '🏛️' },
  { id: 'chungnam-boryeong', name: '충남 보령', province: '충남', keywords: ['머드축제', '대천해수욕장', '꽃게'], emoji: '🦀' },
  { id: 'chungbuk-danyang', name: '충북 단양', province: '충북', keywords: ['도담삼봉', '마늘떡갈비', '단양8경', '만천하스카이워크'], emoji: '🛶' },

  // 전라도
  { id: 'jeonbuk-jeonju', name: '전북 전주', province: '전북', keywords: ['전주한옥마을', '비빔밥', '초코파이', '콩나물국밥'], emoji: '🍚' },
  { id: 'jeonnam-yeosu', name: '전남 여수', province: '전남', keywords: ['밤바다', '게장', '돌산갓김치', '엑스포해양공원'], emoji: '🌊' },
  { id: 'jeonnam-suncheon', name: '전남 순천', province: '전남', keywords: ['순천만습지', '순천만정원', '낙안읍성'], emoji: '🦢' },
  { id: 'jeonnam-damyang', name: '전남 담양', province: '전남', keywords: ['대나무숲', '떡갈비', '죽녹원', '소쇄원'], emoji: '🎋' },
  { id: 'jeonnam-wando', name: '전남 완도', province: '전남', keywords: ['청산도', '전복', '다도해', '명사십리해수욕장'], emoji: '🐚' },

  // 경상도
  { id: 'gyeongbuk-gyeongju', name: '경북 경주', province: '경북', keywords: ['불국사', '황남빵', '첨성대', '석굴암'], emoji: '🏛️' },
  { id: 'gyeongbuk-andong', name: '경북 안동', province: '경북', keywords: ['하회마을', '안동찜닭', '안동소주', '월영교'], emoji: '🎭' },
  { id: 'gyeongnam-tongyeong', name: '경남 통영', province: '경남', keywords: ['한려수도', '꿀빵', '충무김밥', '케이블카'], emoji: '⛵' },
  { id: 'gyeongnam-hadong', name: '경남 하동', province: '경남', keywords: ['재첩국', '섬진강', '쌍계사', '녹차밭'], emoji: '🍵' },
  { id: 'busan-haeundae', name: '부산 해운대', province: '부산', keywords: ['해운대해수욕장', '밀면', '돼지국밥', '광안리'], emoji: '🌅' },

  // 제주
  { id: 'jeju-jeju', name: '제주시', province: '제주', keywords: ['한라산', '흑돼지', '성산일출봉', '용두암'], emoji: '🌋' },
  { id: 'jeju-seogwipo', name: '제주 서귀포', province: '제주', keywords: ['올레길', '감귤', '천지연폭포', '중문해수욕장'], emoji: '🍊' },
]

export const PROVINCE_LIST = [...new Set(KOREA_REGIONS.map(r => r.province))]
