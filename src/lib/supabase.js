import { createClient } from '@supabase/supabase-js'

// Supabase 프로젝트 생성 후 아래 값을 교체하세요
// https://supabase.com 에서 무료 프로젝트 생성
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: {
    fetch: (...args) => {
      if (SUPABASE_URL.includes('placeholder')) {
        return Promise.reject(new Error('Supabase is not configured yet. Using sample data.'))
      }
      return fetch(...args)
    }
  }
})

// DB 테이블 초기화 SQL (Supabase SQL Editor에서 실행)
// 
// -- 일정 테이블
// create table plans (
//   id uuid default gen_random_uuid() primary key,
//   created_by text not null,
//   day_label text not null,
//   time_label text,
//   title text not null,
//   location text,
//   accommodation_name text,
//   accommodation_img_url text,
//   notes text,
//   created_at timestamptz default now()
// );
//
// -- 비용 테이블
// create table expenses (
//   id uuid default gen_random_uuid() primary key,
//   created_by text not null,
//   label text not null,
//   amount numeric not null,
//   category text default 'etc',
//   created_at timestamptz default now()
// );
//
// -- 체크리스트 테이블
// create table checklist (
//   id uuid default gen_random_uuid() primary key,
//   created_by text not null,
//   item text not null,
//   is_done boolean default false,
//   created_at timestamptz default now()
// );
//
// -- 제외 지역 테이블
// create table excluded_regions (
//   id uuid default gen_random_uuid() primary key,
//   region_name text unique not null,
//   created_by text not null,
//   created_at timestamptz default now()
// );
//
// -- 숙소 비교 테이블
// create table accommodations (
//   id uuid default gen_random_uuid() primary key,
//   created_by text not null,
//   name text not null,
//   link_url text,
//   img_url text,
//   price numeric default 0,
//   pros_cons text,
//   votes text[] default '{}',
//   is_selected boolean default false,
//   created_at timestamptz default now()
// );
//
// -- RLS 비활성화 (소규모 팀 내부 앱)
// alter table plans disable row level security;
// alter table expenses disable row level security;
// alter table checklist disable row level security;
// alter table excluded_regions disable row level security;
// alter table accommodations disable row level security;
