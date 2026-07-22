-- users 테이블 비밀번호 노출 차단 (Supabase Security Advisor: sensitive_columns_exposed)
-- 프론트는 anon 키로 users에서 id/name/is_deleted만 읽는다(App.jsx, TravelLogDetailPage.jsx).
-- 비밀번호 관련 처리는 전부 edge function(service_role, RLS/GRANT 우회)이 하므로
-- anon/authenticated의 password 컬럼 접근만 막으면 앱은 그대로 동작한다.

alter table users enable row level security;

-- 읽기는 허용(프론트가 멤버 이름 매핑에 필요). 쓰기 정책은 없음 → anon은 insert/update/delete 불가.
drop policy if exists users_read on users;
create policy users_read on users for select using (true);

-- password 컬럼만 공개 롤에서 회수. 나머지 컬럼은 계속 읽힘.
revoke select (password) on users from anon, authenticated;
