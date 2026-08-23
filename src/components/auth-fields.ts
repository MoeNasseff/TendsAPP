/**
 * The class strings TailAdmin keeps inside its <Label>, <Input> and <Checkbox>
 * components, lifted out so /login and /signup share one definition instead of
 * two copies that drift. Sourced from:
 *   components/form/Label.tsx
 *   components/form/input/InputField.tsx  (default, non-error branch)
 *   components/form/input/Checkbox.tsx
 *
 * We do not port their components themselves — they are uncontrolled wrappers
 * around a plain input, and every field here is controlled React state.
 */

/** components/form/Label.tsx — verbatim. */
export const authLabel = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400'

/**
 * components/form/input/InputField.tsx — their base string plus the default
 * branch. `form-input` replaces their `bg-transparent text-gray-800
 * border-gray-300 dark:*` colour half: it is the same treatment expressed
 * through our token layer, which is what every other form in the app uses.
 */
export const authField =
  'form-input h-11 w-full appearance-none rounded-lg border px-4 py-2.5 text-sm shadow-theme-xs' +
  ' outline-hidden focus:ring-3 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-40'

/** components/form/input/Checkbox.tsx — the <input> half of their component. */
export const authCheckbox =
  'h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 checked:border-transparent' +
  ' checked:bg-brand-500 disabled:opacity-60 dark:border-gray-700'
