-- =====================================================================
--  Mini Habit Tracker — 001_init.sql
--  PostgreSQL 14+ / Supabase
--  Chay mot lan trong Supabase SQL Editor (hoac: psql -f 001_init.sql)
-- =====================================================================

begin;

create extension if not exists pgcrypto;   -- cho gen_random_uuid()

-- ---------- 1. USERS ----------
create table users (
  id            uuid        primary key default gen_random_uuid(),
  email         text        not null,
  password_hash text        not null,
  display_name  text        not null default '',
  -- Mui gio cua user. "Ngay" phu thuoc mui gio: tick luc 23:30 o VN
  -- ma server o My thi dang la hom truoc -> streak sai.
  timezone      text        not null default 'Asia/Ho_Chi_Minh',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint users_email_format
    check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

-- Chan dang ky trung email khac hoa/thuong: Duc@x.com vs duc@x.com
create unique index users_email_lower_key on users (lower(email));

-- ---------- 2. HABITS ----------
create table habits (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references users(id) on delete cascade,
  name        text        not null,
  frequency   text        not null default 'daily',
  color       text,
  archived_at timestamptz,                       -- null = dang hoat dong
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint habits_name_len
    check (char_length(btrim(name)) between 1 and 100),
  constraint habits_frequency_valid
    check (frequency in ('daily', 'weekly'))
);

create index habits_user_id_idx on habits (user_id);

-- ---------- 3. CHECK_INS ----------
create table check_ins (
  id         uuid        primary key default gen_random_uuid(),
  habit_id   uuid        not null references habits(id) on delete cascade,
  done_on    date        not null,       -- chi NGAY, khong gio
  note       text,
  created_at timestamptz not null default now(),
  -- Rang buoc quan trong nhat cua ca schema:
  -- mot habit, mot ngay, chi tick duoc mot lan.
  -- Ke ca backend co bug thi database van chan.
  constraint check_ins_unique_per_day unique (habit_id, done_on)
);

-- LUU Y: luat "khong tick cho ngay tuong lai" KHONG dat duoc o day,
-- vi Postgres khong cho dung current_date trong CHECK (ham khong immutable).
-- => Luat do phai nam o backend.

-- ---------- 4. REFRESH_TOKENS ----------
create table refresh_tokens (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references users(id) on delete cascade,
  token_hash text        not null unique,   -- luu ban BAM, khong luu token that
  expires_at timestamptz not null,
  revoked_at timestamptz,                   -- null = con hieu luc
  user_agent text,
  created_at timestamptz not null default now()
);

create index refresh_tokens_user_id_idx on refresh_tokens (user_id);

-- ---------- 5. Tu dong cap nhat updated_at ----------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_set_updated_at
  before update on users
  for each row execute function set_updated_at();

create trigger habits_set_updated_at
  before update on habits
  for each row execute function set_updated_at();

commit;

-- =====================================================================
--  GHI CHU
--
--  1) Khong co cot "streak". Streak tinh ra duoc tu check_ins
--     => khong luu. Luu la de hai noi cung giu mot su that, se lech.
--
--  2) Neu dung Supabase va frontend goi THANG vao Supabase (khong qua
--     backend rieng), phai bat Row Level Security + viet policy,
--     neu khong ai cung doc duoc du lieu cua nguoi khac.
--     Kien truc cua du an nay la FE -> NestJS -> DB nen chua can,
--     nhung nen bat cho chac:
--       alter table habits    enable row level security;
--       alter table check_ins enable row level security;
-- =====================================================================
