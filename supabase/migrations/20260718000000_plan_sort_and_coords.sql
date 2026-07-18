-- 일정(plans) 드래그 정렬 + 지도 좌표 지원
-- 4번(드래그 앤 드롭 정렬), 7번(Leaflet 지도 연동)용 컬럼 추가
-- Supabase 대시보드 SQL Editor에서 실행하세요. (기존 데이터를 지우지 않는 비파괴적 변경)

-- 1) plans: 수동 정렬 순서 + 위경도
alter table plans add column if not exists sort_order integer;          -- 드래그로 정한 순서 (day_label 내)
alter table plans add column if not exists lat        double precision;  -- 위도 (지도 핀)
alter table plans add column if not exists lng        double precision;  -- 경도 (지도 핀)

-- 2) 기존 데이터 백필: 같은 여행/같은 Day 안에서 시간→생성순으로 sort_order 초기화
--    (null이면 앱이 시간/생성순으로 폴백하므로 필수는 아니지만, 초기 드래그가 매끄럽도록 채워둔다)
update plans p
set sort_order = sub.rn
from (
  select id,
         row_number() over (
           partition by trip_id, day_label
           order by time_label nulls last, created_at
         ) as rn
  from plans
) sub
where p.id = sub.id
  and p.sort_order is null;

-- plans는 다른 콘텐츠 테이블과 동일하게 RLS 비활성화 상태를 유지 (별도 조치 불필요)
