-- MJ Reclame — czytnik e-book: publikacja tekstu przez autora
-- Uruchom w Supabase: SQL Editor → New query → Run.
-- Ten plik dodaje pola potrzebne do zapisania decyzji autora o publikacji tekstu w czytniku.

alter table public.submissions
  add column if not exists published_at timestamptz,
  add column if not exists published_by_author_at timestamptz,
  add column if not exists author_publication_confirmed boolean not null default false,
  add column if not exists author_declaration_version text,
  add column if not exists privacy_policy_accepted_at timestamptz,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists publication_note text;

-- Publiczny odczyt tylko opublikowanych tekstów w czytniku.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'submissions'
      and policyname = 'Public can read published text submissions'
  ) then
    create policy "Public can read published text submissions"
    on public.submissions
    for select
    using (type = 'tekst' and status = 'opublikowane');
  end if;
end $$;

-- Autor może zmienić własny zaakceptowany tekst na opublikowany w czytniku.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'submissions'
      and policyname = 'Author can publish own approved text'
  ) then
    create policy "Author can publish own approved text"
    on public.submissions
    for update
    using (auth.uid() = user_id and type = 'tekst' and status = 'zaakceptowane')
    with check (auth.uid() = user_id and type = 'tekst' and status = 'opublikowane');
  end if;
end $$;

-- Autor może odczytać własne zgłoszenia w panelu Moje prace.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'submissions'
      and policyname = 'Author can read own submissions'
  ) then
    create policy "Author can read own submissions"
    on public.submissions
    for select
    using (auth.uid() = user_id);
  end if;
end $$;
