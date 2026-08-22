-- MJ Reclame — Strefa Twórców — struktura Supabase
-- Uruchom w Supabase SQL Editor.
-- Po wykonaniu ustaw użytkownika administracyjnego:
-- update public.profiles set role = 'admin' where email = 'TWOJ_EMAIL';

create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text unique,
  creator_type text check (creator_type in ('autor','grafik','autor_grafik')) default 'autor',
  bio text,
  role text check (role in ('user','admin')) default 'user',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.submissions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('tekst','grafika')),
  title text not null,
  category text,
  summary text,
  content text,
  file_path text,
  status text not null check (status in ('oczekuje','zaakceptowane','odrzucone')) default 'oczekuje',
  admin_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.submissions enable row level security;

-- Profile: użytkownik widzi profile publicznie, edytuje tylko swój.
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
for select using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

-- Zgłoszenia: użytkownik widzi swoje, publicznie widoczne są tylko zaakceptowane.
drop policy if exists "submissions_select_own_or_accepted" on public.submissions;
create policy "submissions_select_own_or_accepted" on public.submissions
for select using (
  auth.uid() = user_id
  or status = 'zaakceptowane'
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "submissions_insert_own" on public.submissions;
create policy "submissions_insert_own" on public.submissions
for insert with check (auth.uid() = user_id);

drop policy if exists "submissions_update_own_pending" on public.submissions;
create policy "submissions_update_own_pending" on public.submissions
for update using (auth.uid() = user_id and status = 'oczekuje');

drop policy if exists "submissions_admin_update" on public.submissions;
create policy "submissions_admin_update" on public.submissions
for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Storage
insert into storage.buckets (id, name, public)
values ('creator-files', 'creator-files', false)
on conflict (id) do nothing;

drop policy if exists "creator_files_upload_own" on storage.objects;
create policy "creator_files_upload_own" on storage.objects
for insert with check (
  bucket_id = 'creator-files'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "creator_files_read_own_or_admin" on storage.objects;
create policy "creator_files_read_own_or_admin" on storage.objects
for select using (
  bucket_id = 'creator-files'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
);

-- Automatyczne tworzenie profilu po rejestracji użytkownika.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, username, creator_type)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'creator_type', 'autor')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
