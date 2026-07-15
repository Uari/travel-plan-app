-- Edge Function(로그인/회원가입/비밀번호변경/탈퇴)이 서비스 롤 키로 users 테이블을 직접 다루게 되므로,
-- anon 키(브라우저)가 password 컬럼을 포함해 users 테이블에 직접 쓰기/비밀번호 조회를 하지 못하도록 권한을 제한한다.
-- Supabase 대시보드의 SQL Editor에서 실행하세요.

revoke all on table public.users from anon;

-- 앱의 나머지 화면(참여자 목록 표시 등)이 필요로 하는 최소 컬럼만 조회 허용.
grant select (id, name, is_deleted) on public.users to anon;
