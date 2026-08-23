import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { NAV_GROUPS, type NavItem, type NavSubItem } from './nav-items'
import { ChevronDownIcon, HorizontalDotsIcon } from './nav-icons'
import { SidebarWidget } from './SidebarWidget'
import { useBrand } from '../hooks/useBrand'
import { useSidebar } from '../hooks/useSidebar'

/**
 * Port of TailAdmin's AppSidebar — element 1 of the integration spec, matched
 * against the markup at https://react-demo.tailadmin.com/ rather than the older
 * copy vendored under `assets/re-desgin/`. The two differ: the current one
 * breaks at `xl` (the vendored one at `lg`) and spaces menu rows `gap-1` (the
 * vendored one `gap-4`). AppShell and Backdrop follow the same `xl` boundary,
 * or the content column would shift left while the sidebar is still off-canvas.
 *
 * Their behaviour, kept: 290px expanded / 90px collapsed to a rail; hovering
 * the rail expands it temporarily; below xl it becomes an off-canvas drawer
 * that slides in from -translate-x-full; group headings collapse to a dots
 * glyph on the rail; disclosure rows animate open by measuring their content.
 *
 * Ours: the Tends branch, a SidebarWidget carrying Tend copy instead of their
 * pricing promo, and a **third menu level**. TailAdmin stops at two and has no
 * markup for a deeper one, so level three reuses the same
 * `menu-dropdown-item` utilities at a deeper indent with a smaller chevron.
 * Only Tends → Expenses needs it.
 *
 * Panel heights are measured from the content element rather than the animated
 * wrapper, so a nested panel opening grows its ancestor automatically — with
 * the wrapper's own scrollHeight the outer panel would keep its stale height
 * and clip the level-three rows.
 */
export function Sidebar() {
  const brand = useBrand()
  const location = useLocation()
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, setMobileOpen } = useSidebar()

  /** "group-index" of the open level-two panel. */
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null)
  /** "group-index-subIndex" of the open level-three panel. */
  const [openNested, setOpenNested] = useState<string | null>(null)
  const [heights, setHeights] = useState<Record<string, number>>({})
  const contentRefs = useRef<Record<string, HTMLElement | null>>({})

  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname])

  /** Full width when expanded, hovered, or open as the mobile drawer. */
  const showText = isExpanded || isHovered || isMobileOpen

  // Any route change closes the mobile drawer, or it stays over the page the
  // user just navigated to.
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname, setMobileOpen])

  // Open whichever disclosures contain the active route, at either depth.
  useEffect(() => {
    let top: string | null = null
    let nested: string | null = null
    NAV_GROUPS.forEach((group, g) => {
      group.items.forEach((nav, i) => {
        nav.subItems?.forEach((sub, j) => {
          if (sub.path && isActive(sub.path)) top = `${g}-${i}`
          sub.subItems?.forEach((leaf) => {
            if (leaf.path && isActive(leaf.path)) {
              top = `${g}-${i}`
              nested = `${g}-${i}-${j}`
            }
          })
        })
      })
    })
    setOpenSubmenu(top)
    setOpenNested(nested)
  }, [isActive])

  // One observer watches every panel's content element. This is what makes
  // three levels work: when the nested panel expands, its ancestor's content
  // grows, the observer fires for the ancestor too, and the outer wrapper's
  // height follows. Measuring the animated wrapper instead would read a
  // mid-transition value and clip the nested rows.
  const observerRef = useRef<ResizeObserver | null>(null)
  const keyOf = useRef(new WeakMap<Element, string>())

  function getObserver() {
    if (!observerRef.current) {
      observerRef.current = new ResizeObserver((entries) => {
        setHeights((prev) => {
          let changed = false
          const next = { ...prev }
          for (const entry of entries) {
            const key = keyOf.current.get(entry.target)
            if (!key) continue
            const h = (entry.target as HTMLElement).offsetHeight
            if (next[key] !== h) {
              next[key] = h
              changed = true
            }
          }
          return changed ? next : prev
        })
      })
    }
    return observerRef.current
  }

  useEffect(() => () => observerRef.current?.disconnect(), [])

  /** Ref callback for a panel's content element, keyed by panel id. */
  const registerPanel = (key: string) => (el: HTMLElement | null) => {
    const ro = getObserver()
    const previous = contentRefs.current[key]
    if (previous && previous !== el) ro.unobserve(previous)
    contentRefs.current[key] = el
    if (el) {
      keyOf.current.set(el, key)
      ro.observe(el) // fires once immediately with the current size
    }
  }

  const panelStyle = (key: string, open: boolean) => ({
    height: open ? `${heights[key] ?? 0}px` : '0px',
  })

  /** A terminal row — a router link, or a plain anchor when it opens a tab. */
  function renderLeaf(item: NavSubItem) {
    if (!item.path) return null
    const active = isActive(item.path)
    const rowClass = `menu-dropdown-item ${
      active ? 'menu-dropdown-item-active' : 'menu-dropdown-item-inactive'
    }`
    const badges = (
      <span className="ml-auto flex items-center gap-1">
        {item.isNew && (
          <span
            className={`menu-dropdown-badge ml-auto ${
              active ? 'menu-dropdown-badge-active' : 'menu-dropdown-badge-inactive'
            }`}
          >
            new
          </span>
        )}
        {item.isPro && (
          <span
            className={`menu-dropdown-badge-pro ml-auto ${
              active ? 'menu-dropdown-badge-pro-active' : 'menu-dropdown-badge-pro-inactive'
            }`}
          >
            pro
          </span>
        )}
      </span>
    )

    return item.newTab ? (
      <a href={item.path} target="_blank" rel="noreferrer" className={rowClass}>
        {item.name}
        {badges}
      </a>
    ) : (
      <Link to={item.path} className={rowClass}>
        {item.name}
        {badges}
      </Link>
    )
  }

  /** A level-two row: either a leaf, or the disclosure that owns level three. */
  function renderSubItem(sub: NavSubItem, key: string) {
    if (!sub.subItems) return <li key={sub.name}>{renderLeaf(sub)}</li>

    const open = openNested === key
    return (
      <li key={sub.name}>
        <button
          type="button"
          onClick={() => setOpenNested((prev) => (prev === key ? null : key))}
          aria-expanded={open}
          className={`menu-dropdown-item w-full cursor-pointer ${
            open ? 'menu-dropdown-item-active' : 'menu-dropdown-item-inactive'
          }`}
        >
          {sub.name}
          <ChevronDownIcon
            className={`ml-auto h-4 w-4 transition-transform duration-200 ${
              open ? 'rotate-180 text-brand-500' : ''
            }`}
          />
        </button>
        <div className="overflow-hidden transition-all duration-300" style={panelStyle(key, open)}>
          <ul
            ref={registerPanel(key)}
            className="ml-4 mt-1 space-y-1"
          >
            {sub.subItems.map((leaf) => (
              <li key={leaf.name}>{renderLeaf(leaf)}</li>
            ))}
          </ul>
        </div>
      </li>
    )
  }

  function renderItems(items: NavItem[], groupIndex: number) {
    return (
      <ul className="flex flex-col gap-1">
        {items.map((nav, index) => {
          const key = `${groupIndex}-${index}`
          const open = openSubmenu === key
          const Icon = nav.icon

          return (
            <li key={nav.name}>
              {nav.subItems ? (
                <button
                  type="button"
                  onClick={() => setOpenSubmenu((prev) => (prev === key ? null : key))}
                  aria-expanded={open}
                  className={`menu-item group cursor-pointer ${
                    open ? 'menu-item-active' : 'menu-item-inactive'
                  } ${!isExpanded && !isHovered ? 'xl:justify-center' : 'xl:justify-start'}`}
                >
                  <span
                    className={`menu-item-icon-size ${
                      open ? 'menu-item-icon-active' : 'menu-item-icon-inactive'
                    }`}
                  >
                    <Icon />
                  </span>
                  {showText && <span className="menu-item-text">{nav.name}</span>}
                  {/* TailAdmin badges some top-level rows too — AI Assistant,
                      Layouts, Support Ticket, Charts and Maps. Theirs is
                      absolutely positioned at right-10 so it clears the
                      chevron rather than competing with it for ml-auto. */}
                  {showText && nav.isNew && (
                    <span className="menu-dropdown-badge menu-dropdown-badge-inactive absolute right-10 ml-auto">
                      new
                    </span>
                  )}
                  {showText && (
                    <ChevronDownIcon
                      className={`ml-auto h-5 w-5 transition-transform duration-200 ${
                        open ? 'rotate-180 text-brand-500' : ''
                      }`}
                    />
                  )}
                </button>
              ) : (
                nav.path && (
                  <Link
                    to={nav.path}
                    title={showText ? undefined : nav.name}
                    aria-label={nav.name}
                    className={`menu-item group ${
                      isActive(nav.path) ? 'menu-item-active' : 'menu-item-inactive'
                    } ${!isExpanded && !isHovered ? 'xl:justify-center' : 'xl:justify-start'}`}
                  >
                    <span
                      className={`menu-item-icon-size ${
                        isActive(nav.path) ? 'menu-item-icon-active' : 'menu-item-icon-inactive'
                      }`}
                    >
                      <Icon />
                    </span>
                    {showText && <span className="menu-item-text">{nav.name}</span>}
                  </Link>
                )
              )}

              {nav.subItems && showText && (
                <div
                  className="overflow-hidden transition-all duration-300"
                  style={panelStyle(key, open)}
                >
                  <ul
                    ref={registerPanel(key)}
                    className="ml-9 mt-2 space-y-1"
                  >
                    {nav.subItems.map((sub, subIndex) => renderSubItem(sub, `${key}-${subIndex}`))}
                  </ul>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <aside
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out xl:translate-x-0 dark:border-gray-800 dark:bg-gray-900 ${
        isExpanded || isMobileOpen || isHovered ? 'w-[290px]' : 'w-[90px]'
      } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      {/* Their logo block verbatim, including the two-image light/dark swap.
          One asset cannot serve both themes: the wordmark has to be dark on
          the white sidebar and light on the gray-900 one, and an image element
          is opaque to the page's `.dark` class, so CSS cannot recolour it. */}
      <div className={`flex py-8 ${!isExpanded && !isHovered ? 'xl:justify-center' : 'justify-start'}`}>
        <Link to="/">
          {showText ? (
            <>
              <img
                className="dark:hidden"
                alt={brand.logo.alt}
                width={150}
                height={40}
                src={brand.logo.src}
              />
              <img
                className="hidden dark:block"
                alt={brand.logo.alt}
                width={150}
                height={40}
                src={brand.logoDark}
              />
            </>
          ) : (
            <img src={brand.favicon} alt={brand.logo.alt} width={32} height={32} />
          )}
        </Link>
      </div>

      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            {NAV_GROUPS.map((group, groupIndex) => (
              <div key={group.heading}>
                <h2
                  className={`mb-4 flex text-xs uppercase leading-[20px] text-gray-400 ${
                    !isExpanded && !isHovered ? 'xl:justify-center' : 'justify-start'
                  }`}
                >
                  {showText ? group.heading : <HorizontalDotsIcon className="size-6" />}
                </h2>
                {renderItems(group.items, groupIndex)}
              </div>
            ))}
          </div>
        </nav>

        {/* Their promo box sits below the nav in a pb-20 wrapper. Dropping it
            would leave that trailing space unaccounted for, so the box stays
            and the copy becomes Tend's. */}
        {showText && <SidebarWidget />}
      </div>
    </aside>
  )
}
