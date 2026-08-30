# Getting bank texts into Tend automatically (iOS Shortcuts)

Written for an iPhone 14 Pro Max on iOS 18 — every step below was checked
against what iOS 18 actually offers. There is no Action Button on this model
(that's 15 Pro and later); everything here uses the Shortcuts app instead.

**What this does, and what it does not do.** A bank or payment text arrives,
an automation on your phone forwards its text to Tend, and it lands on
[/inbox](/inbox) — nothing more happens on its own. Every message still needs
your review before it becomes a real expense; see `tasks/handoff-4.md` for
why that's a hard requirement, not a missing feature.

**Reliability, stated plainly.** With the settings below, this runs with no
tap required — confirmed working on iOS 16 and later. There's one known
exception: with the phone *locked*, some users report iOS still shows a
confirmation banner despite "Run Immediately" being on ([source](https://talk.automators.fm/t/how-can-i-have-shortcut-automation-run-without-dialog-prompt-when-phone-is-locked/19111),
March 2026). If that happens to you, Step 5 below is the fallback — it takes
two taps and always works.

---

## Step 1 — Get a token

Tend needs a way to know the request is really from you. It can't use your
account password — a phone automation has nothing to log in with — so it
uses a separate, revocable credential instead.

1. Open Tend → **Settings**.
2. Under **Shortcut access tokens**, type a label (e.g. "iPhone Shortcut")
   and tap **New token**.
3. A long string appears once, with a **Copy** button. Copy it now — closing
   that box is the last time you'll see it. If you lose it, revoke it and
   make a new one; there's no way to recover a lost token.

Keep it somewhere you can paste from while building the shortcut in Step 2 —
Apple Notes works fine for the few minutes this takes; just delete the note
once the shortcut is built.

## Step 2 — Build the "Send to Tend" shortcut

This is the one shortcut every automation in Step 4 will call.

1. Open the **Shortcuts** app → **Shortcuts** tab → **+** (new shortcut).
2. Name it **Send to Tend**.
3. Add action **Get Contents of URL**.
4. Tap the URL field and enter:
   ```
   https://qlfzhuwfexvksznahpmy.supabase.co/functions/v1/sms-ingest
   ```
5. Tap **Show More** to reveal Method, Headers, and Request Body.
6. **Method**: `POST`.
7. **Headers** — add two:
   | Key | Value |
   |---|---|
   | `Content-Type` | `application/json` |
   | `x-tend-token` | *(paste the token from Step 1)* |
8. **Request Body**: set the type to **JSON**, then add these fields:
   | Key | Value |
   |---|---|
   | `text` | *(tap the field, choose the magic-variable icon, insert* **Shortcut Input** *)* |
   | `source` | `ios-automation` |

   `Shortcut Input` is what makes this one shortcut work from both an
   automation (Step 4) and the Share Sheet (Step 5) — whichever one hands it
   text, that text becomes the `text` field.
9. Tap the shortcut's settings (the **ⓘ** icon at the bottom) and turn on
   **Show in Share Sheet**, with input type set to accept **Text**. This is
   what makes Step 5's fallback possible — skip it and only the automation
   path (Step 4) will work.
10. Save.

**Verify this step alone** before moving on: run the shortcut manually from
the Shortcuts app once (it will prompt for input since there's no automation
feeding it yet — type any text). Check `/inbox` in Tend within a few seconds.
If it doesn't appear, stop here and check: the token was pasted without
extra spaces, the URL has no typo, and the header key is exactly
`x-tend-token` (case doesn't matter, spelling does).

## Step 3 — Find your trigger phrase per bank

iOS cannot filter automations by a bank's sender name — banks send from
alphanumeric IDs like `CIB`, and those can't be saved as a contact
([Apple Developer Forums](https://developer.apple.com/forums/thread/705659)).
The supported workaround is filtering by **message content** instead: a short
phrase that appears in *every* transaction text from that sender and in
*none* of its OTP or promotional texts.

This phrase has to come from a real message, not a guess — see the
**Trigger phrases** table in `tasks/sms-corpus.md`. That table is filled in
once real messages have been collected and Session 25's parsers are built
against them. Use whatever it lists for each bank; don't invent your own
ahead of that, since a wrong phrase either never fires or fires on the wrong
texts.

## Step 4 — One automation per bank

Repeat this whole section once per sender in the trigger-phrase table.

1. Shortcuts app → **Automation** tab → **+** → **Create Personal Automation**.
2. Choose **Message**.
3. Leave **Sender** empty. Tap **Message Contains** and enter that bank's
   trigger phrase from Step 3. (Leaving Sender empty and setting only
   Message Contains is deliberate — see Step 3.)
4. Tap **Next**.
5. Add action **Run Shortcut** → choose **Send to Tend**.
6. Tap **Next**, then on the summary screen:
   - Turn **off** "Ask Before Running" / set it to **Run Immediately**.
   - Turn **off** "Notify When Run".

   Both matter: leaving either on means a banner appears on your phone (or a
   thief's, if it's ever stolen) asking whether to run it, which is not
   hands-off and defeats the point.
7. Save.

## Step 5 — The manual fallback

For the locked-screen edge case, or for any message whose keyword doesn't
match (an unusual format, a new sender):

1. Long-press the message in Messages → **Copy**, or select the text.
2. Tap **Share** → find **Send to Tend** in the list (this is why Step 2.9
   mattered).
3. It runs the same shortcut with the copied text as input.

## Step 6 — Confirm it actually worked

Send yourself (or wait for) a real bank text matching one of your trigger
phrases. Within a few seconds it should appear on `/inbox`:

- If it shows with a parsed amount and merchant — the deterministic parser
  for that bank (Session 25) understood it.
- If it shows as **"Not parsed"** — the message arrived and was stored
  correctly, but nothing could read it yet. That's still success at the
  ingestion layer; parsing is separate. It stays safely in your inbox either
  way, and you can enter the expense by hand from there.

## Revoking or rotating a token

Settings → **Shortcut access tokens** → **Revoke** next to the old one, then
**New token** for a fresh one. Update the `x-tend-token` header in the **Send
to Tend** shortcut (Step 2.7) to the new value — every automation built in
Step 4 calls that one shortcut, so this is the only place you need to change
it.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Nothing appears on `/inbox` at all | Token was revoked or mistyped — test Step 2 manually first |
| Automation never fires | "Run Immediately" or "Notify When Run" wasn't set correctly in Step 4.6 — check Automation → tap the automation → confirm both |
| Same message appears once, not twice, even though it matched two automations | Correct — the server deduplicates identical messages, so this is expected, not a bug |
| A confirmation banner appears when the phone is locked | The known iOS limitation from the top of this doc — use Step 5 for that message |
| A declined/OTP/promo text created something in the inbox | It's expected to still appear, marked unparsed or with no amount — it must never silently create an expense on its own; if a *parsed* row with an amount appeared for a message that clearly wasn't a transaction, that's a real bug worth reporting |
