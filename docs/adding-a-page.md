# Adding, removing and wiring a page

A line-by-line runbook for this codebase. Everything below is what the code
actually does today — file paths and line numbers are current as of the
`/signup` work.

---

## 0. Decide which of the two kinds of page you are adding

There are exactly two shapes in this app, and they are wired differently.

| | **Standalone page** | **Module page** |
|---|---|---|
| Examples | `/login`, `/signup`, `/` (Landing) | `/expenses`, `/dog`, `/car`, `/meds`, `/body`, `/settings` |
| Signed-in required | No | Yes |
| Rendered inside | nothing — it owns the whole viewport | `RequireAuth` → `SeedGate` → `AppShell` → `MoodLayout` |
| Sidebar / bottom nav entry | No | Yes (except `/settings`) |
| Loaded | eagerly, imported at top of `router.tsx` | lazily, via `lazy: async () => import(...)` |

Pick the row you are in, then follow §1 (standalone) or §2 (module).

---

## 1. Standalone page — the `/signup` recipe

### 1.1 Create the page component

`src/pages/YourPage.tsx`

```tsx
export function YourPage() {
  return <div>…</div>
}
```

Rules the codebase follows:

- **Named export, not default.** `router.tsx` imports `{ Login }`, `{ Signup }`.
  A default export will not resolve.
- File is PascalCase and lives directly in `src/pages/`. No subfolder.
- If it is an auth screen, wrap the body in `<AuthLayout>` from
  `src/components/AuthLayout.tsx` and render only the *form column* as its
  child — the brand panel, grid corners and theme toggle come from the layout.
  This is what keeps `/login` and `/signup` identical.

### 1.2 Register the route

`src/router.tsx`

1. Add the import next to the other eager page imports (currently lines 9–10):

   ```tsx
   import { YourPage } from './pages/YourPage'
   ```

2. Add the route object inside `createBrowserRouter([...])`, **above** the
   `{ path: '/', element: <RequireAuth /> }` block (currently line 16). Order
   matters: the `RequireAuth` block also claims `path: '/'`, so anything
   below it that collides gets swallowed.

   ```tsx
   { path: '/your-page', element: <YourPage /> },
   ```

   The three public routes today are lines 13–15:

   ```tsx
   { path: '/', element: <RootGate /> },
   { path: '/login', element: <Login /> },
   { path: '/signup', element: <Signup /> },
   ```

### 1.3 Link to it

Nothing links itself. Add a `<Link to="/your-page">` wherever it should be
reachable — `src/pages/Landing.tsx` for marketing entry points,
`src/pages/Login.tsx` / `Signup.tsx` for the auth cross-links.

That is the whole standalone recipe. There is no nav registration, no guard, no
lazy loader.

---

## 2. Module page — the `/expenses` recipe

### 2.1 Create the page component

`src/modules/<mood>/<Mood>Page.tsx`, named export, e.g.

```tsx
export function GardenPage() { … }
```

Keep the module's hook, forms and page in the same folder — that is the
convention (`src/modules/expenses/` holds `ExpensesPage.tsx`, `ExpenseForm.tsx`,
`useExpenses.ts`).

### 2.2 Register the lazy route

`src/router.tsx`, inside the `children:` array of the `SeedGate`/`AppShell`
block (currently lines 32–104). Copy the `expenses` entry verbatim and rename:

```tsx
{
  path: 'garden',
  element: <MoodLayout mood="garden" />,
  children: [
    {
      index: true,
      lazy: async () => {
        const { GardenPage } = await import('./modules/garden/GardenPage')
        return { Component: GardenPage }
      },
    },
  ],
},
```

Two things to get right:

- `path` has **no leading slash** here — it is relative to the parent `''`
  route. `'garden'`, not `'/garden'`.
- The `lazy` function must return `{ Component: X }`. Returning the component
  directly silently renders nothing.

`/settings` (line ~101) is the exception that skips `MoodLayout` — copy that one
instead if the page has no mood colour.

### 2.3 Register the nav entry

`src/components/nav-items.ts` — one line in `NAV_ITEMS`:

```ts
{ to: '/garden', label: 'Garden', icon: Sprout, mood: 'garden' },
```

Import the icon from `lucide-react` at the top of that file. `Sidebar.tsx` and
`BottomNav.tsx` both read this array, so one edit updates both.

### 2.4 Register the mood

`MoodLayout` (`src/components/MoodLayout.tsx`) does one thing: it renders
`<div data-mood={mood}>` around the `<Outlet />`. The accent palette that
attribute selects lives in **`src/styles/moods.css`**, not `index.css`.

Add both blocks — the dark one at `[data-mood='garden']` (alongside the
existing five at lines 30–63) and the light override at
`[data-theme='light'] [data-mood='garden']` (lines 73+).

A `mood` string with no matching rule is a **silent** failure: the attribute is
set, no rule matches, `--mood-accent` stays unresolved, and the page renders
with no accent colour and no error. `src/lib/moods.ts` carries a comment about
exactly this trap — the reminders enum says `expense` while the mood key is
`expenses`, which is why `MOOD_BY_MODULE` exists to translate.

---

## 3. Hooking the page to Supabase

Four steps, in this order. Doing the client before the migration is how you get
a `relation does not exist` at runtime.

### 3.1 Write the migration

`supabase/migrations/<YYYYMMDD><NNNNNN>_<name>.sql` — timestamp prefix, sorted
lexicographically, never renamed after it is pushed.

```sql
create table public.garden_plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
```

`user_id uuid not null references auth.users (id) on delete cascade` is not
optional — the RLS policy and the realtime filter both key off it.

### 3.2 Add RLS, index and policy

Every table in `core_schema.sql` gets the same three statements (see the loop at
`supabase/migrations/20260704000002_core_schema.sql:150-169`). For a new table,
write them out:

```sql
alter table public.garden_plants enable row level security;
create index garden_plants_user_id_idx on public.garden_plants (user_id);
create policy "own_rows" on public.garden_plants
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

Without the policy the table is readable by nobody and every query returns `[]`
with no error — the most common "it silently doesn't work" cause here.

### 3.3 Add the table to the realtime publication

```sql
alter publication supabase_realtime add table garden_plants;
```

Not on by default. Without it `useRealtime()` subscribes successfully and simply
never fires, so the UI shows the first load and then goes stale. See
`supabase/migrations/20260704000006_enable_realtime.sql`.

### 3.4 Write the module hook

`src/modules/garden/useGarden.ts`, modelled on `useExpenses.ts`:

```ts
export function useGarden() {
  const { user } = useAuth()
  const [plants, setPlants] = useState<Plant[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('garden_plants').select('*').order('created_at')
    setPlants(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { void load() }, [load])
  useRealtime('garden_plants', load)

  async function addPlant(input: PlantInput) {
    const { error } = await supabase
      .from('garden_plants')
      .insert({ user_id: user.id, ...input })
    if (error) throw error
  }

  return { plants, loading, addPlant }
}
```

Four things this pattern gets right, all of which break if you skip them:

1. **`user_id: user.id` on every insert.** RLS `with check` rejects the row
   otherwise. Selects/updates/deletes don't need it — the policy filters them.
2. **`load` wrapped in `useCallback([user])`**, because `useRealtime` and the
   `useEffect` both depend on its identity.
3. **`useRealtime(table, load)`** re-runs the whole load on any change. It does
   not merge payloads — deliberately, it is simpler and the tables are small.
4. **Types go in `src/lib/types.ts`**, not next to the hook.

### 3.5 Push the migration

The CLI is not logged in on this machine; authenticate straight to Postgres:

```powershell
supabase db push --db-url "postgresql://postgres.qlfzhuwfexvksznahpmy:<DB_PASSWORD>@aws-1-eu-west-1.pooler.supabase.com:5432/postgres" --yes
```

- Port **5432** (session mode). 6543 is transaction mode and misbehaves on DDL.
- `<DB_PASSWORD>` is in the gitignored `New Text Document.txt` at the repo root,
  labelled `tenddb:`.
- Verify: `supabase migration list --db-url "…"` — the Local and Remote columns
  must match.

---

## 4. Auth-specific hookups

Anything under `supabase.auth.*` follows three rules this codebase already
learned the hard way:

- **Always pass `emailRedirectTo` / `redirectTo`.** Without it Supabase builds
  the link from the project's Site URL and sends every device to localhost.
  `` `${window.location.origin}/` `` is the pattern.
- **`signUp()` may return no session.** With email confirmation on you get a
  `user` but `data.session === null`; the account is not usable yet. Branch on
  `data.session` — see `src/pages/Signup.tsx`.
- **Never write to `profiles` straight after `signUp()`.** There is no session,
  so `profiles_update_own` (`id = auth.uid()`) rejects it. Pass the values as
  `options.data` metadata and let the `handle_new_user()` trigger copy them —
  `supabase/migrations/20260819000001_signup_display_name.sql` does exactly
  this. If you extend that trigger, re-run the `revoke execute … from public,
  anon, authenticated` at the end; `create or replace` resets the grants.

---

## 5. Removing a page

Reverse order, and the grep at the end is the part people skip.

1. Delete the component file (`src/pages/X.tsx` or `src/modules/x/`).
2. `src/router.tsx` — delete the import **and** the route object. A leftover
   import fails the build; a leftover route object fails at runtime.
3. `src/components/nav-items.ts` — remove the `NAV_ITEMS` entry (module pages).
4. `grep -rn "'/your-page'\|\"/your-page\"" src/` and fix every `<Link>`,
   `navigate()` and redirect that pointed at it. `RequireAuth.tsx:12` and
   `RootGate.tsx` hold redirect targets.
5. **Leave the database alone.** Dropping a table needs its own dated migration;
   never edit or delete an already-pushed migration file.

---

## 6. Verify — all three, every time

```powershell
npm run lint       # oxlint, must print nothing
npx tsc -b         # must exit 0
npm run build      # must reach "built in …"
```

A route mistake usually survives lint and tsc and only shows up as a blank page,
so also load the route in the dev server (`npm run dev`) before calling it done.

### Gotcha: brand config edits don't reach the manifest locally

`npm` runs here with `ignore-scripts`, so the `predev` / `prebuild` hooks
(`tsx scripts/gen-brand.ts`, package.json:7 and :9) that regenerate the PWA
manifest from `brand.config.json` do not fire. If you touched
`brand.config.json`, run it by hand:

```powershell
npx tsx scripts/gen-brand.ts
```
