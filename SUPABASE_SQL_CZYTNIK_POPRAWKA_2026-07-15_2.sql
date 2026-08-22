-- MJ Reclame — poprawka czytnika 2026-07-15_2
-- Uruchom w Supabase SQL Editor przed ponownym testem publikacji tekstu w czytniku.
-- Poprawka naprawia status "opublikowane" i widoczność tekstów w czytniku.

-- 1. Nowe kolumny potrzebne do publikacji przez autora — bezpieczne, jeśli już istnieją.
alter table public.submissions
  add column if not exists published_at timestamptz,
  add column if not exists published_by_author_at timestamptz,
  add column if not exists author_publication_confirmed boolean not null default false,
  add column if not exists author_declaration_version text,
  add column if not exists privacy_policy_accepted_at timestamptz,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists publication_note text;

-- 2. Najważniejsza poprawka:
-- poprzednia tabela miała ograniczenie statusów tylko do:
-- oczekuje / zaakceptowane / odrzucone.
-- Dodajemy statusy: opublikowane i ukryte.
alter table public.submissions
  drop constraint if exists submissions_status_check;

alter table public.submissions
  add constraint submissions_status_check
  check (status in ('oczekuje','zaakceptowane','opublikowane','ukryte','odrzucone'));

-- 3. Publiczny odczyt:
-- grafiki zaakceptowane mogą być publiczne w galerii,
-- teksty publiczne w czytniku tylko po statusie "opublikowane".
drop policy if exists "submissions_select_own_or_accepted" on public.submissions;
create policy "submissions_select_own_or_accepted" on public.submissions
for select using (
  auth.uid() = user_id
  or (type = 'grafika' and status = 'zaakceptowane')
  or (type = 'tekst' and status = 'opublikowane')
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "Public can read published text submissions" on public.submissions;
create policy "Public can read published text submissions"
on public.submissions
for select
using (type = 'tekst' and status = 'opublikowane');

-- 4. Autor może opublikować własny zaakceptowany tekst.
drop policy if exists "Author can publish own approved text" on public.submissions;
create policy "Author can publish own approved text"
on public.submissions
for update
using (auth.uid() = user_id and type = 'tekst' and status = 'zaakceptowane')
with check (auth.uid() = user_id and type = 'tekst' and status = 'opublikowane');

-- 5. Autor widzi własne zgłoszenia.
drop policy if exists "Author can read own submissions" on public.submissions;
create policy "Author can read own submissions"
on public.submissions
for select
using (auth.uid() = user_id);

-- 6. Administrator może aktualizować zgłoszenia, w tym ukrywać opublikowane teksty.
drop policy if exists "submissions_admin_update" on public.submissions;
create policy "submissions_admin_update" on public.submissions
for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
