-- Balance observations for payment methods — accounts and cards alike.
--
-- Accounts are payment_methods rows, not a separate table. `kind` already
-- has a `bank_transfer` value in its check constraint
-- (20260826120000_installments.sql) with no other use for it, so a CIB
-- current account or an NBE account gets its own payment_methods row the
-- same way a debit or credit card does. This is the "less work, no new
-- table" option tasks/handoff-4.md's S32a section asked to pick and justify.
--
-- `available_credit` and `balance` are separate columns on purpose. One
-- nullable column reused for both is the exact conflation this table exists
-- to avoid — sms_inbox.parsed_balance already suffers from it, since S25's
-- parsers put available credit there for CIB/FAB and a real cash balance
-- there for NBE. Whoever writes a row here (S32b) is responsible for
-- routing by payment_methods.kind: a debit_card/bank_transfer reading is a
-- balance, a credit_card reading is available_credit. Not enforced as a
-- mutual-exclusion check here — a future 'statement' observation may
-- legitimately carry both — but only one is expected in the 'sms' case.
--
-- Append-only: there is no update path. A method's current balance is
-- simply its latest row by observed_at, so a bad reading can be superseded
-- by a corrected one without losing what the bank actually said.
--
-- Nothing is seeded. The real CIB/NBE payment_methods rows and their first
-- balances are the user's to enter.

create table public.account_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- restrict, matching installment_plans' own FK to payment_methods:
  -- deleting a card must never silently erase the record of what it held.
  payment_method_id uuid not null references public.payment_methods (id) on delete restrict,
  -- Debit cash. Can be negative (an overdrawn account), so no >= 0 check.
  balance numeric,
  -- Credit still borrowable. Always >= 0, even for a card in credit — an
  -- overpaid card's available_credit exceeds its limit, it never goes
  -- negative itself (see tasks/handoff-4.md's S32 "red rule" section).
  available_credit numeric check (available_credit >= 0),
  source text not null check (source in ('sms', 'manual', 'statement')),
  observed_at timestamptz not null,
  -- Which message produced this, when source = 'sms'. Nullable and
  -- set-null-on-delete: sms_inbox rows aren't expected to be deleted in
  -- normal operation (retention clears raw_text, not the row), but a
  -- balance observation must survive regardless if one ever is.
  sms_inbox_id uuid references public.sms_inbox (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Indexes ─────────────────────────

create index account_balances_user_id_idx on public.account_balances (user_id);
create index account_balances_payment_method_id_idx on public.account_balances (payment_method_id);
create index account_balances_sms_inbox_id_idx on public.account_balances (sms_inbox_id);
-- The query every "current balance" lookup runs: latest observation per
-- method. Same reasoning as recurring_bills_user_due_idx — index the query
-- the dashboard actually makes, not just the foreign keys.
create index account_balances_method_observed_idx on public.account_balances (payment_method_id, observed_at desc);

-- ───────────────────────── RLS ─────────────────────────
-- Same pattern as 20260826120000_installments.sql.

do $$
declare
  t text;
begin
  for t in select unnest(array['account_balances'])
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own_rows" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;

-- ───────────────────────── Realtime ─────────────────────────

alter publication supabase_realtime add table account_balances;
