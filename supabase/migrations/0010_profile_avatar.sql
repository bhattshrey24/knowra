-- Knowra Phase 8: Profile avatar support for OAuth and custom profiles.
alter table public.profiles
  add column if not exists avatar_url text;
