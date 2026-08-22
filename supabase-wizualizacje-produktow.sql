-- MJ Reclame — galeria grafik i wizualizacje produktów
create table if not exists public.product_visualizations (
  id uuid primary key default uuid_generate_v4(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  product_type text not null check (product_type in ('koszulka','bluza','torba','plakat','kubek','naklejka','okladka_ksiazki','inne')),
  title text,
  description text,
  file_path text not null,
  is_public boolean default true,
  display_order integer default 0,
  rights_confirmed boolean default false,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.product_visualizations enable row level security;
drop policy if exists "product_visualizations_public_select" on public.product_visualizations;
create policy "product_visualizations_public_select" on public.product_visualizations for select using (is_public = true and exists (select 1 from public.submissions s where s.id = product_visualizations.submission_id and s.type = 'grafika' and s.status = 'zaakceptowane'));
drop policy if exists "product_visualizations_admin_all" on public.product_visualizations;
create policy "product_visualizations_admin_all" on public.product_visualizations for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
drop policy if exists "creator_files_read_accepted_graphics_public" on storage.objects;
create policy "creator_files_read_accepted_graphics_public" on storage.objects for select using (bucket_id = 'creator-files' and exists (select 1 from public.submissions s where s.file_path = storage.objects.name and s.type = 'grafika' and s.status = 'zaakceptowane'));
insert into storage.buckets (id, name, public) values ('product-visualizations', 'product-visualizations', true) on conflict (id) do update set public = true;
drop policy if exists "product_visualizations_storage_public_read" on storage.objects;
create policy "product_visualizations_storage_public_read" on storage.objects for select using (bucket_id = 'product-visualizations');
drop policy if exists "product_visualizations_storage_admin_insert" on storage.objects;
create policy "product_visualizations_storage_admin_insert" on storage.objects for insert with check (bucket_id = 'product-visualizations' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
drop policy if exists "product_visualizations_storage_admin_delete" on storage.objects;
create policy "product_visualizations_storage_admin_delete" on storage.objects for delete using (bucket_id = 'product-visualizations' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));


-- Dodatkowa kolumna potwierdzająca, że admin dodał wizualizację jako przykład prezentacji pracy.
alter table public.product_visualizations
add column if not exists rights_confirmed boolean default false;
