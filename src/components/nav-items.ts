import type { ComponentType } from 'react'
import { Car, Dog, Leaf, PersonStanding, Pill, Wallet } from 'lucide-react'
import {
  AiIcon,
  BoxCubeIcon,
  CalenderIcon,
  CartIcon,
  ChatIcon,
  GridIcon,
  LayoutIcon,
  ListIcon,
  LockIcon,
  MailIcon,
  MapsIcon,
  PageIcon,
  PieChartIcon,
  SupportIcon,
  TableIcon,
  TaskIcon,
  UserCircleIcon,
} from './nav-icons'

/**
 * The five mod tabs. Unchanged shape — BottomNav maps over this directly,
 * and Settings is deliberately absent from it (it has never been a tab).
 */
export const NAV_ITEMS = [
  { to: '/expenses', label: 'Expenses', icon: Wallet, mood: 'expenses' },
  { to: '/dog', label: 'Dog', icon: Dog, mood: 'dog' },
  { to: '/car', label: 'Car', icon: Car, mood: 'car' },
  { to: '/meds', label: 'Meds', icon: Pill, mood: 'meds' },
  { to: '/body', label: 'Body', icon: PersonStanding, mood: 'body' },
] as const

/**
 * Both icon families satisfy this: lucide's components (Tend's own rows) and
 * the transcribed TailAdmin glyphs in `nav-icons.tsx` (every row below them).
 */
export type NavIcon = ComponentType<{ className?: string }>

export interface NavSubItem {
  name: string
  /** Absent when the row is itself a disclosure — see `subItems`. */
  path?: string
  /** Renders TailAdmin's "new" pill on the dropdown row. */
  isNew?: boolean
  /** Renders their grey "pro" pill — the rows gated behind the paid template. */
  isPro?: boolean
  /** Their Layouts rows open in a new tab; nothing else does. */
  newTab?: boolean
  /**
   * A third menu level. TailAdmin stops at two and has no markup for this, so
   * Sidebar renders it from the same `menu-dropdown-item` utilities at a
   * deeper indent. Only Tends → Expenses uses it.
   */
  subItems?: NavSubItem[]
}

export interface NavItem {
  name: string
  icon: NavIcon
  /** A leaf row. Mutually exclusive with subItems, as in TailAdmin. */
  path?: string
  /** Present ⇒ the row is a disclosure button rather than a link. */
  subItems?: NavSubItem[]
  /** TailAdmin puts a "New" pill on some top-level rows too. */
  isNew?: boolean
}

export interface NavGroup {
  /** The uppercase heading; collapses to a dots glyph on the rail. */
  heading: string
  items: NavItem[]
}

/**
 * The sidebar's full menu, transcribed from element 1 of the integration spec —
 * TailAdmin's own MENU / SUPPORT / OTHERS groups with every item, dropdown,
 * icon and pill intact, in their order.
 *
 * Their hrefs became router paths of the same name. Almost none of these pages
 * exist in Tend yet, which is what the `*` catch-all in router.tsx is for: an
 * unbuilt entry lands on ComingSoon inside the shell rather than rendering a
 * blank content area.
 *
 * Three entries are real and wired to our own pages: Sign In (/login), Sign Up
 * (/signup) and everything in the leading Tend group.
 *
 * One deliberate divergence: their Dashboard → Ecommerce row points at `/`.
 * Tend's `/` is the app's own home, so pointing a placeholder at it would
 * replace the real dashboard with ComingSoon. It gets `/ecommerce` instead.
 *
 * The Tend group is added above theirs rather than merged into it — our five
 * modules and Settings keep their own lucide icons and their own heading.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'Menu',
    items: [
      // Tend's own modules, which used to be their own heading group. They are
      // now one disclosure at the top of MENU, above TailAdmin's items, so the
      // app's real pages lead the menu instead of sitting in a separate block.
      //
      // Expenses keeps its nine e-commerce pages, which makes this the only
      // three-level branch in the tree. Dropdown rows carry no icons in this
      // template, so the modules' lucide glyphs do not appear at this depth.
      {
        name: 'Tends',
        icon: Leaf,
        subItems: [
          { name: 'Overview', path: '/expenses' },
          ...NAV_ITEMS.filter(({ to }) => to !== '/expenses').map(({ to, label }) => ({
            name: label,
            path: to,
          })),
          { name: 'Settings', path: '/settings' },
        ],
      },
      {
        name: 'Dashboard',
        icon: GridIcon,
        subItems: [
          { name: 'Ecommerce', path: '/ecommerce' },
          { name: 'Analytics', path: '/analytics' },
          { name: 'Marketing', path: '/marketing' },
          { name: 'CRM', path: '/crm' },
          { name: 'Stocks', path: '/stocks' },
          { name: 'SaaS', path: '/saas' },
          { name: 'Logistics', path: '/logistics' },
          { name: 'AI', path: '/ai', isNew: true },
          { name: 'Sales', path: '/sales', isNew: true },
          { name: 'Finance', path: '/finance', isNew: true },
        ],
      },
      {
        name: 'AI Assistant',
        icon: AiIcon,
        isNew: true,
        subItems: [
          { name: 'Text Generator', path: '/text-generator' },
          { name: 'Image Generator', path: '/image-generator' },
          { name: 'Code Generator', path: '/code-generator' },
          { name: 'Video Generator', path: '/video-generator' },
          { name: 'AI Settings', path: '/ai-settings' },
        ],
      },
      {
        name: 'Freelancing',
        icon: CartIcon,
        subItems: [
          { name: 'Products', path: '/products-list' },
          { name: 'Add Product', path: '/add-product' },
          { name: 'Billing', path: '/billing' },
          { name: 'Invoices', path: '/invoices' },
          { name: 'Single Invoice', path: '/single-invoice' },
          { name: 'Create Invoice', path: '/create-invoice' },
          { name: 'Transactions', path: '/transactions' },
          { name: 'Single Transaction', path: '/single-transaction' },
        ],
      },
      { name: 'Calendar', icon: CalenderIcon, path: '/calendar' },
      { name: 'User Profile', icon: UserCircleIcon, path: '/profile' },
      {
        name: 'Task',
        icon: TaskIcon,
        subItems: [
          { name: 'List', path: '/task-list', isPro: true },
          { name: 'Kanban', path: '/task-kanban', isPro: true },
        ],
      },
      {
        name: 'Forms',
        icon: ListIcon,
        subItems: [
          { name: 'Form Elements', path: '/form-elements' },
          { name: 'Form Layout', path: '/form-layout', isPro: true },
        ],
      },
      {
        name: 'Tables',
        icon: TableIcon,
        subItems: [
          { name: 'Basic Tables', path: '/basic-tables' },
          { name: 'Data Tables', path: '/data-tables', isPro: true },
        ],
      },
      {
        name: 'Pages',
        icon: PageIcon,
        subItems: [
          { name: 'File Manager', path: '/file-manager' },
          { name: 'Pricing Tables', path: '/pricing-tables' },
          { name: 'FAQ', path: '/faq' },
          { name: 'API Keys', path: '/api-keys', isNew: true },
          { name: 'Integrations', path: '/integrations', isNew: true },
          { name: 'Blank Page', path: '/blank' },
          { name: '404 Error', path: '/error-404' },
          { name: '500 Error', path: '/error-500' },
          { name: '503 Error', path: '/error-503' },
          { name: 'Coming Soon', path: '/coming-soon' },
          { name: 'Maintenance', path: '/maintenance' },
          { name: 'Success', path: '/success' },
        ],
      },
      {
        name: 'Layouts',
        icon: LayoutIcon,
        isNew: true,
        subItems: [
          { name: 'Layout One', path: '/layout-one', newTab: true },
          { name: 'Layout Two', path: '/layout-two', newTab: true },
          { name: 'Layout Three', path: '/layout-three', newTab: true },
          { name: 'Layout Four', path: '/layout-four', newTab: true },
          { name: 'Layout Five', path: '/layout-five', newTab: true },
          { name: 'Layout Six', path: '/layout-six', newTab: true },
        ],
      },
    ],
  },
  {
    heading: 'Support',
    items: [
      { name: 'Chat', icon: ChatIcon, path: '/chat' },
      {
        name: 'Support Ticket',
        icon: SupportIcon,
        isNew: true,
        subItems: [
          { name: 'Ticket List', path: '/support-tickets' },
          { name: 'Ticket Reply', path: '/support-ticket-reply' },
        ],
      },
      {
        name: 'Email',
        icon: MailIcon,
        subItems: [
          { name: 'Inbox', path: '/inbox' },
          { name: 'Details', path: '/inbox-details' },
        ],
      },
    ],
  },
  {
    heading: 'Others',
    items: [
      {
        name: 'Charts',
        icon: PieChartIcon,
        isNew: true,
        subItems: [
          { name: 'Line Chart', path: '/line-chart' },
          { name: 'Bar Chart', path: '/bar-chart' },
          { name: 'Pie Chart', path: '/pie-chart' },
          { name: 'Radar Chart', path: '/radar-chart' },
          { name: 'Radial Chart', path: '/radial-chart' },
        ],
      },
      {
        name: 'Maps',
        icon: MapsIcon,
        isNew: true,
        subItems: [
          { name: 'Maps', path: '/maps' },
          { name: 'Vector Map', path: '/vector-map' },
        ],
      },
      {
        name: 'UI Elements',
        icon: BoxCubeIcon,
        subItems: [
          { name: 'Alerts', path: '/alerts' },
          { name: 'Avatar', path: '/avatars' },
          { name: 'Badge', path: '/badge' },
          { name: 'Breadcrumb', path: '/breadcrumb' },
          { name: 'Buttons', path: '/buttons' },
          { name: 'Buttons Group', path: '/buttons-group' },
          { name: 'Cards', path: '/cards' },
          { name: 'Carousel', path: '/carousel' },
          { name: 'Dropdowns', path: '/dropdowns' },
          { name: 'Images', path: '/images' },
          { name: 'Links', path: '/links' },
          { name: 'List', path: '/list' },
          { name: 'Modals', path: '/modals' },
          { name: 'Notification', path: '/notifications' },
          { name: 'Pagination', path: '/pagination' },
          { name: 'Popovers', path: '/popovers' },
          { name: 'Progressbar', path: '/progress-bar' },
          { name: 'Ribbons', path: '/ribbons' },
          { name: 'Spinners', path: '/spinners' },
          { name: 'Tabs', path: '/tabs' },
          { name: 'Tooltips', path: '/tooltips' },
          { name: 'Videos', path: '/videos' },
        ],
      },
      {
        name: 'Authentication',
        icon: LockIcon,
        subItems: [
          // These two are real — the pages built earlier.
          { name: 'Sign In', path: '/login' },
          { name: 'Sign Up', path: '/signup' },
          { name: 'Reset Password', path: '/reset-password' },
          { name: 'Two Step Verification', path: '/two-step-verification' },
        ],
      },
    ],
  },
]
