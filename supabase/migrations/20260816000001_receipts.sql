-- Receipt schema: what a scanned receipt actually contains, hung off
-- `expenses`. `expenses` stays the authoritative money record and is not
-- modified here — a receipt references an expense, never the reverse.

create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  normalized_name text not null,
  branch text,
  created_at timestamptz not null default now(),
  unique (user_id, normalized_name)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  normalized_name text not null,
  brand text,
  size_value numeric,
  size_unit text,
  created_at timestamptz not null default now(),
  unique (user_id, normalized_name, brand, size_value, size_unit)
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  expense_id uuid not null references public.expenses (id) on delete cascade,
  merchant_id uuid references public.merchants (id) on delete set null,
  client_ref uuid not null,
  document_type text check (document_type in ('receipt', 'invoice', 'bill', 'other')),
  image_url text,
  invoice_number text,
  issued_at date,
  due_at date,
  subtotal numeric,
  tax numeric,
  total numeric,
  currency text default 'EGP',
  extraction_confidence numeric,
  extraction_source text check (extraction_source in ('mock', 'ai', 'manual')),
  raw_extraction jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, client_ref)
);

create table public.receipt_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  receipt_id uuid not null references public.receipts (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  label text not null,
  quantity numeric,
  unit_price numeric,
  line_total numeric,
  discount numeric,
  category_id uuid references public.expense_categories (id) on delete set null,
  position int,
  created_at timestamptz not null default now()
);

create table public.price_observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  merchant_id uuid references public.merchants (id) on delete set null,
  receipt_item_id uuid not null references public.receipt_items (id) on delete cascade,
  unit_price numeric not null,
  normalized_unit_price numeric,
  normalized_unit text,
  observed_at date not null,
  currency text,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Indexes ─────────────────────────
-- Every foreign key, plus (user_id, observed_at) on price_observations.

create index merchants_user_id_idx on public.merchants (user_id);
create index products_user_id_idx on public.products (user_id);

create index receipts_user_id_idx on public.receipts (user_id);
create index receipts_expense_id_idx on public.receipts (expense_id);
create index receipts_merchant_id_idx on public.receipts (merchant_id);

create index receipt_items_user_id_idx on public.receipt_items (user_id);
create index receipt_items_receipt_id_idx on public.receipt_items (receipt_id);
create index receipt_items_product_id_idx on public.receipt_items (product_id);
create index receipt_items_category_id_idx on public.receipt_items (category_id);

create index price_observations_user_id_idx on public.price_observations (user_id);
create index price_observations_product_id_idx on public.price_observations (product_id);
create index price_observations_merchant_id_idx on public.price_observations (merchant_id);
create index price_observations_receipt_item_id_idx on public.price_observations (receipt_item_id);
create index price_observations_user_observed_idx on public.price_observations (user_id, observed_at);

-- ───────────────────────── RLS ─────────────────────────
-- Same pattern as 20260704000002_core_schema.sql: every table user-owned,
-- one blanket policy per table on user_id = auth.uid().

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'merchants', 'products',
    'receipts', 'receipt_items',
    'price_observations'
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
-- Follows 20260704000006_enable_realtime.sql — without this, useRealtime()
-- subscriptions on these tables never fire.

alter publication supabase_realtime add table
  merchants, products,
  receipts, receipt_items,
  price_observations;

-- ───────────────────────── save_receipt ─────────────────────────
-- One server-side call per scan. Supabase gives the browser no transaction,
-- so the six-table write (merchant upsert, expense, receipt, items, product
-- upserts, price observations) happens here instead, atomically. security
-- invoker means RLS still applies — this cannot write another user's rows.
--
-- Idempotent on (user_id, client_ref): a retried or double-clicked save
-- returns the existing expense_id and writes nothing new.
--
-- payload shape (the contract src/lib/types.ts's ExtractedReceipt and the
-- scanner's save path must match exactly — see Packet 4):
-- {
--   "client_ref": uuid,
--   "merchant": { "name": text, "branch"?: text } | null,
--   "document_type"?: 'receipt'|'invoice'|'bill'|'other',
--   "image_url"?: text, "invoice_number"?: text,
--   "issued_at"?: date, "due_at"?: date,
--   "subtotal"?: numeric, "tax"?: numeric, "total": numeric,
--   "currency"?: text,
--   "extraction_confidence"?: numeric,
--   "extraction_source"?: 'mock'|'ai'|'manual',
--   "raw_extraction"?: jsonb,
--   "category_id"?: uuid, "note"?: text, "spent_at"?: date,
--   "items": [{
--     "label": text, "quantity"?: numeric, "unit_price"?: numeric,
--     "line_total"?: numeric, "discount"?: numeric, "category_id"?: uuid,
--     "position"?: int,
--     "product"?: { "name": text, "brand"?: text, "size_value"?: numeric,
--                    "size_unit"?: text },
--     "normalized_unit_price"?: numeric, "normalized_unit"?: text
--   }]
-- }

create function public.save_receipt(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_client_ref uuid := (payload->>'client_ref')::uuid;
  v_existing_expense_id uuid;
  v_merchant jsonb := payload->'merchant';
  v_merchant_id uuid;
  v_expense_id uuid;
  v_receipt_id uuid;
  v_item jsonb;
  v_product jsonb;
  v_product_id uuid;
  v_receipt_item_id uuid;
  v_position int := 0;
begin
  if v_user_id is null then
    raise exception 'save_receipt requires an authenticated user';
  end if;

  select expense_id into v_existing_expense_id
  from public.receipts
  where user_id = v_user_id and client_ref = v_client_ref;

  if v_existing_expense_id is not null then
    return v_existing_expense_id;
  end if;

  if v_merchant is not null and coalesce(v_merchant->>'name', '') <> '' then
    insert into public.merchants (user_id, name, normalized_name, branch)
    values (
      v_user_id,
      v_merchant->>'name',
      lower(trim(v_merchant->>'name')),
      v_merchant->>'branch'
    )
    on conflict (user_id, normalized_name)
    do update set name = excluded.name, branch = excluded.branch
    returning id into v_merchant_id;
  end if;

  insert into public.expenses (user_id, category_id, amount, currency, note, spent_at)
  values (
    v_user_id,
    nullif(payload->>'category_id', '')::uuid,
    (payload->>'total')::numeric,
    coalesce(payload->>'currency', 'EGP'),
    payload->>'note',
    coalesce(nullif(payload->>'spent_at', '')::date, current_date)
  )
  returning id into v_expense_id;

  insert into public.receipts (
    user_id, expense_id, merchant_id, client_ref,
    document_type, image_url, invoice_number, issued_at, due_at,
    subtotal, tax, total, currency,
    extraction_confidence, extraction_source, raw_extraction
  )
  values (
    v_user_id, v_expense_id, v_merchant_id, v_client_ref,
    payload->>'document_type', payload->>'image_url', payload->>'invoice_number',
    nullif(payload->>'issued_at', '')::date, nullif(payload->>'due_at', '')::date,
    (payload->>'subtotal')::numeric, (payload->>'tax')::numeric, (payload->>'total')::numeric,
    coalesce(payload->>'currency', 'EGP'),
    (payload->>'extraction_confidence')::numeric, payload->>'extraction_source',
    payload->'raw_extraction'
  )
  returning id into v_receipt_id;

  for v_item in select * from jsonb_array_elements(coalesce(payload->'items', '[]'::jsonb))
  loop
    v_product := v_item->'product';
    v_product_id := null;

    if v_product is not null and coalesce(v_product->>'name', '') <> '' then
      insert into public.products (user_id, name, normalized_name, brand, size_value, size_unit)
      values (
        v_user_id,
        v_product->>'name',
        lower(trim(v_product->>'name')),
        v_product->>'brand',
        (v_product->>'size_value')::numeric,
        v_product->>'size_unit'
      )
      on conflict (user_id, normalized_name, brand, size_value, size_unit)
      do update set name = excluded.name
      returning id into v_product_id;
    end if;

    insert into public.receipt_items (
      user_id, receipt_id, product_id, label,
      quantity, unit_price, line_total, discount, category_id, position
    )
    values (
      v_user_id, v_receipt_id, v_product_id, v_item->>'label',
      (v_item->>'quantity')::numeric, (v_item->>'unit_price')::numeric,
      (v_item->>'line_total')::numeric, (v_item->>'discount')::numeric,
      nullif(v_item->>'category_id', '')::uuid,
      coalesce((v_item->>'position')::int, v_position)
    )
    returning id into v_receipt_item_id;

    if v_product_id is not null and (v_item->>'unit_price') is not null then
      insert into public.price_observations (
        user_id, product_id, merchant_id, receipt_item_id,
        unit_price, normalized_unit_price, normalized_unit, observed_at, currency
      )
      values (
        v_user_id, v_product_id, v_merchant_id, v_receipt_item_id,
        (v_item->>'unit_price')::numeric,
        (v_item->>'normalized_unit_price')::numeric,
        v_item->>'normalized_unit',
        coalesce(nullif(payload->>'issued_at', '')::date, current_date),
        coalesce(payload->>'currency', 'EGP')
      );
    end if;

    v_position := v_position + 1;
  end loop;

  return v_expense_id;
end;
$$;
