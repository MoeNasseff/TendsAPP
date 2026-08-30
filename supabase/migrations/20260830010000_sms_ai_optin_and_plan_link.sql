-- Two small additions Session 27 needs that Session 24's schema did not
-- anticipate, since the AI fallback and instalment-linking requirements
-- were only scoped in detail once S27 started.

-- Per-user consent for sending a bank/payment text's raw content to a
-- third-party AI provider when no deterministic parser could read it. Off by
-- default: the deterministic path (supabase/functions/sms-ingest/parsers/)
-- never leaves this database, and a user who has not explicitly agreed to
-- the AI path must not have their SMS content sent anywhere without asking.
alter table public.profiles
  add column sms_ai_parsing_enabled boolean not null default false;

-- Where an instalment-style message is linked to an existing plan.
-- Deliberately references installment_plans, never creates one: a liability
-- must not appear in the app on the strength of a text message. on delete
-- set null, not cascade -- deleting a plan must not delete the SMS that
-- once pointed at it.
alter table public.sms_inbox
  add column matched_installment_plan_id uuid references public.installment_plans (id) on delete set null;

create index sms_inbox_matched_installment_plan_id_idx
  on public.sms_inbox (matched_installment_plan_id);
