// 랜덤 여행지 다트 게임용 한국 시/군 단위 지역 데이터
// 각 지역에 대표 음식/명소 키워드 포함

export const KOREA_REGIONS = [
  // 서울/수도권
  { id: 'seoul-bukchon', name: '서울 북촌', province: '서울', keywords: ['한옥마을', '경복궁', '광장시장 빈대떡'], emoji: '🏯' },
  { id: 'seoul-hongdae', name: '서울 홍대', province: '서울', keywords: ['연트럴파크', '버스킹', '합정 카페거리'], emoji: '🎸' },
  { id: 'seoul-jamsil', name: '서울 잠실', province: '서울', keywords: ['석촌호수', '롯데월드', '송리단길'], emoji: '🎠' },
  { id: 'incheon-ganghwa', name: '인천 강화도', province: '인천', keywords: ['고려궁지', '강화 순무', '마니산 참성단'], emoji: '🌿' },
  { id: 'incheon-yeongjong', name: '인천 영종도', province: '인천', keywords: ['을왕리', '마시안해변', '조개구이'], emoji: '🐚' },
  { id: 'gyeonggi-gapyeong', name: '경기 가평', province: '경기', keywords: ['남이섬', '아침고요수목원', '풀빌라'], emoji: '🌲' },
  { id: 'gyeonggi-suwon', name: '경기 수원', province: '경기', keywords: ['화성행궁', '왕갈비', '행리단길'], emoji: '🏰' },
  { id: 'gyeonggi-paju', name: '경기 파주', province: '경기', keywords: ['헤이리마을', '마장호수', '출판단지'], emoji: '📚' },
  { id: 'gyeonggi-yongin', name: '경기 용인', province: '경기', keywords: ['에버랜드', '민속촌', '백남준아트센터'], emoji: '🎢' },
  { id: 'gyeonggi-yangpyeong', name: '경기 양평', province: '경기', keywords: ['두물머리', '연핫도그', '세미원'], emoji: '🌭' },

  // 강원도
  { id: 'gangwon-gangneung', name: '강원 강릉', province: '강원', keywords: ['안목해변 카페거리', '초당순두부', '경포해수욕장'], emoji: '☕' },
  { id: 'gangwon-yangyang', name: '강원 양양', province: '강원', keywords: ['서피비치', '하조대', '연어', '낙산사'], emoji: '🏄' },
  { id: 'gangwon-sokcho', name: '강원 속초', province: '강원', keywords: ['설악산', '아바이순대', '청초호', '속초해수욕장'], emoji: '🏔️' },
  { id: 'gangwon-pyeongchang', name: '강원 평창', province: '강원', keywords: ['대관령', '이효석문화마을', '메밀꽃', '오대산'], emoji: '🌸' },
  { id: 'gangwon-chuncheon', name: '강원 춘천', province: '강원', keywords: ['닭갈비', '막국수', '소양강'], emoji: '🍗' },
  { id: 'gangwon-jeongseon', name: '강원 정선', province: '강원', keywords: ['아우라지', '곤드레밥', '하이원리조트', '화암동굴'], emoji: '🚠' },
  { id: 'gangwon-yeongwol', name: '강원 영월', province: '강원', keywords: ['한반도지형', '별마로천문대', '동강 래프팅'], emoji: '🛶' },
  { id: 'gangwon-donghae', name: '강원 동해', province: '강원', keywords: ['망상해수욕장', '무릉계곡', '추암촛대바위'], emoji: '🌅' },
  { id: 'gangwon-samcheok', name: '강원 삼척', province: '강원', keywords: ['환선굴', '해상케이블카', '장호항'], emoji: '🚠' },

  // 충청도
  { id: 'chungnam-taean', name: '충남 태안', province: '충남', keywords: ['꽃지해수욕장', '안면도', '꽃 축제', '바지락죽'], emoji: '🌺' },
  { id: 'chungnam-gongju', name: '충남 공주', province: '충남', keywords: ['백제문화', '무령왕릉', '공주 밤', '마곡사'], emoji: '🏛️' },
  { id: 'chungnam-boryeong', name: '충남 보령', province: '충남', keywords: ['머드축제', '대천해수욕장', '꽃게'], emoji: '🦀' },
  { id: 'chungnam-buyeo', name: '충남 부여', province: '충남', keywords: ['부소산성', '궁남지', '연잎밥'], emoji: '🪷' },
  { id: 'chungbuk-danyang', name: '충북 단양', province: '충북', keywords: ['도담삼봉', '마늘떡갈비', '단양8경', '만천하스카이워크'], emoji: '🧄' },
  { id: 'chungbuk-jecheon', name: '충북 제천', province: '충북', keywords: ['청풍호', '의림지', '빨간오뎅'], emoji: '🍢' },
  { id: 'chungbuk-cheongju', name: '충북 청주', province: '충북', keywords: ['수암골', '청남대', '상당산성'], emoji: '🎨' },

  // 전라도
  { id: 'jeonbuk-jeonju', name: '전북 전주', province: '전북', keywords: ['전주한옥마을', '비빔밥', '초코파이', '콩나물국밥'], emoji: '🍚' },
  { id: 'jeonbuk-gunsan', name: '전북 군산', province: '전북', keywords: ['이성당', '초원사진관', '경암동 철길마을'], emoji: '🍞' },
  { id: 'jeonbuk-namwon', name: '전북 남원', province: '전북', keywords: ['광한루원', '추어탕', '지리산'], emoji: '🎋' },
  { id: 'jeonbuk-gochang', name: '전북 고창', province: '전북', keywords: ['고인돌', '선운사', '풍천장어'], emoji: '🐟' },
  { id: 'jeonnam-yeosu', name: '전남 여수', province: '전남', keywords: ['밤바다', '게장', '돌산갓김치', '엑스포해양공원'], emoji: '🌉' },
  { id: 'jeonnam-suncheon', name: '전남 순천', province: '전남', keywords: ['순천만습지', '순천만국가정원', '낙안읍성'], emoji: '🦢' },
  { id: 'jeonnam-damyang', name: '전남 담양', province: '전남', keywords: ['대나무숲', '떡갈비', '죽녹원', '소쇄원'], emoji: '🎋' },
  { id: 'jeonnam-wando', name: '전남 완도', province: '전남', keywords: ['청산도', '전복', '다도해', '명사십리해수욕장'], emoji: '🐚' },
  { id: 'jeonnam-mokpo', name: '전남 목포', province: '전남', keywords: ['해상케이블카', '근대역사관', '낙지탕탕이'], emoji: '🐙' },
  { id: 'jeonnam-namhae', name: '경남 남해', province: '경남', keywords: ['독일마을', '다랭이마을', '보리암'], emoji: '🇩🇪' },

  // 경상도
  { id: 'gyeongbuk-gyeongju', name: '경북 경주', province: '경북', keywords: ['불국사', '황남빵', '첨성대', '동궁과 월지'], emoji: '🏛️' },
  { id: 'gyeongbuk-andong', name: '경북 안동', province: '경북', keywords: ['하회마을', '안동찜닭', '안동소주', '월영교'], emoji: '🎭' },
  { id: 'gyeongbuk-pohang', name: '경북 포항', province: '경북', keywords: ['호미곶', '스페이스워크', '과메기'], emoji: '🖐️' },
  { id: 'gyeongbuk-yeongdeok', name: '경북 영덕', province: '경북', keywords: ['대게', '해파랑공원', '풍력발전단지'], emoji: '🦀' },
  { id: 'gyeongbuk-uljin', name: '경북 울진', province: '경북', keywords: ['성류굴', '울진대게', '덕구온천', '금강소나무'], emoji: '🌲' },
  { id: 'gyeongnam-tongyeong', name: '경남 통영', province: '경남', keywords: ['한려수도', '꿀빵', '충무김밥', '루지'], emoji: '⛵' },
  { id: 'gyeongnam-hadong', name: '경남 하동', province: '경남', keywords: ['재첩국', '섬진강', '쌍계사', '녹차밭'], emoji: '🍵' },
  { id: 'gyeongnam-geoje', name: '경남 거제', province: '경남', keywords: ['바람의언덕', '외도 보타니아', '몽돌해변'], emoji: '🌴' },
  { id: 'busan-haeundae', name: '부산 해운대', province: '부산', keywords: ['해운대해수욕장', '밀면', '동백섬', '해변열차'], emoji: '🌅' },
  { id: 'busan-gwangalli', name: '부산 광안리', province: '부산', keywords: ['광안대교', '수변공원', '돼지국밥'], emoji: '🌉' },
  { id: 'busan-yeongdo', name: '부산 영도', province: '부산', keywords: ['태종대', '흰여울문화마을', '해녀촌'], emoji: '🌊' },
  { id: 'ulsan-ulsan', name: '울산', province: '울산', keywords: ['간절곶', '태화강국가정원', '대왕암공원'], emoji: '🐋' },

  // 제주
  { id: 'jeju-jeju', name: '제주 제주시', province: '제주', keywords: ['용두암', '동문시장', '흑돼지', '함덕해수욕장'], emoji: '🌋' },
  { id: 'jeju-seogwipo', name: '제주 서귀포', province: '제주', keywords: ['올레길', '감귤', '천지연폭포', '중문관광단지'], emoji: '🍊' },
  { id: 'jeju-aewol', name: '제주 애월', province: '제주', keywords: ['한담해안산책로', '애월카페거리', '새별오름'], emoji: '☕' },
  { id: 'jeju-udo', name: '제주 우도', province: '제주', keywords: ['땅콩아이스크림', '검멀레해변', '전기자전거'], emoji: '🥜' },
]

export const PROVINCE_LIST = [...new Set(KOREA_REGIONS.map(r => r.province))]
