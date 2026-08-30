-- Bank/payment SMS ingestion inbox.
--
-- A text from a bank is a notification, not a ledger entry. Nothing in this
-- migration or the `sms-ingest` edge function writes to `expenses` -- every
-- row here is reviewed and accepted by hand on /inbox, because
-- auto-committing a mis-parsed amount would silently corrupt every number
-- the analytics engine derives from `expenses`.
--
-- `ingest_tokens` is the credential a Shortcut authenticates with. It cannot
-- hold a Supabase session -- there is no login flow on an iOS automation --
-- so this is a long-lived per-user secret, stored hashed like a password,
-- sent in a custom header, and revocable independently of the account's own
-- credentials.

create table public.ingest_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- SHA-256 hex digest of the raw token. The raw value is shown once, at
  -- creation, and never stored or logged anywhere again.
  token_hash text not null unique,
  label text,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.sms_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Nullable so a future retention job can clear the text while the parsed
  -- result and the audit trail (received_at, status, expense_id) survive.
  raw_text text,
  -- The alphanumeric sender ID as the phone reported it, e.g. 'CIB', 'ValU'.
  sender_label text,
  received_at timestamptz not null,
  source text not null check (source in ('ios-automation', 'share-sheet', 'manual', 'email')),
  -- sha256(user_id || normalized(text)). The whole defence against an iOS
  -- automation firing twice for one message -- once per matched keyword.
  dedupe_hash text not null,

  parsed_amount numeric,
  parsed_currency text,
  parsed_direction text check (parsed_direction in ('debit', 'credit')),
  parsed_merchant_raw text,
  parsed_last4 text check (parsed_last4 ~ '^[0-9]{4}$'),
  parsed_occurred_at timestamptz,
  parsed_balance numeric,
  parse_method text check (parse_method in ('regex', 'ai', 'none')),
  parse_confidence numeric,
  -- Which parser build produced this row, so a later fix can find and
  -- re-parse exactly the rows a given version handled.
  parser_version text,

  matched_merchant_id uuid references public.merchants (id) on delete set null,
  suggested_category_id uuid references public.expense_categories (id) on delete set null,
  suggested_payment_method_id uuid references public.payment_methods (id) on delete set null,

  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'ignored', 'unparsed')),
  expense_id uuid references public.expenses (id) on delete set null,

  created_at timestamptz not null default now(),
  unique (user_id, dedupe_hash)
);

-- ───────────────────────── Indexes ─────────────────────────

create index ingest_tokens_user_id_idx on public.ingest_tokens (user_id);

create index sms_inbox_user_id_idx on public.sms_inbox (user_id);
create index sms_inbox_matched_merchant_id_idx on public.sms_inbox (matched_merchant_id);
create index sms_inbox_suggested_category_id_idx on public.sms_inbox (suggested_category_id);
create index sms_inbox_suggested_payment_method_id_idx on public.sms_inbox (suggested_payment_method_id);
create index sms_inbox_expense_id_idx on public.sms_inbox (expense_id);
-- The inbox page's own query shape: everything for a user, newest first.
create index sms_inbox_user_received_idx on public.sms_inbox (user_id, received_at desc);

-- ───────────────────────── RLS ─────────────────────────
-- Same pattern as every prior migration: one blanket own_rows policy per
-- table. The ingest endpoint writes as service_role and bypasses this
-- entirely -- it authenticates the caller itself, via the token, before it
-- ever touches these tables.

do $$
declare
  t text;
begin
  for t in select unnest(array['ingest_tokens', 'sms_inbox'])
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own_rows" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;

-- ───────────────────────── Realtime ─────────────────────────
-- Only sms_inbox: a text landing should update /inbox live. ingest_tokens has
-- no live UI consumer yet -- there is no token-management screen in this
-- packet -- so it is left off the publication until one exists.

alter publication supabase_realtime add table sms_inbox;
