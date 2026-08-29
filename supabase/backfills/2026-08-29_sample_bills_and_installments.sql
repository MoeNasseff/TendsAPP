-- SAMPLE DATA — not a migration, and meant to be deleted.
--
-- Seeds one BNPL account, one credit card, one installment plan and six
-- recurring bills so the Bills page, the installments strip and the analytics
-- dashboard can be exercised against something. Requested explicitly so the
-- empty states are not the only thing verifiable; clean-up is expected.
--
-- Every row is tagged with a note/label containing "[sample]" so the teardown
-- at the bottom of this file can remove exactly these rows and nothing else.
--
-- TEARDOWN (run this to undo everything below):
--   delete from public.recurring_bills where note like '%[sample]%';
--   delete from public.installment_plans where description like '%[sample]%';
--   delete from public.payment_methods where label like '%[sample]%';
--
-- Deleting the payment method cascades nothing: installment_plans references
-- it with ON DELETE RESTRICT, so plans must go first — the order above matters.

do $$
declare
  v_user uuid;
  v_valu uuid;
  v_cib uuid;
  v_plan uuid;
  v_cat_utility uuid;
  v_cat_household uuid;
  v_today date := current_date;
begin
  select user_id into v_user from public.expenses limit 1;
  if v_user is null then
    raise exception 'no user found — sign in and record at least one expense first';
  end if;

  select id into v_cat_utility from public.expense_categories
    where user_id = v_user and name = 'Utilities' limit 1;
  select id into v_cat_household from public.expense_categories
    where user_id = v_user and name = 'Household' limit 1;

  -- ── Funding sources ────────────────────────────────────────────────────
  insert into public.payment_methods (user_id, kind, provider_slug, label, credit_limit, currency)
  values (v_user, 'bnpl', 'valu', 'ValU [sample]', 30000, 'EGP')
  returning id into v_valu;

  insert into public.payment_methods (user_id, kind, provider_slug, label, network, issuer, last4, credit_limit, currency)
  values (v_user, 'credit_card', 'cib', 'CIB Titanium [sample]', 'visa', 'CIB', '4417', 75000, 'EGP')
  returning id into v_cib;

  -- ── One installment plan, mid-way through ──────────────────────────────
  -- Started five months ago so the schedule has both paid and outstanding
  -- instalments and the progress figures are not trivially 0% or 100%.
  insert into public.installment_plans (
    user_id, payment_method_id, description,
    principal, fees, total_payable, months, monthly_amount,
    started_on, first_due_on, status
  )
  values (
    v_user, v_valu, 'Laptop [sample]',
    24000, 1800, 25800, 12, 2150,
    (v_today - interval '5 months')::date,
    (v_today - interval '4 months')::date,
    'active'
  )
  returning id into v_plan;

  -- The schedule is built inline rather than by calling
  -- generate_installment_schedule(). That function is `security invoker` and
  -- reads auth.uid(), which is null on a direct postgres connection — it is
  -- built for the browser, and refusing here is it working correctly.
  -- Same rounding rule: the final instalment absorbs the remainder.
  insert into public.installment_payments (user_id, plan_id, seq, due_on, amount)
  select
    v_user,
    v_plan,
    i,
    ((v_today - interval '4 months') + ((i - 1) * interval '1 month'))::date,
    case when i = 12 then 25800 - (round(2150, 2) * 11) else round(2150, 2) end
  from generate_series(1, 12) as i;

  -- Mark the instalments that have already come due as paid.
  update public.installment_payments
  set status = 'paid', paid_on = due_on, paid_amount = amount
  where plan_id = v_plan and due_on < v_today;

  -- ── Recurring bills ────────────────────────────────────────────────────
  -- Electricity and water are variable: amount stays null on purpose, which
  -- is what the UI renders as "Varies" rather than inventing a figure.
  insert into public.recurring_bills
    (user_id, name, kind, category_id, payment_method_id, amount, is_variable,
     currency, interval_unit, interval_count, next_due_on, auto_pay, note)
  values
    (v_user, 'Electricity', 'utility', v_cat_utility, null,
     null, true, 'EGP', 'month', 1, (v_today + interval '6 days')::date, false, '[sample]'),
    (v_user, 'Water', 'utility', v_cat_utility, null,
     null, true, 'EGP', 'month', 1, (v_today + interval '11 days')::date, false, '[sample]'),
    (v_user, 'Internet — WE Fibre', 'subscription', v_cat_utility, v_cib,
     650, false, 'EGP', 'month', 1, (v_today + interval '3 days')::date, true, '[sample]'),
    (v_user, 'Gardener', 'service', v_cat_household, null,
     1200, false, 'EGP', 'month', 1, (v_today - interval '2 days')::date, false, '[sample]'),
    (v_user, 'Pool cleaner', 'service', v_cat_household, null,
     900, false, 'EGP', 'month', 1, (v_today + interval '17 days')::date, false, '[sample]'),
    (v_user, 'Car insurance', 'insurance', null, v_cib,
     8400, false, 'EGP', 'year', 1, (v_today + interval '2 months')::date, false, '[sample]');

end $$;
