create table if not exists public.question_entries (
  id bigint generated always as identity primary key,
  student text not null check (student in ('Bahar', 'Leyla')),
  lesson text not null,
  question_count integer not null check (question_count > 0),
  entry_date date not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_question_entries_student_date
  on public.question_entries (student, entry_date);

alter table public.question_entries enable row level security;

create policy "Allow read for anon"
  on public.question_entries
  for select
  to anon
  using (true);

create policy "Allow insert for anon"
  on public.question_entries
  for insert
  to anon
  with check (true);

create policy "Allow update for anon"
  on public.question_entries
  for update
  to anon
  using (true)
  with check (true);

create policy "Allow delete for anon"
  on public.question_entries
  for delete
  to anon
  using (true);
