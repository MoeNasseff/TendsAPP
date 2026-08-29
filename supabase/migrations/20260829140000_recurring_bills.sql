-- Recurring bills and subscriptions: electricity, water, internet, the
-- gardener, the pool cleaner, a gym membership, rent, insurance.
--
-- Why this is not `installment_plans`: an installment plan is a fixed,
-- finite obligation — a known principal over a known number of months, and
-- then it ends. A utility bill is open-ended and often variable, with no
-- principal and no final payment. Modelling the second as the first would
-- force a fake `months` and a fake `total_payable` onto every bill.
--
-- Why this is not `expenses`: an expense is a payment that already happened.
-- These are commitments that recur, most of whose occurrences are still in
-- the future. `expenses` has no interval, and giving it one would change the
-- meaning of every existing row.
--
-- Loans can be modelled either way. A structured loan with a fixed tenor
-- belongs in `installment_plans`; an open-ended or revolving one fits here
-- with kind = 'loan'.

create table public.recurring_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind text not null default 'utility' check (kind in (
    'utility', 'subscription', 'service', 'rent', 'insurance', 'loan', 'other'
  )),
  merchant_id uuid references public.merchants (id) on delete set null,
  category_id uuid references public.expense_categories (id) on delete set null,
  -- How it gets paid. Nullable: plenty of bills are settled in cash.
  payment_method_id uuid references public.payment_methods (id) on delete set null,

  -- Nullable, and it must stay nullable. Electricity and water are variable
  -- by nature; storing a made-up "typical" amount as though it were the bill
  -- would put a fabricated number on a finance dashboard. `is_variable` says
  -- which case this is so the UI can ask for the real figure at pay time.
  amount numeric check (amount >= 0),
  is_variable boolean not null default false,
  currency text not null default 'EGP',

  interval_unit text not null default 'month' check (interval_unit in ('week', 'month', 'quarter', 'year')),
  interval_count int not null default 1 check (interval_count > 0),
  next_due_on date not null,

  active boolean not null default true,
  auto_pay boolean not null default false,
  note text,
  created_at timestamptz not null default now()
);

-- One row per occurrence, created as bills come due. Keeps history after the
-- bill's own next_due_on has rolled forward, and links to the expense that
-- actually settled it so the money is counted once, in `expenses`, and never
-- double-counted here.
create table public.recurring_bill_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  bill_id uuid not null references public.recurring_bills (id) on delete cascade,
  expense_id uuid references public.expenses (id) on delete set null,
  due_on date not null,
  amount numeric check (amount >= 0),
  paid_on date,
  paid_amount numeric check (paid_amount >= 0),
  status text not null default 'scheduled' check (status in ('scheduled', 'paid', 'late', 'skipped')),
  created_at timestamptz not null default now(),
  unique (bill_id, due_on)
);

-- ───────────────────────── Indexes ─────────────────────────

create index recurring_bills_user_id_idx on public.recurring_bills (user_id);
create index recurring_bills_merchant_id_idx on public.recurring_bills (merchant_id);
create index recurring_bills_category_id_idx on public.recurring_bills (category_id);
create index recurring_bills_payment_method_id_idx on public.recurring_bills (payment_method_id);
create index recurring_bills_user_due_idx on public.recurring_bills (user_id, next_due_on) where active;

create index recurring_bill_payments_user_id_idx on public.recurring_bill_payments (user_id);
create index recurring_bill_payments_bill_id_idx on public.recurring_bill_payments (bill_id);
create index recurring_bill_payments_expense_id_idx on public.recurring_bill_payments (expense_id);
create index recurring_bill_payments_user_due_idx on public.recurring_bill_payments (user_id, due_on);

-- ───────────────────────── RLS ─────────────────────────

do $$
declare
  t text;
begin
  for t in select unnest(array['recurring_bills', 'recurring_bill_payments'])
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own_rows" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;

-- ───────────────────────── Realtime ─────────────────────────

alter publication supabase_realtime add table
  recurring_bills,
  recurring_bill_payments;

-- ───────────────────────── advance_recurring_bill ─────────────────────────
-- Records one occurrence as paid and rolls next_due_on forward by exactly one
-- interval. Server-side so the two writes cannot half-succeed, and idempotent
-- on (bill_id, due_on) so a double-tap does not bill twice.
--
-- next_due_on advances from the occurrence's own due date, never from today.
-- Advancing from today would let a bill paid three days late silently shift
-- its whole future schedule three days later, month after month.

create function public.advance_recurring_bill(
  p_bill_id uuid,
  p_paid_amount numeric,
  p_paid_on date default current_date,
  p_expense_id uuid default null
)
returns date
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_bill public.recurring_bills;
  v_step interval;
begin
  if v_user_id is null then
    raise exception 'advance_recurring_bill requires an authenticated user';
  end if;

  select * into v_bill
  from public.recurring_bills
  where id = p_bill_id and user_id = v_user_id;

  if not found then
    raise exception 'bill not found';
  end if;

  insert into public.recurring_bill_payments (
    user_id, bill_id, expense_id, due_on, amount, paid_on, paid_amount, status
  )
  values (
    v_user_id, p_bill_id, p_expense_id, v_bill.next_due_on,
    coalesce(p_paid_amount, v_bill.amount), p_paid_on, p_paid_amount, 'paid'
  )
  on conflict (bill_id, due_on) do update
    set paid_on = excluded.paid_on,
        paid_amount = excluded.paid_amount,
        expense_id = coalesce(excluded.expense_id, public.recurring_bill_payments.expense_id),
        status = 'paid';

  v_step := case v_bill.interval_unit
    when 'week'    then make_interval(weeks  => v_bill.interval_count)
    when 'month'   then make_interval(months => v_bill.interval_count)
    when 'quarter' then make_interval(months => v_bill.interval_count * 3)
    when 'year'    then make_interval(years  => v_bill.interval_count)
  end;

  update public.recurring_bills
  set next_due_on = (v_bill.next_due_on + v_step)::date
  where id = p_bill_id;

  return (v_bill.next_due_on + v_step)::date;
end;
$$;
