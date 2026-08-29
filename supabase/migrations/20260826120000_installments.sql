-- Installments and funding sources.
--
-- Two things share one table because they behave identically for this app's
-- purposes: a BNPL account (ValU, Sympl, Aman, Contact) and a bank credit
-- card. Both are a source of funds with a limit that can carry installment
-- plans. `kind` tells them apart; `provider_slug` drives the logo and brand
-- colour in the UI.
--
-- SECURITY, non-negotiable: there is no column here for a full card number,
-- CVV, PIN, or online-banking credential, and none may be added. `last4`
-- exists only so a user can tell two of their own cards apart. A personal
-- finance app that warehouses PANs is a liability, not a feature.

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('bnpl', 'credit_card', 'debit_card', 'cash', 'bank_transfer')),
  -- 'valu' | 'sympl' | 'cib' | 'nbe' | … resolved against the client-side
  -- provider registry. Free text rather than an enum so adding a provider is
  -- a UI change, not a migration.
  provider_slug text,
  label text not null,
  network text check (network in ('visa', 'mastercard', 'meeza', 'amex')),
  issuer text,
  last4 text check (last4 ~ '^[0-9]{4}$'),
  -- Nullable on purpose, and it must stay nullable: "limit not recorded" and
  -- "limit is zero" are different facts. Utilisation maths depends on telling
  -- them apart, so a null here yields insufficient_data, never 0%.
  credit_limit numeric check (credit_limit >= 0),
  currency text not null default 'EGP',
  statement_day int check (statement_day between 1 and 31),
  due_day int check (due_day between 1 and 31),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.installment_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- restrict, not cascade: deleting a card must never silently erase the
  -- record of what was bought on it.
  payment_method_id uuid not null references public.payment_methods (id) on delete restrict,
  expense_id uuid references public.expenses (id) on delete set null,
  receipt_id uuid references public.receipts (id) on delete set null,
  merchant_id uuid references public.merchants (id) on delete set null,
  description text not null,
  principal numeric not null check (principal >= 0),
  -- As the provider actually charged it. Never recomputed from an APR —
  -- Tend does not know anyone's rate and must not infer one.
  fees numeric not null default 0 check (fees >= 0),
  total_payable numeric not null check (total_payable >= 0),
  months int not null check (months > 0),
  monthly_amount numeric not null check (monthly_amount >= 0),
  started_on date not null default current_date,
  first_due_on date not null,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled', 'late')),
  created_at timestamptz not null default now()
);

create table public.installment_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid not null references public.installment_plans (id) on delete cascade,
  seq int not null check (seq > 0),
  due_on date not null,
  amount numeric not null check (amount >= 0),
  paid_on date,
  paid_amount numeric check (paid_amount >= 0),
  status text not null default 'scheduled' check (status in ('scheduled', 'paid', 'late', 'skipped')),
  created_at timestamptz not null default now(),
  unique (plan_id, seq)
);

-- ───────────────────────── Indexes ─────────────────────────
-- Every foreign key, plus the two lookups the dashboard actually runs:
-- upcoming dues by date, and plans by method.

create index payment_methods_user_id_idx on public.payment_methods (user_id);

create index installment_plans_user_id_idx on public.installment_plans (user_id);
create index installment_plans_payment_method_id_idx on public.installment_plans (payment_method_id);
create index installment_plans_expense_id_idx on public.installment_plans (expense_id);
create index installment_plans_receipt_id_idx on public.installment_plans (receipt_id);
create index installment_plans_merchant_id_idx on public.installment_plans (merchant_id);

create index installment_payments_user_id_idx on public.installment_payments (user_id);
create index installment_payments_plan_id_idx on public.installment_payments (plan_id);
create index installment_payments_user_due_idx on public.installment_payments (user_id, due_on);

-- ───────────────────────── RLS ─────────────────────────
-- Same pattern as 20260704000002_core_schema.sql and 20260816000001_receipts.sql.

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'payment_methods',
    'installment_plans',
    'installment_payments'
  ])
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own_rows" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;

-- ───────────────────────── Realtime ─────────────────────────
-- Without this, useRealtime() subscriptions on these tables never fire.

alter publication supabase_realtime add table
  payment_methods,
  installment_plans,
  installment_payments;

-- ───────────────────────── generate_installment_schedule ─────────────────────────
-- One call instead of N inserts from the browser. Follows save_receipt's
-- pattern: security invoker so RLS still applies, and idempotent — calling it
-- twice for the same plan writes nothing the second time.
--
-- Rounding: every instalment is the plan's monthly_amount except the last,
-- which absorbs the remainder so the schedule sums to total_payable exactly.
-- Twelve instalments of a rounded monthly figure otherwise drift away from the
-- total, and a finance app whose schedule does not add up is worse than no
-- schedule at all.

create function public.generate_installment_schedule(p_plan_id uuid)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan public.installment_plans;
  v_existing int;
  v_i int;
  v_amount numeric;
  v_running numeric := 0;
begin
  if v_user_id is null then
    raise exception 'generate_installment_schedule requires an authenticated user';
  end if;

  select * into v_plan
  from public.installment_plans
  where id = p_plan_id and user_id = v_user_id;

  if not found then
    raise exception 'plan not found';
  end if;

  select count(*) into v_existing
  from public.installment_payments
  where plan_id = p_plan_id;

  if v_existing > 0 then
    return 0;
  end if;

  for v_i in 1..v_plan.months loop
    if v_i = v_plan.months then
      v_amount := v_plan.total_payable - v_running;
    else
      v_amount := round(v_plan.monthly_amount, 2);
      v_running := v_running + v_amount;
    end if;

    insert into public.installment_payments (user_id, plan_id, seq, due_on, amount)
    values (
      v_user_id,
      p_plan_id,
      v_i,
      (v_plan.first_due_on + ((v_i - 1) * interval '1 month'))::date,
      v_amount
    );
  end loop;

  return v_plan.months;
end;
$$;
