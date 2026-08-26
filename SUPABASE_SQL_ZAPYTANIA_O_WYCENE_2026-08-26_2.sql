-- MJ Reclame — etap 2: Zapytania o wycenę
-- Migracja istniejącego modułu company_inquiries do docelowego obiegu wycen.
-- Uruchom cały plik w Supabase -> SQL Editor -> New query -> Run.
-- Bezpieczny dla istniejących rekordów; można uruchomić ponownie.

-- Najpierw usuwamy stare ograniczenie statusów, aby można było przepisać dawne wartości.
alter table public.company_inquiries
  drop constraint if exists company_inquiries_status_check;

-- Zachowanie historii: stare statusy mapujemy na nowe nazwy procesu wyceny.
update public.company_inquiries
set status = 'Przygotowanie wyceny'
where status = 'Do wyceny';

update public.company_inquiries
set status = 'Wycena wysłana'
where status = 'Wycenione';

-- Docelowe statusy zapytania o wycenę.
alter table public.company_inquiries
  add constraint company_inquiries_status_check
  check (status in (
    'Nowe',
    'W kontakcie',
    'Przygotowanie wyceny',
    'Wycena wysłana',
    'Zaakceptowane',
    'Zamknięte',
    'Odrzucone'
  ));

comment on table public.company_inquiries is
  'Zapytania o wycenę MJ Reclame pochodzące ze strony lub wprowadzone do programu.';

comment on column public.company_inquiries.status is
  'Status zapytania o wycenę: Nowe, W kontakcie, Przygotowanie wyceny, Wycena wysłana, Zaakceptowane, Zamknięte lub Odrzucone.';
