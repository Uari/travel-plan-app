-- 여행 로그(여행 후 기록) 기능 1차: 데이터 모델 추가
-- Supabase 대시보드 SQL Editor에서 실행하세요. (기존 테이블에 컬럼/테이블을 추가하는 비파괴적 변경)

-- 1) trips: 완료 상태 + 여행지 정보 + 한 줄 후기
alter table trips add column if not exists is_completed     boolean     not null default false;
alter table trips add column if not exists completed_at      timestamptz;
alter table trips add column if not exists country_code      text;        -- SUPPORTED_COUNTRIES 기준 코드 (예: 'KR', 'JP')
alter table trips add column if not exists region_id         text;        -- 대한민국이면 KOREA_REGIONS의 id (선택)
alter table trips add column if not exists region_label      text;        -- 지역 표시명 (KOREA_REGIONS가 바뀌어도 깨지지 않도록 값 자체 저장)
alter table trips add column if not exists region_province   text;        -- 상세지도 다트 배치용 도(道) (예: '부산', '강원')
alter table trips add column if not exists destination_label text;        -- 상세지도 미지원 국가의 도시·지역 자유 텍스트
alter table trips add column if not exists review_note       text;        -- 한 줄 여행 후기 (선택)

-- 2) trip_members: 다중 방장 지원
alter table trip_members add column if not exists is_admin boolean not null default false;

-- 2-1) 기존 데이터 백필: 방 생성자(trips.admin_id)를 방장으로 표시
--     (이 백필을 하지 않으면 기존 방들이 방장 없는 상태가 되어 완료 처리를 못 함)
update trip_members tm
set is_admin = true
from trips t
where tm.trip_id = t.id
  and tm.user_id = t.admin_id;

-- 3) trip_photos: 여행 후 사진 (다중)
create table if not exists trip_photos (
  id          uuid        default gen_random_uuid() primary key,
  trip_id     text        not null,      -- trips.id (초대 코드). 기존 테이블들과 동일하게 FK 제약은 두지 않음
  url         text        not null,      -- Storage(travel_images) public URL
  uploaded_by text,                      -- 업로더 user.id
  created_at  timestamptz default now()
);

create index if not exists trip_photos_trip_id_idx on trip_photos (trip_id);

-- 소규모 내부 앱 전제: 다른 콘텐츠 테이블과 동일하게 RLS 비활성화
alter table trip_photos disable row level security;
