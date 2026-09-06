/**
 * The four cards of TailAdmin's /profile page, cloned from
 * https://react-demo.tailadmin.com/profile (the live pro demo, not the free
 * copy vendored under assets/re-desgin/ — that one has no Security or Danger
 * Zone card and keeps Meta and Info as two separate cards).
 *
 * Class strings, labels, SVG paths, grid shapes and column order are the
 * source's, verbatim. Divergences are listed in ProfilePage.tsx's header.
 *
 * One source bug is reproduced deliberately: the avatar wrapper's border class
 * is `border-gray-20`, which is not a Tailwind scale value and resolves to
 * nothing. Fixing it here would put this file permanently out of sync with the
 * template it was cloned from. See Step 8 of the pagesclone runbook.
 */
import type { ReactNode } from 'react'
import type { Profile } from '../../hooks/useProfile'

const FIELD_LABEL = 'mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400'
const FIELD_VALUE = 'text-sm font-medium text-gray-800 dark:text-white/90'
const CARD_H4 = 'text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6'
const SECTION_H4 = 'text-lg mb-4 font-semibold text-gray-800 lg:mb-6 dark:text-white/90'
const SECTION_ROW =
  'flex flex-col justify-between gap-4 border-b border-gray-200 py-4 first:pt-0 last:border-b-0 last:pb-0 sm:flex-row sm:items-end dark:border-gray-800'
const SECTION_CARD = 'mb-6 rounded-2xl border border-gray-200  p-5 lg:p-6 dark:border-gray-800 '
const NEUTRAL_BTN =
  'shadow-theme-xs flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white py-2.5 pr-4 pl-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/3 dark:hover:text-gray-200'

/** An unset field renders as an em dash rather than an empty gap. */
function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className={FIELD_LABEL}>{label}</p>
      <p className={FIELD_VALUE}>{value?.trim() ? value : '—'}</p>
    </div>
  )
}

const PENCIL_PATH =
  'M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z'

function EditButton({ onClick, className }: { onClick: () => void; className: string }) {
  return (
    <button onClick={onClick} className={className}>
      <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" clipRule="evenodd" d={PENCIL_PATH} fill="" />
      </svg>
      Edit
    </button>
  )
}

const SOCIALS = [
  {
    key: 'social_facebook' as const,
    label: 'Facebook',
    d: 'M11.6666 11.2503H13.7499L14.5833 7.91699H11.6666V6.25033C11.6666 5.39251 11.6666 4.58366 13.3333 4.58366H14.5833V1.78374C14.3118 1.7477 13.2858 1.66699 12.2023 1.66699C9.94025 1.66699 8.33325 3.04771 8.33325 5.58342V7.91699H5.83325V11.2503H8.33325V18.3337H11.6666V11.2503Z',
  },
  {
    key: 'social_x' as const,
    label: 'X',
    d: 'M15.1708 1.875H17.9274L11.9049 8.75833L18.9899 18.125H13.4424L9.09742 12.4442L4.12578 18.125H1.36745L7.80912 10.7625L1.01245 1.875H6.70078L10.6283 7.0675L15.1708 1.875ZM14.2033 16.475H15.7308L5.87078 3.43833H4.23162L14.2033 16.475Z',
  },
  {
    key: 'social_linkedin' as const,
    label: 'LinkedIn',
    d: 'M5.78381 4.16645C5.78351 4.84504 5.37181 5.45569 4.74286 5.71045C4.11391 5.96521 3.39331 5.81321 2.92083 5.32613C2.44836 4.83904 2.31837 4.11413 2.59216 3.49323C2.86596 2.87233 3.48886 2.47942 4.16715 2.49978C5.06804 2.52682 5.78422 3.26515 5.78381 4.16645ZM5.83381 7.06645H2.50048V17.4998H5.83381V7.06645ZM11.1005 7.06645H7.78381V17.4998H11.0672V12.0248C11.0672 8.97475 15.0422 8.69142 15.0422 12.0248V17.4998H18.3338V10.8914C18.3338 5.74978 12.4505 5.94145 11.0672 8.46642L11.1005 7.06645Z',
  },
  {
    key: 'social_instagram' as const,
    label: 'Instagram',
    d: 'M10.8567 1.66699C11.7946 1.66854 12.2698 1.67351 12.6805 1.68573L12.8422 1.69102C13.0291 1.69766 13.2134 1.70599 13.4357 1.71641C14.3224 1.75738 14.9273 1.89766 15.4586 2.10391C16.0078 2.31572 16.4717 2.60183 16.9349 3.06503C17.3974 3.52822 17.6836 3.99349 17.8961 4.54141C18.1016 5.07197 18.2419 5.67753 18.2836 6.56433C18.2935 6.78655 18.3015 6.97088 18.3081 7.15775L18.3133 7.31949C18.3255 7.73011 18.3311 8.20543 18.3328 9.1433L18.3335 9.76463C18.3336 9.84055 18.3336 9.91888 18.3336 9.99972L18.3335 10.2348L18.333 10.8562C18.3314 11.794 18.3265 12.2694 18.3142 12.68L18.3089 12.8417C18.3023 13.0286 18.294 13.213 18.2836 13.4351C18.2426 14.322 18.1016 14.9268 17.8961 15.458C17.6842 16.0074 17.3974 16.4713 16.9349 16.9345C16.4717 17.397 16.0057 17.6831 15.4586 17.8955C14.9273 18.1011 14.3224 18.2414 13.4357 18.2831C13.2134 18.293 13.0291 18.3011 12.8422 18.3076L12.6805 18.3128C12.2698 18.3251 11.7946 18.3306 10.8567 18.3324L10.2353 18.333C10.1594 18.333 10.0811 18.333 10.0002 18.333H9.76516L9.14375 18.3325C8.20591 18.331 7.7306 18.326 7.31997 18.3137L7.15824 18.3085C6.97136 18.3018 6.78703 18.2935 6.56481 18.2831C5.67801 18.2421 5.07384 18.1011 4.5419 17.8955C3.99328 17.6838 3.5287 17.397 3.06551 16.9345C2.60231 16.4713 2.3169 16.0053 2.1044 15.458C1.89815 14.9268 1.75856 14.322 1.7169 13.4351C1.707 13.213 1.69892 13.0286 1.69238 12.8417L1.68714 12.68C1.67495 12.2694 1.66939 11.794 1.66759 10.8562L1.66748 9.1433C1.66903 8.20543 1.67399 7.73011 1.68621 7.31949L1.69151 7.15775C1.69815 6.97088 1.70648 6.78655 1.7169 6.56433C1.75786 5.67683 1.89815 5.07266 2.1044 4.54141C2.3162 3.9928 2.60231 3.52822 3.06551 3.06503C3.5287 2.60183 3.99398 2.31641 4.5419 2.10391C5.07315 1.89766 5.67731 1.75808 6.56481 1.71641C6.78703 1.70652 6.97136 1.69844 7.15824 1.6919L7.31997 1.68666C7.7306 1.67446 8.20591 1.6689 9.14375 1.6671L10.8567 1.66699ZM10.0002 5.83308C7.69781 5.83308 5.83356 7.69935 5.83356 9.99972C5.83356 12.3021 7.69984 14.1664 10.0002 14.1664C12.3027 14.1664 14.1669 12.3001 14.1669 9.99972C14.1669 7.69732 12.3006 5.83308 10.0002 5.83308ZM10.0002 7.49974C11.381 7.49974 12.5002 8.61863 12.5002 9.99972C12.5002 11.3805 11.3813 12.4997 10.0002 12.4997C8.6195 12.4997 7.50023 11.3809 7.50023 9.99972C7.50023 8.61897 8.61908 7.49974 10.0002 7.49974ZM14.3752 4.58308C13.8008 4.58308 13.3336 5.04967 13.3336 5.62403C13.3336 6.19841 13.8002 6.66572 14.3752 6.66572C14.9496 6.66572 15.4169 6.19913 15.4169 5.62403C15.4169 5.04967 14.9488 4.58236 14.3752 4.58308Z',
  },
]

/**
 * Meta + personal information. The live demo merges these into one card; the
 * vendored free copy keeps them separate. Following the live page, which is
 * the source that was asked for.
 */
export function MetaInfoCard({
  profile,
  email,
  onEdit,
}: {
  profile: Profile
  email: string | null
  onEdit: () => void
}) {
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ')
  const heading = fullName || profile.display_name || 'Your profile'
  const activeSocials = SOCIALS.filter((s) => profile[s.key]?.trim())

  return (
    <div className="mb-6 rounded-2xl border border-gray-200 p-5 lg:p-6 dark:border-gray-800">
      <div className="flex flex-col gap-5 sm:flex-row xl:gap-10">
        <div className="flex-1">
          <div className="mb-6 flex flex-col gap-5 sm:flex-row xl:items-center xl:justify-between">
            <div className="flex w-full flex-col items-start gap-6 sm:flex-row sm:items-center">
              {/* `border-gray-20` is the source's own typo — kept, see header. */}
              <div className="border-gray-20 overflow-hidden rounded-full border dark:border-gray-800">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="user" className="size-20 object-cover" />
                ) : (
                  <div className="flex size-20 items-center justify-center bg-gray-100 text-xl font-semibold text-gray-500 dark:bg-white/5 dark:text-gray-400">
                    {(profile.display_name?.trim()?.[0] ?? email?.[0] ?? '?').toUpperCase()}
                  </div>
                )}
              </div>
              <div className="text-left">
                <h4 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">{heading}</h4>
                <div className="flex items-center gap-1 sm:gap-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{profile.bio?.trim() || '—'}</p>
                  <div className="hidden h-3.5 w-px bg-gray-300 sm:block dark:bg-gray-700"></div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{profile.city_state?.trim() || '—'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-x-11 xl:gap-y-7">
            <div className="w-full">
              <Field label="First Name" value={profile.first_name} />
            </div>
            <div className="w-full">
              <Field label="Last Name" value={profile.last_name} />
            </div>
            {/* Two empty cells so Email/Phone/Bio/Social start a fresh row at xl. */}
            <div className="hidden xl:block"></div>
            <div className="hidden xl:block"></div>
            <div>
              <Field label="Email address" value={email} />
            </div>
            <div>
              <Field label="Phone" value={profile.phone} />
            </div>
            <div>
              <Field label="Bio" value={profile.bio} />
            </div>
            <div>
              <p className={FIELD_LABEL}>Social Links</p>
              {activeSocials.length > 0 ? (
                <div className="flex grow items-center gap-4">
                  {activeSocials.map((s) => (
                    <a
                      key={s.key}
                      href={profile[s.key] as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className="size-5 text-sm font-medium text-gray-700 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d={s.d} fill="" />
                      </svg>
                    </a>
                  ))}
                </div>
              ) : (
                <p className={FIELD_VALUE}>—</p>
              )}
            </div>
          </div>
        </div>

        <div>
          <EditButton
            onClick={onEdit}
            className="shadow-theme-xs flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-800 lg:inline-flex lg:w-auto dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          />
        </div>
      </div>
    </div>
  )
}

export function AddressCard({ profile, onEdit }: { profile: Profile; onEdit: () => void }) {
  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <div className="flex flex-col gap-6 sm:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <h4 className={CARD_H4}>Address</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-7 2xl:gap-x-32">
            <Field label="Country" value={profile.country} />
            <Field label="City/State" value={profile.city_state} />
            <Field label="Postal Code" value={profile.postal_code} />
            <Field label="TAX ID" value={profile.tax_id} />
          </div>
        </div>
        <EditButton
          onClick={onEdit}
          className="flex w-full items-center h-10 justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
        />
      </div>
    </div>
  )
}

function SectionRow({ title, description, control }: { title: string; description: string; control: ReactNode }) {
  return (
    <div className={SECTION_ROW}>
      <div>
        <span className="block text-base mb-1 font-medium text-gray-800 dark:text-white/90">{title}</span>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <div>{control}</div>
    </div>
  )
}

export function SecurityCard({ onChangePassword }: { onChangePassword: () => void }) {
  return (
    <div className={SECTION_CARD}>
      <h4 className={SECTION_H4}>Security</h4>
      <div>
        <SectionRow
          title="Change Password"
          /* The source's copy for this row is "Receive real-time notifications
             and team alerts." — plainly pasted from a notifications row and
             wrong for a password control. Replaced; noted as a divergence. */
          description="Set a new password for signing in."
          control={
            <button onClick={onChangePassword} className={NEUTRAL_BTN}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M12.3861 5.08087L14.9182 7.61296M15.6437 3.5917L16.408 4.35603C16.8962 4.84419 16.8962 5.63564 16.408 6.1238L7.83547 14.6963C7.69039 14.8414 7.51182 14.9486 7.31554 15.0083L3.97461 16.0251L4.99141 12.6842C5.05115 12.4879 5.15829 12.3093 5.30337 12.1642L13.8759 3.5917C14.3641 3.10355 15.1555 3.10355 15.6437 3.5917Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Change Password
            </button>
          }
        />
        <SectionRow
          title="Two-factor authentication (2FA)"
          description="Keep your account secure by enabling 2FA"
          control={
            /* Stub — this app has no 2FA enrolment. Rendered in the source's
               off state and disabled rather than left as a toggle that silently
               does nothing when tapped. */
            <label
              htmlFor="toggle1"
              aria-disabled="true"
              title="Two-factor authentication is not available yet"
              className="flex cursor-not-allowed items-center gap-3 text-sm font-medium text-gray-700 select-none opacity-60 dark:text-gray-400"
            >
              <div className="relative">
                <input id="toggle1" className="sr-only" type="checkbox" disabled />
                <div className="block h-5 w-9 rounded-full duration-200 bg-gray-200 dark:bg-white/10"></div>
                <div className="shadow-theme-sm absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white duration-200 ease-linear translate-x-0"></div>
              </div>
            </label>
          }
        />
      </div>
    </div>
  )
}

export function DangerZoneCard({
  onLogoutAll,
  onDeleteAccount,
}: {
  onLogoutAll: () => void
  onDeleteAccount: () => void
}) {
  return (
    <div className={SECTION_CARD}>
      <h4 className={SECTION_H4}>Danger Zone</h4>
      <div>
        <SectionRow
          title="Logout all devices"
          description="Sign out from every active session."
          control={
            <button onClick={onLogoutAll} className={NEUTRAL_BTN}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M3.33325 10.0003L9.79159 10.0003M6.66599 6.66699L3.33488 10.0002L6.66599 13.3337M8.12492 4.16374V3.54199C8.12492 2.85164 8.68456 2.29199 9.37492 2.29199H14.3749C15.0653 2.29199 15.6249 2.85164 15.6249 3.54199V16.4587C15.6249 17.149 15.0653 17.7087 14.3749 17.7087H9.37492C8.68456 17.7087 8.12492 17.149 8.12492 16.4587V15.8337"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Logout
            </button>
          }
        />
        <SectionRow
          title="Delete account"
          description="Once you delete your account, there is no going back. Please be certain."
          control={
            <button
              onClick={onDeleteAccount}
              className="border-error-500 text-error-500 hover:bg-error-100 dark:border-error-500/15 inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3.5 py-2.5 pr-4 pl-3.5 text-sm font-medium transition-all dark:hover:bg-red-500/15"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M4.37492 4.79199V16.4587C4.37492 17.149 4.93456 17.7087 5.62492 17.7087H14.3749C15.0653 17.7087 15.6249 17.149 15.6249 16.4587V4.79199M3.33325 4.79199H16.6658M4.37492 13.2466V8.24658M15.6249 13.2466V8.24658M8.33325 13.7503V8.75033M11.6666 13.7503V8.75033M12.7078 4.79199V3.54199C12.7078 2.85164 12.1482 2.29199 11.4578 2.29199H8.54118C7.85082 2.29199 7.29118 2.85164 7.29118 3.54199V4.79199H12.7078Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Delete account
            </button>
          }
        />
      </div>
    </div>
  )
}
