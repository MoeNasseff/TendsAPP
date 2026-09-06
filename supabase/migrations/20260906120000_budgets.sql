-- Budgets — the first *prescriptive* number in the schema.
--
-- Everything the app stores today is descriptive: what was spent. A budget is
-- what you meant to spend, and that difference is why it needs its own table
-- rather than a column on an existing one.
--
-- What counts as spending against a budget is settled elsewhere and
-- deliberately not re-decided here: `expenses.kind = 'purchase'` (see
-- 20260903120000_transaction_kind.sql). The account debit that settles a
-- credit card is real money leaving a real account but is `kind='transfer'`,
-- so it can never blow a budget for money that was already counted when the
-- card was used. That was the single largest correctness risk in this feature
-- and s35 Part 2 removed it before this table existed.
--
-- Refunds: `kind='refund'` is in the constraint but no parser emits one yet,
-- so no such row exists. When a refund parser lands, the subtraction belongs
-- in src/modules/analytics/compute.ts, where the budgets page and the
-- analytics page inherit it together. Two summing paths would disagree within
-- a month and then no number in the app could be trusted.

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- NULL means the overall monthly budget; a value means that category's.
  -- One column rather than two tables: the two differ only in scope, and every
  -- query wants them together.
  category_id uuid references public.expense_categories (id) on delete cascade,

  amount numeric not null check (amount > 0),
  currency text not null default 'EGP',

  -- Check-constrained rather than a bare text column so 'weekly'/'annual' can
  -- be added later by widening the constraint, with no data migration.
  period text not null default 'monthly' check (period in ('monthly')),

  starts_on date not null,

  -- NULL end = applies until superseded. Editing a budget CLOSES this row and
  -- inserts a new one; it never mutates `amount` in place. Otherwise last
  -- month's "you were 12% over" stops reproducing the moment the limit is
  -- raised, and a budget you cannot reproduce is not a record of anything.
  ends_on date,

  created_at timestamptz not null default now(),

  -- An end before the start is not a closed budget, it is a typo.
  constraint budgets_period_order check (ends_on is null or ends_on >= starts_on)
);

comment on table public.budgets is
  'Prescriptive monthly spending limits. Spend is measured against '
  'expenses.kind = ''purchase'' only -- transfers and card settlements are '
  'excluded by the kind model, not by logic in this feature.';

-- Two PARTIAL unique indexes, not one plain one.
--
-- Only *open* budgets (ends_on is null) are constrained: closed rows are
-- history and must be allowed to pile up for the same category. Without this,
-- the "close and re-insert" edit above would be rejected by its own index on
-- the second edit.
--
-- Postgres treats NULLs as distinct in a unique index, so a single index over
-- (user_id, category_id) would NOT prevent two open overall budgets -- the
-- exact ambiguity that makes every downstream number meaningless. Hence the
-- two indexes: one for the NULL-category case, one for the rest.
create unique index budgets_one_open_overall_idx
  on public.budgets (user_id, period)
  where ends_on is null and category_id is null;

create unique index budgets_one_open_per_category_idx
  on public.budgets (user_id, category_id, period)
  where ends_on is null and category_id is not null;

create index budgets_user_id_idx on public.budgets (user_id);
create index budgets_category_id_idx on public.budgets (category_id);
-- The page's own query shape: this user's budgets, newest period first.
create index budgets_user_starts_idx on public.budgets (user_id, starts_on desc);

-- Same blanket own_rows policy every table in this schema uses.
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'budgets'
  ])
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own_rows" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;

-- Budgets have a live UI consumer (/budgets), and a budget edited on one
-- device should reach another without a reload -- same reasoning as sms_inbox.
alter publication supabase_realtime add table budgets;
