# 인증 보안 마이그레이션 배포 가이드

이 디렉토리는 로그인/회원가입/비밀번호 변경/회원 탈퇴 시 비밀번호 해시를
브라우저로 노출하지 않기 위한 Supabase Edge Function과, 그에 맞춰 `users`
테이블의 anon 키 권한을 제한하는 SQL을 담고 있습니다.

## 무엇이 바뀌었나

- 기존: 브라우저가 `users` 테이블에서 비밀번호 해시(SHA-256, 솔트 없음)를 직접
  `select`해서 JS로 비교했습니다. anon 키만 있으면 누구나 전체 비밀번호 해시를
  덤프할 수 있는 구조였습니다.
- 변경 후: 브라우저는 평문 비밀번호를 HTTPS로 Edge Function에 전달하고, Edge
  Function이 서비스 롤 키로 서버 측에서만 비밀번호를 조회/비교/해싱합니다.
  해시는 bcrypt(+salt)로 저장되며, 기존 SHA-256 해시로 로그인에 성공하면 그
  시점에 자동으로 bcrypt로 재해시됩니다(무중단 마이그레이션).
- `supabase/sql/harden_users_access.sql`을 실행하면 anon 키는 `users` 테이블의
  `id, name, is_deleted` 컬럼만 읽을 수 있고, `password` 컬럼 조회와 직접
  insert/update/delete는 모두 차단됩니다.

## 배포 절차 (본인 Supabase 프로젝트에서 실행)

Supabase CLI는 전역 npm 설치(`npm install -g supabase`)를 지원하지 않습니다.
프로젝트 devDependency로 설치해 `npx`로 실행하세요. (Windows에 Scoop이 있다면
`scoop install supabase`도 가능하지만, 아래 방법은 별도 도구 설치 없이 됩니다.)

1. CLI 설치 및 로그인 (저장소 루트에서)
   ```bash
   npm install supabase --save-dev
   npx supabase login
   ```
   `supabase login`을 실행하면 기본 브라우저가 열리고 Supabase 계정으로 로그인/승인하면
   터미널로 자동으로 인증 토큰이 전달됩니다.
2. 프로젝트 연결 (Supabase 대시보드 > Project Settings > General 에서 Project ref 확인)
   ```bash
   npx supabase link --project-ref <YOUR_PROJECT_REF>
   ```
   `supabase/config.toml`이 없다는 오류가 나오면 `npx supabase init`을 먼저 실행하세요
   (기존 `supabase/functions`, `supabase/sql` 폴더는 그대로 유지됩니다).
3. Edge Function 배포 (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`는 Supabase가
   모든 Edge Function에 자동으로 주입하므로 별도 secret 설정이 필요 없습니다)
   ```bash
   npx supabase functions deploy login
   npx supabase functions deploy signup
   npx supabase functions deploy change-password
   npx supabase functions deploy delete-account
   ```
4. `supabase/sql/harden_users_access.sql`의 내용을 Supabase 대시보드의
   SQL Editor에 붙여넣고 실행합니다.
5. 프론트엔드는 이미 `supabase.functions.invoke(...)`로 이 함수들을 호출하도록
   수정되어 있으므로, 재배포 후 별도 프론트엔드 설정 변경 없이 바로 동작합니다.

## 남은 한계 (알려진 트레이드오프)

- 이 앱은 Supabase Auth를 사용하지 않고 자체 `localStorage` 세션(`{id, name}`)으로
  로그인 상태를 유지합니다. 즉 서버가 암호학적으로 "이 요청이 정말 그 사용자가
  보낸 것"임을 검증하지 못합니다. `change-password`/`delete-account` 함수는
  현재 비밀번호를 재확인하도록 만들어 무단 변경/탈퇴를 막지만, 완전한 해결을
  위해서는 Supabase Auth(세션 토큰 기반)로의 전환이 필요합니다.
- `trips`, `plans`, `expenses`, `checklist`, `accommodations` 등 여행 콘텐츠
  테이블은 여전히 RLS 없이 anon 키로 전체 CRUD가 가능합니다. Supabase Auth 없이는
  `auth.uid()` 기반 RLS 정책을 걸 수 없기 때문이며, 소규모 내부 앱이라는 전제
  하의 의도된 트레이드오프입니다.
