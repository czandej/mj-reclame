-- MJ Reclame — etap 3: moduł Wyceny / Oferty
-- Uruchom cały plik w Supabase -> SQL Editor -> New query -> Run.
-- Tworzy dokumenty handlowe i ich pozycje. Nie zmienia istniejących faktur,
-- projektów ani usług/zleceń.

create extension if not exists pgcrypto;

-- Funkcja administratora jest już używana przez panel Zapytania.
-- CREATE OR REPLACE pozostawia ją zgodną z aktualnym modelem uprawnień.
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

create table if not exists public.company_quotes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null,
  client_id uuid not null references public.company_clients(id) on delete restrict,
  inquiry_id uuid references public.company_inquiries(id) on delete set null,
  quote_type text not null default 'Wycena',
  quote_number text not null,
  issue_date date not null default current_date,
  valid_until date,
  status text not null default 'Robocza',
  currency text not null default 'EUR',
  lead_time text,
  terms text,
  notes text,
  constraint company_quotes_quote_type_check check (quote_type in ('Wycena','Oferta')),
  constraint company_quotes_status_check check (status in ('Robocza','Gotowa','Wysłana','Zaakceptowana','Odrzucona','Wygasła','Anulowana')),
  constraint company_quotes_currency_check check (currency = 'EUR'),
  constraint company_quotes_number_unique unique (quote_number)
);

create table if not exists public.company_quote_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  quote_id uuid not null references public.company_quotes(id) on delete cascade,
  position integer not null default 1,
  description text not null,
  quantity numeric(12,3) not null default 1,
  unit text not null default 'szt.',
  unit_net numeric(14,2) not null default 0,
  vat_rate numeric(6,3) not null default 21,
  line_net numeric(14,2) generated always as (round(quantity * unit_net, 2)) stored,
  vat_amount numeric(14,2) generated always as (round((quantity * unit_net) * vat_rate / 100, 2)) stored,
  line_gross numeric(14,2) generated always as (round((quantity * unit_net) + ((quantity * unit_net) * vat_rate / 100), 2)) stored,
  constraint company_quote_items_position_check check (position > 0),
  constraint company_quote_items_quantity_check check (quantity > 0),
  constraint company_quote_items_unit_net_check check (unit_net >= 0),
  constraint company_quote_items_vat_rate_check check (vat_rate >= 0 and vat_rate <= 100),
  constraint company_quote_items_quote_position_unique unique (quote_id, position)
);

create index if not exists company_quotes_created_at_idx on public.company_quotes (created_at desc);
create index if not exists company_quotes_client_id_idx on public.company_quotes (client_id);
create index if not exists company_quotes_inquiry_id_idx on public.company_quotes (inquiry_id);
create index if not exists company_quotes_status_idx on public.company_quotes (status);
create index if not exists company_quote_items_quote_id_idx on public.company_quote_items (quote_id);

create or replace function public.mj_company_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists company_quotes_touch_updated_at on public.company_quotes;
create trigger company_quotes_touch_updated_at
before update on public.company_quotes
for each row execute function public.mj_company_touch_updated_at();

alter table public.company_quotes enable row level security;
alter table public.company_quote_items enable row level security;

revoke all on table public.company_quotes from anon;
revoke all on table public.company_quote_items from anon;
grant select, insert, update, delete on table public.company_quotes to authenticated;
grant select, insert, update, delete on table public.company_quote_items to authenticated;

drop policy if exists "company_quotes_admin_select" on public.company_quotes;
create policy "company_quotes_admin_select" on public.company_quotes
for select to authenticated using (public.mj_company_is_admin());

drop policy if exists "company_quotes_admin_insert" on public.company_quotes;
create policy "company_quotes_admin_insert" on public.company_quotes
for insert to authenticated with check (public.mj_company_is_admin());

drop policy if exists "company_quotes_admin_update" on public.company_quotes;
create policy "company_quotes_admin_update" on public.company_quotes
for update to authenticated
using (public.mj_company_is_admin())
with check (public.mj_company_is_admin());

drop policy if exists "company_quotes_admin_delete" on public.company_quotes;
create policy "company_quotes_admin_delete" on public.company_quotes
for delete to authenticated using (public.mj_company_is_admin());

drop policy if exists "company_quote_items_admin_select" on public.company_quote_items;
create policy "company_quote_items_admin_select" on public.company_quote_items
for select to authenticated using (public.mj_company_is_admin());

drop policy if exists "company_quote_items_admin_insert" on public.company_quote_items;
create policy "company_quote_items_admin_insert" on public.company_quote_items
for insert to authenticated with check (public.mj_company_is_admin());

drop policy if exists "company_quote_items_admin_update" on public.company_quote_items;
create policy "company_quote_items_admin_update" on public.company_quote_items
for update to authenticated
using (public.mj_company_is_admin())
with check (public.mj_company_is_admin());

drop policy if exists "company_quote_items_admin_delete" on public.company_quote_items;
create policy "company_quote_items_admin_delete" on public.company_quote_items
for delete to authenticated using (public.mj_company_is_admin());

comment on table public.company_quotes is 'Wyceny i oferty MJ Reclame powiązane z klientem oraz opcjonalnie z zapytaniem o wycenę.';
comment on table public.company_quote_items is 'Pozycje dokumentów Wycena/Oferta MJ Reclame z automatycznie obliczanym netto, VAT i brutto.';
