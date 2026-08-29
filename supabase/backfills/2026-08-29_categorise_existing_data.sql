-- One-off data backfill. NOT a migration, and deliberately not in
-- supabase/migrations/ — it maps specific merchant and item wording that only
-- exists in this account, so replaying it as schema history on a fresh
-- environment would be meaningless.
--
-- Why this is needed: src/lib/seed.ts never created expense categories, so
-- every expense and receipt line has category_id = null. That is the whole
-- reason the analytics page reported "100% Uncategorized" and why the Recent
-- Purchases category filter offers only "All". Session 16 added the eight
-- defaults to the seeder, but seedDefaults is gated on profiles.seeded, which
-- is already true for this account — so the seeder will never run again here.
--
-- Two parts, and both are needed:
--   1. create the category rows (mechanical — mirrors the seeder exactly)
--   2. assign them to existing expenses and receipt_items
--
-- Part 2 is a JUDGEMENT about your data, not a fact derived from it. The
-- mapping is written out in full below so you can read and edit it before
-- running anything. Nothing here guesses silently.
--
-- Safe to run more than once: categories are inserted only where absent, and
-- assignment only touches rows whose category_id is still null, so it will
-- never overwrite a category you set by hand.
--
-- Wrapped in a single DO block because `supabase db query --file` sends the
-- file as one prepared statement and rejects multi-command input. The block is
-- itself atomic — any failure rolls the whole thing back.
--
-- Run with:
--   supabase db query --file supabase/backfills/2026-08-29_categorise_existing_data.sql \
--     --db-url "postgresql://postgres.<ref>:<password>@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"

do $$
begin

  -- ── 1. Categories ──────────────────────────────────────────────────────
  -- For every user who has expenses but no categories. Colours are
  -- CHART_SERIES order, matching DEFAULT_CATEGORIES in src/lib/seed.ts so a
  -- category looks the same whether it was seeded or backfilled.

  insert into public.expense_categories (user_id, name, color, icon)
  select u.user_id, c.name, c.color, c.icon
  from (select distinct user_id from public.expenses) u
  cross join (values
    ('Groceries',  '#465fff', 'shopping-cart'),
    ('Fuel',       '#12b76a', 'fuel'),
    ('Pharmacy',   '#f79009', 'pill'),
    ('Utilities',  '#f04438', 'zap'),
    ('Dining',     '#7a5af8', 'utensils'),
    ('Transport',  '#ee46bc', 'car'),
    ('Household',  '#0ba5ec', 'house'),
    ('Other',      '#667085', 'package')
  ) as c(name, color, icon)
  where not exists (
    select 1 from public.expense_categories ec
    where ec.user_id = u.user_id and ec.name = c.name
  );

  -- ── 2a. Receipt line items ─────────────────────────────────────────────
  -- Matched on the label the receipt actually printed. Every branch that
  -- fires corresponds to a real line in this account:
  --
  --   Produce & bakery      -> Groceries
  --   Pantry items          -> Groceries
  --   Household supplies    -> Household
  --   92 Octane, 30L        -> Fuel
  --   Prescription refill   -> Pharmacy
  --   First-aid supplies    -> Pharmacy

  update public.receipt_items ri
  set category_id = ec.id
  from public.expense_categories ec
  where ec.user_id = ri.user_id
    and ri.category_id is null
    and ec.name = case
      when ri.label ~* 'produce|bakery|pantry|grocer|milk|bread' then 'Groceries'
      when ri.label ~* 'household|cleaning|detergent|tissue'     then 'Household'
      when ri.label ~* 'octane|fuel|petrol|diesel|benzin'        then 'Fuel'
      when ri.label ~* 'prescription|pharmac|first-aid|medicine' then 'Pharmacy'
      when ri.label ~* 'restaurant|cafe|coffee|meal'             then 'Dining'
      when ri.label ~* 'electric|water|internet|mobile|bill'     then 'Utilities'
      when ri.label ~* 'taxi|uber|careem|metro|parking'          then 'Transport'
      else null
    end;

  -- ── 2b. Expenses ───────────────────────────────────────────────────────
  -- Categorised by the merchant on the linked receipt. A receipt with mixed
  -- lines takes its dominant category:
  --
  --   Carrefour Market   -> Groceries  (142.00 + 155.00 grocery vs 189.50
  --                                     household; grocery by line count)
  --   Total Fuel Station -> Fuel
  --   El Ezaby Pharmacy  -> Pharmacy
  --   هايبر 1             -> Groceries  (hypermarket; this receipt carries no
  --                                     line items at all, so the merchant is
  --                                     the only thing there is to go on)

  update public.expenses e
  set category_id = ec.id
  -- expense_categories is a plain FROM item, not a JOIN: Postgres forbids
  -- referencing the UPDATE target (`e`) inside a JOIN's ON clause, so the
  -- user_id correlation has to live in WHERE.
  from public.receipts r
  join public.merchants m on m.id = r.merchant_id,
       public.expense_categories ec
  where r.expense_id = e.id
    and ec.user_id = e.user_id
    and e.category_id is null
    and ec.name = case
      when m.name ~* 'carrefour|hyper|هايبر|spinneys|seoudi|gourmet' then 'Groceries'
      when m.name ~* 'total|mobil|chillout|wataniya|shell|exxon'     then 'Fuel'
      when m.name ~* 'ezaby|pharmac|seif|roshdy|صيدلية'              then 'Pharmacy'
      when m.name ~* 'restaurant|cafe|coffee|starbucks|mcdonald'     then 'Dining'
      when m.name ~* 'uber|careem|swvl'                              then 'Transport'
      else null
    end;

end $$;

-- ── Check afterwards ─────────────────────────────────────────────────────
-- Expect 8 categories, and zero uncategorised expenses and line items:
--
--   select (select count(*) from expense_categories)                   as categories,
--          (select count(*) from expenses where category_id is null)   as uncat_expenses,
--          (select count(*) from receipt_items where category_id is null) as uncat_items;
