-- 여행 멤버십 기반 RLS 정책 (per-user JWT의 app_user_id 클레임 = 앱의 text user id 전제)
-- 이 마이그레이션은 함수/GRANT/정책만 설치한다. 실제 RLS 활성화(enable)는 맨 아래
-- "PHASE 3b" 블록에 주석으로만 두어, RLS가 꺼진 상태에서도 안전하게(무해하게) 적용된다.
-- 정책은 created_by를 신뢰하지 않는다(테이블마다 user.name/user.id가 섞여 있음). 오직 trip_id 멤버십으로만 판단.
--
-- 확인된 사실(코드 근거):
--   - 모든 콘텐츠 테이블에 trip_id 존재: plans/expenses/checklist/accommodations/trip_photos/excluded_regions
--   - trips 방장 컬럼명 = admin_id (LobbyPage.jsx handleCreateTrip payload)
--   - trip_members = (trip_id text, user_id text, traveler_name, is_admin)
--   - 토큰 신원: auth.jwt() ->> 'app_user_id' = text user id

-- ─────────────────────────────────────────────────────────────
-- 1) 키스톤 함수
-- ─────────────────────────────────────────────────────────────

-- 현재 요청자의 앱 user id(text). JWT에 app_user_id 클레임이 없으면 null.
create or replace function public.app_uid() returns text
  language sql stable as $$ select auth.jwt() ->> 'app_user_id' $$;

-- 요청자가 해당 여행(tid)의 멤버인지 여부.
-- SECURITY DEFINER 필수: trip_members 자신의 SELECT 정책이 다시 이 함수를 호출하면
-- 무한 재귀가 나므로, definer 권한으로 RLS를 우회해 조회한다.
create or replace function public.is_trip_member(tid text) returns boolean
  language sql stable security definer set search_path = public as $$
    select exists (
      select 1 from public.trip_members m
      where m.trip_id = tid
        and m.user_id = auth.jwt() ->> 'app_user_id'
    )
  $$;

-- ─────────────────────────────────────────────────────────────
-- 2) GRANT (authenticated 롤)
--    RLS가 켜지면 GRANT 통과 후 정책이 행 단위로 다시 거른다.
-- ─────────────────────────────────────────────────────────────

grant select, insert, update, delete on public.plans            to authenticated;
grant select, insert, update, delete on public.expenses         to authenticated;
grant select, insert, update, delete on public.checklist        to authenticated;
grant select, insert, update, delete on public.accommodations   to authenticated;
grant select, insert, update, delete on public.trip_photos      to authenticated;
grant select, insert, update, delete on public.excluded_regions to authenticated;
grant select, insert, update, delete on public.trips            to authenticated;
grant select, insert, update, delete on public.trip_members     to authenticated;

-- users: id/name/is_deleted만 읽기 허용. password는 절대 grant 하지 않음
-- (20260722000000_users_protect_password.sql에서 anon/authenticated의 select(password)를 회수함).
grant select (id, name, is_deleted) on public.users to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 3) 정책 (Policies)
-- ─────────────────────────────────────────────────────────────

-- 3-1) 콘텐츠 테이블 6종 — 동일 패턴 (trip_id 멤버십으로만 판단)

-- plans
drop policy if exists plans_select on public.plans;
drop policy if exists plans_insert on public.plans;
drop policy if exists plans_update on public.plans;
drop policy if exists plans_delete on public.plans;
create policy plans_select on public.plans for select to authenticated using (public.is_trip_member(trip_id));
create policy plans_insert on public.plans for insert to authenticated with check (public.is_trip_member(trip_id));
create policy plans_update on public.plans for update to authenticated using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));
create policy plans_delete on public.plans for delete to authenticated using (public.is_trip_member(trip_id));

-- expenses
drop policy if exists expenses_select on public.expenses;
drop policy if exists expenses_insert on public.expenses;
drop policy if exists expenses_update on public.expenses;
drop policy if exists expenses_delete on public.expenses;
create policy expenses_select on public.expenses for select to authenticated using (public.is_trip_member(trip_id));
create policy expenses_insert on public.expenses for insert to authenticated with check (public.is_trip_member(trip_id));
create policy expenses_update on public.expenses for update to authenticated using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));
create policy expenses_delete on public.expenses for delete to authenticated using (public.is_trip_member(trip_id));

-- checklist
drop policy if exists checklist_select on public.checklist;
drop policy if exists checklist_insert on public.checklist;
drop policy if exists checklist_update on public.checklist;
drop policy if exists checklist_delete on public.checklist;
create policy checklist_select on public.checklist for select to authenticated using (public.is_trip_member(trip_id));
create policy checklist_insert on public.checklist for insert to authenticated with check (public.is_trip_member(trip_id));
create policy checklist_update on public.checklist for update to authenticated using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));
create policy checklist_delete on public.checklist for delete to authenticated using (public.is_trip_member(trip_id));

-- accommodations
drop policy if exists accommodations_select on public.accommodations;
drop policy if exists accommodations_insert on public.accommodations;
drop policy if exists accommodations_update on public.accommodations;
drop policy if exists accommodations_delete on public.accommodations;
create policy accommodations_select on public.accommodations for select to authenticated using (public.is_trip_member(trip_id));
create policy accommodations_insert on public.accommodations for insert to authenticated with check (public.is_trip_member(trip_id));
create policy accommodations_update on public.accommodations for update to authenticated using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));
create policy accommodations_delete on public.accommodations for delete to authenticated using (public.is_trip_member(trip_id));

-- trip_photos (uploaded_by 컬럼은 정책 판단에 쓰지 않음 — trip_id 멤버십으로만)
drop policy if exists trip_photos_select on public.trip_photos;
drop policy if exists trip_photos_insert on public.trip_photos;
drop policy if exists trip_photos_update on public.trip_photos;
drop policy if exists trip_photos_delete on public.trip_photos;
create policy trip_photos_select on public.trip_photos for select to authenticated using (public.is_trip_member(trip_id));
create policy trip_photos_insert on public.trip_photos for insert to authenticated with check (public.is_trip_member(trip_id));
create policy trip_photos_update on public.trip_photos for update to authenticated using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));
create policy trip_photos_delete on public.trip_photos for delete to authenticated using (public.is_trip_member(trip_id));

-- excluded_regions
drop policy if exists excluded_regions_select on public.excluded_regions;
drop policy if exists excluded_regions_insert on public.excluded_regions;
drop policy if exists excluded_regions_update on public.excluded_regions;
drop policy if exists excluded_regions_delete on public.excluded_regions;
create policy excluded_regions_select on public.excluded_regions for select to authenticated using (public.is_trip_member(trip_id));
create policy excluded_regions_insert on public.excluded_regions for insert to authenticated with check (public.is_trip_member(trip_id));
create policy excluded_regions_update on public.excluded_regions for update to authenticated using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));
create policy excluded_regions_delete on public.excluded_regions for delete to authenticated using (public.is_trip_member(trip_id));

-- 3-2) trips
-- SELECT는 using(true): 초대 코드로 입장할 때, 멤버가 되기 전에 방 존재 여부를 조회해야 함
--   (LobbyPage.handleJoinTrip이 trips에서 코드로 single() 조회 후 trip_members에 insert).
--   트레이드오프: 코드를 아는 사람은 방 메타(이름/멤버수 등)를 읽을 수 있음. 콘텐츠는 못 읽음.
drop policy if exists trips_select on public.trips;
drop policy if exists trips_insert on public.trips;
drop policy if exists trips_update on public.trips;
create policy trips_select on public.trips for select to authenticated using (true);
-- 방 생성은 본인을 방장으로만 (admin_id = 본인). admin_id 컬럼 확인: LobbyPage handleCreateTrip payload.
create policy trips_insert on public.trips for insert to authenticated with check (admin_id = public.app_uid());
create policy trips_update on public.trips for update to authenticated using (public.is_trip_member(id)) with check (public.is_trip_member(id));
-- DELETE 정책 없음(방 삭제 미지원).

-- 3-3) trip_members
drop policy if exists trip_members_select on public.trip_members;
drop policy if exists trip_members_insert on public.trip_members;
drop policy if exists trip_members_update on public.trip_members;
drop policy if exists trip_members_delete on public.trip_members;
create policy trip_members_select on public.trip_members for select to authenticated using (public.is_trip_member(trip_id));
-- 입장은 본인만(자기 자신을 멤버로 insert). 초대 코드를 아는 상태에서 self-join.
create policy trip_members_insert on public.trip_members for insert to authenticated with check (user_id = public.app_uid());
create policy trip_members_update on public.trip_members for update to authenticated using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));
-- 나가기는 본인 행만 삭제.
create policy trip_members_delete on public.trip_members for delete to authenticated using (user_id = public.app_uid());

-- 3-4) users: 기존 users_read(select using(true)) 유지 — 재생성하지 않음.
--   쓰기 정책 없음(비밀번호 등은 edge function/service_role 담당). 위 GRANT만 보장하면 됨.

-- ─────────────────────────────────────────────────────────────
-- PHASE 3b — enable per-table (run one at a time, verify between each)
-- ─────────────────────────────────────────────────────────────
-- 위의 함수/GRANT/정책은 RLS가 꺼진 상태에서 무해하게 적용된다.
-- 아래 enable 문은 per-user JWT(app_user_id 클레임)가 실제로 흐르기 시작한 뒤,
-- 위험도 낮음 → 높음 순으로 "한 번에 하나씩" 실행하고 각 단계 사이에서 앱 동작을 검증할 것.
-- (users는 20260722000000에서 이미 활성화되어 있으므로 여기 없음.)
--
-- alter table public.excluded_regions enable row level security;
-- alter table public.checklist        enable row level security;
-- alter table public.expenses         enable row level security;
-- alter table public.plans            enable row level security;
-- alter table public.accommodations   enable row level security;
-- alter table public.trip_photos      enable row level security;
-- alter table public.trips            enable row level security;
-- alter table public.trip_members     enable row level security;
