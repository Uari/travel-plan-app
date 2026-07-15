# 여행플랜 (TravelPlan)

친구들과 함께 쓰는 소규모 여행 계획 웹앱. React + Vite 프론트엔드가 Supabase(PostgreSQL)를
직접 호출하는 구조이며, 별도의 백엔드 서버는 없습니다.

## 시작하기

```bash
npm install
cp .env.example .env   # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 입력
npm run dev
```

- `npm run build` — 프로덕션 빌드
- `npm run preview` — 빌드 결과 로컬 미리보기

## 환경 변수

`.env.example`을 복사해 `.env`를 만들고, Supabase 프로젝트(대시보드 > Project Settings > API)의
URL과 anon(public) key를 채워 넣으세요. `.env`는 git에 커밋되지 않습니다.

## 데이터베이스

Supabase 프로젝트에 아래 테이블들이 필요합니다.

- `users` — 자체 로그인 계정 (`id`, `password`(해시), `name`, `is_deleted`)
- `trips` — 여행 방 (`id`(초대 코드), `name`, `start_date`, `member_count`, `admin_id`)
- `trip_members` — 방 참여자 (`trip_id`, `user_id`, `traveler_name`, `joined_at`)
- `plans` — 일정
- `expenses` — 비용 내역
- `checklist` — 준비물 체크리스트
- `accommodations` — 숙소 후보/투표
- `excluded_regions` — 다트 결과에서 제외할 지역

`src/lib/supabase.js` 하단 주석에 초기 테이블 생성용 SQL이 남아있지만, 이후 기능 추가로
`user_id`, `is_deleted`, `img_urls`, `is_selected` 등의 컬럼이 더 추가되었으므로 그 주석을
그대로 실행하지 말고 실제 코드에서 참조하는 컬럼을 기준으로 스키마를 구성하세요.

### 인증 보안

로그인/회원가입/비밀번호 변경/탈퇴는 Supabase Edge Function을 통해 서버 측에서만 비밀번호를
다룹니다. 배포 절차와 관련 트레이드오프는 [`supabase/README.md`](supabase/README.md)를
참고하세요.

## 지도 데이터

`src/data/korea-map-paths.json`은 `public/korea-provinces.json`(GeoJSON)을 SVG path로
미리 변환해둔 결과물입니다. GeoJSON 원본이 바뀌면 아래 명령으로 다시 생성하세요.

```bash
node generate_paths.js
```

## 배포

`vercel.json`에 SPA rewrite 설정이 되어 있어 Vercel에 바로 배포할 수 있습니다. Vercel
프로젝트 환경 변수에도 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 등록해야 합니다.
