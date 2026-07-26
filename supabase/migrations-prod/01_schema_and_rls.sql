-- ==========================================================
-- Arcade Vault — PROD bootstrap: esquema + RLS
-- Reproduce el estado final de DEV (auditado 2026-07-25)
--
-- Pegar y ejecutar en el SQL Editor del Dashboard de PRODUCCIÓN.
-- Ejecutar ANTES de 02_seed_games.sql.
-- ==========================================================

-- 1) Tabla games ------------------------------------------------
create table if not exists public.games (
  id     text primary key,
  title  text not null,
  short  text not null,
  long   text not null,
  cat    text not null,
  cover  text not null,
  color  text not null,
  best   integer not null default 0,
  plays  text not null default '0'
);

-- 2) Tabla scores ----------------------------------------------
create table if not exists public.scores (
  id          uuid primary key default gen_random_uuid(),
  game_id     text not null references public.games(id),
  player_name text not null,
  score       integer not null,
  level       integer not null,
  created_at  timestamptz not null default now(),
  user_id     uuid references auth.users(id) on delete set null
);

-- 3) RLS ON ----------------------------------------------------
alter table public.games  enable row level security;
alter table public.scores enable row level security;

-- 4) Políticas games: lectura pública --------------------------
drop policy if exists games_public_select on public.games;
create policy games_public_select on public.games
  for select to anon, authenticated
  using (true);

-- 5) Políticas scores: lectura pública -------------------------
drop policy if exists scores_public_select on public.scores;
create policy scores_public_select on public.scores
  for select to anon, authenticated
  using (true);

-- 6) Políticas scores: insert solo autenticado y con su propio uid
drop policy if exists scores_authenticated_insert on public.scores;
create policy scores_authenticated_insert on public.scores
  for insert to authenticated
  with check (user_id = auth.uid());
