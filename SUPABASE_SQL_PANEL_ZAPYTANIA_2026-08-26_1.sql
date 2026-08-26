-- MJ Reclame — panel firmowy: Zapytania z formularza
-- Wykonaj cały plik w Supabase -> SQL Editor -> New query -> Run.
-- Plik jest idempotentny: można go uruchomić ponownie.

create extension if not exists pgcrypto;

create table if not exists public.company_inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null default 'website_contact_form',
  form_name text,
  language text not null default 'pl',
  name text not null,
  email text not null,
  phone text,
  service text,
  quantity text,
  deadline text,
  message text,
  product_inquiry text,
  product_code text,
  product_color text,
  product_size text,
  product_quantity text,
  attachment_count integer not null default 0,
  attachment_names text[] not null default '{}'::text[],
  status text not null default 'Nowe',
  notes text,
  constraint company_inquiries_attachment_count_check check (attachment_count between 0 and 5),
  constraint company_inquiries_status_check check (status in ('Nowe','W kontakcie','Do wyceny','Wycenione','Zamknięte','Odrzucone')),
  constraint company_inquiries_language_check check (language in ('pl','nl'))
);

create index if not exists company_inquiries_created_at_idx on public.company_inquiries (created_at desc);
create index if not exists company_inquiries_status_idx on public.company_inquiries (status);
create index if not exists company_inquiries_email_idx on public.company_inquiries (lower(email));

alter table public.company_inquiries enable row level security;

create or replace function public.mj_company_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.mj_company_is_admin() from public;
grant execute on function public.mj_company_is_admin() to authenticated;

-- Publiczny formularz może wyłącznie DODAĆ zapytanie. Nie może czytać, zmieniać ani usuwać rekordów.
revoke all on table public.company_inquiries from anon;
grant insert (source, form_name, language, name, email, phone, service, quantity, deadline, message,
              product_inquiry, product_code, product_color, product_size, product_quantity,
              attachment_count, attachment_names)
on table public.company_inquiries to anon;

grant select, insert, update, delete on table public.company_inquiries to authenticated;

drop policy if exists "company_inquiries_public_insert" on public.company_inquiries;
create policy "company_inquiries_public_insert"
on public.company_inquiries
for insert
to anon
with check (
  status = 'Nowe'
  and length(trim(name)) between 1 and 300
  and length(trim(email)) between 3 and 320
  and position('@' in email) > 1
  and attachment_count between 0 and 5
);

drop policy if exists "company_inquiries_admin_select" on public.company_inquiries;
create policy "company_inquiries_admin_select"
on public.company_inquiries
for select
to authenticated
using (public.mj_company_is_admin());

drop policy if exists "company_inquiries_admin_insert" on public.company_inquiries;
create policy "company_inquiries_admin_insert"
on public.company_inquiries
for insert
to authenticated
with check (public.mj_company_is_admin());

drop policy if exists "company_inquiries_admin_update" on public.company_inquiries;
create policy "company_inquiries_admin_update"
on public.company_inquiries
for update
to authenticated
using (public.mj_company_is_admin())
with check (public.mj_company_is_admin());

drop policy if exists "company_inquiries_admin_delete" on public.company_inquiries;
create policy "company_inquiries_admin_delete"
on public.company_inquiries
for delete
to authenticated
using (public.mj_company_is_admin());
