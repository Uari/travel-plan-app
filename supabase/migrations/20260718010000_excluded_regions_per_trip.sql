-- 제외 지역을 "여행(trip)별 + 팀 공유"로 전환
-- 기존 excluded_regions 테이블은 region_name(전역 unique)만 있어 여행별 구분이 안 됨.
-- 앱은 지금까지 이 테이블을 쓰지 않고 localStorage에 저장해 왔으므로(= 이 테이블은 비어 있음),
-- 안전하게 재생성한다. (실행 전 이 테이블에 데이터가 없어야 함 — 현재 0행 확인됨)

drop table if exists excluded_regions;

create table excluded_regions (
  id          uuid        default gen_random_uuid() primary key,
  trip_id     text        not null,          -- trips.id (초대 코드)
  region_id   text        not null,          -- KOREA_REGIONS의 id
  region_name text,                          -- 표시명(지역 데이터가 바뀌어도 깨지지 않게 값 저장)
  created_by  text,                          -- 설정한 user.id
  created_at  timestamptz default now(),
  unique (trip_id, region_id)                -- 같은 여행에서 같은 지역 중복 방지
);

create index if not exists excluded_regions_trip_id_idx on excluded_regions (trip_id);

-- 소규모 내부 앱 전제: 다른 콘텐츠 테이블과 동일하게 RLS 비활성화
alter table excluded_regions disable row level security;
