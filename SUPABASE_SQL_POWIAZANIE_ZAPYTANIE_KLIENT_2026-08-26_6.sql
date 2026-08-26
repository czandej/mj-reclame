-- MJ Reclame — etap v21: powiązanie Zapytanie o wycenę -> Klient
-- Uruchom cały plik w Supabase -> SQL Editor -> New query -> Run.
-- Zmiana jest idempotentna: można uruchomić ponownie.

alter table public.company_inquiries
  add column if not exists client_id uuid references public.company_clients(id) on delete set null;

create index if not exists company_inquiries_client_id_idx
on public.company_inquiries (client_id);

-- Jeżeli w istniejącej kartotece jest dokładnie jeden klient z tym samym e-mailem,
-- bezpiecznie powiąż istniejące zapytanie z tym klientem.
update public.company_inquiries i
set client_id = c.id
from public.company_clients c
where i.client_id is null
  and i.email is not null
  and c.email is not null
  and lower(trim(i.email)) = lower(trim(c.email))
  and (
    select count(*)
    from public.company_clients c2
    where c2.email is not null
      and lower(trim(c2.email)) = lower(trim(i.email))
  ) = 1;

comment on column public.company_inquiries.client_id is
  'Klient w kartotece company_clients powiązany z zapytaniem o wycenę.';
