-- Transaction kind: separating spending from the movements of money that
-- merely settle it.
--
-- The problem this fixes is a real double-count, not a hypothetical one. Spend
-- on credit card ...8537 and settle it from account ...6169 and the bank sends
-- THREE messages describing ONE purchase: the card charge (the actual spend),
-- the card-payment credit that clears the card, and the account debit that
-- funds it. Counting the third as spending inflates every total by the full
-- value of every purchase the card has ever made.
--
-- `direction` (S25) already stops the second one -- a credit is never an
-- expense. It cannot stop the third: that IS a genuine debit from the account.
-- The message reads only "with transfer to another account" and never names
-- the destination, so paying your own card and sending money to a person are
-- textually identical. Direction cannot separate them. `kind` can.
--
-- Spending totals -- and every budget in S34 -- sum `purchase` only.

-- `default 'purchase'` is what makes this migration safe to apply to a live
-- table: every row already in `expenses` keeps counting exactly as it counts
-- today. Nothing on screen moves until something is deliberately marked
-- otherwise, and today nothing is.
alter table public.expenses
  add column kind text not null default 'purchase'
  check (kind in ('purchase', 'transfer', 'card_payment', 'refund', 'withdrawal'));

comment on column public.expenses.kind is
  'What this row IS, as distinct from which way the money went. Only '
  '''purchase'' is spending; analytics and budgets sum that value alone. '
  'A ''transfer'' is real money leaving a real account, but it settles a debt '
  'already counted elsewhere -- recording it keeps the ledger honest while '
  'keeping it out of every total.';

-- Partial index, not a plain one: every query that cares about `kind` is
-- asking for purchases, and today that is ~100% of rows. A full index would
-- be a second copy of the table for no gain. This one stays small if the
-- non-purchase share ever grows, and is the shape `expenses_user_spent_idx`
-- cannot serve on its own.
create index expenses_user_kind_purchase_idx
  on public.expenses (user_id, spent_at desc)
  where kind = 'purchase';

-- `suggested_kind` is nullable on purpose and carries no default. NULL means
-- "no parser was confident enough to say", which is a different statement from
-- "this is a purchase" -- the AI path (ai-parse.ts) knows no message shape and
-- must land in the first case, not silently in the second.
alter table public.sms_inbox
  add column suggested_kind text
    check (suggested_kind in ('purchase', 'transfer', 'card_payment', 'refund', 'withdrawal'));

-- The settlement this row was matched against: an account debit points at the
-- card_payment credit it funds, and that credit points back. Self-referential
-- and deliberately symmetric, so either row can explain itself in the review
-- UI without a second lookup.
--
-- `on delete set null` rather than cascade -- unpairing two messages must
-- never delete one of them. They are independent records of independent texts
-- that actually arrived; the pairing is an inference laid over them.
alter table public.sms_inbox
  add column paired_inbox_id uuid references public.sms_inbox (id) on delete set null;

comment on column public.sms_inbox.paired_inbox_id is
  'The counterpart message in a card-settlement pair, matched on equal amount '
  'within +/-3 days. Non-null is the ONLY condition under which a transfer is '
  'auto-classified without asking: an unpaired account debit is a genuine '
  'guess (a transfer to a person looks identical to real spending) and still '
  'goes to the user.';

create index sms_inbox_paired_inbox_id_idx on public.sms_inbox (paired_inbox_id);

-- The pairing lookup's own query shape: unpaired rows for one user, filtered
-- by amount and date. Without this the pass degrades into a full scan of the
-- user's inbox on every single ingest.
create index sms_inbox_pairing_idx
  on public.sms_inbox (user_id, parsed_amount, parsed_occurred_at)
  where paired_inbox_id is null;

-- No RLS changes. Both tables already carry the blanket own_rows policy from
-- their creating migrations, and a new column on an existing table inherits
-- it -- policies are per-table, not per-column.
